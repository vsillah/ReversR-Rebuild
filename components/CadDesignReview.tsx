import React from 'react';
import { Image, Platform, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radii, Spacing, Typography } from '../constants/theme';
import { CadAction, CadDetails, CadSourceFacts, CadProvenance } from './CadReviewUI';
import { useAppTheme } from '../hooks/useAppTheme';
import type { CadInternalTesterFixture } from '../utils/cadInternalTesterPreview';
import CadFixtureViewer from './CadFixtureViewer';

export default function CadDesignReview({ fixture }: { fixture: CadInternalTesterFixture }) {
  const { colors } = useAppTheme();
  const text = [Typography.caption, { color: colors.mutedText, lineHeight: 20 }];
  const isDispenserReview = fixture.previewGeometry.kind === 'stl';
  const openAsset = (url: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };
  const downloadSource = () => {
    if (!fixture || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const link = document.createElement('a');
    link.href = fixture.sourceAssetUrl;
    link.download = fixture.sourceFileName;
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };
  return (
    <View testID="cad-qualified-result" style={{ gap: Spacing.md }}>
      <View style={{ gap: Spacing.xs }}>
        <Text style={[Typography.heading, { color: colors.text }]}>{fixture.fixtureName}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} accessible={false} />
          <Text style={[Typography.caption, { color: colors.success }]}>Admission passed · Public fixture</Text>
        </View>
      </View>
      <CadFixtureViewer geometry={fixture.previewGeometry} label={fixture.fixtureName} />
      <CadSourceFacts fixture={fixture} />
      <CadAction testID="cad-open-source-iges" role="link" accessibilityLabel={`Download original ${fixture.sourceFileName}`} label="Download original IGES" icon="download-outline" onPress={downloadSource} />
      {isDispenserReview && <View testID="cad-reference-comparison" style={{ gap: Spacing.sm }}>
        <Text accessibilityRole="header" style={[Typography.heading, { color: colors.text }]}>Supplied reference views</Text>
        <Text style={text}>Compare with the model. Open an image for a closer look.</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
          {fixture.referenceImages.map(reference => <TouchableOpacity key={reference.url} accessibilityRole="link" accessibilityLabel={`Open ${reference.label} reference image`}
            style={{ flexBasis: '45%', flexGrow: 1, minWidth: 96, gap: Spacing.xs }} onPress={() => openAsset(reference.url)}>
            <Image source={{ uri: reference.url }} accessibilityLabel={`${reference.label} supplied reference`} resizeMode="contain"
              style={{ width: '100%', aspectRatio: 4 / 3, backgroundColor: '#ffffff', borderRadius: Radii.xs }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 28 }}>
              <Text style={[Typography.label, { color: colors.text }]}>{reference.label}</Text>
              <Ionicons name="open-outline" size={14} color={colors.primary} accessible={false} />
            </View>
          </TouchableOpacity>)}
        </View>
      </View>}
      <CadDetails title="Geometry, source & review limits" testID="cad-design-details">
        {fixture.warnings.map(warning => <Text key={warning} style={text}>• {warning}</Text>)}
        <CadProvenance fixture={fixture} />
        <Text style={text}>{isDispenserReview
          ? 'The interactive model is the calibrated display mesh derived from the authorized IGES source. Reference images remain independent visual checks.'
          : 'This interactive visual represents the reviewed synthetic public-cube fixture. It is not a render of a selected or uploaded file.'}</Text>
      </CadDetails>
    </View>
  );
}
