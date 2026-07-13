// Pure timeline geometry helpers: snapping and overlap resolution.

import { Project } from '@shared/types';

export const SNAP_GRID_SECONDS = 1;
export const SNAP_THRESHOLD_PX = 8;

export interface ClipSpan {
  startTime: number;
  duration: number;
}

/**
 * Times worth snapping to: project start, the playhead, and every clip edge
 * (excluding the clip being manipulated).
 */
export function getSnapTargets(project: Project, excludeClipId: string | null, playheadTime: number): number[] {
  const targets: number[] = [0, playheadTime];
  for (const track of project.tracks) {
    for (const clip of track.clips) {
      if (clip.id === excludeClipId) continue;
      targets.push(clip.startTime, clip.startTime + clip.duration);
    }
  }
  return targets;
}

/**
 * Snap a time to the nearest target or grid line within the threshold.
 * Returns the original time when nothing is close enough.
 */
export function snapTime(
  desired: number,
  targets: number[],
  thresholdSeconds: number,
  gridSeconds: number = SNAP_GRID_SECONDS
): number {
  let best = desired;
  let bestDistance = thresholdSeconds;

  for (const target of targets) {
    const distance = Math.abs(target - desired);
    if (distance < bestDistance) {
      best = target;
      bestDistance = distance;
    }
  }

  if (gridSeconds > 0) {
    const gridPoint = Math.round(desired / gridSeconds) * gridSeconds;
    const distance = Math.abs(gridPoint - desired);
    if (distance < bestDistance) {
      best = gridPoint;
      bestDistance = distance;
    }
  }

  return Math.max(0, best);
}

/**
 * Find the position closest to `desiredStart` where a clip of `duration`
 * fits without overlapping any of `otherClips`. Gap-based: considers every
 * free interval between existing clips (plus the open range after the last
 * one) and clamps the desired position into the best-fitting gap.
 */
export function clampToFreeSpace(otherClips: ClipSpan[], desiredStart: number, duration: number): number {
  const desired = Math.max(0, desiredStart);
  if (otherClips.length === 0 || duration <= 0) return desired;

  const sorted = [...otherClips].sort((a, b) => a.startTime - b.startTime);

  // Build the free gaps: [0, first.start], between clips, [last.end, ∞)
  const gaps: { start: number; end: number }[] = [];
  let cursor = 0;
  for (const clip of sorted) {
    if (clip.startTime > cursor) {
      gaps.push({ start: cursor, end: clip.startTime });
    }
    cursor = Math.max(cursor, clip.startTime + clip.duration);
  }
  gaps.push({ start: cursor, end: Number.POSITIVE_INFINITY });

  const epsilon = 1e-6;
  let best: number | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const gap of gaps) {
    if (gap.end - gap.start + epsilon < duration) continue; // too small
    const clamped = Math.min(Math.max(desired, gap.start), gap.end - duration);
    const distance = Math.abs(clamped - desired);
    if (distance < bestDistance) {
      best = clamped;
      bestDistance = distance;
    }
  }

  // No gap fits (fully packed track): append after the last clip.
  return best ?? cursor;
}

/** Max end time a clip may resize to before hitting the next clip on the track. */
export function maxEndBeforeNextClip(otherClips: ClipSpan[], startTime: number): number {
  let limit = Number.POSITIVE_INFINITY;
  for (const clip of otherClips) {
    if (clip.startTime >= startTime && clip.startTime < limit) {
      limit = clip.startTime;
    }
  }
  return limit;
}

/** Min start time a clip may resize back to before hitting the previous clip. */
export function minStartAfterPreviousClip(otherClips: ClipSpan[], endTime: number): number {
  let limit = 0;
  for (const clip of otherClips) {
    const clipEnd = clip.startTime + clip.duration;
    if (clipEnd <= endTime && clipEnd > limit) {
      limit = clipEnd;
    }
  }
  return limit;
}
