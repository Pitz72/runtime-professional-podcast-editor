import React, { useCallback } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import Editor from './components/Editor';
import { INITIAL_TRACKS } from './constants';
import { useAppStore, useProject } from './store';
import { audioCache } from './services/AudioCache';

const App: React.FC = () => {
  const project = useProject();
  const setProject = useAppStore((state) => state.setProject);

  const createNewProject = useCallback(() => {
    // Clear audio cache to prevent memory leaks from previous project
    audioCache.clear();

    setProject({
      name: 'Untitled Project',
      tracks: INITIAL_TRACKS,
      files: [],
    });
  }, [setProject]);

  const loadProject = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const projectData = JSON.parse(event.target?.result as string);
            // Basic validation
            if (projectData.name && Array.isArray(projectData.tracks)) {
              // Clear cache before loading new project
              audioCache.clear();
              setProject(projectData);
            } else {
              alert('Invalid project file format.');
            }
          } catch (error) {
            console.error('Error loading project file:', error);
            alert('Failed to read or parse project file.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [setProject]);


  return (
    <div className="h-screen w-screen bg-gray-900 text-gray-200 flex flex-col overflow-hidden">
      {project ? (
        <Editor />
      ) : (
        <WelcomeScreen onNewProject={createNewProject} onLoadProject={loadProject} />
      )}
    </div>
  );
};

export default App;