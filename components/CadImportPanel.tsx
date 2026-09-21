import React, { useEffect, useRef, useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radii, Spacing, Typography } from '../constants/theme';
import { CadAction, CadDetails, CadNotice } from './CadReviewUI';
import { useAppTheme } from '../hooks/useAppTheme';
import { CAD_FILE_ACCEPT, canRenderLocalCadFile, mapCadImportError, prepareCadFileMetadata, type CadUploadSessionAdapter } from '../utils/cadUserImportBridge';
import { getApiBase } from '../utils/apiBase';
import { getCadCapabilitiesRequest, type CadInternalTesterFixture, type CadInternalTesterPreview } from '../utils/cadInternalTesterPreview';
import { prepareLocalCadPreview, supportsLocalCadPreview } from '../utils/cadLocalIgesPreview';

type FixtureSourceMode = 'local' | 'sample' | null;
type IconName = React.ComponentProps<typeof Ionicons>['name'];

const INTERNAL_PREVIEW_DIAGNOSTICS: ReadonlyArray<{
  icon: IconName;
  label: string;
  detail: string;
}> = Object.freeze([
  Object.freeze({
    icon: 'phone-portrait-outline',
    label: 'Device + app',
    detail: 'device model, Android/WebView version, install source',
  }),
  Object.freeze({
    icon: 'document-text-outline',
    label: 'File',
    detail: 'file name, extension, approximate size',
  }),
  Object.freeze({
    icon: 'navigate-circle-outline',
    label: 'Path',
    detail: 'whether Open internal CAD preview or Live upload locked appeared',
  }),
  Object.freeze({
    icon: 'cube-outline',
    label: 'Render',
    detail: 'picker, render action, preview, dimensions, grid and controls',
  }),
]);

export default function CadImportPanel({ internalPreview, onReviewQualifiedResult, onLocalPreviewResult, onOpenInternalPreview, uploadSessionAdapter, desktop = false }: {
  desktop?: boolean;
  internalPreview?: CadInternalTesterPreview;
  onReviewQualifiedResult?: () => void;
  onLocalPreviewResult?: (fixture: CadInternalTesterFixture) => void;
  onOpenInternalPreview?: () => void;
  uploadSessionAdapter?: CadUploadSessionAdapter;
}) {
  const { colors } = useAppTheme();
  const picker = useRef<HTMLInputElement | null>(null);
  const [selected, setSelected] = useState<{ format: string; bytes: number; extension?: string; renderableLocalPreview?: boolean } | null>(null);
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
  const localPreviewEnabled = Boolean(fixture && onLocalPreviewResult && supportsLocalCadPreview());
  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${Math.round(bytes / 1024).toLocaleString()} KB`;
    return `${bytes.toLocaleString()} bytes`;
  };
  const smallActionStyle = {
    minHeight: 34,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  };
  const smallActionText = [Typography.caption, { color: colors.mutedText, fontWeight: '700' as const }];
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
      setMessage('Choose a CAD file before rendering a local preview.');
      return;
    }
    if (!canRenderLocalCadFile(file)) {
      setMessage('Preview supports IGES, STEP, and BREP files right now.');
      return;
    }
    setRenderingLocal(true);
    setMessage(`Rendering ${file.name} locally. File contents are not uploaded.`);
    try {
      const result = await prepareLocalCadPreview(file);
      pendingLocalFile.current = null;
      setPendingLocalFileName('');
      setSelected({ format: result.format, bytes: result.bytes, renderableLocalPreview: true });
      setLocalPreview(result);
      setMessage(`${result.sourceFileName} rendered locally for internal preview. No production upload route was used.`);
      onLocalPreviewResult(result);
    } catch (error) {
      setLocalPreview(null);
      setMessage(error instanceof Error ? error.message : 'Could not render this CAD file locally.');
    } finally {
      setRenderingLocal(false);
    }
  };
  const handleFile = async (file: File) => {
    if (localPreviewEnabled && onLocalPreviewResult) {
      const prepared = prepareCadFileMetadata(file);
      if (!prepared.metadata) {
        clearLocalSelection();
        setFixtureSourceMode(null);
        setMessage(prepared.message);
        return;
      }
      pendingLocalFile.current = file;
      setFixtureSourceMode('local');
      setPendingLocalFileName(file.name);
      setSelected(prepared.metadata);
      setLocalPreview(null);
      setMessage(prepared.metadata.renderableLocalPreview
        ? `${file.name} selected. Preview is available locally.`
        : `${file.name} selected. Preview is pending for ${prepared.metadata.format}.`);
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
    <View testID="cad-import-panel" style={{ gap: 14, maxWidth: desktop ? 840 : undefined, width: '100%', alignSelf: desktop ? 'flex-start' : undefined }}>
      {desktop && <Text accessibilityRole="header" style={[Typography.title, { color: colors.text }]}>CAD source</Text>}
      {supported && <input ref={picker} type="file" accept={CAD_FILE_ACCEPT} aria-label="Choose CAD file" data-testid="cad-file-input" style={{ display: 'none' }} onChange={event => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = '';
        if (!file) return;
        void handleFile(file);
      }} />}
      {!fixture && <Text style={[Typography.heading, { color: colors.text }]}>Import CAD</Text>}
      <Text style={text}>{fixture
        ? 'Choose a CAD file from this device, or use the public sample.'
        : 'Choose a CAD file for a local compatibility check.'}</Text>
      {fixture ? (
        <View testID="cad-public-fixture-ready" style={{ gap: Spacing.md }}>
          <View testID="cad-source-choice-panel" style={{ gap: Spacing.md, borderWidth: desktop ? 0 : 1, borderColor: colors.border, borderRadius: Radii.lg, padding: desktop ? 0 : Spacing.md, backgroundColor: colors.surface }}>
            {!fixtureSourceMode && (
              <View style={{ gap: Spacing.md }}>
                <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft }}>
                    <Ionicons name="document-attach-outline" size={18} color={colors.primary} accessible={false} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[Typography.bodyStrong, { color: colors.text }]}>Pick a CAD source</Text>
                    <Text style={text}>Start with a file or the sample.</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
                  {supported && localPreviewEnabled ? (
                    <View style={{ flexGrow: 1, flexBasis: 220 }}>
                      <CadAction
                        testID="cad-choose-local-iges"
                        accessibilityLabel="Choose CAD file from this device"
                        primary
                        disabled={renderingLocal}
                        icon="document-attach-outline"
                        label="Choose CAD file"
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
                      icon="cube-outline"
                      label="Use public sample"
                      onPress={selectSample}
                    />
                  </View>
                </View>
              </View>
            )}

            {!!fixtureSourceMode && (
              <View testID={fixtureSourceMode === 'local' ? 'cad-local-file-ready' : 'cad-sample-file-ready'} style={{ gap: Spacing.md }}>
                <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft }}>
                    <Ionicons name={fixtureSourceMode === 'local' ? 'document-text-outline' : 'cube-outline'} size={18} color={colors.primary} accessible={false} />
                  </View>
                  <View style={{ flex: 1, gap: Spacing.xs }}>
                    <Text style={[Typography.bodyStrong, { color: colors.text }]}>{fixtureSourceMode === 'local'
                      ? (pendingLocalFileName || localPreview?.sourceFileName || 'Local CAD file')
                      : fixture.sourceFileName}</Text>
                    <Text style={text}>{fixtureSourceMode === 'local' && selected
                      ? `${selected.format} · ${formatFileSize(selected.bytes)} · ${selected.renderableLocalPreview ? 'preview available' : 'preview pending'}`
                      : `${fixture.format} · ${formatFileSize(fixture.bytes)} · public sample`}</Text>
                  </View>
                </View>

                {fixtureSourceMode === 'local' && selected && !localPreview && selected.renderableLocalPreview && (
                  <CadAction
                    testID="cad-render-local-preview"
                    accessibilityLabel="Render selected CAD file locally"
                    primary
                    disabled={renderingLocal}
                    icon="play-circle-outline"
                    label={renderingLocal ? 'Rendering preview...' : 'Render preview'}
                    onPress={() => { void renderPendingLocalFile(); }}
                  />
                )}
                {fixtureSourceMode === 'local' && selected && !localPreview && !selected.renderableLocalPreview && (
                  <CadNotice icon="hourglass-outline">Preview support is pending for {selected.format}.</CadNotice>
                )}
                {fixtureSourceMode === 'local' && localPreview && (
                  <View testID="cad-local-preview-ready" style={{ gap: Spacing.sm }}>
                    <Text style={text}>{localPreview.meshes} mesh{localPreview.meshes === 1 ? '' : 'es'} · {localPreview.vertices.toLocaleString()} vertices · {localPreview.triangles.toLocaleString()} triangles</Text>
                    <CadAction testID="cad-review-local-preview" accessibilityLabel={`Review local render of ${localPreview.sourceFileName}`} primary label="Review render" icon="eye-outline" onPress={() => onLocalPreviewResult?.(localPreview)} />
                  </View>
                )}
                {fixtureSourceMode === 'sample' && (
                  <CadAction testID="cad-review-qualified-result" accessibilityLabel={`Generate public sample preview for ${fixture.fixtureName}`} primary label="Generate sample preview" icon="play-circle-outline" onPress={onReviewQualifiedResult} />
                )}

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
                  {supported && localPreviewEnabled && (
                    <TouchableOpacity
                      testID="cad-change-source-file"
                      accessibilityRole="button"
                      accessibilityLabel={fixtureSourceMode === 'local' ? 'Choose another CAD file' : 'Choose CAD file instead'}
                      disabled={renderingLocal}
                      onPress={chooseLocalFile}
                      style={smallActionStyle}
                    >
                      <Text style={smallActionText}>{fixtureSourceMode === 'local' ? 'Choose another file' : 'Choose CAD instead'}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    testID="cad-clear-source-choice"
                    accessibilityRole="button"
                    accessibilityLabel="Clear CAD source choice"
                    disabled={renderingLocal}
                    onPress={() => {
                      clearLocalSelection();
                      setFixtureSourceMode(null);
                      setMessage('Source cleared.');
                    }}
                    style={smallActionStyle}
                  >
                    <Text style={smallActionText}>Clear</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      ) : onOpenInternalPreview ? (
        <View testID="cad-native-internal-preview-entry" style={{ gap: Spacing.md }}>
          <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: Spacing.md, gap: Spacing.md, backgroundColor: colors.elevated }}>
            <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' }}>
              <Ionicons name="cube-outline" size={22} color={colors.primary} accessible={false} />
              <View style={{ flex: 1, gap: Spacing.xs }}>
                <Text style={[Typography.bodyStrong, { color: colors.text }]}>Internal CAD preview</Text>
                <Text style={text}>Open the internal renderer to choose an authorized CAD file in the installed app.</Text>
              </View>
            </View>
            <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: Radii.pill, paddingHorizontal: Spacing.sm, paddingVertical: 6, backgroundColor: colors.surface }}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} accessible={false} />
              <Text style={[Typography.caption, { color: colors.mutedText }]}>Preview mode · upload/conversion locked</Text>
            </View>
            <CadAction
              testID="cad-open-native-internal-preview"
              accessibilityLabel="Open internal CAD upload-render preview"
              primary
              icon="arrow-forward-circle-outline"
              label="Open internal CAD preview"
              onPress={onOpenInternalPreview}
            />
            <CadDetails title="If this does not open" testID="cad-internal-preview-diagnostics">
              <Text style={text}>Capture support details only. Do not send private CAD, credentials, raw paths, or production account data.</Text>
              <View testID="cad-internal-preview-diagnostics-list" style={{ gap: Spacing.sm }}>
                {INTERNAL_PREVIEW_DIAGNOSTICS.map(item => (
                  <View key={item.label} style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' }}>
                    <Ionicons name={item.icon} size={17} color={colors.mutedText} accessible={false} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[Typography.caption, { color: colors.text, fontWeight: '700' }]}>{item.label}</Text>
                      <Text style={text}>{item.detail}</Text>
                    </View>
                  </View>
                ))}
              </View>
              <Text style={text}>Classify the issue as install/update, file picker, local render, CAD interpretation, or commercial-readiness before changing any gate.</Text>
            </CadDetails>
          </View>
        </View>
      ) : supported ? (
        <>
          <CadAction testID="cad-choose-file" accessibilityLabel="Choose CAD file from this device" primary icon="document-attach-outline" label={selected ? 'Choose another CAD file' : 'Choose CAD file'} onPress={chooseLocalFile} />
        </>
      ) : <Text testID="cad-picker-unavailable" style={text}>File selection is unavailable on this surface. Open ReversR in a web browser with file-picker support to select a CAD file. Native selection is pending.</Text>}
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
