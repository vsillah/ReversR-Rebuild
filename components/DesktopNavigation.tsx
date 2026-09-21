import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts, Radii, Spacing } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import type { BottomTab } from './ui';

type Props = {
  active: BottomTab | null;
  onHome: () => void;
  onProjects: () => void;
  onNew: () => void;
  onTour: () => void;
  onMore: () => void;
};

/** In-flow workspace navigation for wide web: never covers content or depends on bottom padding. */
export default function DesktopNavigation({ active, onHome, onProjects, onNew, onTour, onMore }: Props) {
  const { colors } = useAppTheme();
  const item = (key: BottomTab, label: string, icon: keyof typeof Ionicons.glyphMap, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-pressed={active === key}
      onPress={onPress}
      testID={`desktop-nav-${key}`}
      style={({ pressed }) => [styles.item, {
        backgroundColor: active === key || pressed ? colors.primarySoft : 'transparent',
        borderColor: active === key ? colors.primary : 'transparent',
      }]}
    >
      <Ionicons name={icon} size={18} color={active === key ? colors.primary : colors.mutedText} />
      <Text style={[styles.label, { color: active === key ? colors.primary : colors.text }]}>{label}</Text>
    </Pressable>
  );
  return (
    <View testID="desktop-navigation" role="navigation" accessibilityLabel="Workspace" style={[styles.bar, { backgroundColor: colors.panel, borderBottomColor: colors.hairline }]}>
      <View style={styles.group}>
        {item('home', 'Home', 'home-outline', onHome)}
        {item('projects', 'Projects', 'albums-outline', onProjects)}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="New Reconstruction"
        onPress={onNew}
        testID="desktop-nav-new"
        style={({ pressed }) => [styles.item, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
      >
        <Ionicons name="add" size={20} color={colors.onPrimary} />
        <Text style={[styles.label, { color: colors.onPrimary }]}>New Reconstruction</Text>
      </Pressable>
      <View style={[styles.group, { justifyContent: 'flex-end' }]}>
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
});
