import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radii, Spacing, Typography } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import type { CadInternalTesterPreview } from '../utils/cadInternalTesterPreview';
import { CAD_BUILD_READINESS, CAD_COST_WORKBOOK } from '../utils/cadCostWorkbook';
import CadImportPanel from './CadImportPanel';
import CadDesignReview from './CadDesignReview';
import { CadAction, CadDetails, CadNotice, CadSourceFacts, CadProvenance, cadReviewStyles as styles } from './CadReviewUI';

type Props = {
  preview: Extract<CadInternalTesterPreview, { enabled: true }>;
  phase: number;
  onPhase: (phase: number) => void;
};
const icons = ['document-text-outline', 'layers-outline', 'cube-outline', 'construct-outline'] as const;
const titles = ['CAD source', 'Source inventory', 'Design review', 'Implementation readiness'];
const subtitles = ['Public fixture · Acquisition complete', 'Imported geometry · Parts review pending', 'Geometry review required · Build locked', 'Costs scoped · Outputs locked'];

const formatDimensionValue = (value: number) => `${value.toFixed(1)} mm`;

export default function CadWorkflow({ preview, phase, onPhase }: Props) {
  const { colors } = useAppTheme();
  const [fixture, setFixture] = useState(preview.fixture);
  const isLocalPreview = fixture.previewGeometry.kind === 'mesh';
  const text = [Typography.caption, { color: colors.mutedText, lineHeight: 20 }];
  const toneStyles = {
    success: { color: colors.success, backgroundColor: colors.successSoft },
    warning: { color: colors.warning, backgroundColor: colors.warningSoft },
    muted: { color: colors.mutedText, backgroundColor: colors.elevated },
  };
  return <View testID={`cad-phase-${phase}`} style={{ paddingVertical: Spacing.lg, gap: Spacing.md }}>
    <View style={styles.header}>
      <View style={[styles.headerIcon, { backgroundColor: colors.primarySoft }]}><Ionicons name={icons[phase - 1]} size={24} color={colors.primary} accessible={false} /></View>
      <View style={{ flex: 1, gap: Spacing.xs }}>
        <Text accessibilityRole="header" style={[Typography.title, { color: colors.text }]}>{titles[phase - 1]}</Text>
        <Text style={[...text, phase === 3 && { color: colors.warning }]}>{subtitles[phase - 1]}</Text>
      </View>
    </View>
    <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {phase === 1 && <>
        <CadImportPanel
          internalPreview={preview}
          onReviewQualifiedResult={() => {
            setFixture(preview.fixture);
            onPhase(3);
          }}
          onLocalPreviewResult={result => {
            setFixture(result);
            onPhase(3);
          }}
        />
        <CadAction label="View generated inventory" primary onPress={() => onPhase(2)} />
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
        <CadDesignReview fixture={fixture} />
        <CadAction label="View implementation readiness" icon="lock-closed-outline" onPress={() => onPhase(4)} />
      </>}
      {phase === 4 && <>
        <View testID="cad-build-locked" style={{ gap: Spacing.md }}>
          <CadNotice icon="lock-closed-outline">{CAD_BUILD_READINESS.headline}</CadNotice>
          <View testID="cad-implementation-slide" style={{ gap: Spacing.md }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
              {[
                { icon: 'cube-outline' as const, label: 'Actual product UI', value: 'Controls + workflow', color: colors.success, background: colors.successSoft },
                { icon: 'images-outline' as const, label: 'Test-only content', value: isLocalPreview ? 'Local IGES render' : 'Public dispenser file', color: colors.primary, background: colors.primarySoft },
                { icon: 'lock-closed-outline' as const, label: 'Locked product output', value: 'No build package yet', color: colors.warning, background: colors.warningSoft },
              ].map(item => <View key={item.label} style={{ flexGrow: 1, flexBasis: 150, borderWidth: 1, borderColor: colors.border, borderRadius: Radii.md, padding: Spacing.md, gap: Spacing.sm, backgroundColor: colors.elevated }}>
                <View style={{ width: 34, height: 34, borderRadius: Radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: item.background }}>
                  <Ionicons name={item.icon} size={18} color={item.color} accessible={false} />
                </View>
                <Text style={[Typography.caption, { color: colors.mutedText }]}>{item.label}</Text>
                <Text style={[Typography.label, { color: colors.text }]}>{item.value}</Text>
              </View>)}
            </View>
            <View testID="cad-run-economics" style={{ borderWidth: 1, borderColor: colors.border, borderRadius: Radii.md, padding: Spacing.md, gap: Spacing.md, backgroundColor: colors.panel }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                <Ionicons name="calculator-outline" size={18} color={colors.primary} accessible={false} />
                <Text style={[Typography.heading, { color: colors.text, flex: 1 }]}>Run economics</Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
                {CAD_BUILD_READINESS.summaryCards.map(card => {
                  const tone = toneStyles[card.tone];
                  return <View key={card.label} style={{ flexGrow: 1, flexBasis: 145, borderWidth: 1, borderColor: colors.border, borderRadius: Radii.md, padding: Spacing.md, gap: Spacing.xs, backgroundColor: colors.surface }}>
                    <Text style={[Typography.caption, { color: colors.mutedText }]}>{card.label}</Text>
                    <Text style={[Typography.label, { color: tone.color }]}>{card.value}</Text>
                  </View>;
                })}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, padding: Spacing.sm, borderRadius: Radii.sm, backgroundColor: colors.elevated }}>
                <Ionicons name="information-circle-outline" size={16} color={colors.mutedText} accessible={false} />
                <Text style={[...text, { flex: 1 }]}>The USD {CAD_COST_WORKBOOK.approvedDevelopmentCeilingUsd} ceiling is an internal development cap, not a customer price or per-run fee.</Text>
              </View>
            </View>
            <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: Radii.md, padding: Spacing.md, gap: Spacing.sm, backgroundColor: colors.panel }}>
              <Text style={[Typography.heading, { color: colors.text }]}>Actual product behavior to validate</Text>
              {CAD_BUILD_READINESS.productReady.map(label => <View key={label} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm }}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} accessible={false} />
                <Text style={[...text, { flex: 1, color: colors.text }]}>{label}</Text>
              </View>)}
            </View>
            <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: Radii.md, padding: Spacing.md, gap: Spacing.sm, backgroundColor: colors.surface }}>
              <Text style={[Typography.heading, { color: colors.text }]}>Test-only content in this preview</Text>
              {(isLocalPreview ? [
                `${fixture.sourceFileName} was selected locally in the browser for this internal QA pass.`,
                `Shown extents come from the selected IGES preview mesh: ${fixture.expectedDimensions.map(formatDimensionValue).join(' × ')}.`,
                'This internal preview does not upload file contents or activate the customer upload workflow.',
              ] : [
                `${fixture.sourceFileName} and the matching reference images are public review materials preloaded for this QA pass.`,
                `Shown dimensions come from this public test file: ${fixture.expectedDimensions.map(formatDimensionValue).join(' × ')}.`,
                'This shareable preview link is not the final customer upload workflow.',
              ]).map(label => <View key={label} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm }}>
                <Ionicons name="flask-outline" size={16} color={colors.primary} accessible={false} />
                <Text style={[...text, { flex: 1 }]}>{label}</Text>
              </View>)}
            </View>
            <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: Radii.md, padding: Spacing.md, gap: Spacing.sm, backgroundColor: colors.surface }}>
              <Text style={[Typography.heading, { color: colors.text }]}>Cost evidence still needed</Text>
              {CAD_BUILD_READINESS.costEvidenceNeeded.map(label => <View key={label} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm }}>
                <Ionicons name="time-outline" size={16} color={colors.warning} accessible={false} />
                <Text style={[...text, { flex: 1 }]}>{label}</Text>
              </View>)}
              <Text style={[Typography.caption, { color: colors.mutedText }]}>Workbook rows: {CAD_COST_WORKBOOK.buckets.map(bucket => bucket.label).join(' · ')}</Text>
            </View>
            <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: Radii.md, padding: Spacing.md, gap: Spacing.sm, backgroundColor: colors.surface }}>
              <Text style={[Typography.heading, { color: colors.text }]}>Not part of this product QA</Text>
              {CAD_BUILD_READINESS.blockedOutputs.map(label => <View key={label} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm }}>
                <Ionicons name="ellipse-outline" size={16} color={colors.mutedText} accessible={false} />
                <Text style={[...text, { flex: 1 }]}>{label}</Text>
              </View>)}
            </View>
          </View>
          <CadAction label="Prepare implementation package · Locked" accessibilityLabel="Prepare outputs unavailable: manufacturing review required" icon="lock-closed-outline" disabled />
        </View>
        <CadDetails title="Geometry warnings & review limits" testID="cad-build-details">
          {fixture.warnings.map(warning => <Text key={warning} style={text}>• {warning}</Text>)}
          <Text style={text}>The implementation package remains locked because this {isLocalPreview ? 'local IGES render' : 'public fixture review'} is visual QA only.</Text>
        </CadDetails>
        <CadAction label="Return to Design review" primary icon="arrow-back-outline" onPress={() => onPhase(3)} />
        <CadAction label="Review inventory prerequisites" icon="layers-outline" onPress={() => onPhase(2)} />
      </>}
    </View>
  </View>;
}
