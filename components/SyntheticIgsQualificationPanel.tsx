import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { Radii, Spacing, Typography } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import type { CadInternalTesterFixture } from '../utils/cadInternalTesterPreview';
import {
  createSessionQualificationStateStore,
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
      stateStore: createSessionQualificationStateStore(window.sessionStorage),
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

  const statusMessage = state.status === 'processing'
    ? 'Verifying the synthetic account and upload session, validating IGS, generating inspection output, then deleting the volatile source.'
    : state.status === 'ready'
      ? 'Synthetic IGS qualification passed. Cleanup was verified.'
      : state.status === 'error'
        ? `Stopped safely: ${state.code.replaceAll('_', ' ').toLowerCase()}. This session cannot retry.`
        : 'Runs once in this browser tab with generated data only. No network, production route, provider, or private CAD is used.';

  return <View testID="synthetic-igs-qualification-panel" style={{ gap: Spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: Radii.lg, padding: Spacing.md, backgroundColor: colors.surface }}>
    <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' }}>
      <Ionicons name="flask-outline" size={21} color={colors.primary} accessible={false} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[Typography.bodyStrong, { color: colors.text }]}>Local synthetic qualification</Text>
        <Text style={[Typography.caption, { color: colors.mutedText, lineHeight: 19 }]}>{statusMessage}</Text>
      </View>
    </View>
    {state.status === 'idle' ? <TouchableOpacity
      testID="run-synthetic-igs-qualification"
      accessibilityRole="button"
      accessibilityLabel="Run one-attempt local synthetic authenticated IGS qualification"
      disabled={disabled}
      onPress={() => { void run(); }}
      style={{ minHeight: 44, borderRadius: Radii.md, backgroundColor: colors.primary, opacity: disabled ? 0.55 : 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.md }}
    >
      <Text style={[Typography.bodyStrong, { color: colors.onPrimary }]}>Run synthetic authenticated IGS</Text>
    </TouchableOpacity> : null}
    {state.status !== 'idle' ? <View testID={`synthetic-igs-status-${state.status}`} accessibilityLiveRegion="polite" style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' }}>
      <Ionicons name={state.status === 'ready' ? 'checkmark-circle-outline' : state.status === 'error' ? 'alert-circle-outline' : 'sync-outline'} size={18} color={state.status === 'ready' ? colors.success : state.status === 'error' ? colors.danger : colors.primary} />
      <Text style={[Typography.caption, { color: colors.mutedText, flex: 1 }]}>One session · one attempt · zero retries · cleanup {state.cleanupVerified ? 'verified' : 'pending'}</Text>
    </View> : null}
  </View>;
}
