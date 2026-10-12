import React, { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, FontSizes, Fonts, Radii, Spacing } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';

export type ManufacturerTourTargetId =
  | 'source'
  | 'inventory'
  | 'controls'
  | 'traceability'
  | 'privacy'
  | 'decision';

export type ManufacturerTourStep = {
  id: ManufacturerTourTargetId;
  eyebrow: string;
  title: string;
  body: string;
  focus: string;
  phase: 1 | 2 | 3 | 4;
  subtasks: readonly {
    id: string;
    label: string;
  }[];
  decision?: {
    label: string;
    body: string;
  };
};

export type ManufacturerTourPlacement = 'bottom-left' | 'top-right';

type Props = {
  active: boolean;
  step: ManufacturerTourStep;
  stepIndex: number;
  stepCount: number;
  completedSubtaskIds: readonly string[];
  completedSubtaskCount: number;
  totalSubtaskCount: number;
  placement: ManufacturerTourPlacement;
  onRestart: () => void;
  onBack: () => void;
  onNext: () => void;
  onToggleSubtask: (subtaskId: string) => void;
  onExit: () => void;
  docked?: boolean;
};

export default function ManufacturerTourGuide({
  active,
  step,
  stepIndex,
  stepCount,
  completedSubtaskIds,
  completedSubtaskCount,
  totalSubtaskCount,
  placement,
  onRestart,
  onBack,
  onNext,
  onToggleSubtask,
  onExit,
  docked = false,
}: Props) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const styles = createStyles(colors);
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollBodyRef = useRef<ScrollView>(null);
  const isCompact = !docked && width < 900;
  const isLastStep = stepIndex === stepCount - 1;
  const completedSubtaskSet = new Set(completedSubtaskIds);
  const stepComplete = completedSubtaskIds.length === step.subtasks.length;
  const currentSubtaskId = step.subtasks.find(subtask => !completedSubtaskSet.has(subtask.id))?.id;
  const progress = Math.round((completedSubtaskCount / Math.max(1, totalSubtaskCount)) * 100);
  const progressWidth = `${progress}%` as `${number}%`;
  const placementStyle: StyleProp<ViewStyle> = docked
    ? styles.dockInspector
    : isCompact
    ? styles.dockBottom
    : placement === 'top-right'
      ? styles.dockTopRight
      : styles.dockBottomLeft;

  useEffect(() => {
    setIsMinimized(false);
    scrollBodyRef.current?.scrollTo({ y: 0, animated: false });
  }, [step.id]);

  if (!active) return null;

  if (isCompact && isMinimized) {
    return (
      <View
        style={[styles.miniDock, styles.miniDockPosition]}
        accessibilityRole="summary"
        accessibilityLabel={`Manufacturer tour, step ${stepIndex + 1} of ${stepCount}: ${step.title}`}
        testID="reversr-tour-guide-minimized"
      >
        <View style={styles.miniCopy}>
          <Text style={styles.miniEyebrow}>Step {stepIndex + 1} of {stepCount}</Text>
          <Text style={styles.miniTitle} numberOfLines={1}>{step.title}</Text>
          <Text style={styles.miniProgress}>{completedSubtaskIds.length}/{step.subtasks.length} subtasks complete</Text>
        </View>
        <TouchableOpacity style={styles.iconButton} onPress={() => setIsMinimized(false)} accessibilityRole="button" accessibilityLabel="Expand manufacturer tour">
          <Ionicons name="expand-outline" size={18} color={colors.accent} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={onExit} accessibilityRole="button" accessibilityLabel="Exit manufacturer tour">
          <Ionicons name="close" size={19} color={colors.mutedText} />
        </TouchableOpacity>
          </View>
    );
  }

  return (
    <View style={[styles.dock, placementStyle]} accessibilityRole="summary" accessibilityLabel="ReversR manufacturer tour" testID="reversr-tour-guide">
      <View style={styles.kickerRow}>
        <Text style={styles.eyebrow}>{step.eyebrow}</Text>
        <Text style={styles.stepCounter}>Step {stepIndex + 1} of {stepCount}</Text>
      </View>

      <View style={styles.titleRow}>
        <Text accessibilityRole="header" style={styles.title}>{step.title}</Text>
        <View style={styles.titleActions}>
          {isCompact ? (
            <TouchableOpacity style={styles.iconButton} onPress={() => setIsMinimized(true)} accessibilityRole="button" accessibilityLabel="Minimize manufacturer tour">
              <Ionicons name="contract-outline" size={17} color={colors.accent} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.iconButton} onPress={onExit} accessibilityRole="button" accessibilityLabel="Exit manufacturer tour">
            <Ionicons name="close" size={19} color={colors.mutedText} />
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={styles.progressTrack}
        accessibilityRole="progressbar"
        accessibilityLabel={`Manufacturer tour progress: ${completedSubtaskCount} of ${totalSubtaskCount} subtasks complete, ${progress}%`}
        accessibilityValue={{ min: 0, max: 100, now: progress }}
      >
        <View style={[styles.progressFill, { width: progressWidth }]} />
      </View>
      <View style={styles.progressSummary}>
        <Text style={styles.progressSummaryText}>{completedSubtaskIds.length}/{step.subtasks.length} this step</Text>
        <Text style={styles.progressSummaryText}>{completedSubtaskCount}/{totalSubtaskCount} total</Text>
      </View>

      <ScrollView
        ref={scrollBodyRef}
        style={styles.scrollBody}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
        nestedScrollEnabled
      >
        <View style={styles.fixtureBadge}>
          <Ionicons name="shield-checkmark-outline" size={15} color={colors.accent} />
          <Text style={styles.fixtureBadgeText}>Public Dispenser.IGS fixture · no upload</Text>
        </View>

        <Text style={styles.body}>{step.body}</Text>

        <View style={styles.focusCard} testID={`manufacturer-tour-step-${step.id}`}>
          <Text style={styles.focusLabel}>On this screen</Text>
          <Text style={styles.focusText}>{step.focus}</Text>
          <View style={styles.subtaskHeading}>
            <Text style={styles.subtaskHeadingText}>Subtasks</Text>
            <Text style={styles.subtaskCount}>{completedSubtaskIds.length}/{step.subtasks.length} complete</Text>
          </View>
          <View style={styles.subtaskList}>
            {step.subtasks.map((subtask, index) => {
              const complete = completedSubtaskSet.has(subtask.id);
              const current = currentSubtaskId === subtask.id;
              return (
                <TouchableOpacity
                  key={subtask.id}
                  style={[
                    styles.subtaskRow,
                    current && styles.subtaskRowCurrent,
                    complete && styles.subtaskRowComplete,
                  ]}
                  onPress={() => onToggleSubtask(subtask.id)}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`${complete ? 'Completed' : 'Mark complete'}: ${subtask.label}`}
                  accessibilityHint={complete ? 'Marks this subtask unfinished' : 'Marks this subtask complete'}
                  accessibilityState={{ checked: complete }}
                  aria-checked={complete}
                  testID={`manufacturer-tour-subtask-${step.id}-${subtask.id}`}
                >
                  <Ionicons
                    name={complete ? 'checkmark-circle' : current ? 'radio-button-on-outline' : 'ellipse-outline'}
                    size={19}
                    color={complete ? colors.success : current ? colors.accent : colors.mutedText}
                  />
                  <View style={styles.subtaskCopy}>
                    <Text style={[styles.subtaskIndex, complete && styles.subtaskIndexComplete]}>
                      {complete ? 'Complete' : current ? 'Current' : `Up next · ${index + 1}`}
                    </Text>
                    <Text style={[styles.subtaskText, complete && styles.subtaskTextComplete]}>{subtask.label}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {step.decision ? (
          <View style={styles.decisionCard} testID="manufacturer-tour-decision">
            <View style={styles.decisionHeading}>
              <Ionicons name="pause-circle-outline" size={18} color={colors.warning} />
              <Text style={styles.decisionLabel}>{step.decision.label}</Text>
            </View>
            <Text style={styles.decisionBody}>{step.decision.body}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.restartButton} onPress={onRestart} accessibilityRole="button" accessibilityLabel="Restart manufacturer tour">
          <Ionicons name="refresh-outline" size={16} color={colors.accent} />
          <Text style={styles.restartText}>Restart</Text>
        </TouchableOpacity>
        <View style={styles.stepActions}>
          <TouchableOpacity
            style={[styles.stepButton, stepIndex === 0 && styles.buttonDisabled]}
            onPress={onBack}
            disabled={stepIndex === 0}
            accessibilityRole="button"
            accessibilityLabel="Previous manufacturer tour step"
            accessibilityState={{ disabled: stepIndex === 0 }}
          >
            <Text style={[styles.stepButtonText, stepIndex === 0 && styles.buttonTextDisabled]}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, !stepComplete && styles.buttonDisabled]}
            onPress={onNext}
            disabled={!stepComplete}
            accessibilityRole="button"
            accessibilityLabel={isLastStep ? 'Confirm hold and finish manufacturer tour' : 'Next manufacturer tour step'}
            accessibilityHint={stepComplete ? undefined : 'Complete every subtask in this step to continue'}
            accessibilityState={{ disabled: !stepComplete }}
          >
            <Text style={styles.primaryButtonText}>{isLastStep ? 'Confirm hold & finish' : 'Next'}</Text>
            <Ionicons name={isLastStep ? 'checkmark-outline' : 'arrow-forward-outline'} size={16} color={colors.black} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={[styles.gateText, stepComplete && styles.gateTextComplete]} accessibilityLiveRegion="polite">
        {stepComplete
          ? 'Step complete. Continue when ready.'
          : `Complete ${step.subtasks.length - completedSubtaskIds.length} remaining ${step.subtasks.length - completedSubtaskIds.length === 1 ? 'subtask' : 'subtasks'} to continue.`}
      </Text>
    </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  dock: {
    position: 'absolute',
    width: 440,
    maxHeight: '78%',
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.mode === 'dark' ? '#101816' : colors.gray[50],
    shadowColor: colors.black,
    shadowOpacity: 0.26,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    zIndex: 1000,
    elevation: 1000,
    gap: Spacing.sm,
  },
  dockInspector: { position: 'relative', width: '100%', maxHeight: undefined, padding: 0, borderWidth: 0, borderRadius: 0, backgroundColor: 'transparent', shadowOpacity: 0, elevation: 0, zIndex: 1 },
  dockBottom: { left: Spacing.md, right: Spacing.md, bottom: Spacing.md, width: 'auto', maxWidth: 560, maxHeight: '68%' },
  dockBottomLeft: { left: Spacing.lg, bottom: Spacing.lg },
  dockTopRight: { top: 112, right: Spacing.lg },
  miniDock: {
    width: '100%', maxWidth: 560, minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.sm, borderRadius: Radii.lg, borderWidth: 1, borderColor: colors.accent,
    backgroundColor: colors.mode === 'dark' ? '#101816' : colors.gray[50], shadowColor: colors.black,
    shadowOpacity: 0.28, shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, elevation: 1000,
  },
  miniDockPosition: { position: 'absolute', left: Spacing.md, right: Spacing.md, bottom: Spacing.md, width: 'auto', zIndex: 1000 },
  miniCopy: { flex: 1, minWidth: 0 },
  miniEyebrow: { color: colors.accent, fontSize: FontSizes.xs, fontFamily: Fonts.bold, textTransform: 'uppercase' },
  miniTitle: { color: colors.text, fontSize: FontSizes.sm, fontFamily: Fonts.heading, marginTop: 2 },
  miniProgress: { color: colors.mutedText, fontSize: FontSizes.xs, marginTop: 2 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  eyebrow: { flex: 1, color: colors.accent, fontSize: FontSizes.xs, fontFamily: Fonts.bold, textTransform: 'uppercase' },
  stepCounter: { color: colors.mutedText, fontSize: FontSizes.xs, fontWeight: '800' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  title: { flex: 1, color: colors.text, fontSize: FontSizes.lg, fontFamily: Fonts.heading, lineHeight: 24 },
  titleActions: { flexDirection: 'row', gap: 4 },
  iconButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  progressTrack: { height: 5, borderRadius: Radii.pill, backgroundColor: colors.gray[800], overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radii.pill, backgroundColor: colors.accent },
  progressSummary: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  progressSummaryText: { color: colors.mutedText, fontSize: FontSizes.xs, fontWeight: '800' },
  scrollBody: { flexShrink: 1, minHeight: 0 },
  scrollContent: { gap: Spacing.sm, paddingRight: 2 },
  fixtureBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 6, borderRadius: Radii.pill, borderWidth: 1, borderColor: colors.accent + '66', backgroundColor: colors.accent + '12' },
  fixtureBadgeText: { color: colors.accent, fontSize: FontSizes.xs, fontWeight: '800' },
  body: { color: colors.mutedText, fontFamily: Fonts.regular, fontSize: FontSizes.sm, lineHeight: 19 },
  focusCard: { gap: 5, padding: Spacing.sm, borderRadius: Radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  focusLabel: { color: colors.accent, fontSize: FontSizes.xs, fontWeight: '900', textTransform: 'uppercase' },
  focusText: { color: colors.text, fontSize: FontSizes.sm, fontWeight: '800', lineHeight: 18 },
  subtaskHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, marginTop: 4 },
  subtaskHeadingText: { color: colors.text, fontSize: FontSizes.xs, fontWeight: '900', textTransform: 'uppercase' },
  subtaskCount: { color: colors.mutedText, fontSize: FontSizes.xs, fontWeight: '800' },
  subtaskList: { gap: 6, marginTop: 2 },
  subtaskRow: { minHeight: 52, flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 9, borderRadius: Radii.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel },
  subtaskRowCurrent: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  subtaskRowComplete: { borderColor: colors.success, backgroundColor: colors.successSoft },
  subtaskCopy: { flex: 1, minWidth: 0, gap: 2 },
  subtaskIndex: { color: colors.mutedText, fontSize: FontSizes.xs, fontWeight: '900', textTransform: 'uppercase' },
  subtaskIndexComplete: { color: colors.success },
  subtaskText: { color: colors.text, fontSize: FontSizes.xs, fontWeight: '700', lineHeight: 17 },
  subtaskTextComplete: { color: colors.mutedText },
  decisionCard: { gap: 5, padding: Spacing.sm, borderRadius: Radii.md, borderWidth: 1, borderColor: colors.warning, backgroundColor: colors.warningSoft },
  decisionHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  decisionLabel: { flex: 1, color: colors.warning, fontSize: FontSizes.sm, fontWeight: '900' },
  decisionBody: { color: colors.text, fontSize: FontSizes.xs, lineHeight: 17 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, marginTop: 2 },
  stepActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  restartButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, borderRadius: Radii.md },
  restartText: { color: colors.accent, fontSize: FontSizes.xs, fontWeight: '800' },
  stepButton: { minHeight: 40, minWidth: 64, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, borderRadius: Radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  stepButtonText: { color: colors.text, fontSize: FontSizes.xs, fontWeight: '800' },
  primaryButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12, borderRadius: Radii.md, backgroundColor: colors.accent },
  primaryButtonText: { color: colors.black, fontSize: FontSizes.xs, fontFamily: Fonts.extrabold },
  gateText: { color: colors.mutedText, fontSize: FontSizes.xs, fontWeight: '700', textAlign: 'right' },
  gateTextComplete: { color: colors.success },
  buttonDisabled: { opacity: 0.45 },
  buttonTextDisabled: { color: colors.mutedText },
});
