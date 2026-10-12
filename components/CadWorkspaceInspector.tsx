import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, Radii, Spacing, Typography } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import type { CadInternalTesterFixture } from '../utils/cadInternalTesterPreview';

const phaseNames = ['Input', 'Inventory', 'Design', 'Build'];

export default function CadWorkspaceInspector({
  phase,
  fixture,
  tour,
}: {
  phase: number;
  fixture: CadInternalTesterFixture;
  tour?: React.ReactNode;
}) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  if (tour) return <View testID="desktop-tour-dock" style={styles.tourDock}>{tour}</View>;

  return (
    <View testID="cad-workspace-context" style={styles.stack}>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>Workspace context</Text>
        <Text accessibilityRole="header" style={[Typography.heading, { color: colors.text }]}>{phaseNames[phase - 1] ?? 'Review'}</Text>
      </View>
      {phase === 1 ? <>
        <View style={styles.card}>
          <View style={styles.cardHeading}>
            <Ionicons name="git-compare-outline" size={18} color={colors.primary} />
            <Text style={[Typography.label, { color: colors.text, flex: 1 }]}>Two equal starting points</Text>
          </View>
          <Text style={styles.body}>Choose one local CAD file from this device or the authorized public sample. Both enter the same review path.</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.cardHeading}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.success} />
            <Text style={[Typography.label, { color: colors.text, flex: 1 }]}>Local-first boundary</Text>
          </View>
          <Text style={styles.body}>The Input prototype does not activate production upload, conversion, provider dispatch, or private persistence.</Text>
        </View>
      </> : null}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Authorized review fixture</Text>
        <Text style={[Typography.bodyStrong, { color: colors.text }]}>{fixture.sourceFileName}</Text>
        <Text style={styles.body}>{fixture.format} · {fixture.units}</Text>
        <View style={styles.metricRow}>
          <View style={styles.metric}><Text style={styles.metricLabel}>Components</Text><Text style={styles.metricValue}>{fixture.meshes}</Text></View>
          <View style={styles.metric}><Text style={styles.metricLabel}>Triangles</Text><Text style={styles.metricValue}>{fixture.triangles.toLocaleString()}</Text></View>
        </View>
        <Text style={styles.body}>{fixture.expectedDimensions.map(value => value.toFixed(2)).join(' × ')} {fixture.units}</Text>
      </View>
      <View style={[styles.card, { borderColor: colors.warning }]}>
        <View style={styles.cardHeading}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
          <Text style={[Typography.label, { color: colors.warning, flex: 1 }]}>Review limit</Text>
        </View>
        <Text style={styles.body}>Visual inspection only. This workspace does not certify tolerances, material, threads, finish, wall thickness, orientation, supports, or fabrication readiness.</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  stack: { gap: Spacing.md },
  tourDock: { width: '100%', minWidth: 0 },
  heading: { gap: 3 },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  card: { gap: Spacing.sm, padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardLabel: { color: colors.mutedText, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  body: { ...Typography.caption, color: colors.mutedText, lineHeight: 19 },
  metricRow: { flexDirection: 'row', gap: Spacing.sm },
  metric: { flex: 1, minWidth: 0, padding: Spacing.sm, borderRadius: Radii.sm, backgroundColor: colors.elevated },
  metricLabel: { color: colors.mutedText, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  metricValue: { color: colors.text, fontSize: 17, fontWeight: '800', marginTop: 2 },
});
