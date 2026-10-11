import React, { useEffect, useState } from 'react';
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
  points: readonly string[];
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
  placement: ManufacturerTourPlacement;
  onRestart: () => void;
  onBack: () => void;
  onNext: () => void;
  onExit: () => void;
};

export default function ManufacturerTourGuide({
  active,
  step,
  stepIndex,
  stepCount,
  placement,
  onRestart,
  onBack,
  onNext,
  onExit,
}: Props) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const styles = createStyles(colors);
  const [isMinimized, setIsMinimized] = useState(false);
  const isCompact = width < 900;
  const isLastStep = stepIndex === stepCount - 1;
  const progress = Math.round(((stepIndex + 1) / Math.max(1, stepCount)) * 100);
  const progressWidth = `${progress}%` as `${number}%`;
  const placementStyle: StyleProp<ViewStyle> = isCompact
    ? styles.dockBottom
    : placement === 'top-right'
      ? styles.dockTopRight
      : styles.dockBottomLeft;

  useEffect(() => {
    setIsMinimized(false);
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
        accessibilityLabel={`Manufacturer tour progress: ${progress}%`}
        accessibilityValue={{ min: 0, max: 100, now: progress }}
      >
        <View style={[styles.progressFill, { width: progressWidth }]} />
      </View>

      <ScrollView
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
          <View style={styles.pointList}>
            {step.points.map(point => (
              <View key={point} style={styles.pointRow}>
                <View style={styles.pointDot} />
                <Text style={styles.pointText}>{point}</Text>
              </View>
            ))}
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
          <TouchableOpacity style={styles.primaryButton} onPress={onNext} accessibilityRole="button" accessibilityLabel={isLastStep ? 'Confirm hold and finish manufacturer tour' : 'Next manufacturer tour step'}>
            <Text style={styles.primaryButtonText}>{isLastStep ? 'Confirm hold & finish' : 'Next'}</Text>
            <Ionicons name={isLastStep ? 'checkmark-outline' : 'arrow-forward-outline'} size={16} color={colors.black} />
          </TouchableOpacity>
        </View>
      </View>
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
  kickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  eyebrow: { flex: 1, color: colors.accent, fontSize: FontSizes.xs, fontFamily: Fonts.bold, textTransform: 'uppercase' },
  stepCounter: { color: colors.mutedText, fontSize: FontSizes.xs, fontWeight: '800' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  title: { flex: 1, color: colors.text, fontSize: FontSizes.lg, fontFamily: Fonts.heading, lineHeight: 24 },
  titleActions: { flexDirection: 'row', gap: 4 },
  iconButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  progressTrack: { height: 5, borderRadius: Radii.pill, backgroundColor: colors.gray[800], overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radii.pill, backgroundColor: colors.accent },
  scrollBody: { flexShrink: 1, minHeight: 0 },
  scrollContent: { gap: Spacing.sm, paddingRight: 2 },
  fixtureBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 6, borderRadius: Radii.pill, borderWidth: 1, borderColor: colors.accent + '66', backgroundColor: colors.accent + '12' },
  fixtureBadgeText: { color: colors.accent, fontSize: FontSizes.xs, fontWeight: '800' },
  body: { color: colors.mutedText, fontFamily: Fonts.regular, fontSize: FontSizes.sm, lineHeight: 19 },
  focusCard: { gap: 5, padding: Spacing.sm, borderRadius: Radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  focusLabel: { color: colors.accent, fontSize: FontSizes.xs, fontWeight: '900', textTransform: 'uppercase' },
  focusText: { color: colors.text, fontSize: FontSizes.sm, fontWeight: '800', lineHeight: 18 },
  pointList: { gap: 4, marginTop: 2 },
  pointRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  pointDot: { width: 5, height: 5, borderRadius: Radii.pill, backgroundColor: colors.accent, marginTop: 7 },
  pointText: { flex: 1, color: colors.mutedText, fontSize: FontSizes.xs, lineHeight: 17 },
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
  buttonDisabled: { opacity: 0.45 },
  buttonTextDisabled: { color: colors.mutedText },
});
