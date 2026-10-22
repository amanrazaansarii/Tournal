import React from 'react';

interface TournalLogoProps {
  size?: number;
  className?: string;
}

export const TournalLogo: React.FC<TournalLogoProps> = ({ size = 40, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Tournal geometric emblem"
    >
      {/* Outer architectural frame */}
      <rect
        x="2"
        y="2"
        width="44"
        height="44"
        rx="10"
        fill="#141413"
      />
      {/* Subtle inner grid hairline */}
      <rect
        x="5"
        y="5"
        width="38"
        height="38"
        rx="7"
        stroke="#2E2D2A"
        strokeWidth="1"
      />
      {/* Acoustic Voice Waveform Bars (Left side — representing voice dictation) */}
      <line
        x1="13"
        y1="19"
        x2="13"
        y2="29"
        stroke="#C85A32"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1="18.5"
        y1="14"
        x2="18.5"
        y2="34"
        stroke="#FAF9F5"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Precision Checkmark + Fountain Nib Axis (Right side — tasks & journal) */}
      <path
        d="M24 25.5L28.5 30L36.5 17"
        stroke="#FAF9F5"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="36.5" cy="17" r="2" fill="#C85A32" />
    </svg>
  );
};
