export type InputMode = 'import' | 'scan' | 'type' | 'lucky';
export const INPUT_MODES = [
  { mode: 'import', label: 'Import', icon: 'document-outline', hint: 'IGES file', accessibilityLabel: 'Use CAD import mode' },
  { mode: 'scan', label: 'Scan', icon: 'camera-outline', hint: 'Use camera', accessibilityLabel: 'Use camera scan mode' },
  { mode: 'type', label: 'Describe', icon: 'create-outline', hint: 'Type details', accessibilityLabel: 'Use text description mode' },
  { mode: 'lucky', label: 'Sample', icon: 'dice-outline', hint: 'Try a demo', accessibilityLabel: 'Use sample machine mode' },
] as const;
