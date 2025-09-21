# Regression Testing Guide - Runtime Radio Podcast Toolkit v0.5.0

## 📋 **Overview**

This document outlines comprehensive regression testing procedures to ensure that new features and bug fixes don't break existing functionality in Runtime Radio Podcast Toolkit.

## 🎯 **Testing Scope**

### **Critical Path Features**
These features must work flawlessly in every release:

1. **Audio Playback & Recording**
2. **File Import/Export**
3. **Timeline Editing**
4. **Project Save/Load**
5. **UI Responsiveness**

### **Secondary Features**
Features that enhance user experience but aren't critical:

1. **AI Analysis**
2. **Waveform Display**
3. **Advanced Export Options**
4. **Performance Optimizations**

---

## 🧪 **Automated Test Suite**

### **Unit Tests**
```bash
# Run all unit tests
npm run test:unit

# Run specific test suites
npm run test:audio-engine
npm run test:ui-components
npm run test:hooks
```

### **Integration Tests**
```bash
# Run integration tests
npm run test:integration

# Test audio processing pipeline
npm run test:audio-pipeline

# Test file I/O operations
npm run test:file-io
```

### **End-to-End Tests**
```bash
# Run E2E tests with Playwright
npm run test:e2e

# Test critical user workflows
npm run test:workflows
```

---

## 📝 **Manual Regression Test Checklist**

### **1. Application Startup**
- [ ] Application loads without errors
- [ ] Welcome screen displays correctly
- [ ] Version information is accurate
- [ ] No console errors or warnings
- [ ] Memory usage is within acceptable limits (< 50MB initial)

### **2. Project Management**
- [ ] Create new project works
- [ ] Load existing project works
- [ ] Save project works
- [ ] Project data integrity maintained
- [ ] File references remain valid after save/load

### **3. File Operations**
- [ ] Drag & drop file import works (MP3, WAV, OGG, FLAC)
- [ ] File appears in File Bin
- [ ] File metadata displays correctly (name, duration)
- [ ] Delete file from bin works
- [ ] Associated clips are removed when file is deleted

### **4. Timeline Operations**
- [ ] Drag file from bin to timeline creates clip
- [ ] Clip positioning is accurate
- [ ] Clip resizing (left/right handles) works
- [ ] Clip movement works
- [ ] Delete clip from timeline works
- [ ] Waveform displays correctly on clips
- [ ] Zoom in/out works (8 levels)
- [ ] Timeline scrolling works

### **5. Audio Playback**
- [ ] Play/pause/stop controls work
- [ ] Timecode updates correctly
- [ ] Audio plays from correct position
- [ ] Solo/mute per track works
- [ ] Master volume control works
- [ ] Playback follows timeline accurately
- [ ] Loop playback works for looped clips

### **6. Audio Effects & Processing**
- [ ] Track volume controls work
- [ ] EQ presets apply correctly
- [ ] Compressor settings work
- [ ] Ducking automation works
- [ ] Effects are preserved in export
- [ ] Real-time processing doesn't cause audio glitches

### **7. Recording System**
- [ ] Audio input device selection works
- [ ] Recording starts/stops correctly
- [ ] Recorded audio appears on timeline
- [ ] Recording levels are monitored
- [ ] Multiple tracks can record simultaneously
- [ ] Recording quality is maintained

### **8. AI Features**
- [ ] Gemini AI connection works
- [ ] Audio analysis provides results
- [ ] AI-generated presets apply correctly
- [ ] Analysis doesn't break normal operation
- [ ] Fallback works when AI is unavailable

### **9. Export System**
- [ ] Basic WAV export works
- [ ] Multi-format export works (MP3, FLAC, AAC)
- [ ] Stem export works
- [ ] Export progress is shown
- [ ] Exported files play correctly
- [ ] File size is reasonable
- [ ] Metadata is preserved

### **10. UI/UX**
- [ ] All buttons are clickable
- [ ] Hover effects work
- [ ] Selection states are clear
- [ ] Error messages display correctly
- [ ] Loading states work
- [ ] Responsive design works on different screen sizes
- [ ] Keyboard shortcuts work

### **11. Performance**
- [ ] Application remains responsive during audio processing
- [ ] Memory usage doesn't grow indefinitely
- [ ] CPU usage stays within reasonable limits
- [ ] Large projects (50+ clips) load without issues
- [ ] Timeline scrolling remains smooth
- [ ] No audio dropouts during playback

### **12. Error Handling**
- [ ] Invalid file formats show appropriate errors
- [ ] Network issues are handled gracefully
- [ ] Audio device issues are reported
- [ ] Corrupted project files are detected
- [ ] Out of memory conditions are handled
- [ ] Browser compatibility issues are reported

---

## 🔧 **Performance Benchmarks**

### **Load Times**
- Cold start: < 3 seconds
- Hot reload: < 500ms
- Project load (large): < 5 seconds

### **Memory Usage**
- Initial load: < 50MB
- Large project: < 200MB
- Memory leaks: < 1MB/minute

### **Audio Performance**
- Playback latency: < 10ms
- Recording latency: < 20ms
- CPU usage (playback): < 15%
- CPU usage (recording): < 25%

### **UI Responsiveness**
- Frame rate: 60fps consistent
- Input lag: < 16ms
- Scroll performance: Smooth 60fps

---

## 🌐 **Browser Compatibility Testing**

### **Supported Browsers**
- Chrome 100+
- Firefox 100+
- Safari 15+
- Edge 100+

### **Required Features**
- Web Audio API
- Web Workers
- File System Access API (optional)
- MediaRecorder API (optional)

### **Fallback Testing**
- Test without Web Workers
- Test without advanced APIs
- Test with limited audio capabilities
- Test with slow networks

---

## 📊 **Test Data Sets**

### **Audio Files for Testing**
- **Basic**: 44.1kHz WAV, 2 minutes
- **Complex**: 96kHz FLAC, 10 minutes
- **Large**: Multiple files, 1GB total
- **Edge Cases**: Corrupted files, unusual formats

### **Project Templates**
- **Simple**: 3 tracks, 5 clips
- **Complex**: 10 tracks, 50 clips
- **Heavy**: Effects on all tracks, automation
- **Large**: 2GB project with many files

---

## 🚨 **Critical Failure Criteria**

### **Show Stoppers**
- Application won't start
- Audio playback doesn't work
- Files can't be imported
- Projects can't be saved/loaded
- UI becomes unresponsive

### **Major Issues**
- Audio glitches during playback
- Data loss when saving
- Memory leaks causing crashes
- Incompatible with major browsers

### **Minor Issues**
- UI glitches
- Performance degradation
- Missing error messages
- Inconsistent behavior

---

## 📈 **Continuous Integration**

### **Automated Checks**
```yaml
# GitHub Actions workflow
name: Regression Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run build
      - run: npm run test:e2e
```

### **Performance Monitoring**
- Bundle size tracking
- Lighthouse scores
- Memory usage monitoring
- Audio performance metrics

---

## 📝 **Reporting Issues**

### **Bug Report Template**
```markdown
## Bug Report

**Version:** v0.5.0
**Browser:** Chrome 120
**OS:** Windows 11

**Steps to Reproduce:**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happens

**Screenshots:**
If applicable

**Additional Context:**
Any other information
```

### **Performance Issue Template**
```markdown
## Performance Issue

**Version:** v0.5.0
**Browser:** Chrome 120
**Hardware:** Intel i7, 16GB RAM

**Scenario:**
Description of what was happening

**Metrics:**
- CPU Usage: X%
- Memory Usage: X MB
- Frame Rate: X fps
- Audio Latency: X ms

**Expected Performance:**
What should be the performance

**Actual Performance:**
What was measured
```

---

## 🔄 **Version Compatibility**

### **Backward Compatibility**
- Projects from v0.4.x must load in v0.5.0
- Exported files remain compatible
- API contracts maintained

### **Forward Compatibility**
- v0.5.0 projects can be opened in future versions
- Migration path provided for breaking changes
- Deprecation warnings for removed features

---

## 📚 **Testing Resources**

### **Test Files Repository**
```
test-files/
├── audio/
│   ├── basic/          # Simple test files
│   ├── complex/        # Advanced test files
│   └── edge-cases/     # Problematic files
├── projects/
│   ├── templates/      # Project templates
│   └── regression/     # Known regression cases
└── automation/
    └── scripts/        # Test automation scripts
```

### **Performance Test Suite**
- Audio processing benchmarks
- UI responsiveness tests
- Memory usage monitoring
- Network condition simulation

---

## 🎯 **Quality Gates**

### **Code Quality**
- TypeScript strict mode: ✅
- ESLint: 0 errors
- Test coverage: > 80%
- Bundle size: < 3MB

### **Performance**
- Lighthouse score: > 90
- Memory leaks: None
- Audio latency: < 10ms
- UI responsiveness: 60fps

### **Compatibility**
- Chrome: ✅
- Firefox: ✅
- Safari: ✅
- Mobile: Basic support

---

## 📞 **Support & Escalation**

### **Issue Priority Levels**
1. **Critical**: Blocks core functionality
2. **High**: Major feature broken
3. **Medium**: Feature partially broken
4. **Low**: Minor inconvenience

### **Response Times**
- Critical: < 1 hour
- High: < 4 hours
- Medium: < 24 hours
- Low: < 1 week

---

## 🔗 **Related Documents**

- [CHANGELOG.md](CHANGELOG.md) - Version history and changes
- [USER_GUIDE.md](USER_GUIDE.md) - User manual and tutorials
- [API_REFERENCE.md](API_REFERENCE.md) - Technical API documentation
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment and production setup

---

**Last Updated:** 2025-09-21
**Version Tested:** v0.5.0 "The Sonic Extension"
**Test Environment:** Node.js 18, Chrome 120, Windows 11