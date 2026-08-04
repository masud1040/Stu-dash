import React, { useEffect, useState } from 'react';

interface AnimatedCounterProps {
  value: number | string;
  duration?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 1000,
  decimals = 0,
  suffix = '',
  prefix = ''
}) => {
  const numericVal = typeof value === 'number' ? value : parseFloat(value) || 0;
  const [displayVal, setDisplayVal] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;

    const startVal = displayVal;
    const endVal = numericVal;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * easeProgress;

      setDisplayVal(current);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setDisplayVal(endVal);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [numericVal]);

  const formatted = decimals > 0 ? displayVal.toFixed(decimals) : Math.round(displayVal).toString();

  return (
    <span>
      {prefix}{formatted}{suffix}
    </span>
  );
};

export default AnimatedCounter;
