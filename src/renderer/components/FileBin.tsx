import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { AudioFile } from '@shared/types';
import { CloseIcon, PlayIcon, PauseIcon, SearchIcon, FileAudioIcon } from './icons';
import { useT } from '../i18n';

interface DraggableFileProps {
  file: AudioFile;
  isPlayingPreview: boolean;
  onTogglePreview: (file: AudioFile) => void;
  onFileDelete?: (fileId: string) => void;
  onFileClick?: (fileId: string) => void;
}

const DraggableFile: React.FC<DraggableFileProps> = ({
  file,
  isPlayingPreview,
  onTogglePreview,
  onFileDelete,
  onFileClick
}) => {
  const t = useT();
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

  const ext = file.name.split('.').pop()?.toUpperCase() || 'AUDIO';

  return (
    <li
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`group bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-purple-500/50 p-2.5 rounded-lg cursor-grab active:cursor-grabbing relative select-none transition-all shadow-sm ${
        isDragging ? 'opacity-40 ring-2 ring-purple-500 shadow-2xl' : ''
      }`}
      style={{ touchAction: 'none' }}
      onClick={() => onFileClick && onFileClick(file.id)}
    >
      <div className="flex items-center gap-2.5">
        {/* Quick Preview Play/Pause Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePreview(file);
          }}
          className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-all ${
            isPlayingPreview
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/50 animate-pulse'
              : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-purple-600 border border-slate-700'
          }`}
          title={isPlayingPreview ? 'Ferma anteprima' : 'Ascolta anteprima'}
        >
          {isPlayingPreview ? <PauseIcon className="w-3.5 h-3.5" /> : <PlayIcon className="w-3.5 h-3.5 ml-0.5" />}
        </button>

        {/* File Metadata */}
        <div className="flex-1 min-w-0 pointer-events-none">
          <p className="text-xs font-bold truncate text-slate-100 group-hover:text-purple-300 transition-colors">
            {file.name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-slate-950 text-slate-400 border border-slate-800">
              {ext}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {file.duration.toFixed(2)}s
            </span>
          </div>
        </div>

        {/* Delete File Button */}
        {onFileDelete && (
          <button
            onClick={(e) => handleDeleteFile(e, file.id)}
            className="p-1 text-slate-500 hover:text-white hover:bg-rose-500/80 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 flex-shrink-0"
            title={t('fileBin.deleteFile')}
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
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
  const t = useT();
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  const previewSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const previewContextRef = useRef<AudioContext | null>(null);

  // Stop preview on unmount
  useEffect(() => {
    return () => {
      try {
        previewSourceRef.current?.stop();
        previewSourceRef.current?.disconnect();
      } catch { /* ignore */ }
    };
  }, []);

  const handleTogglePreview = useCallback((file: AudioFile) => {
    if (previewingId === file.id) {
      try {
        previewSourceRef.current?.stop();
        previewSourceRef.current?.disconnect();
      } catch { /* ignore */ }
      previewSourceRef.current = null;
      setPreviewingId(null);
      return;
    }

    if (!file.buffer) return;

    try {
      if (previewSourceRef.current) {
        previewSourceRef.current.stop();
        previewSourceRef.current.disconnect();
      }
    } catch { /* ignore */ }

    if (!previewContextRef.current) {
      previewContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }

    const ctx = previewContextRef.current;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const source = ctx.createBufferSource();
    source.buffer = file.buffer;
    source.connect(ctx.destination);
    source.onended = () => {
      if (previewSourceRef.current === source) {
        setPreviewingId(null);
        previewSourceRef.current = null;
      }
    };
    source.start(0);
    previewSourceRef.current = source;
    setPreviewingId(file.id);
  }, [previewingId]);

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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      onFileDrop(droppedFiles);
    }
  }, [onFileDrop]);

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div
      className={`flex-1 flex flex-col border-b border-slate-800 overflow-hidden bg-slate-900/60 transition-colors ${
        isDraggingOver ? 'bg-purple-950/40 ring-2 ring-purple-500 ring-inset' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-slate-950/80 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <FileAudioIcon className="w-4 h-4 text-purple-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            {t('fileBin.title')}
          </h2>
          <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded-full font-bold">
            {files.length}
          </span>
        </div>
        {onImportClick && (
          <button
            onClick={onImportClick}
            className="px-2.5 py-1 text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-md shadow-sm transition-all flex items-center gap-1"
          >
            <span>{t('fileBin.import')}</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      {files.length > 0 && (
        <div className="px-3 pt-2 pb-1 bg-slate-950/40 border-b border-slate-800/60">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-md px-2 py-1 text-xs text-slate-300">
            <SearchIcon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filtra file audio..."
              className="bg-transparent border-0 focus:outline-none w-full text-xs text-slate-200 placeholder:text-slate-600 font-sans"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-white">
                <CloseIcon className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* File List / Drop Area */}
      <div className="flex-1 overflow-y-auto p-2.5">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 border-2 border-dashed border-slate-800/80 rounded-xl my-2 mx-1 bg-slate-950/30">
            <div className="w-10 h-10 rounded-full bg-slate-800/60 flex items-center justify-center mb-3 text-slate-500">
              <FileAudioIcon className="w-5 h-5 text-purple-400/80" />
            </div>
            <p className="text-xs text-slate-400 font-medium whitespace-pre-line leading-relaxed">
              {t('fileBin.dropHint')}
            </p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500 font-mono">
            Nessun file corrisponde a &quot;{searchQuery}&quot;
          </div>
        ) : (
          <ul className="space-y-1.5">
            {filteredFiles.map(file => (
              <DraggableFile
                key={file.id}
                file={file}
                isPlayingPreview={previewingId === file.id}
                onTogglePreview={handleTogglePreview}
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