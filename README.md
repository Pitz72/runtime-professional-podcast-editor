<div align="center">
<img width="1200" height="475" alt="Runtime Radio Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 🎙️ Runtime Radio Podcast Toolkit

**Version 0.5.0 "Il Gran Consolidamento"**

Desktop application for podcast production built with React + Electron. Features multi-track timeline editing, AI-powered audio enhancement via Google Gemini, and professional export capabilities.

## ✨ Current Features

- **🎵 Multi-Track Timeline**: Drag & drop audio clips on Voice, Music, Background, and FX tracks
- **🤖 AI Enhancement**: Gemini-powered audio preset generation with retry logic and fallback
- **🎚️ Audio Processing**: Compressor, EQ, ducking (auto-reduce music during voice)
- **📤 Export**: WAV (lossless) and MP3 (via lamejs) export
- **🎛️ 22 Professional Presets**: 6 voice + 8 music + 8 mastering curated presets
- **⌨️ Keyboard Shortcuts**: Copy/Paste clips, Delete, Play/Pause/Stop
- **🖥️ Native Electron App**: Fullscreen, native menus, 16:9 aspect ratio
- **📊 Audio Analysis**: LUFS, True Peak, spectral metrics

## ⚠️ Known Limitations

- **Drag & Drop Timeline**: Dragging from the left File Bin directly to the Timeline currently fails internally in React/Electron. Work in progress.
- **FLAC/AAC export**: Not yet implemented (disabled in UI)
- **Timeline virtualization**: Hook exists but not yet integrated (performance may degrade with 100+ clips)
- **Streaming audio**: Architecture exists (`AudioStreamService`) but not connected to main engine
- **Large files**: Audio loaded as Data URL — handle files <100MB for best experience
- **Cross-platform**: Only Windows installer available currently

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+
- **Internet** (for AI features, optional)

### Development
```bash
git clone <repository-url>
cd runtime-radio-podcast-toolkit
npm install
npm run dev
```

### Build Windows Installer
```bash
npm run build
# Output: builds/v0.5.0/
```

## 🏗️ Architecture

```
src/
├── main/            # Electron main process (window, menus, IPC)
├── renderer/        # React UI (Vite)
│   ├── audio/       # AudioWorklet processors
│   ├── components/  # React components (Editor, Timeline, etc.)
│   ├── hooks/       # Custom hooks (audio engine, recording, etc.)
│   ├── services/    # Audio utils, Gemini AI, streaming service
│   └── workers/     # Web Workers for off-thread processing
└── shared/          # Shared TypeScript types
```

### Tech Stack
| Layer | Technology |
|---|---|
| Desktop | Electron 39 |
| Frontend | React 19 + TypeScript |
| Build | Vite 6 |
| Styling | Tailwind CSS 3 |
| State | Zustand (store defined, integration in progress) |
| AI | Google Gemini 2.5 Flash |
| Audio | Web Audio API + AudioWorklet |
| Encoding | lamejs (MP3) |
| Package | electron-builder (NSIS) |

## 📖 Documentation

- **[Changelog](docs/CHANGELOG.md)**: Version history
- **[v0.5.0 Details](docs/v0.5.0.md)**: Detailed release notes
- **[User Guide](docs/USER_GUIDE.md)**: Feature documentation
- **[Regression Testing](docs/REGRESSION_TESTING.md)**: QA procedures

## 🗺️ Roadmap

### Next (v0.6.0)
- Wire Zustand store to replace useState prop drilling
- Integrate `useTimelineVirtualization` into Timeline component
- Connect `AudioStreamService` for large file streaming
- Native file save/open via Electron IPC

### Future
- Real FLAC/AAC encoders (WASM)
- Automation curves on timeline
- Crossfade between clips
- Markers and regions
- AI transcription (Gemini)
- Plugin system

## 📄 License

MIT License — Created by **Simone Pizzi**

---

**Runtime Radio Podcast Toolkit v0.5.0 "Il Gran Consolidamento"** 🎙️
