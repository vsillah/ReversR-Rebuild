import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppColors, Fonts, Radii, Spacing } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import ReversRLogoMark from './ReversRLogoMark';
import DesktopNavigation, { type DesktopProjectNavItem } from './DesktopNavigation';
import {
  DESKTOP_INSPECTOR_COLLAPSE_WIDTH,
  DESKTOP_INSPECTOR_DEFAULT,
  DESKTOP_INSPECTOR_MIN,
  clampDesktopInspectorWidth,
  nextDesktopInspectorWidth,
} from '../utils/desktopErgonomics';

const DESKTOP_PRESENTATION_STORAGE_KEY = 'reversr-desktop-presentation:v1';

type Props = {
  children: React.ReactNode;
  active?: 'home' | 'projects' | 'tour' | 'more' | null;
  phaseRail?: React.ReactNode;
  inspector?: React.ReactNode;
  wideCanvas?: boolean;
  canvasScrollable?: boolean;
  paddedCanvas?: boolean;
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
  projects?: readonly DesktopProjectNavItem[];
  selectedProjectId?: string;
  onSelectProject?: (projectId: string) => void;
};

export default function DesktopCadWorkspace({
  children,
  active = null,
  phaseRail,
  inspector,
  wideCanvas = false,
  canvasScrollable = true,
  paddedCanvas = true,
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
  projects,
  selectedProjectId,
  onSelectProject,
}: Props) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const compactRail = width < 1280;
  const [inspectorWidth, setInspectorWidth] = useState(DESKTOP_INSPECTOR_DEFAULT);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [narrowInspectorOpen, setNarrowInspectorOpen] = useState(false);
  const [resizeHandleFocused, setResizeHandleFocused] = useState(false);
  const resizeStartRef = useRef<{ x: number; width: number } | null>(null);
  const previousWorkspaceWidthRef = useRef(width);
  const hasInspector = Boolean(inspector);
  const inspectorVisible = Boolean(inspector) && inspectorOpen && (width >= DESKTOP_INSPECTOR_COLLAPSE_WIDTH || narrowInspectorOpen);
  const workspaceWidth = width - (compactRail ? 72 : 216);
  const inspectorMaxWidth = clampDesktopInspectorWidth(Math.floor(workspaceWidth * 0.46));
  const effectiveInspectorWidth = clampDesktopInspectorWidth(Math.min(inspectorWidth, inspectorMaxWidth));
  const styles = createStyles(colors);

  const persistPresentation = useCallback((nextWidth: number, nextOpen: boolean) => {
    AsyncStorage.setItem(DESKTOP_PRESENTATION_STORAGE_KEY, JSON.stringify({
      version: 1,
      inspectorWidth: clampDesktopInspectorWidth(nextWidth),
      inspectorOpen: nextOpen,
    })).catch(error => console.warn('Failed to save desktop presentation preferences', error));
  }, []);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(DESKTOP_PRESENTATION_STORAGE_KEY).then(raw => {
      if (!mounted || !raw) return;
      const parsed = JSON.parse(raw) as { inspectorWidth?: unknown; inspectorOpen?: unknown };
      setInspectorWidth(clampDesktopInspectorWidth(parsed.inspectorWidth));
      if (typeof parsed.inspectorOpen === 'boolean') setInspectorOpen(parsed.inspectorOpen);
    }).catch(error => console.warn('Failed to load desktop presentation preferences', error));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const wasWide = previousWorkspaceWidthRef.current >= DESKTOP_INSPECTOR_COLLAPSE_WIDTH;
    const isNarrow = width < DESKTOP_INSPECTOR_COLLAPSE_WIDTH;
    if (wasWide && isNarrow) setNarrowInspectorOpen(false);
    previousWorkspaceWidthRef.current = width;
  }, [width]);

  useEffect(() => {
    if (active !== 'tour' || !hasInspector) return;
    setInspectorOpen(true);
    if (width < DESKTOP_INSPECTOR_COLLAPSE_WIDTH) setNarrowInspectorOpen(true);
  }, [active, hasInspector, width]);

  useEffect(() => {
    if (!inspector || typeof document === 'undefined') return undefined;
    const focusInspector = () => {
      setInspectorOpen(true);
      if (width < DESKTOP_INSPECTOR_COLLAPSE_WIDTH) setNarrowInspectorOpen(true);
      persistPresentation(inspectorWidth, true);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        (document.querySelector('[data-testid="desktop-workspace-inspector"]') as HTMLElement | null)?.focus({ preventScroll: true });
      }));
    };
    document.addEventListener('reversr:focus-inspector', focusInspector);
    return () => document.removeEventListener('reversr:focus-inspector', focusInspector);
  }, [inspector, inspectorWidth, persistPresentation, width]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onPointerMove = (event: PointerEvent) => {
      const start = resizeStartRef.current;
      if (!start) return;
      setInspectorWidth(Math.min(clampDesktopInspectorWidth(start.width + start.x - event.clientX), inspectorMaxWidth));
    };
    const finishPointerResize = () => {
      if (!resizeStartRef.current) return;
      resizeStartRef.current = null;
      setInspectorWidth(current => {
        const next = clampDesktopInspectorWidth(current);
        persistPresentation(next, inspectorOpen);
        return next;
      });
    };
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', finishPointerResize);
    document.addEventListener('pointercancel', finishPointerResize);
    window.addEventListener('blur', finishPointerResize);
    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', finishPointerResize);
      document.removeEventListener('pointercancel', finishPointerResize);
      window.removeEventListener('blur', finishPointerResize);
    };
  }, [inspectorMaxWidth, inspectorOpen, persistPresentation]);

  const toggleInspector = () => {
    if (!inspector) return;
    if (width < DESKTOP_INSPECTOR_COLLAPSE_WIDTH) {
      if (inspectorVisible) {
        setNarrowInspectorOpen(false);
      } else {
        setInspectorOpen(true);
        setNarrowInspectorOpen(true);
        persistPresentation(inspectorWidth, true);
      }
      return;
    }
    const next = !inspectorOpen;
    if (!next && typeof document !== 'undefined') {
      const inspectorElement = document.querySelector('[data-testid="desktop-workspace-inspector"]');
      if (inspectorElement?.contains(document.activeElement)) {
        (document.querySelector('[data-testid="desktop-workspace-canvas"]') as HTMLElement | null)?.focus({ preventScroll: true });
      }
    }
    setInspectorOpen(next);
    persistPresentation(inspectorWidth, next);
  };

  const resizeInspectorFromKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const supported = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', '0'];
    if (!supported.includes(event.key)) return;
    event.preventDefault();
    const next = Math.min(nextDesktopInspectorWidth(inspectorWidth, event.key), inspectorMaxWidth);
    setInspectorWidth(next);
    persistPresentation(next, inspectorOpen);
  };

  const resetInspector = () => {
    setInspectorWidth(DESKTOP_INSPECTOR_DEFAULT);
    persistPresentation(DESKTOP_INSPECTOR_DEFAULT, inspectorOpen);
  };

  return (
    <View testID="desktop-cad-workspace" style={styles.shell}>
      <DesktopNavigation
        rail
        compact={compactRail}
        active={active}
        onHome={onHome}
        onProjects={onProjects}
        onNew={onNew}
        onTour={onTour}
        onMore={onMore}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={onSelectProject}
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
            {inspector ? <TouchableOpacity
              testID="desktop-workspace-inspector-toggle"
              accessibilityRole="button"
              accessibilityLabel={inspectorVisible ? 'Hide workspace inspector' : 'Show workspace inspector'}
              accessibilityState={{ expanded: inspectorVisible }}
              onPress={toggleInspector}
              style={[styles.iconButton, inspectorVisible && styles.iconButtonActive]}
            >
              <Ionicons name={inspectorVisible ? 'reader' : 'reader-outline'} size={20} color={inspectorVisible ? colors.primary : colors.text} />
            </TouchableOpacity> : null}
            <TouchableOpacity testID="desktop-workspace-more" accessibilityRole="button" accessibilityLabel="Open settings" onPress={onMore} style={styles.iconButton}>
              <Ionicons name="settings-outline" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
        {phaseRail ? <View testID="desktop-workspace-phase-rail" style={styles.phaseRail}>
          <View style={styles.phaseRailInner}>{phaseRail}</View>
        </View> : null}
        <View style={styles.workArea}>
          {canvasScrollable ? <ScrollView
            testID="desktop-workspace-canvas"
            style={styles.canvasScroll}
            tabIndex={-1}
            accessibilityLabel="Workspace canvas"
            contentContainerStyle={[styles.canvasContent, !paddedCanvas && styles.canvasContentFlush, wideCanvas && styles.canvasContentWide]}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView> : <View
            testID="desktop-workspace-canvas"
            tabIndex={-1}
            accessibilityLabel="Workspace canvas"
            style={[styles.canvasView, paddedCanvas && styles.canvasViewPadded, wideCanvas && styles.canvasViewWide]}
          >
            {children}
          </View>}
          {inspectorVisible ? <>
            {React.createElement('div', {
              role: 'separator',
              tabIndex: 0,
              'aria-label': 'Resize workspace inspector',
              'aria-orientation': 'vertical',
              'aria-valuemin': DESKTOP_INSPECTOR_MIN,
              'aria-valuemax': inspectorMaxWidth,
              'aria-valuenow': effectiveInspectorWidth,
              'data-testid': 'desktop-workspace-inspector-resize',
              onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
                event.preventDefault();
                resizeStartRef.current = { x: event.clientX, width: effectiveInspectorWidth };
                event.currentTarget.focus();
              },
              onKeyDown: resizeInspectorFromKeyboard,
              onFocus: () => setResizeHandleFocused(true),
              onBlur: () => setResizeHandleFocused(false),
              style: {
                width: 12, minWidth: 12, cursor: 'col-resize', background: resizeHandleFocused ? colors.primarySoft : colors.background,
                borderLeft: `1px solid ${resizeHandleFocused ? colors.primary : colors.hairline}`,
                borderRight: `1px solid ${resizeHandleFocused ? colors.primary : colors.hairline}`,
                outline: resizeHandleFocused ? `2px solid ${colors.primary}` : 'none', outlineOffset: -3,
              },
            })}
            <View style={[styles.inspectorPane, { width: effectiveInspectorWidth, minWidth: effectiveInspectorWidth, maxWidth: effectiveInspectorWidth }]}>
              <View style={styles.inspectorToolbar}>
                <Text style={styles.inspectorSizeLabel}>{effectiveInspectorWidth}px inspector</Text>
                <TouchableOpacity testID="desktop-workspace-inspector-reset" accessibilityRole="button" accessibilityLabel="Reset inspector width" onPress={resetInspector} style={styles.resetButton}>
                  <Ionicons name="refresh-outline" size={15} color={colors.primary} />
                  <Text style={styles.resetButtonText}>Reset</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                testID="desktop-workspace-inspector"
                tabIndex={-1}
                accessibilityLabel="Workspace inspector"
                style={styles.inspector}
                contentContainerStyle={styles.inspectorContent}
                showsVerticalScrollIndicator
                nestedScrollEnabled
              >
                {inspector}
              </ScrollView>
            </View>
          </> : null}
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  shell: { flex: 1, minWidth: 0, minHeight: 0, flexDirection: 'row', overflow: 'hidden', backgroundColor: colors.background },
  workspace: { flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden' },
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
  iconButtonActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  phaseRail: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.hairline, backgroundColor: colors.background },
  phaseRailInner: { width: '100%', maxWidth: 980, alignSelf: 'flex-start' },
  workArea: { flex: 1, minHeight: 0, minWidth: 0, flexDirection: 'row', overflow: 'hidden' },
  canvasScroll: { flex: 1, minWidth: 0 },
  canvasContent: { flexGrow: 1, width: '100%', maxWidth: 1120, alignSelf: 'center', padding: Spacing.lg },
  canvasContentFlush: { maxWidth: '100%', padding: 0 },
  canvasContentWide: { maxWidth: 1600 },
  canvasView: { flex: 1, minWidth: 0, minHeight: 0, width: '100%', maxWidth: '100%', alignSelf: 'stretch' },
  canvasViewPadded: { maxWidth: 1120, padding: Spacing.lg },
  canvasViewWide: { maxWidth: 1600 },
  inspectorPane: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', minHeight: 0, overflow: 'hidden', backgroundColor: colors.panel },
  inspectorToolbar: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, paddingHorizontal: Spacing.md, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  inspectorSizeLabel: { color: colors.mutedText, fontSize: 11, fontWeight: '700' },
  resetButton: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing.sm, borderRadius: Radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  resetButtonText: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  inspector: { flex: 1, minHeight: 0 },
  inspectorContent: { flexGrow: 1, padding: Spacing.md, paddingBottom: Spacing.xl, gap: Spacing.md },
});
