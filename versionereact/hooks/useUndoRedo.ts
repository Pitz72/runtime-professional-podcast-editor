import { useCallback } from 'react';
import { useAppStore } from '../store';
import { Project, Track, AudioClip } from '../types';

// Operation types for undo/redo
export enum OperationType {
  ADD_TRACK = 'ADD_TRACK',
  DELETE_TRACK = 'DELETE_TRACK',
  UPDATE_TRACK = 'UPDATE_TRACK',
  ADD_CLIP = 'ADD_CLIP',
  DELETE_CLIP = 'DELETE_CLIP',
  UPDATE_CLIP = 'UPDATE_CLIP',
  MOVE_CLIP = 'MOVE_CLIP',
  SPLIT_CLIP = 'SPLIT_CLIP',
  BATCH_OPERATION = 'BATCH_OPERATION'
}

export interface Operation {
  id: string;
  type: OperationType;
  timestamp: number;
  description: string;
  data: any;
  inverse: () => void;
  apply: () => void;
}

export interface UndoRedoState {
  operations: Operation[];
  currentIndex: number;
  maxOperations: number;
}

class UndoRedoManager {
  private operations: Operation[] = [];
  private currentIndex: number = -1;
  private maxOperations: number = 100;

  // Create operation
  createOperation(
    type: OperationType,
    description: string,
    data: any,
    apply: () => void,
    inverse: () => void
  ): Operation {
    return {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: Date.now(),
      description,
      data,
      apply,
      inverse
    };
  }

  // Execute and store operation
  execute(operation: Operation) {
    // Remove any operations after current index (when doing new operation after undo)
    this.operations = this.operations.slice(0, this.currentIndex + 1);

    // Add new operation
    this.operations.push(operation);
    this.currentIndex++;

    // Limit history size
    if (this.operations.length > this.maxOperations) {
      this.operations.shift();
      this.currentIndex--;
    }

    // Execute the operation
    operation.apply();
  }

  // Undo last operation
  undo(): Operation | null {
    if (this.currentIndex >= 0) {
      const operation = this.operations[this.currentIndex];
      operation.inverse();
      this.currentIndex--;
      return operation;
    }
    return null;
  }

  // Redo next operation
  redo(): Operation | null {
    if (this.currentIndex < this.operations.length - 1) {
      this.currentIndex++;
      const operation = this.operations[this.currentIndex];
      operation.apply();
      return operation;
    }
    return null;
  }

  // Check if can undo
  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  // Check if can redo
  canRedo(): boolean {
    return this.currentIndex < this.operations.length - 1;
  }

  // Get operation history
  getHistory(): Operation[] {
    return [...this.operations];
  }

  // Get current operation
  getCurrentOperation(): Operation | null {
    return this.currentIndex >= 0 ? this.operations[this.currentIndex] : null;
  }

  // Clear history
  clear() {
    this.operations = [];
    this.currentIndex = -1;
  }

  // Batch operations
  startBatch(description: string): BatchOperationBuilder {
    return new BatchOperationBuilder(this, description);
  }
}

class BatchOperationBuilder {
  private operations: Operation[] = [];
  private manager: UndoRedoManager;
  private description: string;

  constructor(manager: UndoRedoManager, description: string) {
    this.manager = manager;
    this.description = description;
  }

  addOperation(operation: Operation) {
    this.operations.push(operation);
    return this;
  }

  commit() {
    if (this.operations.length === 0) return;

    const batchOperation = this.manager.createOperation(
      OperationType.BATCH_OPERATION,
      this.description,
      { operations: this.operations },
      () => {
        // Apply all operations in batch
        this.operations.forEach(op => op.apply());
      },
      () => {
        // Inverse all operations in reverse order
        [...this.operations].reverse().forEach(op => op.inverse());
      }
    );

    this.manager.execute(batchOperation);
  }
}

// Global undo/redo manager instance
const undoRedoManager = new UndoRedoManager();

// Hook for using undo/redo
export const useUndoRedo = () => {
  const store = useAppStore();

  const executeOperation = useCallback((operation: Operation) => {
    undoRedoManager.execute(operation);
  }, []);

  const undo = useCallback(() => {
    const operation = undoRedoManager.undo();
    if (operation) {
      // Update store state after undo
      // This will be handled by the operation's inverse function
    }
    return operation;
  }, []);

  const redo = useCallback(() => {
    const operation = undoRedoManager.redo();
    if (operation) {
      // Update store state after redo
      // This will be handled by the operation's apply function
    }
    return operation;
  }, []);

  const canUndo = useCallback(() => undoRedoManager.canUndo(), []);
  const canRedo = useCallback(() => undoRedoManager.canRedo(), []);

  const getHistory = useCallback(() => undoRedoManager.getHistory(), []);
  const getCurrentOperation = useCallback(() => undoRedoManager.getCurrentOperation(), []);

  const clearHistory = useCallback(() => {
    undoRedoManager.clear();
  }, []);

  const startBatch = useCallback((description: string) => {
    return undoRedoManager.startBatch(description);
  }, []);

  return {
    executeOperation,
    undo,
    redo,
    canUndo,
    canRedo,
    getHistory,
    getCurrentOperation,
    clearHistory,
    startBatch
  };
};

// Utility functions for creating common operations
export const createAddTrackOperation = (
  track: Track,
  onApply: () => void,
  onInverse: () => void
): Operation => {
  return undoRedoManager.createOperation(
    OperationType.ADD_TRACK,
    `Add track "${track.name}"`,
    { track },
    onApply,
    onInverse
  );
};

export const createDeleteTrackOperation = (
  track: Track,
  onApply: () => void,
  onInverse: () => void
): Operation => {
  return undoRedoManager.createOperation(
    OperationType.DELETE_TRACK,
    `Delete track "${track.name}"`,
    { track },
    onApply,
    onInverse
  );
};

export const createUpdateTrackOperation = (
  trackId: string,
  oldTrack: Track,
  newTrack: Track,
  onApply: () => void,
  onInverse: () => void
): Operation => {
  return undoRedoManager.createOperation(
    OperationType.UPDATE_TRACK,
    `Update track "${oldTrack.name}"`,
    { trackId, oldTrack, newTrack },
    onApply,
    onInverse
  );
};

export const createAddClipOperation = (
  clip: AudioClip,
  trackName: string,
  onApply: () => void,
  onInverse: () => void
): Operation => {
  return undoRedoManager.createOperation(
    OperationType.ADD_CLIP,
    `Add clip to track "${trackName}"`,
    { clip, trackName },
    onApply,
    onInverse
  );
};

export const createMoveClipOperation = (
  clipId: string,
  oldStartTime: number,
  newStartTime: number,
  trackName: string,
  onApply: () => void,
  onInverse: () => void
): Operation => {
  return undoRedoManager.createOperation(
    OperationType.MOVE_CLIP,
    `Move clip in track "${trackName}"`,
    { clipId, oldStartTime, newStartTime, trackName },
    onApply,
    onInverse
  );
};

export default undoRedoManager;