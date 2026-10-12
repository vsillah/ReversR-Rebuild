const DESKTOP_INSPECTOR_MIN = 260;
const DESKTOP_INSPECTOR_MAX = 480;
const DESKTOP_INSPECTOR_DEFAULT = 336;
const DESKTOP_INSPECTOR_COLLAPSE_WIDTH = 1200;

const DESKTOP_SHORTCUTS = Object.freeze({
  h: 'home',
  p: 'projects',
  n: 'new',
  t: 'tour',
  s: 'settings',
  c: 'canvas',
  i: 'inspector',
});

function clampDesktopInspectorWidth(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DESKTOP_INSPECTOR_DEFAULT;
  return Math.min(DESKTOP_INSPECTOR_MAX, Math.max(DESKTOP_INSPECTOR_MIN, Math.round(numeric)));
}

function resolveDesktopShortcut(key, prefixActive) {
  const normalized = typeof key === 'string' ? key.toLowerCase() : '';
  if (!prefixActive) return normalized === 'g' ? 'prefix' : null;
  return DESKTOP_SHORTCUTS[normalized] || null;
}

function isDesktopShortcutEditableTarget(target) {
  if (!target || typeof target !== 'object') return false;
  const element = target;
  const tagName = String(element.tagName || '').toLowerCase();
  if (['input', 'textarea', 'select', 'option'].includes(tagName)) return true;
  if (element.isContentEditable) return true;
  const role = typeof element.getAttribute === 'function' ? element.getAttribute('role') : null;
  return role === 'textbox' || role === 'combobox' || role === 'spinbutton' || role === 'slider';
}

function nextDesktopInspectorWidth(current, key) {
  if (key === 'Home') return DESKTOP_INSPECTOR_MIN;
  if (key === 'End') return DESKTOP_INSPECTOR_MAX;
  if (key === '0') return DESKTOP_INSPECTOR_DEFAULT;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return clampDesktopInspectorWidth(current + 16);
  if (key === 'ArrowRight' || key === 'ArrowDown') return clampDesktopInspectorWidth(current - 16);
  return clampDesktopInspectorWidth(current);
}

module.exports = {
  DESKTOP_INSPECTOR_MIN,
  DESKTOP_INSPECTOR_MAX,
  DESKTOP_INSPECTOR_DEFAULT,
  DESKTOP_INSPECTOR_COLLAPSE_WIDTH,
  DESKTOP_SHORTCUTS,
  clampDesktopInspectorWidth,
  resolveDesktopShortcut,
  isDesktopShortcutEditableTarget,
  nextDesktopInspectorWidth,
};
