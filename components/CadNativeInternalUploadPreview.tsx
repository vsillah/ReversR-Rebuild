import React, { useMemo, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radii, Spacing, Typography } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import {
  getCadNativeInternalUploadRenderConfig,
  isAllowedCadNativeInternalUploadRenderUrl,
} from '../utils/cadNativeInternalUploadPreview';

type NativeWebViewModule = {
  WebView: React.ComponentType<Record<string, unknown>>;
};

function loadNativeWebView() {
  if (Platform.OS === 'web') return null;
  try {
    return (require('react-native-webview') as NativeWebViewModule).WebView;
  } catch {
    return null;
  }
}

export default function CadNativeInternalUploadPreview({ visible, onClose }: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors } = useAppTheme();
  const config = useMemo(() => getCadNativeInternalUploadRenderConfig(), []);
  const WebView = useMemo(() => loadNativeWebView(), []);
  const [loadError, setLoadError] = useState('');
  const canRender = Platform.OS !== 'web' && WebView && config.enabled && !loadError;
  const unavailableMessage = loadError || (WebView
    ? config.enabled ? 'The internal preview is configured but cannot be shown in this session.' : config.message
    : 'This app build does not include the native preview renderer.');
  const bodyText = { ...Typography.caption, color: colors.mutedText, lineHeight: 19 };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View testID="cad-native-upload-render-modal" style={[styles.shell, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerCopy}>
            <Text style={[Typography.bodyStrong, { color: colors.text }]}>Internal IGS preview</Text>
            <Text style={bodyText}>Choose a public or authorized internal .igs/.iges file. Production upload remains locked.</Text>
          </View>
          <TouchableOpacity
            testID="cad-native-upload-render-close"
            accessibilityRole="button"
            accessibilityLabel="Close internal IGS preview"
            onPress={onClose}
            hitSlop={8}
            style={[styles.closeButton, { borderColor: colors.border, backgroundColor: colors.elevated }]}
          >
            <Ionicons name="close" size={20} color={colors.text} accessible={false} />
          </TouchableOpacity>
        </View>

        <View style={[styles.boundaryCard, { borderColor: colors.border, backgroundColor: colors.elevated }]}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} accessible={false} />
          <Text style={[bodyText, styles.boundaryText]}>
            Test-only installed-app preview. The selected file is handled by the internal renderer surface; this does not unlock production upload admission, conversion, or Sandbox dispatch.
          </Text>
        </View>

        <View style={[styles.viewerFrame, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          {canRender ? (
            <WebView
              testID="cad-native-upload-render-webview"
              source={{ uri: config.url }}
              javaScriptEnabled
              domStorageEnabled
              allowFileAccess
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
    minHeight: 88,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
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
  boundaryCard: {
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  boundaryText: {
    flex: 1,
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
