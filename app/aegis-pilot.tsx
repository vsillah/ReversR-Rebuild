import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useReducer, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import CadFixtureViewer from '../components/CadFixtureViewer';
import { Radii, Spacing, Typography } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import { PUBLIC_CUBE_RESULT } from '../utils/cadInternalTesterPreview';
import {
  PILOT_ACCEPT,
  createPublicCubeDerivedStl,
  nextPilotState,
  validatePilotFileMetadata,
  verifyPublicPilotFixture,
  type AegisPilotState,
} from '../utils/aegisPilotJourney';

const initialState: AegisPilotState = { status: 'idle', message: '' };
const steps = [
  { id: 'select', label: 'Select', active: ['queued', 'processing', 'ready'] },
  { id: 'verify', label: 'Verify', active: ['processing', 'ready'] },
  { id: 'inspect', label: 'Inspect', active: ['ready'] },
];

function wait(milliseconds: number) {
  return new Promise(resolve => window.setTimeout(resolve, milliseconds));
}

export default function AegisPilotJourney() {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const compact = width < 620;
  const stackedHero = width < 900;
  const styles = createStyles(colors);
  const picker = useRef<HTMLInputElement | null>(null);
  const selectedFile = useRef<File | null>(null);
  const runId = useRef(0);
  const [state, dispatch] = useReducer(nextPilotState, initialState);
  const [dragActive, setDragActive] = useState(false);
  const ready = state.status === 'ready';
  const busy = state.status === 'queued' || state.status === 'processing';

  useEffect(() => () => { runId.current += 1; }, []);

  const reset = () => {
    runId.current += 1;
    selectedFile.current = null;
    dispatch({ type: 'RESET' });
  };

  const processFile = async (file: File) => {
    const metadata = validatePilotFileMetadata(file);
    if (!metadata.ok) {
      selectedFile.current = null;
      dispatch({ type: 'ERROR', message: metadata.message });
      return;
    }
    selectedFile.current = file;
    const currentRun = ++runId.current;
    dispatch({ type: 'SELECT' });
    await wait(260);
    if (currentRun !== runId.current) return;
    dispatch({ type: 'PROCESS' });
    try {
      const result = await verifyPublicPilotFixture(file);
      await wait(420);
      if (currentRun !== runId.current) return;
      if (!result.ok) {
        dispatch({ type: 'ERROR', message: result.message });
        return;
      }
      dispatch({ type: 'READY' });
    } catch (error) {
      if (currentRun !== runId.current) return;
      dispatch({ type: 'ERROR', message: error instanceof Error ? error.message : 'The public fixture could not be verified locally.' });
    }
  };

  const useIncludedSample = async () => {
    try {
      const response = await fetch(PUBLIC_CUBE_RESULT.sourceAssetUrl, { credentials: 'same-origin' });
      if (!response.ok) throw new Error('The included public fixture is unavailable in this build.');
      const blob = await response.blob();
      await processFile(new File([blob], PUBLIC_CUBE_RESULT.sourceFileName, { type: 'model/iges' }));
    } catch (error) {
      dispatch({ type: 'ERROR', message: error instanceof Error ? error.message : 'The included public fixture could not be opened.' });
    }
  };

  const downloadDerivedMesh = () => {
    if (!ready || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const href = URL.createObjectURL(new Blob([createPublicCubeDerivedStl()], { type: 'model/stl' }));
    const link = document.createElement('a');
    link.href = href;
    link.download = 'reversr-public-cube-derived-inspection-mesh-mm.stl';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 0);
  };

  const retry = () => {
    const file = selectedFile.current;
    if (file) void processFile(file);
    else void useIncludedSample();
  };

  return (
    <ScrollView contentContainerStyle={styles.page} testID="aegis-pilot-page">
      {Platform.OS === 'web' && (
        <input
          ref={picker}
          type="file"
          accept={PILOT_ACCEPT}
          aria-label="Choose approved synthetic IGES file"
          data-testid="aegis-pilot-file-input"
          style={{ display: 'none' }}
          onChange={event => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            if (file) void processFile(file);
          }}
        />
      )}

      <View style={styles.topbar}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Return to ReversR" onPress={() => router.replace('/')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={18} color={colors.text} />
          <Text style={[Typography.label, { color: colors.text }]}>ReversR</Text>
        </TouchableOpacity>
        <View style={styles.pilotBadge}>
          <View style={styles.liveDot} />
          <Text style={[Typography.label, { color: colors.success }]}>LOCAL PILOT</Text>
        </View>
      </View>

      <View style={[styles.hero, stackedHero && styles.heroCompact]}>
        <View style={{ flex: stackedHero ? undefined : 1, width: stackedHero ? '100%' : undefined, gap: Spacing.sm }}>
          <Text style={styles.eyebrow}>AEGIS × REVERSR</Text>
          <Text accessibilityRole="header" style={[styles.title, compact && styles.titleCompact]}>From IGES file to usable 3D inspection</Text>
          <Text style={styles.subtitle}>A reviewable, browser-local path for one public synthetic fixture. Geometry stays on this device. Production upload and live conversion remain closed.</Text>
        </View>
        <View style={[styles.boundaryCard, stackedHero && styles.boundaryCardCompact]}>
          <Ionicons name="shield-checkmark-outline" size={22} color={colors.success} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[Typography.bodyStrong, { color: colors.text }]}>Fail-closed by design</Text>
            <Text style={[Typography.caption, { color: colors.mutedText, lineHeight: 19 }]}>No production upload or conversion service is called.</Text>
          </View>
        </View>
      </View>

      <View style={styles.stepRail} accessibilityLabel="Pilot progress">
        {steps.map((step, index) => {
          const active = step.active.includes(state.status);
          return (
            <React.Fragment key={step.id}>
              {index > 0 && <View style={[styles.stepLine, active && styles.stepLineActive]} />}
              <View style={styles.stepItem}>
                <View style={[styles.stepCircle, active && styles.stepCircleActive]}>
                  {active ? <Ionicons name="checkmark" size={14} color={colors.onPrimary} /> : <Text style={styles.stepNumber}>{index + 1}</Text>}
                </View>
                <Text style={[Typography.label, { color: active ? colors.text : colors.dimText }]}>{step.label}</Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>

      {!ready ? (
        <View style={[styles.workGrid, desktop && styles.workGridDesktop]}>
          <View style={[styles.panel, { flex: desktop ? 1.2 : undefined }]}>
            <Text accessibilityRole="header" style={[Typography.heading, { color: colors.text }]}>1. Add the approved synthetic IGES</Text>
            <Text style={styles.body}>Use the included 10 × 10 × 10 mm public cube, or select that same fixture from your device. Other files are rejected before a model appears.</Text>
            {Platform.OS === 'web' ? (
              <div
                aria-label="Drop approved synthetic IGES file here"
                data-testid="aegis-pilot-drop-zone"
                onDragEnter={event => { event.preventDefault(); setDragActive(true); }}
                onDragOver={event => { event.preventDefault(); setDragActive(true); }}
                onDragLeave={event => { event.preventDefault(); setDragActive(false); }}
                onDrop={event => {
                  event.preventDefault();
                  setDragActive(false);
                  const file = event.dataTransfer.files?.[0];
                  if (file) void processFile(file);
                }}
                style={{
                  minHeight: compact ? 170 : 210,
                  border: `1.5px dashed ${dragActive ? colors.primary : colors.border}`,
                  borderRadius: Radii.lg,
                  background: dragActive ? colors.primarySoft : colors.surface,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  padding: 24,
                  textAlign: 'center',
                }}
              >
                <Ionicons name="cloud-upload-outline" size={34} color={colors.primary} />
                <Text style={[Typography.bodyStrong, { color: colors.text }]}>Drop the approved .igs or .iges fixture</Text>
                <Text style={[Typography.caption, { color: colors.mutedText }]}>IGES only · 2 MB maximum · digest verified locally</Text>
                <TouchableOpacity disabled={busy} accessibilityRole="button" accessibilityLabel="Choose approved synthetic IGES file" onPress={() => picker.current?.click()} style={[styles.button, styles.secondaryButton]}>
                  <Text style={[styles.buttonText, { color: colors.text }]}>Choose IGES file</Text>
                </TouchableOpacity>
              </div>
            ) : (
              <View style={styles.unsupportedCard}><Text style={styles.body}>Open this pilot in the web build for local IGES selection and interactive 3D review.</Text></View>
            )}
            <TouchableOpacity disabled={busy} testID="aegis-use-sample" accessibilityRole="button" accessibilityLabel="Use included public synthetic IGES sample" onPress={() => { void useIncludedSample(); }} style={[styles.button, styles.primaryButton, busy && styles.disabled]}>
              <Ionicons name="cube-outline" size={18} color={colors.onPrimary} />
              <Text style={[styles.buttonText, { color: colors.onPrimary }]}>{busy ? 'Preparing local inspection…' : 'Use included public sample'}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.panel, { flex: desktop ? 0.8 : undefined }]}>
            <Text accessibilityRole="header" style={[Typography.heading, { color: colors.text }]}>Processing status</Text>
            <View style={styles.statusCard} accessibilityLiveRegion="polite" testID={`aegis-status-${state.status}`}>
              <View style={[styles.statusIcon, state.status === 'error' && { backgroundColor: colors.dangerSoft }]}>
                <Ionicons name={state.status === 'error' ? 'alert-circle-outline' : busy ? 'sync-outline' : 'hourglass-outline'} size={24} color={state.status === 'error' ? colors.danger : colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[Typography.bodyStrong, { color: colors.text, textTransform: 'capitalize' }]}>{state.status === 'idle' ? 'Waiting for fixture' : state.status}</Text>
                <Text style={styles.body}>{state.message || 'Choose the public sample to begin the bounded local journey.'}</Text>
              </View>
            </View>
            <View style={styles.factList}>
              <Fact icon="document-text-outline" label="Input" value="Public synthetic IGES" colors={colors} />
              <Fact icon="resize-outline" label="Declared units" value="Millimeters (mm)" colors={colors} />
              <Fact icon="navigate-outline" label="Orientation" value="Source axes; Y is vertical" colors={colors} />
              <Fact icon="lock-closed-outline" label="Production dispatch" value="Disabled" colors={colors} />
            </View>
            {state.status === 'error' && (
              <View style={{ gap: Spacing.sm }}>
                <TouchableOpacity accessibilityRole="button" onPress={retry} style={[styles.button, styles.primaryButton]}><Text style={[styles.buttonText, { color: colors.onPrimary }]}>Retry public sample</Text></TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" onPress={reset} style={[styles.button, styles.secondaryButton]}><Text style={[styles.buttonText, { color: colors.text }]}>Clear and start over</Text></TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.resultWrap}>
          <View style={styles.resultHeader}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.eyebrow}>INSPECTION MESH READY</Text>
              <Text accessibilityRole="header" style={[Typography.title, { color: colors.text }]}>Public cube · 10 × 10 × 10 mm</Text>
              <Text style={styles.body}>Orbit by dragging. Pan with Shift + drag or right-drag. Zoom with the rail, wheel, or pinch. Reset returns to the fitted isometric view.</Text>
            </View>
            <View style={styles.readyBadge}><Ionicons name="checkmark-circle" size={18} color={colors.success} /><Text style={[Typography.label, { color: colors.success }]}>READY</Text></View>
          </View>
          <View style={[styles.viewerGrid, desktop && styles.viewerGridDesktop]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <CadFixtureViewer geometry={PUBLIC_CUBE_RESULT.previewGeometry} label="public synthetic IGES cube" height={desktop ? 520 : undefined} />
            </View>
            <View style={[styles.inspectionRail, desktop && { width: 310 }]}>
              <Text accessibilityRole="header" style={[Typography.heading, { color: colors.text }]}>Inspection record</Text>
              <Fact icon="scan-outline" label="Geometry" value="1 mesh · 24 vertices · 12 triangles" colors={colors} />
              <Fact icon="resize-outline" label="Bounds" value="X 10 · Y 10 · Z 10 mm" colors={colors} />
              <Fact icon="navigate-outline" label="Orientation" value="Source axes preserved · Y up" colors={colors} />
              <Fact icon="finger-print-outline" label="Source" value="Digest-matched public fixture" colors={colors} />
              <View style={styles.limitCard}>
                <Text style={[Typography.label, { color: colors.warning }]}>INSPECTION-GRADE PILOT</Text>
                <Text style={styles.body}>Interactive mesh review only. This does not prove editable native CAD, manufacturing readiness, or geometric equivalence for other files.</Text>
              </View>
              <TouchableOpacity testID="aegis-download-derived-stl" accessibilityRole="button" accessibilityLabel="Download derived inspection mesh STL in millimeters" onPress={downloadDerivedMesh} style={[styles.button, styles.primaryButton]}>
                <Ionicons name="download-outline" size={18} color={colors.onPrimary} />
                <Text style={[styles.buttonText, { color: colors.onPrimary }]}>Download derived inspection mesh (.stl)</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" onPress={reset} style={[styles.button, styles.secondaryButton]}><Text style={[styles.buttonText, { color: colors.text }]}>Inspect another fixture</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <View style={styles.closedGate}>
        <Ionicons name="lock-closed" size={18} color={colors.warning} />
        <Text style={[Typography.caption, { color: colors.mutedText, flex: 1, lineHeight: 19 }]}><Text style={{ color: colors.text, fontWeight: '700' }}>Live CAD upload remains disabled.</Text> This pilot never calls the production admission route, external conversion, cloud storage, or a private-file workflow.</Text>
      </View>
    </ScrollView>
  );
}

function Fact({ icon, label, value, colors }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string; colors: ReturnType<typeof useAppTheme>['colors'] }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm }}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <View style={{ flex: 1, gap: 2 }}><Text style={[Typography.caption, { color: colors.dimText }]}>{label}</Text><Text style={[Typography.bodyStrong, { color: colors.text }]}>{value}</Text></View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
  page: { width: '100%', maxWidth: 1320, alignSelf: 'center', padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 80 },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backButton: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', minHeight: 44, paddingHorizontal: Spacing.md, borderRadius: Radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  pilotBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, minHeight: 34, borderRadius: Radii.pill, backgroundColor: colors.successSoft, borderWidth: 1, borderColor: colors.success },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  hero: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.lg, alignItems: 'flex-end', paddingVertical: Spacing.md },
  heroCompact: { flexDirection: 'column', alignItems: 'stretch' },
  eyebrow: { ...Typography.label, color: colors.accent, letterSpacing: 1.5 },
  title: { ...Typography.display, color: colors.text, fontSize: 38, lineHeight: 44, maxWidth: 820 },
  titleCompact: { fontSize: 30, lineHeight: 36 },
  subtitle: { ...Typography.body, color: colors.mutedText, lineHeight: 24, maxWidth: 800 },
  boundaryCard: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start', padding: Spacing.md, width: 290, borderRadius: Radii.lg, borderWidth: 1, borderColor: colors.success, backgroundColor: colors.successSoft },
  boundaryCardCompact: { width: '100%' },
  stepRail: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', width: '100%', maxWidth: 560, paddingVertical: Spacing.sm },
  stepItem: { alignItems: 'center', gap: 6 },
  stepLine: { flex: 1, height: 2, marginHorizontal: 8, backgroundColor: colors.border },
  stepLineActive: { backgroundColor: colors.primary },
  stepCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  stepCircleActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  stepNumber: { ...Typography.label, color: colors.dimText },
  workGrid: { gap: Spacing.lg },
  workGridDesktop: { flexDirection: 'row', alignItems: 'stretch' },
  panel: { gap: Spacing.md, padding: Spacing.lg, borderRadius: Radii.xl, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border },
  body: { ...Typography.body, color: colors.mutedText, lineHeight: 21 },
  button: { minHeight: 46, paddingHorizontal: Spacing.md, paddingVertical: 12, borderRadius: Radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  primaryButton: { backgroundColor: colors.primary },
  secondaryButton: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  buttonText: { ...Typography.bodyStrong, textAlign: 'center' },
  disabled: { opacity: 0.55 },
  unsupportedCard: { padding: Spacing.lg, borderRadius: Radii.lg, backgroundColor: colors.warningSoft },
  statusCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, padding: Spacing.md, borderRadius: Radii.lg, backgroundColor: colors.surface },
  statusIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  factList: { gap: Spacing.md, paddingVertical: Spacing.sm },
  resultWrap: { gap: Spacing.md, padding: Spacing.lg, borderRadius: Radii.xl, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border },
  resultHeader: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, alignItems: 'flex-start' },
  readyBadge: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 12, minHeight: 34, borderRadius: Radii.pill, backgroundColor: colors.successSoft },
  viewerGrid: { gap: Spacing.lg },
  viewerGridDesktop: { flexDirection: 'row', alignItems: 'flex-start' },
  inspectionRail: { gap: Spacing.md },
  limitCard: { gap: 6, padding: Spacing.md, borderRadius: Radii.md, backgroundColor: colors.warningSoft, borderWidth: 1, borderColor: colors.warning },
  closedGate: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start', padding: Spacing.md, borderRadius: Radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
});
