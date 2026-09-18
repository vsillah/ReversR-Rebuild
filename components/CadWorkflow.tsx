import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import type { CadInternalTesterPreview } from '../utils/cadInternalTesterPreview';
import CadImportPanel from './CadImportPanel';
import CadDesignReview from './CadDesignReview';
import { CadAction, CadDetails, CadNotice, CadSourceFacts, CadProvenance, cadReviewStyles as styles } from './CadReviewUI';

type Props = {
  preview: Extract<CadInternalTesterPreview, { enabled: true }>;
  phase: number;
  onPhase: (phase: number) => void;
};
const icons = ['document-text-outline', 'layers-outline', 'cube-outline', 'construct-outline'] as const;
const titles = ['CAD source', 'Source inventory', 'Design review', 'Build prerequisites'];
const subtitles = ['Public fixture · Acquisition complete', 'Imported geometry · Parts review pending', 'Geometry review required · Build locked', 'Locked · Manufacturing review required'];

export default function CadWorkflow({ preview, phase, onPhase }: Props) {
  const { colors } = useAppTheme();
  const fixture = preview.fixture;
  const text = [Typography.caption, { color: colors.mutedText, lineHeight: 20 }];
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
        <CadImportPanel internalPreview={preview} onReviewQualifiedResult={() => onPhase(3)} />
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
        <CadAction label="View Build prerequisites" icon="lock-closed-outline" onPress={() => onPhase(4)} />
      </>}
      {phase === 4 && <>
        <View testID="cad-build-locked" style={{ gap: Spacing.md }}>
          <CadNotice icon="lock-closed-outline">Manufacturing preparation is locked</CadNotice>
          <Text style={text}>Review these prerequisites before BOM or manufacturing exports can be prepared.</Text>
          {['Reviewed dimensions and features', 'Resolved geometry issues', 'Verified parts list'].map(label => <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Ionicons name="ellipse-outline" size={16} color={colors.mutedText} accessible={false} />
            <Text style={[Typography.label, { color: colors.text, flex: 1 }]}>{label}</Text>
          </View>)}
          <Text style={text}>This fixture provides visual review only. Build approval and output generation are unavailable in this preview.</Text>
          <CadAction label="Prepare outputs · Locked" accessibilityLabel="Prepare outputs unavailable: manufacturing review required" icon="lock-closed-outline" disabled />
        </View>
        <CadDetails title="Geometry warnings & review limits" testID="cad-build-details">
          {fixture.warnings.map(warning => <Text key={warning} style={text}>• {warning}</Text>)}
        </CadDetails>
        <CadAction label="Return to Design review" primary icon="arrow-back-outline" onPress={() => onPhase(3)} />
        <CadAction label="Review inventory prerequisites" icon="layers-outline" onPress={() => onPhase(2)} />
      </>}
    </View>
  </View>;
}
