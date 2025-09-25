import React, { useState } from 'react';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { Operation, OperationType } from '../hooks/useUndoRedo';

interface UndoRedoHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

const getOperationIcon = (type: OperationType): string => {
  switch (type) {
    case OperationType.ADD_TRACK:
      return '➕';
    case OperationType.DELETE_TRACK:
      return '🗑️';
    case OperationType.UPDATE_TRACK:
      return '✏️';
    case OperationType.ADD_CLIP:
      return '🎵';
    case OperationType.DELETE_CLIP:
      return '✂️';
    case OperationType.UPDATE_CLIP:
      return '🔄';
    case OperationType.MOVE_CLIP:
      return '↔️';
    case OperationType.SPLIT_CLIP:
      return '✂️';
    case OperationType.BATCH_OPERATION:
      return '📦';
    default:
      return '❓';
  }
};

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const UndoRedoHistory: React.FC<UndoRedoHistoryProps> = ({ isOpen, onClose }) => {
  const { getHistory, getCurrentOperation, undo, redo, canUndo, canRedo } = useUndoRedo();
  const [selectedOperation, setSelectedOperation] = useState<Operation | null>(null);

  if (!isOpen) return null;

  const history = getHistory();
  const currentOp = getCurrentOperation();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Operation History</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          <div className="flex gap-2 mb-4">
            <button
              onClick={undo}
              disabled={!canUndo()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Undo
            </button>
            <button
              onClick={redo}
              disabled={!canRedo()}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2M21 10l-6-6m6 6l-6 6" />
              </svg>
              Redo
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {history.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>No operations in history</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((operation, index) => {
                  const isCurrent = currentOp?.id === operation.id;
                  const isFuture = index > (currentOp ? history.findIndex(op => op.id === currentOp.id) : -1);

                  return (
                    <div
                      key={operation.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        isCurrent
                          ? 'bg-blue-900/50 border-blue-500'
                          : isFuture
                          ? 'bg-gray-700/50 border-gray-600 opacity-60'
                          : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                      }`}
                      onClick={() => setSelectedOperation(operation)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{getOperationIcon(operation.type)}</span>
                        <div className="flex-1">
                          <p className="text-white font-medium">{operation.description}</p>
                          <p className="text-xs text-gray-400">
                            {formatTimestamp(operation.timestamp)}
                            {isCurrent && <span className="ml-2 text-blue-400">(Current)</span>}
                            {isFuture && <span className="ml-2 text-gray-500">(Future)</span>}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-1 rounded ${
                            isCurrent
                              ? 'bg-blue-500 text-white'
                              : isFuture
                              ? 'bg-gray-500 text-white'
                              : 'bg-gray-600 text-gray-300'
                          }`}>
                            {operation.type.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {selectedOperation && (
            <div className="mt-4 p-3 bg-gray-700 rounded-lg border border-gray-600">
              <h3 className="text-lg font-semibold text-white mb-2">Operation Details</h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-400">Type:</span> <span className="text-white">{selectedOperation.type}</span></p>
                <p><span className="text-gray-400">Time:</span> <span className="text-white">{formatTimestamp(selectedOperation.timestamp)}</span></p>
                <p><span className="text-gray-400">Description:</span> <span className="text-white">{selectedOperation.description}</span></p>
                {selectedOperation.data && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-gray-400 hover:text-gray-300">View Data</summary>
                    <pre className="mt-2 p-2 bg-gray-900 rounded text-xs text-gray-300 overflow-auto max-h-32">
                      {JSON.stringify(selectedOperation.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UndoRedoHistory;