import { useMemo, useState, useCallback } from 'react';
import { Project, Track } from '@shared/types';

interface VirtualizedTimelineConfig {
  containerWidth: number;
  pixelsPerSecond: number;
  currentTime: number;
  zoomLevel: number;
}

interface VirtualizedClip {
  id: string;
  trackId: string;
  startTime: number;
  duration: number;
  left: number;
  width: number;
  isVisible: boolean;
}

export const useTimelineVirtualization = (
  project: Project,
  config: VirtualizedTimelineConfig
) => {
  const [scrollLeft, setScrollLeft] = useState(0);

  // Calculate visible time range with padding
  const visibleTimeRange = useMemo(() => {
    const visibleWidth = config.containerWidth;
    const padding = visibleWidth * 0.5; // 50% padding on each side

    const startTime = Math.max(0, (scrollLeft - padding) / config.pixelsPerSecond);
    const endTime = (scrollLeft + visibleWidth + padding) / config.pixelsPerSecond;

    return { startTime, endTime };
  }, [scrollLeft, config.containerWidth, config.pixelsPerSecond]);

  // Get only clips that are visible or near visible
  const visibleClips = useMemo(() => {
    const clips: VirtualizedClip[] = [];

    project.tracks.forEach(track => {
      track.clips.forEach(clip => {
        const clipEndTime = clip.startTime + clip.duration;
        const isVisible = clipEndTime >= visibleTimeRange.startTime &&
          clip.startTime <= visibleTimeRange.endTime;

        clips.push({
          id: clip.id,
          trackId: track.id,
          startTime: clip.startTime,
          duration: clip.duration,
          left: clip.startTime * config.pixelsPerSecond,
          width: clip.duration * config.pixelsPerSecond,
          isVisible
        });
      });
    });

    return clips;
  }, [project.tracks, visibleTimeRange, config.pixelsPerSecond]);

  // Calculate total timeline width
  const totalWidth = useMemo(() => {
    const maxEndTime = Math.max(
      60, // minimum 60 seconds
      ...project.tracks.flatMap(t => t.clips.map(c => c.startTime + c.duration))
    );
    return maxEndTime * config.pixelsPerSecond;
  }, [project.tracks, config.pixelsPerSecond]);

  const handleScroll = useCallback((newScrollLeft: number) => {
    setScrollLeft(Math.max(0, newScrollLeft));
  }, []);

  return {
    visibleClips,
    totalWidth,
    scrollLeft,
    visibleTimeRange,
    handleScroll
  };
};