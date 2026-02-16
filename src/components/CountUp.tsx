import React, { useEffect, useState, useRef } from 'react';

interface CountUpProps {
    value: number;
    duration?: number; // in ms
    className?: string;
}

const CountUp: React.FC<CountUpProps> = ({ value, duration = 400, className = '' }) => {
    const [displayValue, setDisplayValue] = useState(value);
    const startValueRef = useRef(value);
    const endValueRef = useRef(value);
    const animationFrameRef = useRef<number>(0);
    const startTimeRef = useRef<number | null>(null);

    useEffect(() => {
        // Initialize start value from the current display value
        startValueRef.current = displayValue;
        endValueRef.current = value;
        startTimeRef.current = null;

        // If no change, no need to animate
        if (startValueRef.current === endValueRef.current) {
            return;
        }

        const step = (timestamp: number) => {
            if (startTimeRef.current === null) {
                startTimeRef.current = timestamp;
            }
            const progress = timestamp - startTimeRef.current;
            const progressRatio = Math.min(progress / duration, 1);

            // Easing function (easeOutExpo for snappiness)
            // or easeOutQuad: t * (2 - t)
            const ease = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
            const easedProgress = ease(progressRatio);

            const nextValue = Math.round(
                startValueRef.current + (endValueRef.current - startValueRef.current) * easedProgress
            );

            setDisplayValue(nextValue);

            if (progress < duration) {
                animationFrameRef.current = requestAnimationFrame(step);
            } else {
                // Ensure we land exactly on target
                setDisplayValue(endValueRef.current);
            }
        };

        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = requestAnimationFrame(step);

        return () => {
            cancelAnimationFrame(animationFrameRef.current);
        };
    }, [value, duration]); // Intentionally omitting displayValue to avoid resetting on every tick

    return (
        <span className={`tabular-nums ${className}`}>
            {displayValue}
        </span>
    );
};

export default CountUp;
