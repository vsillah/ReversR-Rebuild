import { Platform, useWindowDimensions } from 'react-native';
import { isCadNativeEmbeddedPreview } from '../utils/cadInternalTesterPreview';

/** Shared presentation breakpoint. Layout never grants preview or upload capabilities. */
export function useDesktopWorkspace() {
  const { width, height } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 1024
    && !(typeof window !== 'undefined' && isCadNativeEmbeddedPreview(window.location));
  return { desktop, width, height };
}
