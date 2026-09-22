import React from 'react';

interface TulipIconProps {
  className?: string;
  size?: number;
}

export default function TulipIcon({ className = '', size = 28 }: TulipIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id="tulipGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F7E6BD" />
          <stop offset="45%" stopColor="#D9B571" />
          <stop offset="100%" stopColor="#A8823B" />
        </linearGradient>
      </defs>
      {/* Central Tulip Petal */}
      <path
        d="M 50 14 C 42 26, 41 42, 50 54 C 59 42, 58 26, 50 14 Z"
        fill="url(#tulipGoldGradient)"
      />
      {/* Left Outer Petal */}
      <path
        d="M 46 18 C 30 24, 26 42, 45 54 C 37 44, 38 29, 46 18 Z"
        fill="url(#tulipGoldGradient)"
      />
      {/* Right Outer Petal */}
      <path
        d="M 54 18 C 70 24, 74 42, 55 54 C 63 44, 62 29, 54 18 Z"
        fill="url(#tulipGoldGradient)"
      />
      {/* Stem */}
      <path
        d="M 48.5 56 L 51.5 56 L 51.5 92 C 51.5 93 48.5 93 48.5 92 Z"
        fill="url(#tulipGoldGradient)"
      />
      {/* Left Curved Leaf */}
      <path
        d="M 47.5 90 C 26 84, 22 61, 28 46 C 25 63, 33 79, 47.5 85 Z"
        fill="url(#tulipGoldGradient)"
      />
      {/* Right Curved Leaf */}
      <path
        d="M 52.5 90 C 74 84, 78 61, 72 46 C 75 63, 67 79, 52.5 85 Z"
        fill="url(#tulipGoldGradient)"
      />
    </svg>
  );
}
