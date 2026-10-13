import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts, Radii, Spacing } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import type { BottomTab } from './ui';
import { isDesktopShortcutEditableTarget, resolveDesktopShortcut } from '../utils/desktopErgonomics';

type Props = {
  active: BottomTab | null;
  rail?: boolean;
  compact?: boolean;
  onHome: () => void;
  onProjects: () => void;
  onNew: () => void;
  onTour: () => void;
  onMore: () => void;
  projects?: readonly DesktopProjectNavItem[];
  selectedProjectId?: string;
  onSelectProject?: (projectId: string) => void;
};

export type DesktopProjectNavItem = {
  id: string;
  title: string;
  phaseLabel: string;
  inventoryLabel?: string;
  updatedLabel?: string;
};

/** In-flow workspace navigation for wide web: never covers content or depends on bottom padding. */
export default function DesktopNavigation({ active, rail = false, compact = false, onHome, onProjects, onNew, onTour, onMore,
  projects = [], selectedProjectId, onSelectProject }: Props) {
  const { colors } = useAppTheme();
  const [shortcutReferenceOpen, setShortcutReferenceOpen] = useState(false);
  const [projectsExpanded, setProjectsExpanded] = useState(active === 'projects');
  const [focusedProjectId, setFocusedProjectId] = useState<string | null>(null);
  const [projectsButtonFocused, setProjectsButtonFocused] = useState(false);
  const actionsRef = useRef({ onHome, onProjects, onNew, onTour, onMore });
  const projectsButtonRef = useRef<any>(null);
  const projectRowRefs = useRef<Array<any>>([]);
  const referenceOpenRef = useRef(shortcutReferenceOpen);
  const prefixActiveRef = useRef(false);
  const prefixTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  actionsRef.current = { onHome, onProjects, onNew, onTour, onMore };
  referenceOpenRef.current = shortcutReferenceOpen;

  useEffect(() => {
    if (active === 'projects' && !compact) setProjectsExpanded(true);
  }, [active, compact]);

  useEffect(() => {
    if (!rail || typeof window === 'undefined') return undefined;
    const resetPrefix = () => {
      prefixActiveRef.current = false;
      if (prefixTimerRef.current) clearTimeout(prefixTimerRef.current);
      prefixTimerRef.current = null;
    };
    const focusRegion = (testId: string) => {
      const region = document.querySelector(`[data-testid="${testId}"]`) as HTMLElement | null;
      region?.focus({ preventScroll: true });
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      if (referenceOpenRef.current) {
        if (event.key === 'Escape') {
          event.preventDefault();
          setShortcutReferenceOpen(false);
        }
        return;
      }
      const modalOpen = Boolean(document.querySelector('[role="dialog"], [aria-modal="true"], [data-testid="reversr-tour-settings"]'));
      if (modalOpen || isDesktopShortcutEditableTarget(event.target)) {
        resetPrefix();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) {
        resetPrefix();
        return;
      }
      if (event.key === '?') {
        event.preventDefault();
        resetPrefix();
        setShortcutReferenceOpen(true);
        return;
      }
      const shortcut = resolveDesktopShortcut(event.key, prefixActiveRef.current);
      if (shortcut === 'prefix') {
        resetPrefix();
        prefixActiveRef.current = true;
        prefixTimerRef.current = setTimeout(resetPrefix, 900);
        return;
      }
      if (!shortcut) {
        resetPrefix();
        return;
      }
      event.preventDefault();
      resetPrefix();
      const actions = actionsRef.current;
      if (shortcut === 'home') actions.onHome();
      else if (shortcut === 'projects') actions.onProjects();
      else if (shortcut === 'new') actions.onNew();
      else if (shortcut === 'tour') actions.onTour();
      else if (shortcut === 'settings') actions.onMore();
      else if (shortcut === 'canvas') focusRegion('desktop-workspace-canvas');
      else if (shortcut === 'inspector') {
        const inspector = document.querySelector('[data-testid="desktop-workspace-inspector"]');
        if (inspector) focusRegion('desktop-workspace-inspector');
        else document.dispatchEvent(new Event('reversr:focus-inspector'));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      resetPrefix();
    };
  }, [rail]);
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
  const openProjects = () => {
    if (!compact && active === 'projects') setProjectsExpanded(expanded => !expanded);
    else if (!compact) setProjectsExpanded(true);
    onProjects();
  };
  const focusProjectRow = (index: number) => {
    const bounded = Math.max(0, Math.min(projects.length - 1, index));
    projectRowRefs.current[bounded]?.focus?.();
  };
  const onProjectRowKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusProjectRow(index + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusProjectRow(index - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusProjectRow(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusProjectRow(projects.length - 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'Escape') {
      event.preventDefault();
      setProjectsExpanded(false);
      projectsButtonRef.current?.focus?.();
    }
  };
  return (
    <View testID="desktop-navigation" role="navigation" accessibilityLabel="Workspace" style={[styles.bar, rail && styles.rail, compact && styles.compactRail, { backgroundColor: colors.panel, borderBottomColor: colors.hairline, borderRightColor: colors.hairline }]}>
      {rail ? <>
        <View style={styles.railPrimary}>
          {item('home', 'Home', 'home-outline', onHome)}
          <Pressable
            ref={projectsButtonRef}
            accessibilityRole="button"
            accessibilityLabel="Projects"
            accessibilityState={{ selected: active === 'projects', expanded: compact ? undefined : projectsExpanded }}
            aria-expanded={compact ? undefined : projectsExpanded}
            aria-controls={compact ? undefined : 'desktop-project-tree'}
            onPress={openProjects}
            onFocus={() => setProjectsButtonFocused(true)}
            onBlur={() => setProjectsButtonFocused(false)}
            {...({ onKeyDown: (event: React.KeyboardEvent) => {
              if (compact) return;
              if (event.key === 'ArrowRight') { event.preventDefault(); setProjectsExpanded(true); }
              if (event.key === 'ArrowLeft') { event.preventDefault(); setProjectsExpanded(false); }
              if (event.key === 'ArrowDown' && projectsExpanded && projects.length) { event.preventDefault(); focusProjectRow(0); }
            } } as any)}
            testID="desktop-nav-projects"
            style={({ pressed }) => [styles.item, styles.railItem, compact && styles.compactItem, {
              backgroundColor: active === 'projects' || pressed ? colors.primarySoft : 'transparent',
              borderColor: projectsButtonFocused || active === 'projects' ? colors.primary : 'transparent',
            }]}
          >
            <Ionicons name="albums-outline" size={18} color={active === 'projects' ? colors.primary : colors.mutedText} />
            {!compact ? <>
              <Text style={[styles.label, styles.projectDisclosureLabel, { color: active === 'projects' ? colors.primary : colors.text }]}>Projects</Text>
              <Ionicons name={projectsExpanded ? 'chevron-down' : 'chevron-forward'} size={15} color={colors.mutedText} />
            </> : null}
          </Pressable>
          {!compact && projectsExpanded ? <View nativeID="desktop-project-tree" role="tree" accessibilityLabel="Saved projects" style={styles.projectTree}>
            {projects.length ? <ScrollView
              testID="desktop-project-list"
              style={styles.projectList}
              contentContainerStyle={styles.projectListContent}
              showsVerticalScrollIndicator
              nestedScrollEnabled
            >
              {projects.map((project, index) => {
                const selected = project.id === selectedProjectId;
                return <Pressable
                  key={project.id}
                  ref={(node: any) => { projectRowRefs.current[index] = node; }}
                  role="treeitem"
                  accessibilityRole="button"
                  accessibilityLabel={`${project.title}, ${project.phaseLabel}${project.inventoryLabel ? `, ${project.inventoryLabel}` : ''}${project.updatedLabel ? `, updated ${project.updatedLabel}` : ''}`}
                  accessibilityState={{ selected }}
                  aria-selected={selected}
                  onPress={() => onSelectProject?.(project.id)}
                  onFocus={() => setFocusedProjectId(project.id)}
                  onBlur={() => setFocusedProjectId(current => current === project.id ? null : current)}
                  {...({ onKeyDown: (event: React.KeyboardEvent) => onProjectRowKeyDown(event, index) } as any)}
                  testID={`desktop-project-${project.id}`}
                  style={({ pressed }) => [styles.projectRow, {
                    backgroundColor: selected || pressed ? colors.primarySoft : 'transparent',
                    borderColor: focusedProjectId === project.id || selected ? colors.primary : 'transparent',
                  }]}
                >
                  <Text numberOfLines={1} style={[styles.projectTitle, { color: selected ? colors.primary : colors.text }]}>{project.title}</Text>
                  <Text numberOfLines={1} style={[styles.projectMeta, { color: colors.mutedText }]}>
                    {[project.phaseLabel, project.inventoryLabel, project.updatedLabel].filter(Boolean).join(' · ')}
                  </Text>
                </Pressable>;
              })}
            </ScrollView> : <View testID="desktop-project-empty" style={styles.projectEmpty}>
              <Text style={[styles.projectEmptyText, { color: colors.mutedText }]}>No saved projects</Text>
            </View>}
          </View> : null}
        </View>
        <View style={styles.railBottom}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="New Reconstruction"
            onPress={onNew}
            testID="desktop-nav-new"
            style={({ pressed }) => [styles.item, styles.railItem, compact && styles.compactItem, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
          >
            <Ionicons name="add" size={20} color={colors.onPrimary} />
            {!compact && <Text style={[styles.label, { color: colors.onPrimary }]}>New</Text>}
          </Pressable>
          {item('tour', 'Tour', 'compass-outline', onTour)}
        {rail ? <Pressable
          accessibilityRole="button"
          accessibilityLabel="Keyboard shortcuts"
          accessibilityHint="Open the desktop shortcut reference. Press question mark from the workspace to open it."
          onPress={() => setShortcutReferenceOpen(true)}
          testID="desktop-nav-shortcuts"
          style={({ pressed }) => [styles.item, styles.railItem, compact && styles.compactItem, {
            backgroundColor: pressed ? colors.primarySoft : 'transparent', borderColor: 'transparent',
          }]}
        >
          <Ionicons name="keypad-outline" size={18} color={colors.mutedText} />
          {!compact && <Text style={[styles.label, { color: colors.text }]}>Shortcuts</Text>}
        </Pressable> : null}
        {item('more', 'More', 'ellipsis-horizontal', onMore)}
        </View>
      </> : <>
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
      </>}
      <Modal visible={shortcutReferenceOpen} transparent animationType="fade" onRequestClose={() => setShortcutReferenceOpen(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} accessibilityViewIsModal>
          <View role="dialog" aria-modal={true} aria-label="Desktop keyboard shortcuts" testID="desktop-shortcut-reference" style={[styles.shortcutPanel, { backgroundColor: colors.panel, borderColor: colors.border }]}>
            <View style={styles.shortcutHeader}>
              <View style={styles.shortcutTitleGroup}>
                <Text style={[styles.shortcutTitle, { color: colors.text }]}>Keyboard shortcuts</Text>
                <Text style={[styles.shortcutSubtitle, { color: colors.mutedText }]}>Press G, then the destination key.</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close keyboard shortcuts" onPress={() => setShortcutReferenceOpen(false)} style={[styles.closeButton, { borderColor: colors.border }]}>
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>
            {[
              ['G H', 'Home'], ['G P', 'Projects'], ['G N', 'New reconstruction'], ['G T', 'Tour'], ['G S', 'Account and settings'],
              ['G C', 'Focus work canvas'], ['G I', 'Focus inspector when available'], ['?', 'Open this reference'], ['Esc', 'Close this reference'],
            ].map(([keys, label]) => <View key={keys} style={[styles.shortcutRow, { borderTopColor: colors.hairline }]}>
              <Text style={[styles.shortcutKeys, { color: colors.primary, backgroundColor: colors.primarySoft }]}>{keys}</Text>
              <Text style={[styles.shortcutLabel, { color: colors.text }]}>{label}</Text>
            </View>)}
            <Text style={[styles.shortcutNote, { color: colors.mutedText }]}>Shortcuts pause while fields or dialogs own focus. Browser and operating-system shortcuts remain unchanged.</Text>
          </View>
        </View>
      </Modal>
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
  railPrimary: { flex: 1, minHeight: 0, width: '100%', gap: Spacing.xs },
  railBottom: { width: '100%', gap: Spacing.xs },
  railItem: { width: '100%', justifyContent: 'flex-start', minHeight: 46, paddingHorizontal: Spacing.md },
  compactItem: { width: 54, paddingHorizontal: 0, justifyContent: 'center' },
  projectDisclosureLabel: { flex: 1, minWidth: 0 },
  projectTree: { flex: 1, minHeight: 0, marginLeft: Spacing.sm, borderLeftWidth: 1, borderLeftColor: 'transparent' },
  projectList: { flex: 1, minHeight: 0 },
  projectListContent: { gap: 2, paddingLeft: Spacing.sm, paddingBottom: Spacing.sm },
  projectRow: { minHeight: 48, justifyContent: 'center', gap: 2, paddingHorizontal: Spacing.sm, paddingVertical: 6, borderWidth: 1, borderRadius: Radii.sm },
  projectTitle: { fontFamily: Fonts.semibold, fontSize: 12 },
  projectMeta: { fontSize: 10, lineHeight: 14 },
  projectEmpty: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  projectEmptyText: { fontSize: 11, lineHeight: 16 },
  modalOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  shortcutPanel: { width: '100%', maxWidth: 520, maxHeight: '88%', borderWidth: 1, borderRadius: Radii.lg, padding: Spacing.lg },
  shortcutHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, marginBottom: Spacing.sm },
  shortcutTitleGroup: { flex: 1, minWidth: 0 },
  shortcutTitle: { fontFamily: Fonts.bold, fontSize: 20 },
  shortcutSubtitle: { fontSize: 13, marginTop: 3 },
  closeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: Radii.pill },
  shortcutRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderTopWidth: 1 },
  shortcutKeys: { minWidth: 54, overflow: 'hidden', borderRadius: Radii.sm, paddingHorizontal: 8, paddingVertical: 5, textAlign: 'center', fontFamily: Fonts.bold, fontSize: 12 },
  shortcutLabel: { flex: 1, fontSize: 14, fontFamily: Fonts.medium },
  shortcutNote: { fontSize: 12, lineHeight: 18, marginTop: Spacing.md },
});
