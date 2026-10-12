import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, Fonts, Radii, Spacing } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import ReversRLogoMark from './ReversRLogoMark';
import DesktopNavigation from './DesktopNavigation';

type Props = {
  children: React.ReactNode;
  phaseRail: React.ReactNode;
  inspector?: React.ReactNode;
  wideCanvas?: boolean;
  userDisplayName: string;
  workspaceName: string;
  userAvatarUri?: string;
  userHasProfileIdentity: boolean;
  appearanceIcon: 'moon-outline' | 'sunny-outline';
  onHome: () => void;
  onProjects: () => void;
  onNew: () => void;
  onTour: () => void;
  onMore: () => void;
  onProfile: () => void;
  onToggleAppearance: () => void;
};

export default function DesktopCadWorkspace({
  children,
  phaseRail,
  inspector,
  wideCanvas = false,
  userDisplayName,
  workspaceName,
  userAvatarUri,
  userHasProfileIdentity,
  appearanceIcon,
  onHome,
  onProjects,
  onNew,
  onTour,
  onMore,
  onProfile,
  onToggleAppearance,
}: Props) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const compactRail = width < 1280;
  const inspectorWidth = width >= 1600 ? 360 : width >= 1280 ? 336 : 300;
  const styles = createStyles(colors);

  return (
    <View testID="desktop-cad-workspace" style={styles.shell}>
      <DesktopNavigation
        rail
        compact={compactRail}
        active={null}
        onHome={onHome}
        onProjects={onProjects}
        onNew={onNew}
        onTour={onTour}
        onMore={onMore}
      />
      <View style={styles.workspace}>
        <View testID="desktop-workspace-header" style={styles.header}>
          <View style={styles.identity}>
            <ReversRLogoMark colors={colors} size={36} />
            <View style={styles.identityCopy}>
              <Text style={styles.wordmark}>REVERS<Text style={styles.wordmarkAccent}>R</Text></Text>
              <Text style={styles.subtitle} numberOfLines={1}>Machine Reconstruction · {workspaceName} workspace</Text>
            </View>
          </View>
          <View style={styles.accountActions}>
            <TouchableOpacity
              testID="desktop-workspace-profile"
              accessibilityRole="button"
              accessibilityLabel={userHasProfileIdentity ? `Open profile for ${userDisplayName}` : 'Open guest profile'}
              onPress={onProfile}
              style={[styles.profile, userHasProfileIdentity && styles.profileActive]}
            >
              {userAvatarUri ? <Image source={{ uri: userAvatarUri }} style={styles.avatar} />
                : <Ionicons name={userHasProfileIdentity ? 'person-circle-outline' : 'person-outline'} size={19} color={userHasProfileIdentity ? colors.accent : colors.mutedText} />}
              <Text numberOfLines={1} style={[styles.profileText, userHasProfileIdentity && { color: colors.accent }]}>{userDisplayName}</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="desktop-workspace-appearance" accessibilityRole="button" accessibilityLabel={appearanceIcon === 'moon-outline' ? 'Use dark mode' : 'Use light mode'} onPress={onToggleAppearance} style={styles.iconButton}>
              <Ionicons name={appearanceIcon} size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity testID="desktop-workspace-more" accessibilityRole="button" accessibilityLabel="Open settings" onPress={onMore} style={styles.iconButton}>
              <Ionicons name="settings-outline" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
        <View testID="desktop-workspace-phase-rail" style={styles.phaseRail}>
          <View style={styles.phaseRailInner}>{phaseRail}</View>
        </View>
        <View style={styles.workArea}>
          <ScrollView
            testID="desktop-workspace-canvas"
            style={styles.canvasScroll}
            contentContainerStyle={[styles.canvasContent, wideCanvas && styles.canvasContentWide]}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          {inspector ? <ScrollView
              testID="desktop-workspace-inspector"
              style={[styles.inspector, { width: inspectorWidth, minWidth: inspectorWidth, maxWidth: inspectorWidth }]}
              contentContainerStyle={styles.inspectorContent}
              showsVerticalScrollIndicator
              nestedScrollEnabled
            >
              {inspector}
            </ScrollView> : null}
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  shell: { flex: 1, minWidth: 0, flexDirection: 'row', backgroundColor: colors.background },
  workspace: { flex: 1, minWidth: 0 },
  header: {
    minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.hairline,
    backgroundColor: colors.panel, zIndex: 4,
  },
  identity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  identityCopy: { flex: 1, minWidth: 0 },
  wordmark: { color: colors.text, fontFamily: Fonts.brand, fontSize: 17, lineHeight: 21, letterSpacing: 1.4 },
  wordmarkAccent: { color: colors.accent },
  subtitle: { color: colors.mutedText, fontSize: 11, letterSpacing: 0.35 },
  accountActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexShrink: 0 },
  profile: {
    maxWidth: 172, minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 11, borderRadius: Radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  profileActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  profileText: { maxWidth: 124, color: colors.mutedText, fontSize: 12, fontWeight: '800' },
  avatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.elevated },
  iconButton: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.pill,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  phaseRail: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.hairline, backgroundColor: colors.background },
  phaseRailInner: { width: '100%', maxWidth: 980, alignSelf: 'flex-start' },
  workArea: { flex: 1, minHeight: 0, minWidth: 0, flexDirection: 'row' },
  canvasScroll: { flex: 1, minWidth: 0 },
  canvasContent: { flexGrow: 1, width: '100%', maxWidth: 1120, alignSelf: 'center', padding: Spacing.lg },
  canvasContentWide: { maxWidth: 1600 },
  inspector: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', borderLeftWidth: 1, borderLeftColor: colors.hairline, backgroundColor: colors.panel },
  inspectorContent: { flexGrow: 1, padding: Spacing.md, gap: Spacing.md },
});
