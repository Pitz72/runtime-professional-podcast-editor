import { useCallback, useEffect, useRef } from 'react';
import { cleanupUnusedAudioBuffers, getActiveFileIds, forceGarbageCollection } from '../services/audioUtils';

export const useMemoryCleanup = (project: any) => {
    const cleanupIntervalRef = useRef<NodeJS.Timeout>();

    const performCleanup = useCallback(() => {
        if (!project) return;

        const activeFileIds = getActiveFileIds(project);
        cleanupUnusedAudioBuffers(project, activeFileIds);

        // Force garbage collection periodically
        forceGarbageCollection();
    }, [project]);

    const startPeriodicCleanup = useCallback(() => {
        // Clean up every 30 seconds
        cleanupIntervalRef.current = setInterval(performCleanup, 30000);
    }, [performCleanup]);

    const stopPeriodicCleanup = useCallback(() => {
        if (cleanupIntervalRef.current) {
            clearInterval(cleanupIntervalRef.current);
            cleanupIntervalRef.current = undefined;
        }
    }, []);

    // Start cleanup on mount, stop on unmount
    useEffect(() => {
        startPeriodicCleanup();
        return () => {
            stopPeriodicCleanup();
        };
    }, [startPeriodicCleanup, stopPeriodicCleanup]);

    return {
        performCleanup,
        startPeriodicCleanup,
        stopPeriodicCleanup
    };
};