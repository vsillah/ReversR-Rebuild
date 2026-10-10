import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Radii, Spacing, Typography } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import type { CadInternalTesterFixture } from '../utils/cadInternalTesterPreview';
import type { AuthenticatedImportAdapter, AuthenticatedImportSourceChoice,
  AuthenticatedImportState } from '../utils/cadAuthenticatedImportQualification';

type Props = {
  adapter: AuthenticatedImportAdapter;
  state: AuthenticatedImportState;
  onState: (state: AuthenticatedImportState) => void;
  onReady: (fixture: CadInternalTesterFixture) => void;
};

export default function AuthenticatedIgsQualificationPanel({ adapter, state, onState, onReady }: Props) {
  const { colors } = useAppTheme();
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const busy = state.status === 'uploading' || state.status === 'processing';
  const choose = async (source: AuthenticatedImportSourceChoice) => {
    if (busy || controller.current) return;
    adapter.selectSource(source, onState);
    const request = new AbortController(); controller.current = request;
    const result = await adapter.run({ signal: request.signal, onState });
    controller.current = null;
    if (result.ok === true && result.fixture) onReady(result.fixture as CadInternalTesterFixture);
  };
  const statusLabel = state.status === 'uploading' ? 'Checking bounded synthetic upload…'
    : state.status === 'processing' ? 'Preparing preview and inspection STL…' : '';

  if (state.status === 'ready') return <View testID="cad-auth-import-resume" style={[styles.stateCard,
    { borderColor: colors.success, backgroundColor: colors.successSoft }]}>
    <Ionicons name="checkmark-circle" size={22} color={colors.success} accessible={false} />
    <View style={styles.flexText}>
      <Text style={[Typography.bodyStrong, { color: colors.text }]}>Synthetic artifacts are ready</Text>
      <Text style={[Typography.caption, { color: colors.mutedText }]}>The saved local result can reopen in Design after reload.</Text>
    </View>
    <TouchableOpacity testID="cad-auth-import-open-design" accessibilityRole="button"
      accessibilityLabel="Open ready synthetic model in Design" onPress={() => {
        const fixture = adapter.fixture(); if (fixture) onReady(fixture);
      }} style={[styles.pillButton, { borderColor: colors.border, backgroundColor: colors.panel }]}>
      <Text style={[Typography.label, { color: colors.primary }]}>Open Design</Text>
    </TouchableOpacity>
  </View>;

  if (state.status === 'recoverable-error') return <View testID="cad-auth-import-safe-error"
    accessibilityLiveRegion="polite" style={[styles.stateCard, { borderColor: colors.danger,
      backgroundColor: colors.dangerSoft }]}>
    <Ionicons name="alert-circle-outline" size={22} color={colors.danger} accessible={false} />
    <View style={styles.flexText}>
      <Text style={[Typography.bodyStrong, { color: colors.text }]}>Synthetic source was rejected safely</Text>
      <Text style={[Typography.caption, { color: colors.mutedText }]}>No artifact was created. Return to the choices, or inspect the closed unknown-outcome path.</Text>
      <View style={styles.actionRow}>
        <TouchableOpacity testID="cad-auth-import-recover" accessibilityRole="button"
          accessibilityLabel="Return to synthetic source choices" onPress={() => adapter.recoverSafeFailure(onState)}
          style={[styles.pillButton, { borderColor: colors.border, backgroundColor: colors.panel }]}>
          <Text style={[Typography.label, { color: colors.primary }]}>Choose again</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="cad-auth-import-show-unknown" accessibilityRole="button"
          accessibilityLabel="Show unknown outcome recovery" onPress={() => adapter.previewUnknownOutcome(onState)}
          style={[styles.pillButton, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={[Typography.label, { color: colors.mutedText }]}>Unknown outcome</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>;

  if (state.status === 'unknown') return <View testID="cad-auth-import-unknown"
    accessibilityLiveRegion="assertive" style={[styles.stateCard, { borderColor: colors.warning,
      backgroundColor: colors.warningSoft }]}>
    <Ionicons name="help-circle-outline" size={22} color={colors.warning} accessible={false} />
    <View style={styles.flexText}>
      <Text style={[Typography.bodyStrong, { color: colors.text }]}>Result could not be confirmed</Text>
      <Text style={[Typography.caption, { color: colors.mutedText }]}>Resubmission is blocked. Revoke the local qualification record before starting a new synthetic session.</Text>
      <TouchableOpacity testID="cad-auth-import-revoke-unknown" accessibilityRole="button"
        accessibilityLabel="Revoke unknown synthetic qualification" onPress={() => adapter.revokeUnknown(onState)}
        style={[styles.pillButton, { alignSelf: 'flex-start', borderColor: colors.border,
          backgroundColor: colors.panel }]}>
        <Text style={[Typography.label, { color: colors.danger }]}>Revoke local record</Text>
      </TouchableOpacity>
    </View>
  </View>;

  if (state.status === 'deleted') return <View testID="cad-auth-import-deleted"
    accessibilityLiveRegion="polite" style={[styles.stateCard, { borderColor: colors.border,
      backgroundColor: colors.elevated }]}>
    <Ionicons name="trash-outline" size={22} color={colors.mutedText} accessible={false} />
    <View style={styles.flexText}>
      <Text style={[Typography.bodyStrong, { color: colors.text }]}>Synthetic artifacts deleted and access revoked</Text>
      <Text style={[Typography.caption, { color: colors.mutedText }]}>No source or artifact metadata remains available in this view.</Text>
      <TouchableOpacity testID="cad-auth-import-start-new" accessibilityRole="button"
        accessibilityLabel="Start a new synthetic qualification session" onPress={() => adapter.startNew(onState)}
        style={[styles.pillButton, { alignSelf: 'flex-start', borderColor: colors.border,
          backgroundColor: colors.panel }]}>
        <Text style={[Typography.label, { color: colors.primary }]}>Start new synthetic session</Text>
      </TouchableOpacity>
    </View>
  </View>;

  return <View testID="cad-authenticated-import-panel" style={styles.container}>
    <View style={styles.headingRow}>
      <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name="shield-checkmark-outline" size={21} color={colors.primary} accessible={false} />
      </View>
      <View style={styles.flexText}>
        <View style={styles.labelRow}>
          <Text accessibilityRole="header" style={[Typography.heading, { color: colors.text }]}>Authenticated import check</Text>
          <View style={[styles.badge, { backgroundColor: colors.primarySoft }]}><Text style={[Typography.caption,
            { color: colors.primary, fontWeight: '700' }]}>Synthetic</Text></View>
        </View>
        <Text style={[Typography.caption, { color: colors.mutedText, lineHeight: 19 }]}>Choose one generated IGS source. Selection starts the bounded local check automatically.</Text>
      </View>
    </View>
    <View testID="cad-auth-import-source-choices" style={styles.choiceGrid} accessibilityRole="radiogroup"
      accessibilityLabel="Choose one synthetic IGS source">
      {([
        { key: 'file' as const, title: 'Generated .igs file', detail: 'Fresh browser-generated source', icon: 'document-attach-outline' as const },
        { key: 'sample' as const, title: 'Included .iges sample', detail: 'Repeatable public fixture', icon: 'cube-outline' as const },
      ]).map(choice => {
        const selected = state.sourceChoice === choice.key;
        return <TouchableOpacity key={choice.key} testID={`cad-auth-import-source-${choice.key}`}
          accessibilityRole="radio" accessibilityLabel={choice.title}
          accessibilityState={{ selected, disabled: busy }} disabled={busy}
          onPress={() => { void choose(choice.key); }}
          style={[styles.choice, { borderColor: selected ? colors.primary : colors.border,
            backgroundColor: selected ? colors.primarySoft : colors.surface, opacity: busy && !selected ? 0.5 : 1 }]}>
          <Ionicons name={selected ? 'checkmark-circle' : choice.icon} size={25} color={colors.primary} accessible={false} />
          <Text style={[Typography.bodyStrong, { color: colors.text, textAlign: 'center' }]}>{choice.title}</Text>
          <Text style={[Typography.caption, { color: colors.mutedText, textAlign: 'center' }]}>{choice.detail}</Text>
        </TouchableOpacity>;
      })}
    </View>
    {busy ? <View testID={`cad-auth-import-${state.status}`} accessibilityLiveRegion="polite"
      style={[styles.progressCard, { backgroundColor: colors.primarySoft }]}>
      <Ionicons name="sync-outline" size={19} color={colors.primary} accessible={false} />
      <Text style={[Typography.label, { color: colors.text, flex: 1 }]}>{statusLabel}</Text>
      <Text style={[Typography.caption, { color: colors.primary }]}>0 retries</Text>
    </View> : null}
    {!busy ? <TouchableOpacity testID="cad-auth-import-preview-failure" accessibilityRole="button"
      accessibilityLabel="Preview safe import failure recovery" onPress={() => adapter.previewRecoverableFailure(onState)}
      style={{ alignSelf: 'flex-start', minHeight: 38, justifyContent: 'center' }}>
      <Text style={[Typography.caption, { color: colors.mutedText, textDecorationLine: 'underline' }]}>Preview failure recovery</Text>
    </TouchableOpacity> : null}
  </View>;
}

const styles = StyleSheet.create({
  container: { width: '100%', gap: Spacing.md },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  flexText: { flex: 1, minWidth: 0, gap: 5 },
  labelRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: Radii.pill },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  choice: { flexGrow: 1, flexBasis: 210, minWidth: 0, minHeight: 132, borderWidth: 1.5,
    borderRadius: Radii.lg, padding: Spacing.md, alignItems: 'center', justifyContent: 'center', gap: 7 },
  progressCard: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: Radii.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  stateCard: { width: '100%', borderWidth: 1, borderRadius: Radii.lg, padding: Spacing.md,
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xs },
  pillButton: { minHeight: 38, borderWidth: 1, borderRadius: Radii.pill, paddingHorizontal: Spacing.md,
    paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
});
