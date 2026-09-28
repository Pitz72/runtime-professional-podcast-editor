import React from 'react';

interface TimelineRulerProps {
    duration: number;
    pixelsPerSecond: number;
    onSeek?: (time: number) => void;
}

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const TimelineRuler: React.FC<TimelineRulerProps> = ({ duration, pixelsPerSecond, onSeek }) => {
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

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!onSeek) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const time = Math.max(0, Math.min(duration, clickX / pixelsPerSecond));
        onSeek(time);
    };

    return (
        <div
            className="relative h-7 w-full cursor-pointer bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800 select-none hover:bg-slate-800/40 transition-colors"
            style={{ width: `${duration * pixelsPerSecond}px`}}
            onClick={handleClick}
            title="Clicca per spostare la testina temporale"
        >
            {ticks.map(({ time, isMajor }) => (
                <div
                    key={time}
                    className="absolute bottom-0 text-slate-400 pointer-events-none"
                    style={{ left: `${time * pixelsPerSecond}px` }}
                >
                    <div
                        className={`absolute bottom-0 w-px ${isMajor ? 'h-3.5 bg-slate-400' : 'h-2 bg-slate-700'}`}
                    />
                    {isMajor && (
                        <span className="absolute -top-6 -translate-x-1/2 text-[10px] font-mono tracking-tight text-slate-400 font-medium">
                            {formatTime(time)}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
};

export default TimelineRuler;
