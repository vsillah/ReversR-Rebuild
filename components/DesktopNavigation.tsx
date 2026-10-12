import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts, Radii, Spacing } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import type { BottomTab } from './ui';

type Props = {
  active: BottomTab | null;
  rail?: boolean;
  compact?: boolean;
  onHome: () => void;
  onProjects: () => void;
  onNew: () => void;
  onTour: () => void;
  onMore: () => void;
};

/** In-flow workspace navigation for wide web: never covers content or depends on bottom padding. */
export default function DesktopNavigation({ active, rail = false, compact = false, onHome, onProjects, onNew, onTour, onMore }: Props) {
  const { colors } = useAppTheme();
  const item = (key: BottomTab, label: string, icon: keyof typeof Ionicons.glyphMap, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-pressed={active === key}
      onPress={onPress}
      testID={`desktop-nav-${key}`}
      style={({ pressed }) => [styles.item, rail && styles.railItem, compact && styles.compactItem, {
        backgroundColor: active === key || pressed ? colors.primarySoft : 'transparent',
        borderColor: active === key ? colors.primary : 'transparent',
      }]}
    >
      <Ionicons name={icon} size={18} color={active === key ? colors.primary : colors.mutedText} />
      {!compact && <Text style={[styles.label, { color: active === key ? colors.primary : colors.text }]}>{label}</Text>}
    </Pressable>
  );
  return (
    <View testID="desktop-navigation" role="navigation" accessibilityLabel="Workspace" style={[styles.bar, rail && styles.rail, compact && styles.compactRail, { backgroundColor: colors.panel, borderBottomColor: colors.hairline, borderRightColor: colors.hairline }]}>
      <View style={[styles.group, rail && styles.railGroup]}>
        {item('home', 'Home', 'home-outline', onHome)}
        {item('projects', 'Projects', 'albums-outline', onProjects)}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="New Reconstruction"
        onPress={onNew}
        testID="desktop-nav-new"
        style={({ pressed }) => [styles.item, rail && styles.railItem, compact && styles.compactItem, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
      >
        <Ionicons name="add" size={20} color={colors.onPrimary} />
        {!compact && <Text style={[styles.label, { color: colors.onPrimary }]}>{rail ? 'New' : 'New Reconstruction'}</Text>}
      </Pressable>
      <View style={[styles.group, rail && styles.railGroup, { justifyContent: 'flex-end' }]}>
        {item('tour', 'Tour', 'compass-outline', onTour)}
        {item('more', 'More', 'ellipsis-horizontal', onMore)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderBottomWidth: 1, flexShrink: 0 },
  group: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, minHeight: 44, paddingHorizontal: Spacing.md, borderRadius: Radii.md, borderWidth: 1 },
  label: { fontFamily: Fonts.semibold, fontSize: 14 },
  rail: { width: 216, flexDirection: 'column', alignItems: 'stretch', gap: Spacing.md, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.md, borderBottomWidth: 0, borderRightWidth: 1 },
  compactRail: { width: 72, paddingHorizontal: 8 },
  railGroup: { width: '100%', flexDirection: 'column', alignItems: 'stretch' },
  railItem: { width: '100%', justifyContent: 'flex-start', minHeight: 46, paddingHorizontal: Spacing.md },
  compactItem: { width: 54, paddingHorizontal: 0, justifyContent: 'center' },
});
