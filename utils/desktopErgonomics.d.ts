export const DESKTOP_INSPECTOR_MIN: number;
export const DESKTOP_INSPECTOR_MAX: number;
export const DESKTOP_INSPECTOR_DEFAULT: number;
export const DESKTOP_INSPECTOR_COLLAPSE_WIDTH: number;
export const DESKTOP_SHORTCUTS: Readonly<Record<string, 'home' | 'projects' | 'new' | 'tour' | 'settings' | 'canvas' | 'inspector'>>;
export function clampDesktopInspectorWidth(value: unknown): number;
export function resolveDesktopShortcut(key: string, prefixActive: boolean): 'prefix' | 'home' | 'projects' | 'new' | 'tour' | 'settings' | 'canvas' | 'inspector' | null;
export function isDesktopShortcutEditableTarget(target: unknown): boolean;
export function nextDesktopInspectorWidth(current: number, key: string): number;
