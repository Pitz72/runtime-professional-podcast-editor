# User Guide — Runtime Radio Podcast Toolkit

**Current Version:** 0.0.3 "Mestiere"  
**Platform:** Windows Desktop Application (Electron + React 19 + TypeScript)  
**Author:** Simone Pizzi  

---

## 🎙️ Welcome to Runtime Radio Podcast Toolkit

**Runtime Radio Podcast Toolkit** is a desktop application designed to empower journalists, podcasters, and content creators to produce broadcast-quality podcast episodes without requiring audio engineering expertise.

The software is **opinionated**: it handles technical acoustics (compression, parametric equalization, ducking, and peak headroom) with curated presets and human-readable controls, allowing you to focus on your story and pacing.

---

## 🚀 Getting Started

### System Requirements
* **Operating System:** Windows 10 / Windows 11 (64-bit)
* **Memory:** Minimum 4 GB RAM (8 GB recommended for multi-track projects)
* **Storage:** 200 MB for application + project audio storage
* **Network:** None required. All audio processing, effects, and exports run **100% locally and offline**.

### First Launch & Language Selection
1. Launch **Runtime Radio Podcast Toolkit** from the Start Menu, desktop shortcut, or dev environment (`npm run dev`).
2. On the **Welcome Screen**, choose your preferred language (**Italiano** or **English US**) via the dropdown at the bottom. The chosen language immediately syncs across all interface panels, notifications, and native system menus.
3. Choose an action:
   * **New Project**: Starts a clean workspace with default Voice, Music, Background, and FX tracks.
   * **Load Project**: Opens a native file dialog to select a previously saved `.json` project file.
   * **Recent Projects**: Directly reopen any of your last 10 projects.

---

## 🎛️ Workspace Overview

The application interface is divided into four main sections:

```
┌────────────────────────────────────────────────────────────────────────┐
│  HEADER: Title & Transport Controls (Play, Stop, Mastering, Save, Export) │
├──────────────┬─────────────────────────────────────────────────────────┤
│ FILE BIN     │ TIMELINE RULER & PLAYHEAD                               │
│ [ + Import ] ├─────────────────────────────────────────────────────────┤
│ • File List  │ TRACK 1: Voice                                          │
│              │ [ Clip 1 ]        [ Clip 2 ]                            │
│              ├─────────────────────────────────────────────────────────┤
│              │ TRACK 2: Music                                          │
│              │ [ Background Music (Looped) ]                           │
├──────────────┤                                                         │
│ PROPERTIES   │ TRACK 3: Background Ambience                            │
│ • Volume     ├─────────────────────────────────────────────────────────┤
│ • Ducking    │ TRACK 4: Sound FX                                       │
│ • Presets    ├─────────────────────────────────────────────────────────┤
│              │ [ + Add Voice Track ]  [ + Add Music Track ]  [ - Zoom +]│
└──────────────┴─────────────────────────────────────────────────────────┘
```

---

## 📁 1. Managing Audio Files (File Bin)

The **File Bin** on the left stores the audio assets imported into the current project.

### Supported Audio Formats
* **WAV** (`.wav`, uncompressed PCM)
* **MP3** (`.mp3`, MPEG Audio Layer 3)
* **OGG** (`.ogg`, Ogg Vorbis)
* **FLAC** (`.flac`, Free Lossless Audio Codec)
* **AAC / M4A** (`.aac`, `.m4a`)

### Importing Audio
You can add audio files using two methods:
1. **Direct Drag & Drop**: Select one or more audio files in Windows Explorer and drag them into the File Bin area.
2. **Native Import Dialog**: Click the **"+ Import"** button at the top of the File Bin to open the Windows file picker.

> [!NOTE]
> When files are imported, their absolute paths on disk are retained. Audio data is kept in memory while editing and re-decoded from disk upon reopening projects, keeping project files lightweight and clean.

### File Properties & Deletion
* Click any file in the File Bin to view its properties in the panel below (duration, file path, and decoded status).
* Hover over a file card and click the **✕** button to delete it. Deleting a file removes all clips on the timeline that reference it.

---

## 🎵 2. Multi-Track Timeline Editing

### Adding Clips to Tracks
* Drag an audio file from the File Bin and drop it onto any track on the timeline.
* The clip is created with the full duration of the file and placed at the dropped time position.

### Track Types
* **🎤 Voice**: Intended for speech, dialogue, and interviews.
* **🎵 Music**: Background tracks and theme tunes. Features automatic ducking under voice tracks.
* **🌊 Background**: Environmental sounds, room tone, and soundscapes.
* **💥 FX**: Sound effects, jingles, stingers, and short transitions.

### Magnetic Snapping
When dragging or resizing clips:
* Clips magnetically snap to the **1-second grid**, to the edges of other clips on the timeline, and to the **playhead position**.
* **Hold `Alt`** while dragging to temporarily bypass magnetic snapping for micro-adjustments.

### Anti-Overlap Protection
Clips on the same track will never collide or overwrite each other. When moving or dropping a clip:
* The timeline engine automatically finds the nearest free gap on the track that fits the clip duration.
* Resizing handles automatically stop when hitting adjacent clips.

### Trimming & Resizing Clips
* Hover over the left or right edge of a clip to reveal the resize handle (cursor turns into `↔`).
* Drag the left handle to trim the start point (adjusting internal audio offset).
* Drag the right handle to trim the duration.

### Looping Clips
For music beds and ambient backgrounds:
1. Select a music or background clip.
2. In the **Properties Panel**, toggle **"Loop Clip"**.
3. A repeat icon appears on the clip, and the audio will automatically loop continuously for the entire duration of the project.

---

## 🎚️ 3. Audio Processing & Ducking

### Automatic Voice Ducking
To ensure background music never overpowers speech:
1. In the **Properties Panel**, select a Music or Background track.
2. Ensure **"Automatic Ducking"** is checked (enabled by default).
3. Whenever speech occurs on any Voice track, the music volume is automatically and smoothly attenuated to 20% (-14 dB) with hardware-like, click-free audio automation ramps.

### Curated Presets
Select any track to choose from curated EQ and compressor settings:
* **Voice Presets (6)**: *Modern Podcast Clarity*, *Warm Broadcast Voice*, *Deep & Rich Narrator*, *Bright & Present Interview*, *Telephone Effect*, *Vintage Radio Effect*.
* **Music Presets (8)**: *Punchy Pop/Rock*, *Lofi Vibe*, *Ambient Background*, *Jazz/Soul Warmth*, *Electronic/Dance*, *Classical/Acoustic*, *Hip-Hop/Urban*, *Folk/Acoustic Bright*.

### Master Bus Limiter
In the header transport controls, select a mastering compressor preset:
* *Standard Broadcast* (default)
* *Subtle Glue*
* *Loud & Punchy*
* *Transparent Limiting*
* *Vintage Tube Warmth*
* *Modern Digital*
* *Gentle Evening Out*

---

## ⌨️ 4. Keyboard Shortcuts & Context Menus

| Action | Shortcut | Context |
|---|---|---|
| **Copy Clip** | `Ctrl + C` | Clip selected |
| **Paste Clip** | `Ctrl + V` | Track selected (pastes at playhead) |
| **Delete Clip** | `Delete` | Clip selected |
| **New Project** | `Ctrl + N` | Global |
| **Open Project** | `Ctrl + O` | Global |
| **Save Project** | `Ctrl + S` | Global |
| **Save Project As** | `Ctrl + Shift + S` | Global |
| **Export Audio** | `Ctrl + E` | Global |
| **Undo** | `Ctrl + Z` | Global (up to 50 steps) |
| **Redo** | `Ctrl + Y` | Global |
| **Bypass Snapping** | Hold `Alt` | During drag / resize |

### Right-Click Context Menu
* **Right-click on a track**: Opens a menu with **"Paste here"** (places the copied clip at the clicked position).
* **Right-click on a clip**: Opens a menu with **"Copy clip"** and **"Delete clip"**.

---

## 💾 5. Project Persistence & Crash Recovery

### Saving Projects
* Press `Ctrl + S` or click **"Save"** in the header.
* Projects are stored as `.json` files referencing audio file paths on your computer.
* If you modify a project, the title bar shows an unsaved marker and closing the window triggers a confirmation dialog to prevent accidental data loss.

### Automatic Crash Recovery
* Every 60 seconds, if unsaved changes exist, an automatic recovery snapshot is written to your secure `userData` directory.
* If your computer loses power or the application closes unexpectedly, relaunching the app will prompt:  
  *"An automatic backup with unsaved changes was found. Do you want to recover it?"*
* Clicking **Recover** restores your clips, timeline layout, and audio files exactly as they were.

---

## 📤 6. Exporting Your Podcast

1. Set the desired playback mix using track volumes and mastering presets.
2. Select your export format in the header dropdown:
   * **WAV**: 16-bit uncompressed broadcast PCM audio (highest fidelity).
   * **MP3**: High-quality compressed audio (192 kbps, stereo) encoded via background Web Worker.
3. Click **"Export"** (or press `Ctrl + E`).
4. Choose the destination folder and filename in the native Windows Save dialog.
5. The audio is rendered offline and normalized with **−1 dBFS** peak headroom to ensure compliance across all major podcast platforms.