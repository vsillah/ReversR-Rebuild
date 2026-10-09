import { useCadDesktopWorkspace } from '../hooks/useCadDesktopWorkspace';
import React from 'react';
import { Image, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radii, Spacing, Typography } from '../constants/theme';
import { CadAction, CadDetails, CadSourceFacts, CadProvenance } from './CadReviewUI';
import { useAppTheme } from '../hooks/useAppTheme';
import type { CadInternalTesterFixture } from '../utils/cadInternalTesterPreview';
import CadFixtureViewer from './CadFixtureViewer';
import { createPublicCubeDerivedStl, PUBLIC_CUBE_SHA256 } from '../utils/igsImportJourney';

export default function CadDesignReview({ fixture, onChangeSource, desktop = false, onReadiness }: { fixture: CadInternalTesterFixture; onChangeSource?: () => void; desktop?: boolean; onReadiness?: () => void }) {
  const { viewerHeight } = useCadDesktopWorkspace();
  const { colors } = useAppTheme();
  const DetailsContainer = desktop ? ScrollView : View;
  const text = [Typography.caption, { color: colors.mutedText, lineHeight: 20 }];
  const isDispenserReview = fixture.previewGeometry.kind === 'stl';
  const isLocalPreview = fixture.previewGeometry.kind === 'mesh';
  const canDownloadSource = Boolean(fixture.sourceAssetUrl);
  const canDownloadDerived = fixture.sha256 === PUBLIC_CUBE_SHA256 || Boolean(fixture.derivedInspectionStl);
  const openAsset = (url: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };
  const downloadSource = () => {
    if (!fixture || !canDownloadSource || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const link = document.createElement('a');
    link.href = fixture.sourceAssetUrl;
    link.download = fixture.sourceFileName;
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };
  const downloadDerivedMesh = () => {
    if (!canDownloadDerived || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const content = fixture.derivedInspectionStl?.content ?? createPublicCubeDerivedStl();
    const href = URL.createObjectURL(new Blob([content], { type: 'model/stl' }));
    const link = document.createElement('a');
    link.href = href;
    link.download = fixture.derivedInspectionStl?.fileName ?? 'reversr-public-cube-derived-inspection-mesh-mm.stl';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 0);
  };
  return (
    <View testID="cad-qualified-result" style={{ gap: Spacing.md }}>
      <View style={{ flexDirection: desktop ? 'row' : 'column', gap: Spacing.sm, alignItems: desktop ? 'center' : undefined }}>
      <View style={{ gap: Spacing.xs, flex: desktop ? 1 : undefined }}>
        <Text style={[Typography.heading, { color: colors.text }]}>{fixture.fixtureName}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} accessible={false} />
          <Text style={[Typography.caption, { color: colors.success }]}>{isLocalPreview ? 'Local render ready · Internal preview' : 'Local validation passed · Public IGS file'}</Text>
        </View>
      </View>
      {onChangeSource ? <CadAction testID="cad-change-source-from-design" accessibilityLabel="Change CAD source" label="Change source" icon="arrow-back-outline" onPress={onChangeSource} /> : null}
      </View>
      <View style={{ flexDirection: desktop ? 'row' : 'column', gap: Spacing.lg }}>
      <View style={{ flex: desktop ? 1 : undefined, minWidth: 0 }}>
        <CadFixtureViewer geometry={fixture.previewGeometry} label={fixture.fixtureName} height={desktop ? viewerHeight : undefined} />
      </View>
      <DetailsContainer testID="cad-review-rail" style={desktop ? { width: 300, height: viewerHeight, flexGrow: 0 } : { gap: Spacing.md }} contentContainerStyle={{ gap: Spacing.md }}>
      {desktop && <CadAction label="View implementation readiness" icon="lock-closed-outline" onPress={onReadiness} />}
      <CadSourceFacts fixture={fixture} />
      {canDownloadSource ? <CadAction testID="cad-open-source-iges" role="link" accessibilityLabel={`Download original ${fixture.sourceFileName}`} label={canDownloadDerived ? 'Download original .igs file' : 'Download original CAD'} icon="download-outline" onPress={downloadSource} /> : null}
      {canDownloadDerived ? <CadAction testID="igs-download-derived-stl" accessibilityLabel="Download derived inspection mesh STL in millimeters" label="Download derived inspection mesh (.stl)" icon="download-outline" onPress={downloadDerivedMesh} /> : null}
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
          ? 'The interactive model is the calibrated display mesh derived from the authorized CAD source. Reference images remain independent visual checks.'
          : isLocalPreview
            ? 'The interactive model was generated locally in this browser from the selected CAD file. It is an internal preview only and does not activate production upload or conversion.'
            : 'This interactive model represents the digest-verified public IGS file as a deterministic inspection mesh. It does not activate production upload or conversion.'}</Text>
      </CadDetails>
      </DetailsContainer>
      </View>
    </View>
  );
}
