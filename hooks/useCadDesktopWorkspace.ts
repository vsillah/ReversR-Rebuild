import { Platform, useWindowDimensions } from 'react-native';
import { getCadInternalTesterPreview, isCadNativeEmbeddedPreview } from '../utils/cadInternalTesterPreview';

/** Presentation only: reuse the existing host/route gate without granting capabilities. */
export function useCadDesktopWorkspace() {
  const { width, height } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 1024
    && getCadInternalTesterPreview().enabled
    && typeof window !== 'undefined' && window.location.pathname === '/'
    && !isCadNativeEmbeddedPreview(window.location);
  return { desktop, viewerHeight: Math.max(320, height - 296) };
}
