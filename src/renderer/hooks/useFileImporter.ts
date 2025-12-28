import { useCallback } from 'react';
import { useAppStore } from '../store';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { validateAudioFile } from '../services/audioUtils';
import { audioCache } from '../services/AudioCache';
import { AudioFile } from '@shared/types';

export const useFileImporter = () => {
    const setProject = useAppStore(state => state.setProject);
    const addFile = useAppStore(state => state.addFile);
    const { initAudioContext } = useAudioEngine(null)[1]; // Get actions only

    const importFiles = useCallback(async (files: File[]) => {
        await initAudioContext();

        // Validate files first
        const validationPromises = files.map(file => validateAudioFile(file));
        const validationResults = await Promise.all(validationPromises);

        const validFiles = files.filter((file, index) => {
            const result = validationResults[index];
            if (!result.isValid) {
                alert(`File "${file.name}" is invalid: ${result.error}`);
                return false;
            }
            if (result.warnings && result.warnings.length > 0) {
                console.warn(`File "${file.name}" warnings:`, result.warnings);
                result.warnings.forEach(warning => console.warn(warning));
            }
            return true;
        });

        if (validFiles.length === 0) {
            return;
        }

        // Use a single temporary context for all decodings to avoid hitting the browser limit (usually 6)
        // We create it once and reuse it.
        const decodeContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        const newFilesPromises = validFiles.map((file) => {
            return new Promise<AudioFile | null>((resolve) => {
                // Use FileReader to get DataURL for persistence (JSON save/load compatibility)
                // In a future expansion, we should switch to file system paths for Electron to save memory.
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const dataUrl = e.target?.result as string;

                        // To get duration and buffer, we decode it.
                        // Ideally we would stream this, but for compatibility we load it.
                        // The AudioCache will prevent re-loading/re-decoding on Undo/Redo.
                        const response = await fetch(dataUrl);
                        const arrayBuffer = await response.arrayBuffer();

                        // Reuse the single decoding context
                        const audioBuffer = await decodeContext.decodeAudioData(arrayBuffer);

                        const fileId = `file-${Date.now()}-${Math.random()}`;

                        // Add to cache immediately - this is the key fix for Undo/Redo data loss
                        audioCache.set(fileId, audioBuffer);

                        const newAudioFile: AudioFile = {
                            id: fileId,
                            name: file.name,
                            url: dataUrl, // Save DataURL so project can be saved/loaded
                            type: file.type,
                            duration: audioBuffer.duration,
                            buffer: audioBuffer,
                        };

                        resolve(newAudioFile);

                    } catch (error) {
                        console.error("Failed to decode audio file:", file.name, error);
                        alert(`Could not decode audio file: ${file.name}`);
                        resolve(null);
                    }
                };
                reader.readAsDataURL(file);
            });
        });

        // Wait for all files to be processed
        try {
            await Promise.all(newFilesPromises);
        } finally {
            // Close the temporary context when done
            decodeContext.close();
        }

        const newFiles = await Promise.all(newFilesPromises);
        const successfullyLoadedFiles = newFiles.filter((f): f is AudioFile => f !== null);

        if (successfullyLoadedFiles.length > 0) {
            successfullyLoadedFiles.forEach(file => {
                 addFile(file);
            });
        }

    }, [initAudioContext, addFile]);

    return { importFiles };
};
