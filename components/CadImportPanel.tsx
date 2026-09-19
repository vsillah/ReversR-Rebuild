import React, { useEffect, useRef, useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radii, Spacing, Typography } from '../constants/theme';
import { CadAction, CadDetails, CadNotice } from './CadReviewUI';
import { useAppTheme } from '../hooks/useAppTheme';
import { mapCadImportError, prepareCadFileMetadata, type CadUploadSessionAdapter } from '../utils/cadUserImportBridge';
import { getApiBase } from '../utils/apiBase';
import { getCadCapabilitiesRequest, type CadInternalTesterFixture, type CadInternalTesterPreview } from '../utils/cadInternalTesterPreview';
import { prepareLocalIgesPreview, supportsLocalIgesPreview } from '../utils/cadLocalIgesPreview';

type FixtureSourceMode = 'local' | 'sample' | null;

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
  const [fixtureSourceMode, setFixtureSourceMode] = useState<FixtureSourceMode>(null);
  const [pendingLocalFileName, setPendingLocalFileName] = useState('');
  const [sessionMessage, setSessionMessage] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const sessionController = useRef<AbortController | null>(null);
  const pendingLocalFile = useRef<File | null>(null);
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
  const clearLocalSelection = () => {
    pendingLocalFile.current = null;
    setPendingLocalFileName('');
    setSelected(null);
    setLocalPreview(null);
  };
  const chooseLocalFile = () => {
    try {
      picker.current?.click();
    } catch {
      setMessage('This browser could not open the file picker. Try a supported desktop browser.');
    }
  };
  const renderPendingLocalFile = async () => {
    const file = pendingLocalFile.current;
    if (!file || !localPreviewEnabled || !onLocalPreviewResult) {
      setMessage('Choose an IGES file before rendering a local preview.');
      return;
    }
    setRenderingLocal(true);
    setMessage(`Rendering ${file.name} locally. File contents are not uploaded.`);
    try {
      const result = await prepareLocalIgesPreview(file);
      pendingLocalFile.current = null;
      setPendingLocalFileName('');
      setSelected({ format: result.format, bytes: result.bytes });
      setLocalPreview(result);
      setMessage(`${result.sourceFileName} rendered locally for internal preview. No production upload route was used.`);
      onLocalPreviewResult(result);
    } catch (error) {
      setLocalPreview(null);
      setMessage(error instanceof Error ? error.message : 'Could not render this IGES file locally.');
    } finally {
      setRenderingLocal(false);
    }
  };
  const handleFile = async (file: File) => {
    if (localPreviewEnabled && onLocalPreviewResult) {
      const prepared = prepareCadFileMetadata(file);
      if (!prepared.metadata) {
        clearLocalSelection();
        setFixtureSourceMode('local');
        setMessage(prepared.message);
        return;
      }
      pendingLocalFile.current = file;
      setFixtureSourceMode('local');
      setPendingLocalFileName(file.name);
      setSelected(prepared.metadata);
      setLocalPreview(null);
      setMessage(`${file.name} selected. Render it locally when you are ready; no upload route has been used.`);
      return;
    }
    const prepared = prepareCadFileMetadata(file);
    setSelected(prepared.metadata);
    setMessage(prepared.message);
  };
  const selectSample = () => {
    if (!fixture) return;
    setFixtureSourceMode('sample');
    clearLocalSelection();
    setMessage(`${fixture.sourceFileName} selected as the public sample. Generate the sample preview when you are ready.`);
  };
  return (
    <View testID="cad-import-panel" style={{ gap: 14 }}>
      {supported && <input ref={picker} type="file" accept=".igs,.iges,*/*" aria-label="Choose IGES file" data-testid="cad-file-input" style={{ display: 'none' }} onChange={event => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = '';
        if (!file) return;
        void handleFile(file);
      }} />}
      {!fixture && <Text style={[Typography.heading, { color: colors.text }]}>Import CAD</Text>}
      <Text style={text}>{fixture
        ? 'Choose one source for this internal preview. You can render a local .igs/.iges file from this device or use the public sample.'
        : 'Choose a public or synthetic .igs or .iges file for a local compatibility check. File contents stay on your device.'}</Text>
      {fixture ? (
        <View testID="cad-public-fixture-ready" style={{ gap: Spacing.md }}>
          <View testID="cad-source-choice-panel" style={{ gap: Spacing.sm }}>
            <Text style={[Typography.bodyStrong, { color: colors.text }]}>Source</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
              {supported && localPreviewEnabled ? (
                <View style={{ flexGrow: 1, flexBasis: 220 }}>
                  <CadAction
                    testID="cad-choose-local-iges"
                    accessibilityLabel="Choose local IGES file from this device"
                    primary={fixtureSourceMode === 'local' || !fixtureSourceMode}
                    disabled={renderingLocal}
                    icon="document-attach-outline"
                    label={pendingLocalFileName || localPreview ? 'Choose different file' : 'Choose IGES file'}
                    onPress={chooseLocalFile}
                  />
                </View>
              ) : (
                <Text testID="cad-local-preview-unavailable" style={text}>Local browser rendering is unavailable on this surface. Open this preview in the installed app or a supported desktop browser.</Text>
              )}
              <View style={{ flexGrow: 1, flexBasis: 220 }}>
                <CadAction
                  testID="cad-select-public-sample"
                  accessibilityLabel={`Use public sample ${fixture.sourceFileName}`}
                  primary={fixtureSourceMode === 'sample'}
                  icon="cube-outline"
                  label="Use public sample"
                  onPress={selectSample}
                />
              </View>
            </View>
          </View>

          {fixtureSourceMode === 'local' && selected && (
            <View testID="cad-local-file-ready" style={{ gap: Spacing.sm, borderTopWidth: 1, borderColor: colors.border, paddingTop: Spacing.md }}>
              <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' }}>
                <Ionicons name="document-text-outline" size={22} color={colors.primary} accessible={false} />
                <View style={{ flex: 1, gap: Spacing.xs }}>
                  <Text style={[Typography.bodyStrong, { color: colors.text }]}>{pendingLocalFileName || localPreview?.sourceFileName || 'Local IGES file'}</Text>
                  <Text style={text}>{selected.format} · {selected.bytes.toLocaleString()} bytes · Local preview only</Text>
                </View>
              </View>
              {!localPreview && (
                <CadAction
                  testID="cad-render-local-preview"
                  accessibilityLabel="Render selected IGES file locally"
                  primary
                  disabled={renderingLocal}
                  icon="play-circle-outline"
                  label={renderingLocal ? 'Rendering local preview...' : 'Render selected IGES'}
                  onPress={() => { void renderPendingLocalFile(); }}
                />
              )}
              {localPreview && (
                <View testID="cad-local-preview-ready" style={{ gap: Spacing.xs }}>
                  <Text style={text}>{localPreview.meshes} mesh{localPreview.meshes === 1 ? '' : 'es'} · {localPreview.vertices.toLocaleString()} vertices · {localPreview.triangles.toLocaleString()} triangles</Text>
                  <CadAction testID="cad-review-local-preview" accessibilityLabel={`Review local render of ${localPreview.sourceFileName}`} label="Review local render" onPress={() => onLocalPreviewResult?.(localPreview)} />
                </View>
              )}
            </View>
          )}

          {fixtureSourceMode === 'sample' && (
            <View testID="cad-sample-file-ready" style={{ gap: Spacing.md, borderTopWidth: 1, borderColor: colors.border, paddingTop: Spacing.md }}>
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
              <Text testID="cad-public-fixture-guidance" style={text}>Generate the public sample preview when you want to inspect inventory, orientation controls, and reference views.</Text>
              <CadAction testID="cad-review-qualified-result" accessibilityLabel={`Generate public sample preview for ${fixture.fixtureName}`} primary label="Generate sample preview" icon="play-circle-outline" onPress={onReviewQualifiedResult} />
            </View>
          )}
        </View>
      ) : onOpenInternalPreview ? (
        <View testID="cad-native-internal-preview-entry" style={{ gap: Spacing.md }}>
          <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: Spacing.md, gap: Spacing.md, backgroundColor: colors.elevated }}>
            <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' }}>
              <Ionicons name="cube-outline" size={22} color={colors.primary} accessible={false} />
              <View style={{ flex: 1, gap: Spacing.xs }}>
                <Text style={[Typography.bodyStrong, { color: colors.text }]}>Internal IGS preview</Text>
                <Text style={text}>Open the internal renderer to choose an authorized .igs/.iges file in the installed app.</Text>
              </View>
            </View>
            <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: Radii.pill, paddingHorizontal: Spacing.sm, paddingVertical: 6, backgroundColor: colors.surface }}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} accessible={false} />
              <Text style={[Typography.caption, { color: colors.mutedText }]}>Preview mode · upload/conversion locked</Text>
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
        </View>
      ) : supported ? (
        <>
          <CadAction testID="cad-choose-file" accessibilityLabel="Choose IGES file from this device" primary icon="document-attach-outline" label={selected ? 'Choose another IGES file' : 'Choose IGES file'} onPress={chooseLocalFile} />
        </>
      ) : <Text testID="cad-picker-unavailable" style={text}>File selection is unavailable on this surface. Open ReversR in a web browser with file-picker support to select an IGES file. Native selection is pending.</Text>}
      {!fixture && selected && <View testID="cad-selected-metadata" style={{ gap: 10 }}>
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
