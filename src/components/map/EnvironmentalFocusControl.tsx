import React from 'react';

interface EnvironmentalFocusControlProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const EnvironmentalFocusControl: React.FC<EnvironmentalFocusControlProps> = ({
  isOpen,
  onToggle
}) => {
  return (
    <button
      onClick={onToggle}
      style={{
        backgroundColor: isOpen ? 'rgba(56, 189, 248, 0.25)' : 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: isOpen
          ? '1px solid rgba(56, 189, 248, 0.6)'
          : '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '12px',
        padding: '10px 14px',
        color: isOpen ? '#38BDF8' : '#F8FAFC',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.2s ease-in-out'
      }}
      title="Toggle Time-Aware Environmental Intelligence Panel"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
        <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
        <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
      </svg>
      <span>Weather & Wind</span>
    </button>
  );
};
