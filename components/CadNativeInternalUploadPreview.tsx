import React, { useMemo, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Radii, Spacing, Typography } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import {
  getCadNativeInternalUploadRenderConfig,
  isAllowedCadNativeInternalUploadRenderUrl,
} from '../utils/cadNativeInternalUploadPreview';

function getNativePreviewUrl(value?: string) {
  if (!value) return '';
  try {
    const parsed = new URL(value);
    parsed.searchParams.set('nativePreviewCacheBust', String(Date.now()));
    return parsed.toString();
  } catch {
    return value;
  }
}

export default function CadNativeInternalUploadPreview({ visible, onClose }: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const config = useMemo(() => getCadNativeInternalUploadRenderConfig(), []);
  const configUrl = config.enabled ? config.url : undefined;
  const previewUrl = useMemo(() => getNativePreviewUrl(configUrl), [configUrl]);
  const [loadError, setLoadError] = useState('');
  const canRender = Platform.OS !== 'web' && config.enabled && !loadError;
  const unavailableMessage = loadError || (config.enabled
    ? 'The internal preview is configured but cannot be shown in this session.'
    : config.message);
  const bodyText = { ...Typography.caption, color: colors.mutedText, lineHeight: 19 };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View testID="cad-native-upload-render-modal" style={[styles.shell, { backgroundColor: colors.background }]}>
        <View style={[styles.header, {
          borderBottomColor: colors.border,
          minHeight: 72 + insets.top,
          paddingTop: Math.max(insets.top + Spacing.sm, Spacing.lg),
        }]}>
          <View style={styles.headerCopy}>
            <Text style={[Typography.bodyStrong, { color: colors.text }]}>Internal CAD preview</Text>
            <Text style={bodyText}>Choose an authorized CAD file.</Text>
          </View>
          <TouchableOpacity
            testID="cad-native-upload-render-close"
            accessibilityRole="button"
            accessibilityLabel="Close internal CAD preview"
            onPress={onClose}
            hitSlop={8}
            style={[styles.closeButton, { borderColor: colors.border, backgroundColor: colors.elevated }]}
          >
            <Ionicons name="close" size={20} color={colors.text} accessible={false} />
          </TouchableOpacity>
        </View>

        <View style={[styles.boundaryPill, { borderColor: colors.border, backgroundColor: colors.elevated }]}>
          <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} accessible={false} />
          <Text numberOfLines={1} style={[Typography.caption, styles.boundaryText, { color: colors.mutedText }]}>
            Preview mode · upload and conversion locked
          </Text>
        </View>

        <View style={[styles.viewerFrame, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          {canRender ? (
            <WebView
              testID="cad-native-upload-render-webview"
              source={{ uri: previewUrl }}
              javaScriptEnabled
              domStorageEnabled
              allowFileAccess
              cacheEnabled={false}
              cacheMode="LOAD_NO_CACHE"
              setSupportMultipleWindows={false}
              allowsBackForwardNavigationGestures
              mixedContentMode="never"
              originWhitelist={['https://*', 'http://localhost:*', 'http://127.0.0.1:*']}
              startInLoadingState
              onError={() => setLoadError('The internal preview failed to load.')}
              onShouldStartLoadWithRequest={(request: { url?: string }) => {
                const requestUrl = request.url || '';
                if (requestUrl === 'about:blank' || requestUrl.startsWith('blob:')) return true;
                return isAllowedCadNativeInternalUploadRenderUrl(requestUrl);
              }}
            />
          ) : (
            <View testID="cad-native-upload-render-unavailable" style={styles.unavailable}>
              <Ionicons name="lock-closed-outline" size={24} color={colors.mutedText} accessible={false} />
              <Text style={[Typography.bodyStrong, { color: colors.text, textAlign: 'center' }]}>Internal preview unavailable</Text>
              <Text style={[bodyText, { textAlign: 'center' }]}>
                {unavailableMessage}
              </Text>
              <Text style={[bodyText, { textAlign: 'center' }]}>
                Note the install link, app version and whether the renderer opened before changing any upload or conversion gate.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  header: {
    minHeight: 72,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boundaryPill: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    borderRadius: Radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '88%',
  },
  boundaryText: {
    flexShrink: 1,
  },
  viewerFrame: {
    flex: 1,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  unavailable: {
    flex: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
});
