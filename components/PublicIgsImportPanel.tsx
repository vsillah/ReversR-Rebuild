import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useReducer, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Radii, Spacing, Typography } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import { PUBLIC_CUBE_RESULT, type CadInternalTesterFixture } from '../utils/cadInternalTesterPreview';
import {
  IGS_FILE_ACCEPT,
  nextIgsImportState,
  validateIgsFileMetadata,
  verifyPublicIgsFixture,
  type IgsImportState,
} from '../utils/igsImportJourney';
import SyntheticIgsQualificationPanel from './SyntheticIgsQualificationPanel';

const initialState: IgsImportState = { status: 'idle', message: '' };

function wait(milliseconds: number) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

export default function PublicIgsImportPanel({ onReady }: { onReady: (fixture: CadInternalTesterFixture) => void }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const picker = useRef<HTMLInputElement | null>(null);
  const selectedFile = useRef<File | null>(null);
  const selectedSource = useRef<'file' | 'sample' | null>(null);
  const runId = useRef(0);
  const [state, dispatch] = useReducer(nextIgsImportState, initialState);
  const [dragActive, setDragActive] = useState(false);
  const [syntheticBusy, setSyntheticBusy] = useState(false);
  const busy = state.status === 'queued' || state.status === 'processing';
  const sourceBusy = busy || syntheticBusy;
  const ready = state.status === 'ready';
  const canRetry = Boolean(selectedFile.current) || selectedSource.current === 'sample';

  useEffect(() => () => { runId.current += 1; }, []);

  const reset = () => {
    runId.current += 1;
    selectedFile.current = null;
    selectedSource.current = null;
    dispatch({ type: 'RESET' });
  };

  const processFile = async (file: File, source: 'file' | 'sample' = 'file') => {
    if (syntheticBusy) return;
    selectedSource.current = source;
    const metadata = validateIgsFileMetadata(file);
    if (!metadata.ok) {
      selectedFile.current = null;
      dispatch({ type: 'ERROR', message: metadata.message });
      return;
    }
    selectedFile.current = file;
    const currentRun = ++runId.current;
    dispatch({ type: 'SELECT' });
    await wait(220);
    if (currentRun !== runId.current) return;
    dispatch({ type: 'PROCESS' });
    try {
      const result = await verifyPublicIgsFixture(file);
      await wait(360);
      if (currentRun !== runId.current) return;
      if (!result.ok) {
        dispatch({ type: 'ERROR', message: result.message });
        return;
      }
      dispatch({ type: 'READY' });
      onReady(PUBLIC_CUBE_RESULT);
    } catch (error) {
      if (currentRun !== runId.current) return;
      dispatch({ type: 'ERROR', message: error instanceof Error ? error.message : 'The public .igs file could not be verified locally.' });
    }
  };

  const useIncludedFile = async () => {
    selectedSource.current = 'sample';
    if (Platform.OS !== 'web' || typeof File === 'undefined') {
      dispatch({ type: 'ERROR', message: 'Local IGS import is available in the ReversR web app.' });
      return;
    }
    try {
      const response = await fetch(PUBLIC_CUBE_RESULT.sourceAssetUrl, { credentials: 'same-origin' });
      if (!response.ok) throw new Error('The included public .igs file is unavailable in this build.');
      const blob = await response.blob();
      await processFile(new File([blob], PUBLIC_CUBE_RESULT.sourceFileName, { type: 'model/iges' }), 'sample');
    } catch (error) {
      dispatch({ type: 'ERROR', message: error instanceof Error ? error.message : 'The included public .igs file could not be opened.' });
    }
  };

  const retry = () => {
    if (selectedFile.current) void processFile(selectedFile.current, selectedSource.current ?? 'file');
    else if (selectedSource.current === 'sample') void useIncludedFile();
    else picker.current?.click();
  };

  const chooseDifferentFile = () => {
    reset();
    picker.current?.click();
  };

  return (
    <View testID="igs-import-panel" style={styles.container}>
      {Platform.OS === 'web' ? (
        <input
          ref={picker}
          type="file"
          accept={IGS_FILE_ACCEPT}
          aria-label="Choose approved public IGS file"
          data-testid="igs-import-file-input"
          style={{ display: 'none' }}
          onChange={event => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            if (file) void processFile(file);
          }}
        />
      ) : null}

      <View style={styles.headingRow}>
        <View style={styles.iconCircle}><Ionicons name="document-text-outline" size={21} color={colors.primary} /></View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text accessibilityRole="header" style={[Typography.heading, { color: colors.text }]}>Import an IGS file</Text>
          <Text style={styles.body}>Choose an approved public .igs file. ReversR verifies it locally, prepares inventory, and opens the 3D review automatically.</Text>
        </View>
      </View>

      {!ready ? (
        <>
          {Platform.OS === 'web' ? (
            <div
              aria-label="Drop approved public IGS file here"
              aria-disabled={sourceBusy}
              data-testid="igs-import-drop-zone"
              onDragEnter={event => { event.preventDefault(); setDragActive(true); }}
              onDragOver={event => { event.preventDefault(); setDragActive(true); }}
              onDragLeave={event => { event.preventDefault(); setDragActive(false); }}
              onDrop={event => {
                event.preventDefault();
                setDragActive(false);
                if (busy) return;
                if (syntheticBusy) return;
                const file = event.dataTransfer.files?.[0];
                if (file) void processFile(file);
              }}
              style={{
                minHeight: 156,
                border: `1.5px dashed ${dragActive ? colors.primary : colors.border}`,
                borderRadius: Radii.lg,
                background: dragActive ? colors.primarySoft : colors.surface,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: 20, textAlign: 'center', pointerEvents: sourceBusy ? 'none' : 'auto',
              }}
            >
              <Ionicons name="cloud-upload-outline" size={30} color={colors.primary} />
              <Text style={[Typography.bodyStrong, { color: colors.text }]}>Drop your approved public .igs file</Text>
              <Text style={[Typography.caption, { color: colors.mutedText }]}>IGS file · IGES format · 2 MB maximum · verified locally</Text>
              <TouchableOpacity disabled={sourceBusy} accessibilityRole="button" accessibilityLabel="Choose approved public IGS file" onPress={() => picker.current?.click()} style={[styles.button, styles.primaryButton, sourceBusy && styles.disabled]}>
                <Text style={[Typography.bodyStrong, { color: colors.onPrimary }]}>Choose .igs file</Text>
              </TouchableOpacity>
            </div>
          ) : (
            <View style={styles.blockedCard}><Text style={styles.body}>Local IGS import currently requires the ReversR web app.</Text></View>
          )}
          <View accessibilityLabel="Or use the public sample" style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={[Typography.caption, { color: colors.mutedText }]}>OR</Text>
            <View style={styles.orLine} />
          </View>
          <TouchableOpacity disabled={sourceBusy} testID="igs-import-use-sample" accessibilityRole="button" accessibilityLabel="No IGS file available? Try the public sample" onPress={() => { void useIncludedFile(); }} style={[styles.sampleLink, sourceBusy && styles.disabled]}>
            <Text style={[Typography.bodyStrong, styles.sampleLinkText]}>{busy ? 'Verifying selected source locally…' : syntheticBusy ? 'Synthetic qualification is running…' : 'No .igs file available? Try the public sample'}</Text>
          </TouchableOpacity>
          <SyntheticIgsQualificationPanel disabled={busy} onBusyChange={setSyntheticBusy} onReady={onReady} />
        </>
      ) : (
        <View testID="igs-import-ready" accessibilityLiveRegion="polite" style={styles.readyCard}>
          <Ionicons name="checkmark-circle" size={25} color={colors.success} />
          <Text style={[Typography.bodyStrong, { color: colors.text, flex: 1 }]}>Verified locally. Opening 3D review…</Text>
        </View>
      )}

      <View testID={`igs-import-status-${state.status}`} accessibilityLiveRegion="polite" style={[styles.statusCard, state.status === 'error' && styles.errorCard]}>
        <Ionicons name={state.status === 'error' ? 'alert-circle-outline' : ready ? 'checkmark-circle-outline' : busy ? 'sync-outline' : 'shield-checkmark-outline'} size={20} color={state.status === 'error' ? colors.danger : ready ? colors.success : colors.primary} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[Typography.label, { color: colors.text, textTransform: 'capitalize' }]}>{state.status === 'idle' ? 'Ready for a public file' : state.status}</Text>
          <Text style={styles.body}>{state.message || 'No production upload or conversion service is called.'}</Text>
        </View>
      </View>

      {state.status === 'error' ? (
        <View style={styles.actionRow}>
          {canRetry ? <TouchableOpacity testID="igs-import-retry" accessibilityRole="button" accessibilityLabel="Retry local IGS verification" onPress={retry} style={[styles.button, styles.primaryButton, { flex: 1 }]}><Text style={[Typography.bodyStrong, { color: colors.onPrimary }]}>Retry verification</Text></TouchableOpacity> : null}
          <TouchableOpacity testID="igs-import-change-source" accessibilityRole="button" accessibilityLabel="Choose a different IGS file" onPress={chooseDifferentFile} style={[styles.button, styles.secondaryButton, { flex: 1 }]}><Text style={[Typography.bodyStrong, { color: colors.text }]}>Change source</Text></TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.boundaryCard}>
        <Ionicons name="lock-closed-outline" size={17} color={colors.warning} />
        <Text style={[Typography.caption, { color: colors.mutedText, flex: 1, lineHeight: 19 }]}><Text style={{ color: colors.text, fontWeight: '700' }}>Non-production paths only.</Text> Live CAD upload remains disabled. No private files, production admission, cloud storage, or external conversion.</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
  container: { width: '100%', gap: Spacing.md },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  body: { ...Typography.caption, color: colors.mutedText, lineHeight: 20 },
  button: { minHeight: 46, paddingHorizontal: Spacing.md, paddingVertical: 11, borderRadius: Radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  primaryButton: { backgroundColor: colors.primary },
  secondaryButton: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  sampleLink: { minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.sm },
  sampleLinkText: { color: colors.primary, textDecorationLine: 'underline', textAlign: 'center' },
  disabled: { opacity: 0.55 },
  statusCard: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start', padding: Spacing.md, borderRadius: Radii.md, backgroundColor: colors.primarySoft },
  errorCard: { backgroundColor: colors.dangerSoft },
  readyCard: { gap: Spacing.md, padding: Spacing.md, borderRadius: Radii.lg, borderWidth: 1, borderColor: colors.success, backgroundColor: colors.successSoft },
  blockedCard: { padding: Spacing.md, borderRadius: Radii.md, backgroundColor: colors.warningSoft },
  boundaryCard: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start', padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
