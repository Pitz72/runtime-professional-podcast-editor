import { lazy, ComponentType, LazyExoticComponent } from 'react';

// Lazy load components with error boundaries
export const useLazyComponents = () => {
  // Timeline component - heavy due to complex rendering
  const Timeline = lazy(() =>
    import('../components/Timeline').then(module => ({ default: module.default }))
  );

  // PropertiesPanel - moderate complexity
  const PropertiesPanel = lazy(() =>
    import('../components/PropertiesPanel').then(module => ({ default: module.default }))
  );

  // FileBin - moderate complexity
  const FileBin = lazy(() =>
    import('../components/FileBin').then(module => ({ default: module.default }))
  );

  // TransportControls - lightweight
  const TransportControls = lazy(() =>
    import('../components/TransportControls').then(module => ({ default: module.default }))
  );

  // WelcomeScreen - lightweight, shown initially
  const WelcomeScreen = lazy(() =>
    import('../components/WelcomeScreen').then(module => ({ default: module.default }))
  );

  // UndoRedoHistory - modal, loaded on demand
  const UndoRedoHistory = lazy(() =>
    import('../components/UndoRedoHistory').then(module => ({ default: module.default }))
  );

  return {
    Timeline,
    PropertiesPanel,
    FileBin,
    TransportControls,
    WelcomeScreen,
    UndoRedoHistory
  };
};

// Preload critical components
export const preloadCriticalComponents = () => {
  // Preload welcome screen (shown initially)
  import('../components/WelcomeScreen');

  // Preload transport controls (always visible)
  import('../components/TransportControls');
};

// Preload component on user interaction
export const preloadOnInteraction = (componentName: string) => {
  switch (componentName) {
    case 'Timeline':
      import('../components/Timeline');
      break;
    case 'PropertiesPanel':
      import('../components/PropertiesPanel');
      break;
    case 'FileBin':
      import('../components/FileBin');
      break;
    case 'UndoRedoHistory':
      import('../components/UndoRedoHistory');
      break;
  }
};

// Bundle splitting strategy
export const createBundleSplit = <T extends Record<string, any>>(
  imports: T
): T => {
  const lazyImports = {} as T;

  for (const [key, importFn] of Object.entries(imports)) {
    (lazyImports as any)[key] = lazy(importFn as () => Promise<{ default: ComponentType<any> }>);
  }

  return lazyImports;
};

// Future components will be added here as they are developed
// export const futureComponents = createBundleSplit({
//   // Advanced editing features
//   AudioWaveform: () => import('../components/AudioWaveform'),
//   AutomationEditor: () => import('../components/AutomationEditor'),
//   EffectRack: () => import('../components/EffectRack'),
//
//   // Collaboration features
//   CollaborationPanel: () => import('../components/CollaborationPanel'),
//   VersionHistory: () => import('../components/VersionHistory'),
//
//   // Analysis tools
//   FrequencyAnalyzer: () => import('../components/FrequencyAnalyzer'),
//   LoudnessMeter: () => import('../components/LoudnessMeter'),
//
//   // Export tools
//   ExportDialog: () => import('../components/ExportDialog'),
//   StemSeparator: () => import('../components/StemSeparator')
// });