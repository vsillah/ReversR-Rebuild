import { useDesktopWorkspace } from './useDesktopWorkspace';
import { getCadInternalTesterPreview } from '../utils/cadInternalTesterPreview';

/** Presentation only: reuse the existing host/route gate without granting capabilities. */
export function useCadDesktopWorkspace() {
  const { desktop: desktopWeb, height } = useDesktopWorkspace();
  const desktop = desktopWeb
    && getCadInternalTesterPreview().enabled
    && typeof window !== 'undefined' && window.location.pathname === '/';
  // Reserve the complete desktop chrome, title row, gaps, and a bottom safety
  // margin. The viewer must fit the work area without relying on page scroll,
  // especially in reduced-height laptop windows.
  return { desktop, viewerHeight: Math.max(300, Math.min(720, height - 344)) };
}
