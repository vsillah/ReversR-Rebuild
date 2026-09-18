import React, { useEffect, useRef, useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography } from '../constants/theme';
import { CadAction, CadDetails, CadNotice } from './CadReviewUI';
import { useAppTheme } from '../hooks/useAppTheme';
import { mapCadImportError, prepareCadFileMetadata, type CadUploadSessionAdapter } from '../utils/cadUserImportBridge';
import { getApiBase } from '../utils/apiBase';
import { getCadCapabilitiesRequest, type CadInternalTesterFixture, type CadInternalTesterPreview } from '../utils/cadInternalTesterPreview';
import { prepareLocalIgesPreview, supportsLocalIgesPreview } from '../utils/cadLocalIgesPreview';

export default function CadImportPanel({ internalPreview, onReviewQualifiedResult, onLocalPreviewResult, onOpenInternalPreview, uploadSessionAdapter }: {
  internalPreview?: CadInternalTesterPreview;
  onReviewQualifiedResult?: () => void;
  onLocalPreviewResult?: (fixture: CadInternalTesterFixture) => void;
  onOpenInternalPreview?: () => void;
  uploadSessionAdapter?: CadUploadSessionAdapter;
}) {
  const { colors } = useAppTheme();
  const picker = useRef<HTMLInputElement | null>(null);
  const [selected, setSelected] = useState<{ format: string; bytes: number } | null>(null);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('Status has not been checked.');
  const [checking, setChecking] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [renderingLocal, setRenderingLocal] = useState(false);
  const [localPreview, setLocalPreview] = useState<CadInternalTesterFixture | null>(null);
  const [sessionMessage, setSessionMessage] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const sessionController = useRef<AbortController | null>(null);
  const supported = Platform.OS === 'web' && typeof document !== 'undefined' && typeof File !== 'undefined';
  useEffect(() => () => { controller.current?.abort(); sessionController.current?.abort(); }, []);
  const connectSession = async () => {
    if (!uploadSessionAdapter || sessionController.current) return;
    const request = new AbortController();
    sessionController.current = request;
    setConnecting(true);
    setSessionMessage('');
    const result = await uploadSessionAdapter.connect({ signal: request.signal });
    if (!request.signal.aborted) {
      setSessionReady(result.ok);
      setSessionMessage(result.message);
    }
    if (sessionController.current === request) {
      sessionController.current = null;
      if (!request.signal.aborted) setConnecting(false);
    }
  };
  const checkStatus = async () => {
    if (controller.current) return;
    const request = new AbortController();
    controller.current = request;
    setChecking(true);
    const timer = setTimeout(() => request.abort(), 8000);
    try {
      const capabilityRequest = getCadCapabilitiesRequest(Boolean(fixture), getApiBase());
      const response = await fetch(capabilityRequest.url, { signal: request.signal, credentials: capabilityRequest.credentials, cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) {
        setStatus(mapCadImportError(data).message);
        return;
      }
      setStatus(data?.enabled === true
        ? 'The protected conversion service is available. User uploads still require an approved access route.'
        : 'The conversion service is unavailable. You can check again later.');
    } catch {
      setStatus('Could not check service status. Check your connection and try again.');
    } finally {
      clearTimeout(timer);
      controller.current = null;
      setChecking(false);
    }
  };
  const text = { ...Typography.caption, color: colors.mutedText, lineHeight: 20 };
  const button = { padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border };
  const fixture = internalPreview?.enabled ? internalPreview.fixture : null;
  const isDispenserReview = fixture?.previewGeometry.kind === 'stl';
  const localPreviewEnabled = Boolean(fixture && onLocalPreviewResult && supportsLocalIgesPreview());
  const handleFile = async (file: File) => {
    if (localPreviewEnabled && onLocalPreviewResult) {
      setRenderingLocal(true);
      setMessage(`Preparing ${file.name} locally. File contents are not uploaded.`);
      try {
        const result = await prepareLocalIgesPreview(file);
        setSelected({ format: result.format, bytes: result.bytes });
        setLocalPreview(result);
        setMessage(`${result.sourceFileName} rendered locally for internal preview. No production upload route was used.`);
        onLocalPreviewResult(result);
      } catch (error) {
        setLocalPreview(null);
        setSelected(null);
        setMessage(error instanceof Error ? error.message : 'Could not render this IGES file locally.');
      } finally {
        setRenderingLocal(false);
      }
      return;
    }
    const prepared = prepareCadFileMetadata(file);
    setSelected(prepared.metadata);
    setMessage(prepared.message);
  };
  return (
    <View testID="cad-import-panel" style={{ gap: 14 }}>
      {supported && <input ref={picker} type="file" accept=".igs,.iges" aria-label="Choose IGES file" data-testid="cad-file-input" style={{ display: 'none' }} onChange={event => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = '';
        if (!file) return;
        void handleFile(file);
      }} />}
      {!fixture && <Text style={[Typography.heading, { color: colors.text }]}>Import CAD</Text>}
      <Text style={text}>{fixture
        ? 'Review the preloaded public sample or choose a local .igs/.iges file to render in this internal preview. File contents stay on this device.'
        : 'Choose a public or synthetic .igs or .iges file for a local compatibility check. File contents stay on your device.'}</Text>
      {fixture ? (
        <View testID="cad-public-fixture-ready" style={{ gap: Spacing.md }}>
          {supported && localPreviewEnabled ? (
            <View testID="cad-local-iges-preview" style={{ gap: Spacing.sm }}>
              <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' }}>
                <Ionicons name="desktop-outline" size={20} color={colors.primary} accessible={false} />
                <View style={{ flex: 1, gap: Spacing.xs }}>
                  <Text style={[Typography.bodyStrong, { color: colors.text }]}>Internal local render</Text>
                  <Text style={text}>Choose Mark's IGES file from this device. ReversR reads it in the browser for preview; it does not use production upload admission.</Text>
                </View>
              </View>
              <CadAction
                testID="cad-choose-local-iges"
                accessibilityLabel="Choose local IGES file to render"
                primary
                disabled={renderingLocal}
                icon="document-attach-outline"
                label={renderingLocal ? 'Rendering local IGES...' : localPreview ? 'Choose another IGES file' : 'Choose IGES file'}
                onPress={() => {
                  try { picker.current?.click(); } catch { setMessage('This browser could not open the file picker. Try a supported desktop browser.'); }
                }}
              />
              {localPreview && <View testID="cad-local-preview-ready" style={{ gap: Spacing.xs }}>
                <Text style={[Typography.bodyStrong, { color: colors.text }]}>{localPreview.sourceFileName}</Text>
                <Text style={text}>{localPreview.meshes} mesh{localPreview.meshes === 1 ? '' : 'es'} · {localPreview.vertices.toLocaleString()} vertices · {localPreview.triangles.toLocaleString()} triangles</Text>
                <CadAction testID="cad-review-local-preview" accessibilityLabel={`Review local render of ${localPreview.sourceFileName}`} label="Review local render" onPress={() => onLocalPreviewResult?.(localPreview)} />
              </View>}
            </View>
          ) : (
            <Text testID="cad-local-preview-unavailable" style={text}>Local browser rendering is unavailable on this surface. Use the preloaded public sample or open this preview in a supported desktop browser.</Text>
          )}
          <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' }}>
            <Ionicons name="document-text-outline" size={24} color={colors.primary} accessible={false} />
            <View style={{ flex: 1, gap: Spacing.xs }}>
              <Text style={[Typography.bodyStrong, { color: colors.text }]}>{fixture.sourceFileName}</Text>
              <Text style={text}>{fixture.format} · {fixture.bytes.toLocaleString()} bytes</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
            {[
              isDispenserReview ? 'Public reviewer fixture' : 'Internal test fixture',
              'Authorized source',
              'No upload required',
            ].map(label => (
              <View key={label} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: Spacing.sm, paddingVertical: 6, backgroundColor: colors.elevated }}>
                <Text style={[Typography.caption, { color: colors.mutedText }]}>{label}</Text>
              </View>
            ))}
          </View>
          <Text testID="cad-public-fixture-guidance" style={text}>Use the next screens to review generated inventory, inspect the 3D orientation controls, and compare against the reference views.</Text>
          <CadAction testID="cad-review-qualified-result" accessibilityLabel={`Review qualified ${fixture.fixtureName} result`} label="Review public sample" onPress={onReviewQualifiedResult} />
        </View>
      ) : onOpenInternalPreview ? (
        <View testID="cad-native-internal-preview-entry" style={{ gap: Spacing.md }}>
          <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: Spacing.md, gap: Spacing.md, backgroundColor: colors.elevated }}>
            <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' }}>
              <Ionicons name="cube-outline" size={22} color={colors.primary} accessible={false} />
              <View style={{ flex: 1, gap: Spacing.xs }}>
                <Text style={[Typography.bodyStrong, { color: colors.text }]}>Internal IGS preview</Text>
                <Text style={text}>Open the internal renderer to choose a public or authorized internal .igs/.iges file in the installed app. Production upload admission stays locked.</Text>
              </View>
            </View>
            <CadAction
              testID="cad-open-native-internal-preview"
              accessibilityLabel="Open internal IGS upload-render preview"
              primary
              icon="arrow-forward-circle-outline"
              label="Open internal IGS preview"
              onPress={onOpenInternalPreview}
            />
          </View>
          <Text style={text}>This is test-only preview handling for internal reviewers. It does not activate production upload, conversion, or Sandbox dispatch.</Text>
        </View>
      ) : supported ? (
        <>
          <CadAction testID="cad-choose-file" accessibilityLabel="Choose IGES file from this device" primary icon="document-attach-outline" label={selected ? 'Choose another IGES file' : 'Choose IGES file'} onPress={() => {
            try { picker.current?.click(); } catch { setMessage('This browser could not open the file picker. Try a supported desktop browser.'); }
          }} />
        </>
      ) : <Text testID="cad-picker-unavailable" style={text}>File selection is unavailable on this surface. Open ReversR in a web browser with file-picker support to select an IGES file. Native selection is pending.</Text>}
      {selected && <View testID="cad-selected-metadata" style={{ gap: 10 }}>
        <Text style={text}>{selected.format} · {selected.bytes.toLocaleString()} bytes · Prepared locally</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear selected CAD file" style={button} onPress={() => { setSelected(null); setMessage('Selection cleared.'); }}><Text style={text}>Clear selection</Text></TouchableOpacity>
      </View>}
      {!!message && <Text accessibilityLiveRegion="polite" style={text}>{message}</Text>}
      {!fixture && !onOpenInternalPreview && <>
        <View testID="cad-operator-gate" style={{ gap: Spacing.sm, borderTopWidth: 1, borderColor: colors.border, paddingTop: Spacing.md }}>
          <CadNotice icon="lock-closed-outline">Live upload locked</CadNotice>
          <Text testID="cad-session-state" accessibilityLiveRegion="polite" style={text}>{sessionReady
            ? 'Development session connected. Upload admission remains disabled.'
            : 'No upload session connected. Upload admission remains disabled.'}</Text>
          {uploadSessionAdapter && !sessionReady && <CadAction
            testID="cad-connect-session"
            accessibilityLabel="Connect development upload session"
            icon="key-outline"
            label={connecting ? 'Connecting session…' : 'Connect development session'}
            disabled={connecting}
            onPress={connectSession}
          />}
          {!!sessionMessage && <Text testID="cad-session-message" accessibilityLiveRegion="polite" style={text}>{sessionMessage}</Text>}
          <Text testID="cad-upload-locked-status" style={text}>This local check does not upload files. Live upload stays unavailable until an approved session and admission route are both enabled.</Text>
        </View>
        <CadDetails title="Import access & service status" testID="cad-import-details">
          <Text testID="cad-development-session-unavailable" style={text}>{mapCadImportError({ schemaVersion: 1, status: 'error', code: 'USER_AUTH_UNAVAILABLE' }).message} No browser sign-in route is available yet. Clear or replace your selection to continue locally.</Text>
          <Text style={text}>CAD conversion is restricted to approved operator runs. Selecting a file does not authorize an upload. You can use Scan, Describe, or Sample while user import access is being prepared.</Text>
          <Text accessibilityLiveRegion="polite" style={text}>{status}</Text>
          <CadAction testID="cad-check-status" disabled={checking} accessibilityLabel="Check CAD service status" icon="refresh-outline" label={checking ? 'Checking status…' : 'Check service status'} onPress={checkStatus} />
          <Text style={text}>Future mesh previews will need separate review. Import readiness does not certify dimensions, manufacturing suitability, model fidelity, rendering, or STL export.</Text>
        </CadDetails>
      </>}
    </View>
  );
}
