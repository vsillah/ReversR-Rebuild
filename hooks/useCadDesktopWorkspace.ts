import { useDesktopWorkspace } from './useDesktopWorkspace';
import { getCadInternalTesterPreview } from '../utils/cadInternalTesterPreview';

/** Presentation only: reuse the existing host/route gate without granting capabilities. */
export function useCadDesktopWorkspace() {
  const { desktop: desktopWeb, height } = useDesktopWorkspace();
  const desktop = desktopWeb
    && getCadInternalTesterPreview().enabled
    && typeof window !== 'undefined' && window.location.pathname === '/';
  return { desktop, viewerHeight: Math.max(320, height - 296) };
}
