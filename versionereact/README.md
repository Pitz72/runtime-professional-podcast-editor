<div align="center">
<img width="1200" height="475" alt="Runtime Radio Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 🎙️ Runtime Radio Podcast Toolkit

**Version 0.5.0 "The Sonic Extension"**

A professional Digital Audio Workstation designed specifically for podcast production. Create broadcast-quality podcasts with AI-powered audio enhancement, real-time waveform visualization, multi-track recording, and comprehensive editing tools.

## ✨ Features

- **🎵 Professional Audio Engine**: Web Audio API with real-time processing
- **🤖 AI-Powered Enhancement**: Gemini AI for intelligent audio presets
- **🎚️ Multi-track Recording**: Professional recording with level monitoring
- **🎼 Advanced Timeline**: Waveform visualization and precision editing
- **📊 Audio Analysis**: Comprehensive metrics (LUFS, frequency, quality)
- **🎛️ Mastering Suite**: Compressor, EQ, and broadcast optimization
- **📤 Multi-format Export**: WAV/MP3/FLAC/AAC with quality options
- **⚡ Performance Optimized**: 60fps UI with background processing

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+
- **Modern Browser** (Chrome 100+, Firefox 100+, Safari 15+)
- **Internet Connection** (for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd runtime-radio-podcast-toolkit
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure AI (Optional)**
   ```bash
   # Create .env.local file
   echo "VITE_GEMINI_API_KEY=your_gemini_api_key_here" > .env.local
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:5174
   ```

## 📖 Documentation

- **[User Guide](USER_GUIDE.md)**: Complete feature documentation and tutorials
- **[Changelog](CHANGELOG.md)**: Version history and feature updates
- **[Regression Testing](REGRESSION_TESTING.md)**: Quality assurance procedures

## 🎯 Use Cases

### For Podcasters
- Record multi-track podcasts with professional quality
- Clean up audio with AI-powered enhancement
- Mix voice, music, and sound effects seamlessly
- Export broadcast-ready files

### For Content Creators
- Create engaging audio content with ease
- Apply professional audio processing
- Analyze and optimize audio quality
- Share projects with team members

### For Audio Engineers
- Access professional-grade tools in the browser
- Use AI assistance for complex processing
- Monitor detailed audio metrics
- Export in any professional format

## 🏗️ Architecture

```
Runtime Radio Podcast Toolkit/
├── 🎨 components/          # React UI components
├── 🪝 hooks/              # Custom React hooks
├── 🔧 services/           # External services (Gemini AI)
├── 👷 workers/            # Web Workers for processing
├── 📋 types.ts            # TypeScript definitions
├── 🏪 store.ts            # Zustand state management
└── ⚙️ constants.tsx       # App configuration
```

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Audio**: Web Audio API + Web Workers
- **State**: Zustand + Immer
- **UI**: Tailwind CSS + Custom Components
- **AI**: Google Gemini 2.5-flash
- **Build**: Vite with optimizations

## 🧪 Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test:unit    # Run unit tests
npm run test:e2e     # Run end-to-end tests
```

### Project Structure
- **Components**: Modular, reusable UI elements
- **Hooks**: Business logic and state management
- **Services**: External API integrations
- **Workers**: Heavy computation off main thread
- **Types**: Complete TypeScript coverage

## 📊 Performance

- **Load Time**: < 3 seconds cold start
- **Memory Usage**: < 50MB initial, < 200MB large projects
- **Audio Latency**: < 10ms playback, < 20ms recording
- **UI Responsiveness**: 60fps consistent
- **Bundle Size**: ~2.3MB (gzipped)

## 🌐 Browser Support

- ✅ **Chrome** 100+
- ✅ **Firefox** 100+
- ✅ **Safari** 15+
- ✅ **Edge** 100+

*Requires Web Audio API support*

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm run test:unit`
5. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini AI** for powering intelligent audio analysis
- **Web Audio API** for enabling browser-based audio processing
- **React Community** for the excellent framework ecosystem
- **Open Source Community** for tools and inspiration

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Documentation**: [User Guide](USER_GUIDE.md)

---

**Runtime Radio Podcast Toolkit v0.5.0 "The Sonic Extension"**
**Created by Simone Pizzi**
**Professional Podcast Production Made Simple** 🎙️✨
