import React from 'react';
import { Image, Platform, Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import type { CadInternalTesterFixture } from '../utils/cadInternalTesterPreview';
import CadFixtureViewer from './CadFixtureViewer';

export default function CadDesignReview({ fixture }: { fixture: CadInternalTesterFixture }) {
  const { colors } = useAppTheme();
  const text = { color: colors.text, lineHeight: 22 };
  const button = { padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border };
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
        <View testID="cad-qualified-result" style={{ gap: 10, paddingTop: 16, paddingBottom: 16, borderTopWidth: 1, borderColor: colors.border }}>
          <View style={{ gap: 4 }}>
            <Text style={[text, { fontWeight: '700' }]}>{fixture.fixtureName}</Text>
            <Text style={{ color: colors.mutedText, lineHeight: 20 }}>Source-derived display mesh · Drag or select a fixed view</Text>
          </View>
          <CadFixtureViewer geometry={fixture.previewGeometry} label={fixture.fixtureName} />
          <Text style={[text, { fontWeight: '700' }]}>Development qualification result</Text>
          <Text style={text}>Admission passed</Text>
          <Text style={text}>{isDispenserReview
            ? `${fixture.meshes} connected components · ${fixture.triangles.toLocaleString()} triangles`
            : `${fixture.meshes} mesh · ${fixture.vertices} vertices · ${fixture.triangles} triangles`}</Text>
          <Text style={text}>Source confidence: {fixture.sourceConfidence}</Text>
          <Text style={text}>
            Imported extents (X × Y × Z): {fixture.expectedDimensions.map(value => value.toFixed(2)).join(' × ')} {fixture.units}
          </Text>
          <TouchableOpacity
            testID="cad-open-source-iges"
            accessibilityRole="link"
            accessibilityLabel={`Download original ${fixture.sourceFileName}`}
            style={button}
            onPress={downloadSource}
          >
            <Text style={text}>Download original IGES</Text>
          </TouchableOpacity>
          {isDispenserReview ? (
            <View testID="cad-reference-comparison" style={{ gap: 10, paddingTop: 8 }}>
              <Text style={[text, { fontWeight: '700' }]}>Supplied reference views</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {fixture.referenceImages.map(reference => (
                  <TouchableOpacity
                    key={reference.url}
                    accessibilityRole="link"
                    accessibilityLabel={`Open ${reference.label} reference image`}
                    style={{ width: '48%', minWidth: 140, gap: 6 }}
                    onPress={() => openAsset(reference.url)}
                  >
                    <Image
                      source={{ uri: reference.url }}
                      accessibilityLabel={`${reference.label} supplied reference`}
                      resizeMode="contain"
                      style={{ width: '100%', aspectRatio: 4 / 3, backgroundColor: '#ffffff', borderRadius: 6 }}
                    />
                    <Text style={{ color: colors.mutedText, lineHeight: 20 }}>{reference.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}
          <View style={{ gap: 4, paddingTop: 4 }}>
            {fixture.warnings.map(warning => (
              <Text key={warning} style={{ color: colors.mutedText, lineHeight: 20 }}>• {warning}</Text>
            ))}
          </View>
          <Text style={{ color: colors.mutedText, lineHeight: 20 }}>
            {isDispenserReview
              ? 'The interactive model is the calibrated display mesh derived from the authorized IGES source. Reference images remain independent visual checks.'
              : 'This interactive visual represents the reviewed synthetic public-cube fixture. It is not a render of a selected or uploaded file.'}
          </Text>
        </View>
  );
}
