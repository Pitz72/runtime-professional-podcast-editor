
import React, { useCallback, useState } from 'react';
import { AudioFile } from '@shared/types';
import { CloseIcon } from './icons';

interface FileBinProps {
  files: AudioFile[];
  onFileDrop: (files: File[]) => void;
  onFileDelete?: (fileId: string) => void;
}

const FileBin: React.FC<FileBinProps> = ({ files, onFileDrop, onFileDelete }) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      onFileDrop(droppedFiles);
    }
  }, [onFileDrop]);

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, file: AudioFile) => {
    e.dataTransfer.setData('application/json', JSON.stringify(file));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDeleteFile = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    if (onFileDelete) {
      onFileDelete(fileId);
    }
  };

  return (
    <div
      className={`flex-1 flex flex-col border-b border-gray-700 overflow-hidden ${isDraggingOver ? 'bg-purple-900/50 ring-2 ring-purple-500' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <h2 className="text-lg font-semibold p-3 bg-gray-900 border-b border-gray-700">File Bin</h2>
      <div className="flex-1 overflow-y-auto p-2">
        {files.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center text-gray-500 p-4">
            <p>Drag & drop compatible audio files here.<br />(mp3, wav, ogg, flac)</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {files.map(file => (
              <li
                key={file.id}
                className="bg-gray-700 p-2 rounded-md cursor-grab active:cursor-grabbing hover:bg-gray-600 relative group"
                draggable
                onDragStart={(e) => handleDragStart(e, file)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-white">{file.name}</p>
                    <p className="text-xs text-gray-400">{file.duration.toFixed(2)}s</p>
                  </div>
                  {onFileDelete && (
                    <button
                      onClick={(e) => handleDeleteFile(e, file.id)}
                      className="ml-2 p-1 text-gray-400 hover:text-white hover:bg-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete file"
                    >
                      <CloseIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default FileBin;