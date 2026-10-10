import React, { useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radii, Spacing, Typography } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import type { CadInternalTesterPreview } from '../utils/cadInternalTesterPreview';
import { CAD_BUILD_READINESS } from '../utils/cadCostWorkbook';
import CadImportPanel from './CadImportPanel';
import PublicIgsImportPanel from './PublicIgsImportPanel';
import CadDesignReview from './CadDesignReview';
import { CadAction, CadDetails, CadNotice, CadSourceFacts, CadProvenance, cadReviewStyles as styles } from './CadReviewUI';
import { PUBLIC_CUBE_SHA256 } from '../utils/igsImportJourney';
import AuthenticatedIgsQualificationPanel from './AuthenticatedIgsQualificationPanel';
import { createAuthenticatedImportQualificationAdapter, createAuthenticatedImportStateStore,
  inspectAuthenticatedImportQualification, type AuthenticatedImportState }
  from '../utils/cadAuthenticatedImportQualification';

type Props = {
  preview: Extract<CadInternalTesterPreview, { enabled: true }>;
  phase: number;
  onPhase: (phase: number) => void;
  compact?: boolean;
  desktop?: boolean;
};
const icons = ['document-text-outline', 'layers-outline', 'cube-outline', 'construct-outline'] as const;
const titles = ['CAD source', 'Source inventory', 'Design review', 'Implementation readiness'];
const subtitles = ['Public IGS file · Local validation', 'Imported geometry · Parts review pending', 'Geometry review required · Build locked', 'Source, geometry, and package readiness'];

const formatDimensionValue = (value: number) => `${value.toFixed(1)} mm`;

export default function CadWorkflow({ preview, phase, onPhase, compact = false, desktop = false }: Props) {
  const { colors } = useAppTheme();
  const authenticatedMode = useMemo(() => typeof window !== 'undefined'
    && inspectAuthenticatedImportQualification(window.location).enabled, []);
  const authenticatedAdapter = useMemo(() => {
    if (!authenticatedMode || typeof window === 'undefined') return null;
    return createAuthenticatedImportQualificationAdapter({
      stateStore: createAuthenticatedImportStateStore(window.localStorage),
      wait: (milliseconds, signal) => new Promise(resolve => {
        const done = () => { clearTimeout(timer); signal?.removeEventListener('abort', done); resolve(); };
        const timer = window.setTimeout(done, milliseconds);
        signal?.addEventListener('abort', done, { once: true });
      }),
    });
  }, [authenticatedMode]);
  const [authenticatedState, setAuthenticatedState] = useState<AuthenticatedImportState | null>(
    () => authenticatedAdapter?.status() ?? null);
  const [fixture, setFixture] = useState(() => authenticatedAdapter?.fixture() ?? preview.fixture);
  const [selectedBuildGate, setSelectedBuildGate] = useState(0);
  const publicIgsJourney = preview.fixture.sha256 === PUBLIC_CUBE_SHA256 || Boolean(preview.fixture.derivedInspectionStl);
  const buildStep = CAD_BUILD_READINESS.userSteps[selectedBuildGate] ?? CAD_BUILD_READINESS.userSteps[0];
  const text = [Typography.caption, { color: colors.mutedText, lineHeight: 20 }];
  const panelStyle = compact
    ? { padding: 0, gap: Spacing.sm, borderWidth: 0, backgroundColor: 'transparent' }
    : {};
  const toneStyles = {
    success: { color: colors.success, backgroundColor: colors.successSoft },
    warning: { color: colors.warning, backgroundColor: colors.warningSoft },
    muted: { color: colors.mutedText, backgroundColor: colors.elevated },
  };
  return <View testID={`cad-phase-${phase}`} style={{ paddingVertical: compact ? Spacing.xs : Spacing.lg, gap: compact ? Spacing.sm : Spacing.md }}>
    {!compact && <View style={styles.header}>
      <View style={[styles.headerIcon, { backgroundColor: colors.primarySoft }]}><Ionicons name={icons[phase - 1]} size={24} color={colors.primary} accessible={false} /></View>
      <View style={{ flex: 1, gap: Spacing.xs }}>
        <Text accessibilityRole="header" style={[Typography.title, { color: colors.text }]}>{titles[phase - 1]}</Text>
        <Text style={[...text, phase === 3 && { color: colors.warning }]}>{subtitles[phase - 1]}</Text>
      </View>
    </View>}
    <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }, panelStyle]}>
      {phase === 1 && <>
        {authenticatedMode && authenticatedAdapter && authenticatedState
          ? <AuthenticatedIgsQualificationPanel adapter={authenticatedAdapter} state={authenticatedState}
            onState={setAuthenticatedState} onReady={result => { setFixture(result); onPhase(3); }} />
          : publicIgsJourney ? <PublicIgsImportPanel onReady={result => {
          setFixture(result);
          onPhase(3);
        }} /> : <CadImportPanel
          internalPreview={preview}
          desktop={desktop}
          onReviewQualifiedResult={() => {
            setFixture(preview.fixture);
            onPhase(3);
          }}
          onLocalPreviewResult={result => {
            setFixture(result);
            onPhase(3);
          }}
        />}
      </>}
      {phase === 2 && <>
        <Text accessibilityRole="header" style={[Typography.heading, { color: colors.text }]}>Auto-generated inventory</Text>
        <CadSourceFacts fixture={fixture} />
        <Text style={[Typography.bodyStrong, { color: colors.text }]}>{fixture.meshes} {fixture.previewGeometry.kind === 'stl' ? 'connected components' : 'mesh'}</Text>
        <CadNotice>Parts list unverified · Review required before Build</CadNotice>
        <CadDetails title="Source & inventory details" testID="cad-inventory-details">
          <CadProvenance fixture={fixture} />
          <Text style={text}>Mesh components are not a verified parts list. Part identities, features, and manufacturing dimensions still need review.</Text>
        </CadDetails>
        <CadAction label="Review in Design" primary onPress={() => onPhase(3)} />
        <CadAction label="Review source in Input" icon="arrow-back-outline" onPress={() => onPhase(1)} />
      </>}
      {phase === 3 && <>
        {authenticatedMode && authenticatedAdapter && authenticatedState?.status !== 'ready'
          ? <AuthenticatedIgsQualificationPanel adapter={authenticatedAdapter} state={authenticatedState!}
            onState={setAuthenticatedState} onReady={result => { setFixture(result); onPhase(3); }} />
          : <CadDesignReview fixture={fixture} onChangeSource={() => onPhase(1)} desktop={desktop}
            onReadiness={authenticatedMode ? undefined : () => onPhase(4)}
            qualificationArtifacts={authenticatedMode ? authenticatedAdapter?.artifacts() : null}
            onDeleteQualificationArtifacts={authenticatedMode && authenticatedAdapter ? () => {
              setAuthenticatedState(authenticatedAdapter.deleteArtifacts());
            } : undefined} />}
        {!desktop && !authenticatedMode && <CadAction label="View implementation readiness" icon="lock-closed-outline" onPress={() => onPhase(4)} />}
      </>}
      {phase === 4 && <>
        {authenticatedMode ? <View testID="cad-auth-import-build-locked" style={{ gap: Spacing.sm,
          borderWidth: 1, borderColor: colors.border, borderRadius: Radii.lg, padding: Spacing.md,
          backgroundColor: colors.elevated }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.mutedText} accessible={false} />
            <Text style={[Typography.bodyStrong, { color: colors.text }]}>Build remains locked</Text>
          </View>
          <Text style={text}>Review the synthetic model in Design. Manufacturing actions are unavailable.</Text>
          <CadAction label="Return to Design" primary icon="arrow-back-outline" onPress={() => onPhase(3)} />
        </View> : <><View testID="cad-build-locked" style={{ gap: Spacing.md }}>
          <View testID="cad-implementation-slide" style={{ gap: Spacing.md }}>
            <View testID="cad-commercialization-gates" style={{ borderWidth: 1, borderColor: colors.border, borderRadius: Radii.md, padding: Spacing.md, gap: Spacing.md, backgroundColor: colors.panel }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                <Ionicons name="construct-outline" size={18} color={colors.primary} accessible={false} />
                <Text style={[Typography.heading, { color: colors.text, flex: 1 }]}>Build readiness</Text>
              </View>
              <View testID="cad-commercialization-stepper" style={{ position: 'relative', flexDirection: 'row', alignItems: 'flex-start', paddingTop: Spacing.xs }}>
                <View pointerEvents="none" style={{ position: 'absolute', left: '16%', right: '16%', top: 24, height: 2, borderRadius: 2, backgroundColor: colors.border }} />
                {CAD_BUILD_READINESS.userSteps.map((step, index) => {
                  const tone = toneStyles[step.tone];
                  const selected = index === selectedBuildGate;
                  return <View key={step.label} style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: 4 }}>
                    <TouchableOpacity
                      testID={`cad-commercialization-step-${index + 1}`}
                      accessibilityRole="button"
                      accessibilityLabel={`${step.label}: ${step.state}`}
                      accessibilityState={{ selected }}
                      onPress={() => setSelectedBuildGate(index)}
                      activeOpacity={0.75}
                      style={{ minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <View style={{
                        width: 34,
                        height: 34,
                        borderRadius: Radii.pill,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: selected ? 2 : 1,
                        borderColor: selected ? colors.accent : tone.color,
                        backgroundColor: selected ? colors.background : tone.backgroundColor,
                      }}>
                        <Ionicons name={step.icon} size={14} color={selected ? colors.accent : tone.color} accessible={false} />
                      </View>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: selected ? colors.text : colors.mutedText, textAlign: 'center' }} numberOfLines={1}>
                      {step.label}
                    </Text>
                    <Text style={{ fontSize: 9, color: tone.color, textAlign: 'center' }} numberOfLines={1}>{step.state}</Text>
                    {selected ? <View style={{ width: 24, height: 3, borderRadius: 2, backgroundColor: colors.accent }} /> : null}
                  </View>;
                })}
              </View>
              <View testID="cad-commercialization-gate-detail" style={{ borderWidth: 1, borderColor: colors.border, borderRadius: Radii.md, padding: Spacing.md, gap: Spacing.sm, backgroundColor: colors.surface }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <Text style={[Typography.label, { color: colors.text, flex: 1 }]}>{buildStep.label}</Text>
                  <View style={{ borderRadius: Radii.pill, paddingHorizontal: Spacing.sm, paddingVertical: 4, backgroundColor: toneStyles[buildStep.tone].backgroundColor }}>
                    <Text style={[Typography.caption, { color: toneStyles[buildStep.tone].color }]}>{buildStep.state}</Text>
                  </View>
                </View>
                <Text style={[Typography.caption, { color: colors.mutedText, lineHeight: 18 }]}>{buildStep.detail}</Text>
                {selectedBuildGate === 0 ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
                  <View style={{ flexGrow: 1, flexBasis: 140 }}>
                    <Text style={[Typography.caption, { color: colors.mutedText }]}>Selected source</Text>
                    <Text style={[Typography.label, { color: colors.text }]}>{fixture.sourceFileName}</Text>
                  </View>
                  <View style={{ flexGrow: 1, flexBasis: 180 }}>
                    <Text style={[Typography.caption, { color: colors.mutedText }]}>Extents</Text>
                    <Text style={[Typography.label, { color: colors.text }]}>{fixture.expectedDimensions.map(formatDimensionValue).join(' × ')}</Text>
                  </View>
                </View> : null}
              </View>
              {fixture.qualificationProvenance?.kind === 'synthetic-igs-local' ? <CadDetails title="Qualification boundaries & roadmap" testID="cad-readiness-qualification-details">
                <Text style={text}>This review used generated synthetic IGS data in one browser-only, single-attempt session. A result is returned only after volatile source cleanup completes.</Text>
                <Text style={text}>Browser account and upload-session adapters are not production authentication. The deterministic cube adapter is not the real geometry converter.</Text>
                <Text style={text}>Production upload, hosted conversion, cloud storage, and provider dispatch remain disabled.</Text>
                <Text style={text}>Roadmap gate: qualify real authentication, user-file admission, durable cleanup evidence, and real converter output before production activation.</Text>
              </CadDetails> : null}
            </View>
          </View>
          <CadAction label="Prepare implementation package · Locked" accessibilityLabel="Prepare implementation package locked" icon="lock-closed-outline" disabled />
        </View>
        <CadAction label="Return to Design review" primary icon="arrow-back-outline" onPress={() => onPhase(3)} />
        <CadAction label="Review inventory prerequisites" icon="layers-outline" onPress={() => onPhase(2)} />
        </>}
      </>}
    </View>
  </View>;
}
