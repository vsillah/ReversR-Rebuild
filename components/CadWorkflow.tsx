import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import { inspectAuthenticatedIgsPreview } from '../utils/cadInternalTesterPreview';
import { createCadAuthenticatedIgsBrowserClient } from '../utils/cadAuthenticatedIgsBrowser';
import { getCommercialRequestHeaders } from '../hooks/useCommercialization';
import CadDesktopPhaseLayout from './CadDesktopPhaseLayout';

type Props = {
  preview: Extract<CadInternalTesterPreview, { enabled: true }>;
  phase: number;
  onPhase: (phase: number) => void;
  compact?: boolean;
  desktop?: boolean;
  desktopTourActive?: boolean;
};
const icons = ['document-text-outline', 'layers-outline', 'cube-outline', 'construct-outline'] as const;
const titles = ['CAD source', 'Source inventory', 'Design review', 'Implementation readiness'];
const subtitles = ['Public IGS file · Local validation', 'Imported geometry · Parts review pending', 'Geometry review required · Build locked', 'Source, geometry, and package readiness'];

const formatDimensionValue = (value: number) => `${value.toFixed(1)} mm`;

export default function CadWorkflow({ preview, phase, onPhase, compact = false, desktop = false, desktopTourActive = false }: Props) {
  const { colors } = useAppTheme();
  const onPhaseRef = useRef(onPhase);
  useEffect(() => { onPhaseRef.current = onPhase; }, [onPhase]);
  const authenticatedMode = useMemo(() => typeof window !== 'undefined'
    && inspectAuthenticatedImportQualification(window.location).enabled, []);
  const authenticatedLiveMode = useMemo(() => typeof window !== 'undefined'
    && inspectAuthenticatedIgsPreview(window.location).enabled, []);
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
  const authenticatedLiveClient = useMemo(() => authenticatedLiveMode && typeof window !== 'undefined'
    ? createCadAuthenticatedIgsBrowserClient({ getAuthorizationHeaders: () => getCommercialRequestHeaders() })
    : null, [authenticatedLiveMode]);
  const [authenticatedLiveJobId, setAuthenticatedLiveJobId] = useState<string | null>(null);
  const [authenticatedLiveResume, setAuthenticatedLiveResume] = useState('');
  const [selectedBuildGate, setSelectedBuildGate] = useState(0);
  const publicIgsJourney = preview.fixture.sha256 === PUBLIC_CUBE_SHA256
    || preview.fixture.qualificationProvenance?.kind === 'authenticated-igs-preview';
  const buildStep = CAD_BUILD_READINESS.userSteps[selectedBuildGate] ?? CAD_BUILD_READINESS.userSteps[0];
  const text = [Typography.caption, { color: colors.mutedText, lineHeight: 20 }];
  useEffect(() => {
    if (!authenticatedLiveClient) return undefined;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const resume = async () => {
      try {
        let job = await authenticatedLiveClient.resume();
        while (!cancelled && job && ['admitted', 'converting'].includes(job.state)) {
          setAuthenticatedLiveResume('Restoring the durable private conversion…');
          await new Promise<void>(resolve => { timer = setTimeout(resolve, 1000); });
          if (!cancelled) job = await authenticatedLiveClient.status(job.jobId);
        }
        if (!cancelled && job?.state === 'ready') {
          const ready = await authenticatedLiveClient.ready(job);
          if (!cancelled) {
            setFixture(ready.fixture);
            setAuthenticatedLiveJobId(job.jobId);
            setAuthenticatedLiveResume('');
            onPhaseRef.current(3);
          }
        } else if (!cancelled) setAuthenticatedLiveResume('');
      } catch { if (!cancelled) setAuthenticatedLiveResume(''); }
    };
    void resume();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [authenticatedLiveClient]);
  const authenticatedArtifacts = useMemo(() => authenticatedLiveClient && authenticatedLiveJobId ? {
    downloadOriginal: () => authenticatedLiveClient.download(authenticatedLiveJobId, 'original'),
    downloadStl: () => authenticatedLiveClient.download(authenticatedLiveJobId, 'stl'),
    deleteAll: async () => {
      await authenticatedLiveClient.delete(authenticatedLiveJobId);
      setAuthenticatedLiveJobId(null);
      setFixture(preview.fixture);
      onPhase(1);
    },
  } : null, [authenticatedLiveClient, authenticatedLiveJobId, onPhase, preview.fixture]);
  const panelStyle = compact
    ? { padding: 0, gap: Spacing.sm, borderWidth: 0, backgroundColor: 'transparent' }
    : {};
  const toneStyles = {
    success: { color: colors.success, backgroundColor: colors.successSoft },
    warning: { color: colors.warning, backgroundColor: colors.warningSoft },
    muted: { color: colors.mutedText, backgroundColor: colors.elevated },
  };
  const desktopInspectorCard = { borderColor: colors.border, backgroundColor: colors.panel };
  const inventoryCanvas = <>
    <View style={phaseStyles.titleRow}>
      <View style={{ flex: 1, minWidth: 0, gap: Spacing.xs }}>
        <Text accessibilityRole="header" style={[Typography.heading, { color: colors.text }]}>Auto-generated inventory</Text>
        <Text style={text}>A scan-friendly summary of the imported geometry. Part identities still require review.</Text>
      </View>
      <View style={[phaseStyles.statusPill, { backgroundColor: colors.warningSoft }]}>
        <Ionicons name="alert-circle-outline" size={14} color={colors.warning} accessible={false} />
        <Text style={[Typography.caption, { color: colors.warning, fontWeight: '800' }]}>Review required</Text>
      </View>
    </View>
    <View testID="cad-inventory-metrics" style={phaseStyles.metricGrid}>
      <View style={[phaseStyles.metricCard, desktopInspectorCard]}>
        <Text style={[Typography.caption, { color: colors.mutedText }]}>Source</Text>
        <Text numberOfLines={2} style={[Typography.bodyStrong, { color: colors.text }]}>{fixture.sourceFileName}</Text>
        <Text style={[Typography.caption, { color: colors.mutedText }]}>{fixture.format} · {fixture.units}</Text>
      </View>
      <View style={[phaseStyles.metricCard, desktopInspectorCard]}>
        <Text style={[Typography.caption, { color: colors.mutedText }]}>Geometry</Text>
        <Text style={[Typography.title, { color: colors.text }]}>{fixture.meshes}</Text>
        <Text style={[Typography.caption, { color: colors.mutedText }]}>{fixture.previewGeometry.kind === 'stl' ? 'connected components' : 'mesh'}</Text>
      </View>
      <View style={[phaseStyles.metricCard, desktopInspectorCard]}>
        <Text style={[Typography.caption, { color: colors.mutedText }]}>Triangles</Text>
        <Text style={[Typography.title, { color: colors.text }]}>{fixture.triangles.toLocaleString()}</Text>
        <Text style={[Typography.caption, { color: colors.mutedText }]}>inspection geometry</Text>
      </View>
      <View style={[phaseStyles.metricCard, desktopInspectorCard]}>
        <Text style={[Typography.caption, { color: colors.mutedText }]}>Envelope</Text>
        <Text style={[Typography.bodyStrong, { color: colors.text }]}>{fixture.expectedDimensions.map(formatDimensionValue).join(' × ')}</Text>
        <Text style={[Typography.caption, { color: colors.mutedText }]}>X × Y × Z</Text>
      </View>
    </View>
    <View style={[phaseStyles.reviewPanel, { borderColor: colors.border, backgroundColor: colors.elevated }]}>
      <View style={phaseStyles.inlineHeading}>
        <Ionicons name="layers-outline" size={18} color={colors.primary} accessible={false} />
        <Text style={[Typography.bodyStrong, { color: colors.text }]}>What the import established</Text>
      </View>
      <Text style={text}>The source identity, unit system, geometry envelope, and connected component count are available for inspection.</Text>
      <CadNotice>Connected components are not a verified parts list. Features and manufacturing dimensions still need review.</CadNotice>
    </View>
  </>;
  const inventoryInspector = <View style={phaseStyles.inspectorStack}>
    <Text style={[Typography.heading, { color: colors.text }]}>Inventory review</Text>
    <CadSourceFacts fixture={fixture} />
    <CadAction label="Review in Design" primary onPress={() => onPhase(3)} />
    <CadAction label="Review source in Input" icon="arrow-back-outline" onPress={() => onPhase(1)} />
    <CadDetails title="Source, provenance & limits" testID="cad-inventory-details">
      <CadProvenance fixture={fixture} />
      <Text style={text}>This inventory does not certify part names, tolerances, materials, finish, threads, or fabrication readiness.</Text>
    </CadDetails>
  </View>;
  const buildInspector = <View testID="cad-build-inspector-content" style={phaseStyles.inspectorStack}>
    <View style={phaseStyles.inlineHeading}>
      <Ionicons name="lock-closed-outline" size={18} color={colors.warning} accessible={false} />
      <Text accessibilityRole="header" style={[Typography.heading, { color: colors.text, flex: 1 }]}>Build remains on hold</Text>
    </View>
    <Text style={text}>Review can continue, but no manufacturing package or production action is available from this workspace.</Text>
    <View style={[phaseStyles.metricCard, desktopInspectorCard]}>
      <Text style={[Typography.caption, { color: colors.mutedText }]}>Current readiness gate</Text>
      <Text style={[Typography.bodyStrong, { color: colors.text }]}>{buildStep.label}</Text>
      <View style={[phaseStyles.statusPill, { alignSelf: 'flex-start', backgroundColor: toneStyles[buildStep.tone].backgroundColor }]}>
        <Text style={[Typography.caption, { color: toneStyles[buildStep.tone].color, fontWeight: '800' }]}>{buildStep.state}</Text>
      </View>
      <Text style={text}>{buildStep.detail}</Text>
    </View>
    <CadAction label="Return to Design review" primary icon="arrow-back-outline" onPress={() => onPhase(3)} />
    <CadAction label="Review inventory prerequisites" icon="layers-outline" onPress={() => onPhase(2)} />
    <CadDetails title="Certification limits" testID="cad-build-certification-limits">
      <Text style={text}>This review does not certify tolerances, materials, threads, wall thickness, orientation, supports, or fabrication readiness.</Text>
      <Text style={text}>Production upload, provider dispatch, and manufacturing actions remain unavailable.</Text>
    </CadDetails>
  </View>;
  const wrapBuild = (content: React.ReactNode) => desktop && !desktopTourActive
    ? <CadDesktopPhaseLayout canvasTestID="cad-build-canvas" inspectorTestID="cad-build-inspector" inspector={buildInspector}>{content}</CadDesktopPhaseLayout>
    : content;
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
          : publicIgsJourney ? <>
            {authenticatedLiveResume ? <CadNotice>{authenticatedLiveResume}</CadNotice> : null}
            <PublicIgsImportPanel onReady={result => {
          setFixture(result);
          if (result.qualificationProvenance?.kind !== 'authenticated-igs-preview') {
            setAuthenticatedLiveJobId(null);
          }
          onPhase(3);
        }} onAuthenticatedFile={authenticatedLiveClient ? async file => {
          const ready = await authenticatedLiveClient.upload(file);
          setAuthenticatedLiveJobId(ready.job.jobId);
          return ready.fixture;
        } : undefined} /></> : <CadImportPanel
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
      {phase === 2 && desktop && !desktopTourActive ? <CadDesktopPhaseLayout
        canvasTestID="cad-inventory-canvas"
        inspectorTestID="cad-inventory-inspector"
        inspector={inventoryInspector}
      >
        {inventoryCanvas}
      </CadDesktopPhaseLayout> : phase === 2 && <>
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
            desktopInspector={!desktopTourActive}
            onReadiness={authenticatedMode || authenticatedLiveMode ? undefined : () => onPhase(4)}
            qualificationArtifacts={authenticatedMode ? authenticatedAdapter?.artifacts() : null}
            authenticatedArtifacts={authenticatedArtifacts}
            onDeleteQualificationArtifacts={authenticatedMode && authenticatedAdapter ? () => {
              setAuthenticatedState(authenticatedAdapter.deleteArtifacts());
            } : undefined} />}
        {!desktop && !authenticatedMode && !authenticatedLiveMode && <CadAction label="View implementation readiness" icon="lock-closed-outline" onPress={() => onPhase(4)} />}
      </>}
      {phase === 4 && wrapBuild(<>
        {authenticatedMode || authenticatedLiveMode ? <View testID="cad-auth-import-build-locked" style={{ gap: Spacing.sm,
          borderWidth: 1, borderColor: colors.border, borderRadius: Radii.lg, padding: Spacing.md,
          backgroundColor: colors.elevated }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.mutedText} accessible={false} />
            <Text style={[Typography.bodyStrong, { color: colors.text }]}>Build remains locked</Text>
          </View>
          <Text style={text}>{authenticatedLiveMode
            ? 'Review the private inspection geometry in Design. Manufacturing actions and production activation remain unavailable.'
            : 'Review the synthetic model in Design. Manufacturing actions are unavailable.'}</Text>
          {(!desktop || desktopTourActive) ? <CadAction label="Return to Design" primary icon="arrow-back-outline" onPress={() => onPhase(3)} /> : null}
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
        {(!desktop || desktopTourActive) ? <>
          <CadAction label="Return to Design review" primary icon="arrow-back-outline" onPress={() => onPhase(3)} />
          <CadAction label="Review inventory prerequisites" icon="layers-outline" onPress={() => onPhase(2)} />
        </> : null}
        </>}
      </>)}
    </View>
  </View>;
}

const phaseStyles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  statusPill: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.sm, borderRadius: Radii.pill },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  metricCard: { flexGrow: 1, flexBasis: 180, minWidth: 0, minHeight: 124, justifyContent: 'space-between', gap: Spacing.xs, padding: Spacing.md, borderWidth: 1, borderRadius: Radii.md },
  reviewPanel: { gap: Spacing.sm, padding: Spacing.lg, borderWidth: 1, borderRadius: Radii.lg },
  inlineHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  inspectorStack: { gap: Spacing.md },
});
