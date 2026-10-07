import React from 'react';

export default function Skeleton({ width = '100%', height = '20px', borderRadius = 'var(--radius-md)', style }) {
  return (
    <div
      className="skeleton-loader"
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, var(--bg-card) 25%, var(--bg-card-hover) 50%, var(--bg-card) 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-loading 1.5s infinite',
        ...style
      }}
    />
  );
}
