import React from 'react';

interface TimelineRulerProps {
    duration: number;
    pixelsPerSecond: number;
}

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const TimelineRuler: React.FC<TimelineRulerProps> = ({ duration, pixelsPerSecond }) => {
    // Tick density adapts to zoom.
    let majorInterval = 5; // seconds
    if (pixelsPerSecond < 40) majorInterval = 10;
    if (pixelsPerSecond > 100) majorInterval = 2;

    const minorPerMajor = pixelsPerSecond > 60 ? 5 : 2;
    const minorInterval = majorInterval / minorPerMajor;
    const showMinor = pixelsPerSecond > 30;

    // Iterate by tick interval (not by second): long projects stay cheap.
    const step = showMinor ? minorInterval : majorInterval;
    const ticks: { time: number; isMajor: boolean }[] = [];
    const epsilon = 1e-6;
    for (let time = 0; time <= duration + epsilon; time += step) {
        const isMajor = Math.abs(time / majorInterval - Math.round(time / majorInterval)) < epsilon;
        ticks.push({ time, isMajor });
    }

    return (
        <div className="relative h-6 w-full" style={{ width: `${duration * pixelsPerSecond}px`}}>
            {ticks.map(({ time, isMajor }) => (
                <div
                    key={time}
                    className="absolute bottom-0 text-gray-400"
                    style={{ left: `${time * pixelsPerSecond}px` }}
                >
                    <div
                        className={`absolute bottom-0 w-px ${isMajor ? 'h-4 bg-gray-400' : 'h-2 bg-gray-600'}`}
                    />
                    {isMajor && (
                        <span className="absolute -bottom-5 -translate-x-1/2 text-xs">
                            {formatTime(time)}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
};

export default TimelineRuler;
