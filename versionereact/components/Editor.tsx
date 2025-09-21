import React, { useState, useCallback, useRef, useEffect } from 'react';
import FileBin from './FileBin';
import PropertiesPanel from './PropertiesPanel';
import Timeline from './Timeline';
import TransportControls from './TransportControls';
import { Project, AudioFile, Track, TrackKind, AudioClip, CompressorSettings, TimelineHandle } from '../types';
import { DUCKING_AMOUNT, DUCKING_ATTACK, DUCKING_RELEASE, ZOOM_LEVELS, INITIAL_ZOOM_LEVEL, APP_NAME } from '../constants';
import { MASTERING_PRESETS } from '../presets';

// Helper to build the audio graph for both playback and export
const buildAudioGraph = (
    context: BaseAudioContext,
    project: Project,
    tracksToProcess: Track[],
    totalDuration: number,
) => {
    const masterBus = context.createGain();
    
    // --- MASTERING CHAIN ---
    if (project.mastering) {
        const limiter = context.createDynamicsCompressor();
        limiter.threshold.setValueAtTime(project.mastering.threshold, context.currentTime);
        limiter.knee.setValueAtTime(project.mastering.knee, context.currentTime);
        limiter.ratio.setValueAtTime(project.mastering.ratio, context.currentTime);
        limiter.attack.setValueAtTime(project.mastering.attack, context.currentTime);
        limiter.release.setValueAtTime(project.mastering.release, context.currentTime);
        masterBus.connect(limiter);
        limiter.connect(context.destination);
    } else {
        masterBus.connect(context.destination);
    }


    const sources: { source: AudioBufferSourceNode, clip: AudioClip }[] = [];
    const voiceClips = project.tracks
        .filter(t => t.kind === TrackKind.Voice)
        .flatMap(t => t.clips);

    let voiceEvents: { time: number, type: 'start' | 'end' }[] = [];
    if (voiceClips.length > 0) {
        voiceClips.forEach(c => {
            voiceEvents.push({ time: c.startTime, type: 'start' });
            voiceEvents.push({ time: c.startTime + c.duration, type: 'end' });
        });
        voiceEvents.sort((a,b) => a.time - b.time);
    }

    tracksToProcess.forEach(track => {
        const trackGain = context.createGain();
        trackGain.gain.setValueAtTime(track.volume, context.currentTime);
        trackGain.connect(masterBus);

        // --- DUCKING LOGIC ---
        if ((track.kind === TrackKind.Music || track.kind === TrackKind.Background) && track.isDuckingEnabled && voiceEvents.length > 0) {
            const gainParam = trackGain.gain;
            let activeVoices = 0;
            
            gainParam.setValueAtTime(voiceEvents[0]?.time === 0 ? track.volume * DUCKING_AMOUNT : track.volume, context.currentTime);

            voiceEvents.forEach(event => {
                const previousActiveVoices = activeVoices;
                activeVoices += (event.type === 'start' ? 1 : -1);

                if (previousActiveVoices === 0 && activeVoices > 0) {
                    gainParam.linearRampToValueAtTime(track.volume * DUCKING_AMOUNT, context.currentTime + event.time + DUCKING_ATTACK);
                } else if (previousActiveVoices > 0 && activeVoices === 0) {
                    gainParam.linearRampToValueAtTime(track.volume, context.currentTime + event.time + DUCKING_RELEASE);
                }
            });
        }

        let trackHead: AudioNode = trackGain;

        // --- EFFECTS CHAIN ---
        if (track.effects) {
            const { compressor: compressorSettings, equalizer: eqSettingsList } = track.effects;
            let lastNodeInFXChain: AudioNode = trackGain;

            if(eqSettingsList) {
                [...eqSettingsList].reverse().forEach(eqSettings => {
                    const filter = context.createBiquadFilter();
                    filter.type = eqSettings.type;
                    filter.frequency.setValueAtTime(eqSettings.frequency, context.currentTime);
                    if (typeof eqSettings.gain === 'number') filter.gain.setValueAtTime(eqSettings.gain, context.currentTime);
                    if (typeof eqSettings.Q === 'number') filter.Q.setValueAtTime(eqSettings.Q, context.currentTime);
                    filter.connect(lastNodeInFXChain);
                    lastNodeInFXChain = filter;
                });
            }

            if(compressorSettings){
                const compressor = context.createDynamicsCompressor();
                compressor.threshold.setValueAtTime(compressorSettings.threshold, context.currentTime);
                compressor.knee.setValueAtTime(compressorSettings.knee, context.currentTime);
                compressor.ratio.setValueAtTime(compressorSettings.ratio, context.currentTime);
                compressor.attack.setValueAtTime(compressorSettings.attack, context.currentTime);
                compressor.release.setValueAtTime(compressorSettings.release, context.currentTime);
                compressor.connect(lastNodeInFXChain);
                trackHead = compressor;
            }
        }

        // --- SOURCE NODES ---
        track.clips.forEach(clip => {
            const file = project.files.find(f => f.id === clip.fileId);
            if (file?.buffer) {
                 if ((track.kind === TrackKind.Music || track.kind === TrackKind.Background) && clip.isLooped && clip.duration > 0) {
                    let currentStartTime = clip.startTime;
                    while (currentStartTime < totalDuration) {
                        const source = context.createBufferSource();
                        source.buffer = file.buffer;
                        source.connect(trackHead);
                        const repeatedClip = { ...clip, id: `${clip.id}-loop-${currentStartTime}`, startTime: currentStartTime };
                        sources.push({ source, clip: repeatedClip });
                        currentStartTime += clip.duration;
                    }
                } else {
                    const source = context.createBufferSource();
                    source.buffer = file.buffer;
                    source.connect(trackHead);
                    sources.push({ source, clip });
                }
            }
        });
    });

    return { sources };
};

// WAV encoding function
function encodeWAV(audioBuffer: AudioBuffer): Blob {
    const numOfChan = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let i, sample;
    let offset = 0;
    let pos = 0;

    // write WAVE header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(audioBuffer.sampleRate);
    setUint32(audioBuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit inventory

    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    // write interleaved data
    for (i = 0; i < numOfChan; i++) {
        channels.push(audioBuffer.getChannelData(i));
    }

    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
            view.setInt16(pos, sample, true); // write 16-bit sample
            pos += 2;
        }
        offset++;
    }

    return new Blob([view], { type: 'audio/wav' });

    function setUint16(data: number) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data: number) {
        view.setUint32(pos, data, true);
        pos += 4;
    }
}


interface EditorProps {
    project: Project;
    setProject: React.Dispatch<React.SetStateAction<Project | null>>;
}

const Editor: React.FC<EditorProps> = ({ project, setProject }) => {
    const [selectedItem, setSelectedItem] = useState<{ type: 'track' | 'clip', id: string } | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [isBuffering, setIsBuffering] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [zoomIndex, setZoomIndex] = useState(INITIAL_ZOOM_LEVEL);
    
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodesRef = useRef<Map<string, AudioBufferSourceNode>>(new Map());
    const animationFrameRef = useRef<number>();
    const playbackStartTimeRef = useRef(0);
    const seekOffsetRef = useRef(0);
    const timelineRef = useRef<TimelineHandle>(null);

    const pixelsPerSecond = ZOOM_LEVELS[zoomIndex];

    const handleSetMastering = useCallback((preset: CompressorSettings | undefined) => {
        setProject(p => p ? { ...p, mastering: preset } : null);
    }, [setProject]);

    const initAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
    }, []);

    useEffect(() => {
        // Set default mastering on project load
        if (project && !project.mastering) {
            handleSetMastering(MASTERING_PRESETS[0].settings);
        }
    }, [project, handleSetMastering]);


    useEffect(() => {
        initAudioContext();
        // Effect to hydrate audio buffers on project load or when files with data URLs are added
        const hydrateBuffers = async () => {
            if (!project || !project.files.some(f => !f.buffer)) return;
            
            setIsBuffering(true);
            const ac = audioContextRef.current;
            if (!ac) {
                setIsBuffering(false);
                return;
            };

            const filesToHydrate = project.files.filter(f => !f.buffer && f.url);
            if (filesToHydrate.length === 0) {
                setIsBuffering(false);
                return;
            }

            const hydratedFiles = new Map(project.files.map(f => [f.id, f]));
            
            await Promise.all(filesToHydrate.map(async (file) => {
                try {
                    // Fetching from a data URL is synchronous and fast
                    const response = await fetch(file.url);
                    const arrayBuffer = await response.arrayBuffer();
                    const audioBuffer = await ac.decodeAudioData(arrayBuffer);
                    hydratedFiles.set(file.id, { ...file, buffer: audioBuffer, duration: audioBuffer.duration });
                } catch (error) {
                    console.error(`Failed to load audio for ${file.name}:`, error);
                }
            }));
            
            setProject(p => p ? { ...p, files: Array.from(hydratedFiles.values()) } : null);
            setIsBuffering(false);
        };

        hydrateBuffers();
    }, [project?.files, initAudioContext, setProject]);

    const handleFileDrop = useCallback((files: File[]) => {
        initAudioContext();
        const ac = audioContextRef.current;
        if (!ac) return;

        setIsBuffering(true);
        const newFilesPromises = files
            .filter(file => file.type.startsWith('audio/'))
            .map(file => {
                return new Promise<AudioFile | null>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = async (e) => {
                        try {
                            const dataUrl = e.target?.result as string;
                            // To get duration, we still need to decode it.
                            const response = await fetch(dataUrl);
                            const arrayBuffer = await response.arrayBuffer();
                            const audioBuffer = await ac.decodeAudioData(arrayBuffer);
                            resolve({
                                id: `file-${Date.now()}-${Math.random()}`,
                                name: file.name,
                                url: dataUrl, // Save the Data URL
                                type: file.type,
                                duration: audioBuffer.duration,
                                buffer: audioBuffer,
                            });
                        } catch (error) {
                            console.error("Failed to decode audio file:", file.name, error);
                            alert(`Could not decode audio file: ${file.name}`);
                            resolve(null);
                        }
                    };
                    reader.readAsDataURL(file); // Read file as Data URL
                });
            });

        Promise.all(newFilesPromises).then(newFiles => {
            const validFiles = newFiles.filter((f): f is AudioFile => f !== null);
            if (validFiles.length > 0) {
                 setProject(p => p ? {...p, files: [...p.files, ...validFiles]} : null);
            }
            setIsBuffering(false);
        });
    }, [initAudioContext, setProject]);

    const stopPlayback = useCallback((resetTime?: boolean) => {
        sourceNodesRef.current.forEach(source => {
            try { source.stop(); } catch(e) { /* ignore */ }
        });
        sourceNodesRef.current.clear();
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = undefined;
        }
        setIsPlaying(false);
        if (resetTime) {
            setCurrentTime(0);
            seekOffsetRef.current = 0;
        }
    }, []);

    const handleStop = useCallback(() => {
        stopPlayback(true);
    }, [stopPlayback]);
    
    const handleSeek = useCallback((time: number) => {
        if(isPlaying) return;
        const newTime = Math.max(0, time);
        setCurrentTime(newTime);
        seekOffsetRef.current = newTime;
    }, [isPlaying]);

    const handlePlayPause = useCallback(() => {
        if (isPlaying) {
            stopPlayback(false);
            seekOffsetRef.current = currentTime;
        } else {
            initAudioContext();
            const ac = audioContextRef.current;
            if (!ac || !project) return;

            ac.resume();
            
            const soloTrack = project.tracks.find(t => t.isSolo);
            const tracksToPlay = soloTrack ? [soloTrack] : project.tracks.filter(t => !t.isMuted);
            const totalDuration = Math.max(0, ...project.tracks.flatMap(t => t.clips.map(c => c.startTime + c.duration)));

            const { sources } = buildAudioGraph(ac, project, tracksToPlay, totalDuration);
            sourceNodesRef.current.clear();

            playbackStartTimeRef.current = ac.currentTime;
            
            sources.forEach(({ source, clip }) => {
                const file = project.files.find(f => f.id === clip.fileId);
                const clipEndTime = clip.startTime + clip.duration;
                if (file && seekOffsetRef.current < clipEndTime) {
                    const offsetInClip = Math.max(0, seekOffsetRef.current - clip.startTime);
                    
                    if (offsetInClip < clip.duration) {
                         const durationToPlay = clip.duration - offsetInClip;
                         const playAt = clip.startTime < seekOffsetRef.current ? ac.currentTime : ac.currentTime + (clip.startTime - seekOffsetRef.current);
                         
                         source.start(playAt, clip.offset + offsetInClip, durationToPlay);
                         sourceNodesRef.current.set(clip.id, source);
                    }
                }
            });

            setIsPlaying(true);
            
            const tick = () => {
                const acNow = audioContextRef.current?.currentTime;
                if (!acNow || !animationFrameRef.current) return;

                const newCurrentTime = seekOffsetRef.current + (acNow - playbackStartTimeRef.current);
                
                if (totalDuration > 0 && newCurrentTime >= totalDuration) {
                    handleStop();
                } else {
                    setCurrentTime(newCurrentTime);
                    timelineRef.current?.scrollToTime(newCurrentTime);
                    animationFrameRef.current = requestAnimationFrame(tick);
                }
            };
            animationFrameRef.current = requestAnimationFrame(tick);
        }
    }, [isPlaying, project, currentTime, stopPlayback, initAudioContext, handleStop]);

    const addTrack = (kind: TrackKind) => {
        setProject(p => {
            if (!p) return null;
            const newTrack: Track = {
                id: `track-${Date.now()}`,
                name: `${kind} ${p.tracks.filter(t => t.kind === kind).length + 1}`,
                kind: kind,
                clips: [],
                volume: kind === TrackKind.Background ? 0.4 : kind === TrackKind.Voice ? 1.0 : 0.8,
                isMuted: false,
                isSolo: false,
                isDuckingEnabled: kind === TrackKind.Music || kind === TrackKind.Background,
            };
            const tracks = [...p.tracks];
            if (kind === TrackKind.Voice) {
                let lastVoiceIndex = -1;
                for (let i = tracks.length - 1; i >= 0; i--) {
                    if (tracks[i].kind === TrackKind.Voice) {
                        lastVoiceIndex = i;
                        break;
                    }
                }

                if (lastVoiceIndex !== -1) {
                    tracks.splice(lastVoiceIndex + 1, 0, newTrack);
                } else {
                    tracks.push(newTrack);
                }
            } else {
                 tracks.push(newTrack);
            }
            return { ...p, tracks };
        });
    };
    
    const deleteTrack = (trackId: string) => {
        setProject(p => {
            if (!p) return null;
            const newTracks = p.tracks.filter(t => t.id !== trackId);
            // If the deleted track was selected, unselect it
            if(selectedItem?.type === 'track' && selectedItem.id === trackId) {
                setSelectedItem(null);
            }
            return { ...p, tracks: newTracks };
        })
    }

    const deleteFile = useCallback((fileId: string) => {
        setProject(p => {
            if (!p) return null;

            // Remove the file from the files array
            const newFiles = p.files.filter(f => f.id !== fileId);

            // Remove all clips that reference this file
            const newTracks = p.tracks.map(track => ({
                ...track,
                clips: track.clips.filter(clip => clip.fileId !== fileId)
            }));

            // If a clip from this file was selected, unselect it
            if (selectedItem?.type === 'clip') {
                const clipExists = newTracks.some(track =>
                    track.clips.some(clip => clip.id === selectedItem.id)
                );
                if (!clipExists) {
                    setSelectedItem(null);
                }
            }

            return { ...p, files: newFiles, tracks: newTracks };
        });
    }, [selectedItem, setSelectedItem]);

    const handleSaveProject = useCallback(() => {
        if (!project) return;
        // Strip out the buffer before saving, the data URL is what we persist
        const projectToSave = { ...project, files: project.files.map(({ buffer, ...rest }) => rest) };
        const projectJson = JSON.stringify(projectToSave, null, 2);
        const blob = new Blob([projectJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.name.replace(/\s/g, '_')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [project]);

    const handleExportAudio = useCallback(async () => {
        if (!project || !window.OfflineAudioContext) {
            alert('Audio export is not supported in this browser.');
            return;
        }

        setIsExporting(true);
        
        try {
            const totalDuration = Math.max(0, ...project.tracks.flatMap(t => {
                return t.clips.map(c => {
                    if ((t.kind === TrackKind.Music || t.kind === TrackKind.Background) && c.isLooped) {
                        // For looped clips, we need a better way to define total duration,
                        // for now we just use the first instance.
                        // A better solution might be a user-defined project duration.
                        return c.startTime + c.duration;
                    }
                    return c.startTime + c.duration;
                });
            }));

            if (totalDuration === 0) {
                alert("Project is empty. Add some clips to export.");
                setIsExporting(false);
                return;
            }

            // Ensure there's a default mastering preset if none is selected
            const projectWithMastering = {
                ...project,
                mastering: project.mastering || MASTERING_PRESETS[0].settings,
            }

            const offlineContext = new OfflineAudioContext(2, Math.ceil(totalDuration * 44100), 44100);
            const { sources } = buildAudioGraph(offlineContext, projectWithMastering, projectWithMastering.tracks.filter(t => !t.isMuted), totalDuration);
            
            sources.forEach(({source, clip}) => {
                source.start(clip.startTime, clip.offset, clip.duration);
            });

            const renderedBuffer = await offlineContext.startRendering();
            const wavBlob = encodeWAV(renderedBuffer);

            const url = URL.createObjectURL(wavBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${project.name.replace(/\s/g, '_')}.wav`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error exporting audio:", error);
            alert("An error occurred during audio export. See console for details.");
        } finally {
            setIsExporting(false);
        }
    }, [project]);
    
    useEffect(() => {
        return () => {
            // Stop playback and reset time on unmount
            stopPlayback(true);
        };
    }, [stopPlayback]);

    return (
        <div className="flex flex-col h-screen bg-gray-900 overflow-hidden">
            <header className="bg-gray-800 p-2 border-b border-gray-700 flex items-center justify-between">
                <h1 className="text-xl font-bold text-purple-400">{APP_NAME}</h1>
                <TransportControls 
                    isPlaying={isPlaying} 
                    onPlayPause={handlePlayPause} 
                    onStop={handleStop}
                    onSave={handleSaveProject}
                    onExport={handleExportAudio}
                    onMasteringChange={handleSetMastering}
                    isBuffering={isBuffering}
                    isExporting={isExporting}
                    currentMastering={project.mastering}
                />
            </header>
            <div className="flex flex-1 overflow-hidden">
                <aside className="w-1/4 max-w-xs flex flex-col bg-gray-800 border-r border-gray-700">
                    <FileBin files={project.files} onFileDrop={handleFileDrop} onFileDelete={deleteFile} />
                    <PropertiesPanel selectedItem={selectedItem} project={project} setProject={setProject} />
                </aside>
                <main className="flex-1 flex flex-col overflow-y-auto">
                    <Timeline 
                        ref={timelineRef}
                        project={project} 
                        setProject={setProject}
                        selectedItem={selectedItem}
                        onSelectItem={setSelectedItem} 
                        onAddTrack={addTrack}
                        onDeleteTrack={deleteTrack}
                        currentTime={currentTime}
                        onSeek={handleSeek}
                        isPlaying={isPlaying}
                        pixelsPerSecond={pixelsPerSecond}
                        zoomIndex={zoomIndex}
                        onZoomChange={setZoomIndex}
                    />
                </main>
            </div>
        </div>
    );
};

export default Editor;