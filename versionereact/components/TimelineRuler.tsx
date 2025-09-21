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
    const ticks = [];
    
    // Adjust tick density based on zoom
    let majorTickInterval = 5; // seconds
    if (pixelsPerSecond < 40) majorTickInterval = 10;
    if (pixelsPerSecond > 100) majorTickInterval = 2;
    
    const minorTicksPerMajor = pixelsPerSecond > 60 ? 5 : 2;

    for (let time = 0; time <= duration; time++) {
        const isMajor = time % majorTickInterval === 0;
        const isMinor = time % (majorTickInterval / minorTicksPerMajor) === 0;

        if (isMajor) {
            ticks.push({ time, type: 'major' });
        } else if (isMinor && pixelsPerSecond > 30) { // Don't draw minor ticks when zoomed out too far
            ticks.push({ time, type: 'minor' });
        }
    }

    return (
        <div className="relative h-6 w-full" style={{ width: `${duration * pixelsPerSecond}px`}}>
            {ticks.map(({time, type}) => (
                <div 
                    key={time}
                    className="absolute bottom-0 text-gray-400"
                    style={{ left: `${time * pixelsPerSecond}px` }}
                >
                    <div 
                        className={`absolute bottom-0 w-px ${type === 'major' ? 'h-4 bg-gray-400' : 'h-2 bg-gray-600'}`}
                    />
                    {type === 'major' && (
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