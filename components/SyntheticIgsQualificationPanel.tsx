import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { Radii, Spacing, Typography } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import type { CadInternalTesterFixture } from '../utils/cadInternalTesterPreview';
import {
  createDurableQualificationStateStore,
  createSyntheticIgsQualificationPipeline,
  inspectSyntheticIgsQualification,
  type SyntheticQualificationState,
} from '../utils/igsPrivatePipelineQualification';

type Props = {
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onReady: (fixture: CadInternalTesterFixture) => void;
};

const idleState: SyntheticQualificationState = {
  schemaVersion: 1,
  status: 'idle',
  code: 'READY',
  runRef: null,
  attemptConsumed: false,
  cleanupVerified: true,
  unknownOutcome: false,
};

export default function SyntheticIgsQualificationPanel({ disabled = false, onBusyChange, onReady }: Props) {
  const { colors } = useAppTheme();
  const enabled = useMemo(() => Platform.OS === 'web' && typeof window !== 'undefined'
    && inspectSyntheticIgsQualification(window.location).enabled, []);
  const pipeline = useRef<ReturnType<typeof createSyntheticIgsQualificationPipeline> | null>(null);
  if (enabled && !pipeline.current && typeof window !== 'undefined') {
    pipeline.current = createSyntheticIgsQualificationPipeline({
      stateStore: createDurableQualificationStateStore(window.localStorage),
    });
  }
  const [state, setState] = useState<SyntheticQualificationState>(() => pipeline.current?.status() ?? idleState);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  if (!enabled || !pipeline.current) return null;

  const run = async () => {
    if (disabled || state.attemptConsumed || controller.current) return;
    const request = new AbortController();
    controller.current = request;
    onBusyChange?.(true);
    setState({ ...idleState, status: 'processing', code: 'ATTEMPT_CONSUMED', attemptConsumed: true, cleanupVerified: false });
    try {
      const result = await pipeline.current!.run({ signal: request.signal });
      setState(pipeline.current!.status());
      if (result.ok) onReady(result.fixture);
    } finally {
      controller.current = null;
      onBusyChange?.(false);
    }
  };

  return <View testID="synthetic-igs-qualification-panel" style={{ gap: Spacing.sm }}>
    {state.status === 'idle' ? <TouchableOpacity
      testID="run-synthetic-igs-qualification"
      accessibilityRole="button"
      accessibilityLabel="Use synthetic IGS fixture"
      disabled={disabled}
      onPress={() => { void run(); }}
      style={{ minHeight: 40, borderRadius: Radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, opacity: disabled ? 0.55 : 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md }}
    >
      <Ionicons name="flask-outline" size={18} color={colors.primary} accessible={false} />
      <Text style={[Typography.bodyStrong, { color: colors.primary }]}>Use synthetic IGS fixture</Text>
    </TouchableOpacity> : null}
    {state.status === 'processing' ? <Text testID="synthetic-igs-status-processing" accessibilityLiveRegion="polite" style={[Typography.caption, { color: colors.mutedText, textAlign: 'center' }]}>Preparing the synthetic fixture…</Text> : null}
    {state.status === 'error' ? <Text testID="synthetic-igs-status-error" accessibilityLiveRegion="polite" style={[Typography.caption, { color: colors.danger, textAlign: 'center' }]}>Synthetic fixture unavailable in this browser. Choose another source.</Text> : null}
  </View>;
}
