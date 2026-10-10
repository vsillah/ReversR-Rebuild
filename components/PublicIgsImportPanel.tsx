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
  const [sourceChoice, setSourceChoice] = useState<'file' | 'sample' | null>(null);
  const busy = state.status === 'queued' || state.status === 'processing';
  const sourceBusy = busy || syntheticBusy;
  const ready = state.status === 'ready';
  const canRetry = Boolean(selectedFile.current) || selectedSource.current === 'sample';

  useEffect(() => () => { runId.current += 1; }, []);

  const reset = () => {
    runId.current += 1;
    selectedFile.current = null;
    selectedSource.current = null;
    setSourceChoice(null);
    dispatch({ type: 'RESET' });
  };

  const processFile = async (file: File, source: 'file' | 'sample' = 'file') => {
    if (syntheticBusy) return;
    selectedSource.current = source;
    setSourceChoice(source);
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
    setSourceChoice('sample');
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
            <View testID="igs-source-choice-panel" style={styles.sourceChoiceGrid}>
              <div
                aria-label="Drop approved public IGS file here"
                aria-disabled={sourceBusy}
                data-testid="igs-import-drop-zone"
                data-selected={sourceChoice === 'file'}
                onDragEnter={event => { event.preventDefault(); setDragActive(true); }}
                onDragOver={event => { event.preventDefault(); setDragActive(true); }}
                onDragLeave={event => { event.preventDefault(); setDragActive(false); }}
                onDrop={event => {
                  event.preventDefault();
                  setDragActive(false);
                  if (sourceBusy) return;
                  const file = event.dataTransfer.files?.[0];
                  if (file) void processFile(file);
                }}
                style={{
                  minWidth: 0,
                  flex: '1 1 220px',
                  minHeight: 160,
                  boxSizing: 'border-box',
                  border: `1.5px dashed ${dragActive || sourceChoice === 'file' ? colors.primary : colors.border}`,
                  borderRadius: Radii.lg,
                  background: dragActive || sourceChoice === 'file' ? colors.primarySoft : colors.surface,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 8, padding: 16, textAlign: 'center',
                  opacity: sourceChoice === 'sample' ? 0.48 : sourceBusy && sourceChoice !== 'file' ? 0.55 : 1,
                  pointerEvents: sourceBusy ? 'none' : 'auto',
                }}
              >
                <Ionicons name={sourceChoice === 'file' ? 'checkmark-circle-outline' : 'cloud-upload-outline'} size={27} color={colors.primary} />
                <Text style={[Typography.bodyStrong, { color: colors.text }]}>Local .igs file</Text>
                <Text style={[Typography.caption, { color: colors.mutedText }]}>IGS or IGES · 2 MB maximum</Text>
                <TouchableOpacity testID="igs-source-local-action" disabled={sourceBusy} accessibilityRole="button" accessibilityLabel={sourceChoice === 'file' ? 'Selected local IGS file' : 'Choose local IGS file'} accessibilityState={{ disabled: sourceBusy }} aria-pressed={sourceChoice === 'file'} onPress={() => picker.current?.click()} style={[styles.chooseAction, sourceBusy && styles.disabled]}>
                  <Text style={[Typography.label, { color: colors.primary }]}>{sourceChoice === 'file' ? 'Selected' : 'Choose'}</Text>
                </TouchableOpacity>
              </div>
              <View
                testID="igs-source-sample-tile"
                style={[styles.sourceChoiceTile, sourceChoice === 'sample' && styles.sourceChoiceTileSelected, sourceChoice === 'file' && styles.sourceChoiceTileDeemphasized, sourceBusy && sourceChoice !== 'sample' && styles.disabled]}
              >
                <Ionicons name={sourceChoice === 'sample' ? 'checkmark-circle-outline' : 'globe-outline'} size={27} color={colors.primary} />
                <Text style={[Typography.bodyStrong, { color: colors.text }]}>Included public sample</Text>
                <Text style={[Typography.caption, { color: colors.mutedText, textAlign: 'center' }]}>Synthetic cube · ready to review</Text>
                <TouchableOpacity testID="igs-source-sample-action" disabled={sourceBusy} accessibilityRole="button" accessibilityLabel={sourceChoice === 'sample' ? 'Selected included public IGS sample' : 'Choose included public IGS sample'} accessibilityState={{ disabled: sourceBusy }} aria-pressed={sourceChoice === 'sample'} onPress={() => { void useIncludedFile(); }} style={[styles.chooseAction, sourceBusy && styles.disabled]}>
                  <Text style={[Typography.label, { color: colors.primary }]}>{sourceChoice === 'sample' ? 'Selected' : 'Choose'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.blockedCard}><Text style={styles.body}>Local IGS import currently requires the ReversR web app.</Text></View>
          )}
          {sourceBusy ? <Text accessibilityLiveRegion="polite" style={[Typography.caption, { color: colors.mutedText, textAlign: 'center' }]}>{busy ? state.message : 'Preparing synthetic fixture…'}</Text> : null}
          <SyntheticIgsQualificationPanel disabled={busy} onBusyChange={setSyntheticBusy} onReady={onReady} />
        </>
      ) : (
        <View testID="igs-import-ready" accessibilityLiveRegion="polite" style={styles.readyCard}>
          <Ionicons name="checkmark-circle" size={25} color={colors.success} />
          <Text style={[Typography.bodyStrong, { color: colors.text, flex: 1 }]}>Verified locally. Opening 3D review…</Text>
        </View>
      )}

      {state.status === 'error' ? <View testID="igs-import-status-error" accessibilityLiveRegion="polite" style={[styles.statusCard, styles.errorCard]}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[Typography.label, { color: colors.text }]}>Could not prepare source</Text>
            <Text style={styles.body}>{state.message}</Text>
          </View>
        </View> : null}

      {state.status === 'error' ? (
        <View style={styles.actionRow}>
          {canRetry ? <TouchableOpacity testID="igs-import-retry" accessibilityRole="button" accessibilityLabel="Retry local IGS verification" onPress={retry} style={[styles.button, styles.primaryButton, { flex: 1 }]}><Text style={[Typography.bodyStrong, { color: colors.onPrimary }]}>Retry verification</Text></TouchableOpacity> : null}
          <TouchableOpacity testID="igs-import-change-source" accessibilityRole="button" accessibilityLabel="Choose a different IGS file" onPress={chooseDifferentFile} style={[styles.button, styles.secondaryButton, { flex: 1 }]}><Text style={[Typography.bodyStrong, { color: colors.text }]}>Change source</Text></TouchableOpacity>
        </View>
      ) : null}

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
  sourceChoiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  sourceChoiceTile: { flexGrow: 1, flexBasis: 220, minWidth: 0, minHeight: 150, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, borderRadius: Radii.lg, backgroundColor: colors.surface, padding: Spacing.md, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  sourceChoiceTileSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  sourceChoiceTileDeemphasized: { opacity: 0.48 },
  chooseAction: { minHeight: 34, minWidth: 88, borderRadius: Radii.pill, borderWidth: 1, borderColor: colors.border, paddingHorizontal: Spacing.md, paddingVertical: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel },
  disabled: { opacity: 0.55 },
  statusCard: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start', padding: Spacing.md, borderRadius: Radii.md, backgroundColor: colors.primarySoft },
  errorCard: { backgroundColor: colors.dangerSoft },
  readyCard: { gap: Spacing.md, padding: Spacing.md, borderRadius: Radii.lg, borderWidth: 1, borderColor: colors.success, backgroundColor: colors.successSoft },
  blockedCard: { padding: Spacing.md, borderRadius: Radii.md, backgroundColor: colors.warningSoft },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
