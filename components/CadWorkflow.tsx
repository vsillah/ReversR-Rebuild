import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import type { CadInternalTesterPreview } from '../utils/cadInternalTesterPreview';
import CadImportPanel from './CadImportPanel';
import CadDesignReview from './CadDesignReview';

type Props = {
  preview: Extract<CadInternalTesterPreview, { enabled: true }>;
  phase: number;
  onPhase: (phase: number) => void;
};

export default function CadWorkflow({ preview, phase, onPhase }: Props) {
  const { colors } = useAppTheme();
  const fixture = preview.fixture;
  const text = { color: colors.text, lineHeight: 22 };
  const button = { padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border };
  const action = (label: string, target: number) => (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} style={button} onPress={() => onPhase(target)}>
      <Text style={text}>{label}</Text>
    </TouchableOpacity>
  );
  return (
    <View testID={`cad-phase-${phase}`} style={{ gap: 14 }}>
      <Text accessibilityRole="header" style={[text, { fontSize: 22, fontWeight: '700' }]}>
        {['Input · Complete', 'Inventory · Complete', 'Design · Active', 'Build · Locked'][phase - 1]}
      </Text>
      {phase === 1 && <>
        <Text style={text}>Source acquisition and conversion are complete for this fixed review fixture.</Text>
        <CadImportPanel internalPreview={preview} onReviewQualifiedResult={() => onPhase(3)} />
        {action('View generated inventory', 2)}
      </>}
      {phase === 2 && <>
        <Text style={text}>Auto-generated inventory</Text>
        <Text style={text}>{fixture.sourceFileName} · {fixture.format}</Text>
        <Text style={text}>{fixture.meshes} {fixture.previewGeometry.kind === 'stl' ? 'connected components' : 'mesh'} · {fixture.triangles.toLocaleString()} triangles</Text>
        <Text style={text}>Units: {fixture.units}</Text>
        <Text style={text}>Imported extents (X × Y × Z): {fixture.expectedDimensions.map(value => value.toFixed(2)).join(' × ')} {fixture.units}</Text>
        <Text style={text}>Source: {fixture.sourcePackage}</Text>
        <Text style={text}>Source confidence: {fixture.sourceConfidence}</Text>
        <Text style={text}>Mesh components are not a verified parts list. Part identities, features, and manufacturing dimensions still need review.</Text>
        {action('Review in Design', 3)}
        {action('Review source in Input', 1)}
      </>}
      {phase === 3 && <>
        <Text style={text}>Review the interactive model, source dimensions, reference views, and geometry issues before preparing outputs.</Text>
        <CadDesignReview fixture={fixture} />
        {action('View Build prerequisites', 4)}
      </>}
      {phase === 4 && <>
        <View testID="cad-build-locked" style={{ gap: 10, backgroundColor: colors.elevated, padding: 16, borderRadius: 10 }}>
          <Text style={[text, { fontWeight: '700' }]}>Manufacturing preparation is locked</Text>
          <Text style={text}>Build needs reviewed dimensions and features, resolved geometry issues, and a verified parts list before BOM and manufacturing exports can be prepared.</Text>
          {fixture.warnings.map(warning => <Text key={warning} style={text}>• {warning}</Text>)}
          <Text style={text}>This fixture provides visual review only. Build approval and output generation are unavailable in this preview.</Text>
          <TouchableOpacity disabled accessibilityRole="button" accessibilityLabel="Prepare outputs unavailable: manufacturing review required" accessibilityState={{ disabled: true }} style={button}>
            <Text style={{ color: colors.mutedText }}>Prepare outputs · Locked</Text>
          </TouchableOpacity>
        </View>
        {action('Return to Design review', 3)}
        {action('Review inventory prerequisites', 2)}
      </>}
    </View>
  );
}
