import React from 'react';
export const Ionicons = ({ name, size, color }: { name: string; size: number; color: string }) => <span aria-hidden="true" style={{ fontSize: size, color }}>{name.startsWith('refresh') ? '↻' : name.startsWith('check') ? '✓' : '↗'}</span>;
