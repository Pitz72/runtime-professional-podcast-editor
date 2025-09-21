# User Guide - Runtime Radio Podcast Toolkit v0.5.0

## 🎙️ **Welcome to Runtime Radio Podcast Toolkit**

A professional Digital Audio Workstation designed specifically for podcast production. This guide will help you master all the features and create broadcast-quality podcasts.

---

## 🚀 **Getting Started**

### **System Requirements**
- **Browser**: Chrome 100+, Firefox 100+, Safari 15+, Edge 100+
- **Audio**: Web Audio API support (enabled by default in modern browsers)
- **Storage**: 500MB free space for projects and audio files
- **Internet**: Required for AI features (optional for basic editing)

### **First Launch**
1. Open your browser and navigate to the application
2. You'll see the welcome screen with version information
3. Click **"New Project"** to start creating your podcast
4. Or click **"Load Project"** to open an existing project

---

## 🎵 **Core Workflow**

### **1. Import Audio Files**
```
File Bin (Left Panel) → Drag & Drop → Timeline
```

**Supported Formats:**
- MP3, WAV, OGG, FLAC
- Up to 2GB per file
- Batch import supported

**Steps:**
1. Locate audio files on your computer
2. Drag them into the **File Bin** (left panel)
3. Files appear with name and duration
4. Drag files from bin to timeline to create clips

### **2. Create Your Timeline**
```
Timeline (Center) → Drag clips → Arrange → Edit
```

**Track Types:**
- **🎤 Voice**: Main narration and dialogue
- **🎵 Music**: Background music and themes
- **🌊 Background**: Ambient sounds and atmospheres
- **💥 FX**: Sound effects and transitions

**Basic Editing:**
- **Move**: Drag clips left/right on timeline
- **Resize**: Drag edges to trim start/end
- **Delete**: Hover over clip → Click red X button
- **Zoom**: Use zoom controls for precision editing

### **3. Apply Audio Enhancement**
```
Properties Panel (Right) → Select clip/track → Apply effects
```

**AI-Powered Enhancement:**
1. Select a voice clip
2. Go to Properties panel
3. Describe your audio (e.g., "Podcast voice with room reverb")
4. Click "Enhance with AI"
5. Gemini analyzes and creates optimal settings

**Manual Effects:**
- **Volume**: Adjust track or clip volume
- **EQ**: Frequency shaping with presets
- **Compression**: Dynamic range control
- **Pan**: Stereo positioning

### **4. Record New Audio**
```
Transport Controls → Record button → Speak/Sing → Stop
```

**Recording Setup:**
1. Click the **Record** button in transport controls
2. Select audio input device
3. Monitor levels (avoid red clipping indicators)
4. Click **Record** to start
5. Click **Stop** when finished
6. New clip appears on selected track

### **5. Mix and Master**
```
Master Section → Compressor → Export
```

**Mastering Steps:**
1. Set master compressor for consistency
2. Adjust overall levels
3. Enable ducking for voice-over-music
4. Preview final mix

### **6. Export Your Podcast**
```
File Menu → Export → Choose format → Download
```

**Export Options:**
- **Format**: WAV (lossless), MP3, FLAC, AAC
- **Quality**: Sample rate, bit depth, channels
- **Processing**: Normalization, effects inclusion
- **Mode**: Mix (final) or Stems (individual tracks)

---

## 🎛️ **Detailed Feature Guide**

### **File Management**

#### **Importing Files**
```
Method 1: Drag & Drop
1. Select files in file explorer
2. Drag into File Bin area
3. Drop to import

Method 2: Click to Browse
1. Click in File Bin area
2. Select files in dialog
3. Click Open to import
```

#### **File Operations**
- **Preview**: Hover over file to see waveform preview
- **Delete**: Click X button on file (removes all associated clips)
- **Info**: View duration, format, size
- **Analysis**: Right-click → Analyze for detailed metrics

### **Timeline Editing**

#### **Clip Manipulation**
```
Move: Click and drag clip horizontally
Resize Left: Drag left edge to trim start
Resize Right: Drag right edge to trim end
Delete: Hover → Click red X in top-right
Split: Double-click to split at playhead (future feature)
```

#### **Track Management**
```
Add Track: Click "+" buttons below timeline
Delete Track: Click X on track header
Reorder: Drag track headers vertically
Solo/Mute: Click S/M buttons on tracks
Volume: Drag volume faders
```

#### **Navigation**
```
Zoom: Use +/- buttons or mouse wheel + Ctrl
Scroll: Drag timeline background or use scrollbars
Playhead: Click timeline to jump to position
Follow: Playhead auto-scrolls during playback
```

### **Audio Effects**

#### **Track Effects**
- **Volume**: -∞ to +12dB
- **Pan**: -100% (left) to +100% (right)
- **Mute/Solo**: Isolate tracks for mixing
- **EQ**: Frequency shaping (future expansion)
- **Compression**: Dynamic control (future expansion)

#### **AI Enhancement**
```
For Voice Tracks:
1. Select voice clip
2. Open Properties panel
3. Describe audio: "Clear podcast voice with slight reverb"
4. Click "Enhance with AI"
5. Wait for Gemini analysis
6. Apply suggested preset
```

#### **Master Effects**
- **Master Volume**: Overall output level
- **Master Compressor**: Glue the mix together
- **Ducking**: Auto-reduce music during voice

### **Recording System**

#### **Setup Recording**
```
1. Click Record button in transport
2. Select input device from dropdown
3. Choose destination track
4. Set recording levels
5. Enable monitoring if needed
```

#### **Recording Process**
```
Pre-roll: 2 seconds of pre-recording buffer
Monitoring: Hear yourself with slight delay
Levels: Green=good, Yellow=hot, Red=clipping
Stop: Click stop or spacebar
```

#### **Multi-track Recording**
```
1. Arm multiple tracks (record-enable)
2. Start recording on all armed tracks
3. Record different sources simultaneously
4. Stop all recordings at once
```

### **Analysis & Quality Control**

#### **Audio Analysis**
```
Access: Right-click clip → Analyze
Or: Select clip → Properties → Analysis tab

Metrics Provided:
- LUFS (Loudness Units)
- True Peak levels
- Crest Factor
- Dynamic Range
- Frequency Spectrum
- Noise Floor
- DC Offset
- Clipping Detection
```

#### **Quality Recommendations**
```
Based on analysis, get suggestions:
- "Increase loudness" (if too quiet)
- "Reduce peaks" (if clipping)
- "Add compression" (if dynamic range too wide)
- "Filter low end" (if rumble detected)
```

### **Export System**

#### **Export Formats**
```
WAV: Lossless, highest quality, largest files
FLAC: Lossless compressed, good compression
MP3: Lossy, small files, universal compatibility
AAC: Lossy, web-optimized, streaming friendly
```

#### **Export Settings**
```
Quality Presets:
- CD Quality: 44.1kHz, 16-bit
- Professional: 48kHz, 24-bit
- High-End: 96kHz, 32-bit

Processing Options:
- Include Effects: Apply track processing
- Normalize: Auto-level adjustment
- Dithering: Reduce quantization noise
```

#### **Stem Export**
```
Export individual tracks as separate files:
1. Choose "Export Stems" mode
2. Select format and quality
3. Each track becomes separate file
4. Useful for post-production mixing
```

---

## 🎹 **Keyboard Shortcuts**

### **Playback Control**
- **Space**: Play/Pause
- **Ctrl + Space**: Stop and return to start
- **Enter**: Record start/stop

### **Navigation**
- **←/→**: Nudge playhead by 1 second
- **Shift + ←/→**: Nudge by 10 seconds
- **Ctrl + ←/→**: Jump to previous/next clip
- **Home/End**: Jump to start/end of project

### **Editing**
- **Delete**: Remove selected clip
- **Ctrl + C/V**: Copy/paste clips (future)
- **Ctrl + Z/Y**: Undo/Redo
- **Ctrl + A**: Select all clips on track
- **Esc**: Deselect all

### **Zoom & View**
- **Ctrl + +/-**: Zoom in/out
- **Ctrl + 0**: Fit project to view
- **Ctrl + F**: Focus on selected clip

### **File Operations**
- **Ctrl + N**: New project
- **Ctrl + O**: Open project
- **Ctrl + S**: Save project
- **Ctrl + E**: Export audio

---

## 🔧 **Advanced Features**

### **AI Integration**

#### **Smart Preset Generation**
```
Gemini analyzes your audio and creates custom presets:
- Voice cleaning for podcasts
- Music enhancement
- Problem-solving (reverb removal, noise reduction)
- Broadcast optimization
```

#### **Context-Aware Suggestions**
```
Based on your project:
- Detects podcast vs music production
- Adapts to voice types (male/female, accent)
- Considers room acoustics
- Optimizes for target platform (Spotify, Apple, etc.)
```

### **Performance Optimization**

#### **Large Project Handling**
```
For projects with 50+ clips:
- Lazy loading of waveforms
- Background audio processing
- Memory cleanup automatic
- Progressive loading
```

#### **Real-time Monitoring**
```
Performance metrics always visible:
- CPU usage
- Memory consumption
- Audio buffer status
- Network status (for AI features)
```

### **Collaboration Features** (Future)
```
- Project sharing
- Real-time collaboration
- Version control
- Comment system
```

---

## 🐛 **Troubleshooting**

### **Audio Issues**

#### **No Sound**
```
Check:
- Browser audio permissions
- System audio settings
- Audio device selection
- File format compatibility
```

#### **Audio Glitches**
```
Solutions:
- Reduce number of active tracks
- Close other audio applications
- Restart browser
- Check system resources
```

#### **Recording Problems**
```
- Check microphone permissions
- Select correct input device
- Adjust input levels
- Close background applications
```

### **Performance Issues**

#### **Slow Loading**
```
Optimize:
- Reduce project size
- Close unused browser tabs
- Update browser
- Check internet connection (for AI)
```

#### **UI Freezing**
```
Fix:
- Save and reload project
- Clear browser cache
- Restart browser
- Check system memory
```

### **File Issues**

#### **Import Failures**
```
Supported formats: MP3, WAV, OGG, FLAC
Max file size: 2GB
Check file corruption
Try different browser
```

#### **Export Problems**
```
Check available disk space
Try different format
Disable effects if issues persist
Check browser compatibility
```

---

## 📚 **Best Practices**

### **Podcast Production**

#### **Recording Setup**
```
- Use quality microphone (USB or XLR)
- Record in quiet environment
- Use pop filter for plosives
- Maintain consistent distance from mic
- Monitor levels (avoid clipping)
```

#### **Editing Workflow**
```
1. Import and organize files
2. Rough cut to remove mistakes
3. Clean up audio with AI enhancement
4. Add music and sound effects
5. Mix levels and apply compression
6. Master for consistent loudness
7. Export in multiple formats
```

#### **Audio Quality Standards**
```
- Sample Rate: 44.1kHz minimum, 48kHz recommended
- Bit Depth: 16-bit minimum, 24-bit for editing
- Loudness: -16 to -20 LUFS for podcasts
- Dynamic Range: 6-12dB for speech
- Stereo: Mono for speech, stereo for music
```

### **Performance Optimization**

#### **Project Organization**
```
- Use descriptive file names
- Organize tracks logically
- Group related clips
- Use consistent naming conventions
- Save regularly
```

#### **System Resources**
```
- Close unnecessary applications
- Use SSD for better performance
- Ensure 8GB+ RAM
- Keep browser updated
- Use wired internet for AI features
```

---

## 🎯 **Quick Start Checklist**

### **First Podcast Session**
- [ ] Create new project
- [ ] Import voice recording
- [ ] Place on Voice track
- [ ] Add background music
- [ ] Adjust volume levels
- [ ] Apply AI enhancement
- [ ] Export as MP3

### **Advanced Production**
- [ ] Set up multi-track recording
- [ ] Use compression on voice
- [ ] Apply ducking automation
- [ ] Add sound effects
- [ ] Use stem export for mixing
- [ ] Master with broadcast standards

---

## 📞 **Support & Resources**

### **Getting Help**
- **Documentation**: This user guide
- **Changelog**: Version history and updates
- **Regression Testing**: Quality assurance procedures
- **GitHub Issues**: Bug reports and feature requests

### **Community Resources**
- **Tutorials**: Step-by-step video guides (future)
- **Templates**: Pre-built project templates
- **Presets**: Community-shared effect chains
- **Forum**: User discussion and tips

### **System Requirements**
```
Minimum:
- Chrome 100+
- 4GB RAM
- 1GB storage
- Broadband internet

Recommended:
- Chrome 120+
- 8GB RAM
- SSD storage
- Stable internet
```

---

## 🔄 **Version Updates**

### **Staying Current**
- Check for updates on application start
- Review changelog for new features
- Backup projects before major updates
- Test new features on copy projects first

### **Migration Guide**
```
From v0.4.x to v0.5.0:
- Projects load automatically
- New features available immediately
- Performance improvements included
- AI features require internet connection
```

---

## 🎉 **Congratulations!**

You're now ready to create professional podcasts with Runtime Radio Podcast Toolkit. Remember:

- **Start Simple**: Master basic editing before advanced features
- **Use AI Wisely**: AI enhances, doesn't replace, your creative decisions
- **Save Often**: Regular backups prevent lost work
- **Learn Gradually**: Each project teaches new techniques
- **Have Fun**: Podcasting should be enjoyable!

**Happy podcasting! 🎙️✨**

---

**Runtime Radio Podcast Toolkit v0.5.0 "The Sonic Extension"**
**Created by Simone Pizzi**
**Documentation Version: 1.0**
**Last Updated: 2025-09-21**