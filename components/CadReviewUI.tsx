import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radii, Spacing, Typography } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import type { CadInternalTesterFixture } from '../utils/cadInternalTesterPreview';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function CadAction({ label, onPress, primary = false, disabled = false, accessibilityLabel = label, testID, icon = 'arrow-forward-outline', role = 'button' }: {
  label: string; onPress?: () => void; primary?: boolean; disabled?: boolean;
  accessibilityLabel?: string; testID?: string; icon?: IconName; role?: 'button' | 'link';
}) {
  const { colors } = useAppTheme();
  const color = disabled ? colors.mutedText : primary ? colors.onPrimary : colors.primary;
  return <TouchableOpacity testID={testID} accessibilityRole={role} accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={[styles.action, { backgroundColor: disabled ? colors.elevated : primary ? colors.primary : 'transparent', borderColor: primary ? colors.primary : colors.border }]}>
    <Text style={[Typography.label, { color, flex: 1, flexShrink: 1 }]}>{label}</Text>
    <Ionicons name={icon} size={18} color={color} accessible={false} />
  </TouchableOpacity>;
}

export function CadDetails({ title, testID, children }: { title: string; testID: string; children: React.ReactNode }) {
  const { colors } = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  return <View style={{ borderTopWidth: 1, borderColor: colors.border }}>
    <TouchableOpacity testID={testID} accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded }} aria-expanded={expanded} aria-controls={`${testID}-content`}
      onPress={() => setExpanded(value => !value)} style={styles.disclosure}>
      <Ionicons name="information-circle-outline" size={19} color={colors.mutedText} accessible={false} />
      <Text style={[Typography.label, { color: colors.mutedText, flex: 1 }]}>{title}</Text>
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.mutedText} accessible={false} />
    </TouchableOpacity>
    {expanded && <View nativeID={`${testID}-content`} testID={`${testID}-content`} style={{ gap: Spacing.sm, paddingBottom: Spacing.md }}>{children}</View>}
  </View>;
}

export function CadNotice({ children, icon = 'alert-circle-outline' }: { children: React.ReactNode; icon?: IconName }) {
  const { colors } = useAppTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm }}>
    <Ionicons name={icon} size={18} color={colors.warning} accessible={false} />
    <Text style={[Typography.caption, { color: colors.warning, flex: 1, lineHeight: 18 }]}>{children}</Text>
  </View>;
}

export function CadSourceFacts({ fixture }: { fixture: CadInternalTesterFixture }) {
  const { colors } = useAppTheme();
  return <View testID="cad-source-facts" style={{ gap: Spacing.sm }}>
    <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' }}>
      <Ionicons name="document-outline" size={20} color={colors.primary} accessible={false} />
      <Text style={[Typography.bodyStrong, { color: colors.text, flex: 1 }]}>{fixture.sourceFileName}</Text>
      <Text style={[Typography.caption, { color: colors.mutedText }]}>{fixture.format}</Text>
    </View>
    <View accessibilityLabel={`Imported extents (X × Y × Z): ${fixture.expectedDimensions.map(value => value.toFixed(2)).join(' × ')} ${fixture.units}`} style={{ flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap' }}>
      {fixture.expectedDimensions.map((value, index) => <View key={index} style={{ flexGrow: 1, gap: Spacing.xs }}>
        <Text style={[Typography.caption, { color: colors.mutedText }]}>{['X', 'Y', 'Z'][index]}</Text>
        <Text style={[Typography.bodyStrong, { color: colors.text }]}>{value.toFixed(2)}</Text>
      </View>)}
    </View>
    <Text style={[Typography.caption, { color: colors.mutedText }]}>Imported extents · Units: {fixture.units}</Text>
  </View>;
}

export function CadProvenance({ fixture }: { fixture: CadInternalTesterFixture }) {
  const { colors } = useAppTheme();
  const text = [Typography.caption, { color: colors.mutedText, lineHeight: 20 }];
  const sourceLabel = fixture.sourceAssetUrl ? 'Public, authorized review fixture' : 'Local internal preview file';
  return <>
    <Text style={text}>Source: {fixture.sourcePackage}</Text>
    <Text style={text}>Source confidence: {fixture.sourceConfidence}</Text>
    <Text style={text}>{fixture.meshes} {fixture.previewGeometry.kind === 'stl' ? 'connected components' : 'mesh'} · {fixture.vertices.toLocaleString()} vertices · {fixture.triangles.toLocaleString()} triangles</Text>
    <Text style={text}>{fixture.bytes.toLocaleString()} bytes · {sourceLabel}</Text>
  </>;
}

export const cadReviewStyles = StyleSheet.create({
  stack: { gap: Spacing.md },
  header: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  headerIcon: { width: 46, height: 46, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  panel: { borderWidth: 1, borderRadius: Radii.lg, padding: Spacing.md, gap: Spacing.md },
});
const styles = StyleSheet.create({
  action: { minHeight: 48, borderWidth: 1, borderRadius: Radii.md, paddingHorizontal: Spacing.md, paddingVertical: 12, flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  disclosure: { minHeight: 48, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
});
