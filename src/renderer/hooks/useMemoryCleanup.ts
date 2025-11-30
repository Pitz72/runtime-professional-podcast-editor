import { useCallback, useEffect, useRef } from 'react';
import { cleanupUnusedAudioBuffers, getActiveFileIds, forceGarbageCollection } from '../services/audioUtils';

export const useMemoryCleanup = (project?: any) => {
    const cleanupIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const resourcesRef = useRef<Map<string, { type: string, resource: any }>>(new Map());

    const performCleanup = useCallback(() => {
        if (project) {
            const activeFileIds = getActiveFileIds(project);
            cleanupUnusedAudioBuffers(project, activeFileIds);
        }

        // Force garbage collection periodically
        forceGarbageCollection();
    }, [project]);

    const registerResource = useCallback((id: string, type: string, resource: any) => {
        resourcesRef.current.set(id, { type, resource });
        return id;
    }, []);

    const unregisterResource = useCallback((id: string) => {
        const item = resourcesRef.current.get(id);
        if (item) {
            if (item.type === 'MediaStream') {
                try {
                    (item.resource as MediaStream).getTracks().forEach(t => t.stop());
                } catch (e) {
                    console.error('Failed to stop media stream track', e);
                }
            }
            resourcesRef.current.delete(id);
        }
    }, []);

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

    // Cleanup all registered resources on unmount
    useEffect(() => {
        return () => {
            resourcesRef.current.forEach((item, id) => {
                if (item.type === 'MediaStream') {
                    try {
                        (item.resource as MediaStream).getTracks().forEach(t => t.stop());
                    } catch (e) { /* ignore */ }
                }
            });
            resourcesRef.current.clear();
        };
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
        stopPeriodicCleanup,
        registerResource,
        unregisterResource
    };
};