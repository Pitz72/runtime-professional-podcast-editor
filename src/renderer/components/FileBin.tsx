
import React, { useCallback, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { AudioFile } from '@shared/types';
import { CloseIcon } from './icons';

interface DraggableFileProps {
  file: AudioFile;
  onFileDelete?: (fileId: string) => void;
  onFileClick?: (fileId: string) => void;
}

const DraggableFile: React.FC<DraggableFileProps> = ({ file, onFileDelete, onFileClick }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `file-${file.id}`,
    data: { type: 'file', file }
  });

  const handleDeleteFile = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    if (onFileDelete) {
      onFileDelete(fileId);
    }
  };

  return (
    <li
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`bg-gray-700 p-2 rounded-md cursor-grab active:cursor-grabbing hover:bg-gray-600 relative group ${isDragging ? 'opacity-50 ring-2 ring-purple-500' : ''}`}
      style={{ touchAction: 'none' }}
      onClick={() => onFileClick && onFileClick(file.id)}
    >
      <div className="flex items-center justify-between pointer-events-none">
        <div className="flex-1 min-w-0 pointer-events-auto">
          <p className="text-sm font-medium truncate text-white">{file.name}</p>
          <p className="text-xs text-gray-400">{file.duration.toFixed(2)}s</p>
        </div>
      </div>
      {onFileDelete && (
        <button
          onClick={(e) => handleDeleteFile(e, file.id)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white hover:bg-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10"
          title="Delete file"
        >
          <CloseIcon className="w-4 h-4" />
        </button>
      )}
    </li>
  );
};

interface FileBinProps {
  files: AudioFile[];
  onFileDrop: (files: File[]) => void;
  onImportClick?: () => void;
  onFileDelete?: (fileId: string) => void;
  onFileClick?: (fileId: string) => void;
}

const FileBin: React.FC<FileBinProps> = ({ files, onFileDrop, onImportClick, onFileDelete, onFileClick }) => {
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

    // Solo i file nativi dal sistema operativo
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      onFileDrop(droppedFiles);
    }
  }, [onFileDrop]);

  return (
    <div
      className={`flex-1 flex flex-col border-b border-gray-700 overflow-hidden ${isDraggingOver ? 'bg-purple-900/50 ring-2 ring-purple-500' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between p-3 bg-gray-900 border-b border-gray-700">
        <h2 className="text-lg font-semibold">File Bin</h2>
        {onImportClick && (
          <button
            onClick={onImportClick}
            className="px-2 py-1 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-md"
          >
            + Import
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {files.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center text-gray-500 p-4">
            <p>Drag & drop compatible audio files here.<br />(mp3, wav, ogg, flac)</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {files.map(file => (
              <DraggableFile
                key={file.id}
                file={file}
                onFileDelete={onFileDelete}
                onFileClick={onFileClick}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default FileBin;