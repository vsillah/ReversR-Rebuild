import { useCadDesktopWorkspace } from '../hooks/useCadDesktopWorkspace';
import React from 'react';
import { Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radii, Spacing, Typography } from '../constants/theme';
import { CadAction, CadDetails, CadSourceFacts, CadProvenance } from './CadReviewUI';
import { useAppTheme } from '../hooks/useAppTheme';
import type { CadInternalTesterFixture } from '../utils/cadInternalTesterPreview';
import CadFixtureViewer from './CadFixtureViewer';
import { createPublicCubeDerivedStl, PUBLIC_CUBE_SHA256 } from '../utils/igsImportJourney';
import type { SyntheticArtifacts } from '../utils/cadAuthenticatedImportQualification';

export default function CadDesignReview({ fixture, onChangeSource, desktop = false, onReadiness,
  qualificationArtifacts, onDeleteQualificationArtifacts }: { fixture: CadInternalTesterFixture;
  onChangeSource?: () => void; desktop?: boolean; onReadiness?: () => void;
  qualificationArtifacts?: SyntheticArtifacts | null; onDeleteQualificationArtifacts?: () => void }) {
  const { viewerHeight } = useCadDesktopWorkspace();
  const { colors } = useAppTheme();
  const DetailsContainer = desktop ? ScrollView : View;
  const text = [Typography.caption, { color: colors.mutedText, lineHeight: 20 }];
  const isDispenserReview = fixture.previewGeometry.kind === 'stl';
  const isLocalPreview = fixture.previewGeometry.kind === 'mesh';
  const isSyntheticQualification = fixture.qualificationProvenance?.kind === 'synthetic-igs-local';
  const canDownloadSource = Boolean(fixture.sourceAssetUrl || qualificationArtifacts?.original);
  const canDownloadDerived = Boolean(qualificationArtifacts?.stl)
    || fixture.sha256 === PUBLIC_CUBE_SHA256 || Boolean(fixture.derivedInspectionStl);
  const [downloadMenuOpen, setDownloadMenuOpen] = React.useState(false);
  const downloadMenuRef = React.useRef<View>(null);

  React.useEffect(() => {
    if (!downloadMenuOpen || Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    const closeOnOutsidePress = (event: MouseEvent | TouchEvent) => {
      const host = downloadMenuRef.current as unknown as HTMLElement | null;
      if (host && event.target instanceof Node && !host.contains(event.target)) setDownloadMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDownloadMenuOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsidePress);
    document.addEventListener('touchstart', closeOnOutsidePress);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsidePress);
      document.removeEventListener('touchstart', closeOnOutsidePress);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [downloadMenuOpen]);
  const openAsset = (url: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };
  const downloadSource = () => {
    if (!fixture || !canDownloadSource || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const link = document.createElement('a');
    let href = fixture.sourceAssetUrl;
    if (qualificationArtifacts?.original) {
      href = URL.createObjectURL(new Blob([qualificationArtifacts.original.bytes.slice().buffer as ArrayBuffer],
        { type: qualificationArtifacts.original.format }));
    }
    link.href = href;
    link.download = qualificationArtifacts?.original.fileName ?? fixture.sourceFileName;
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
    if (qualificationArtifacts?.original) window.setTimeout(() => URL.revokeObjectURL(href), 1000);
  };
  const downloadDerivedMesh = () => {
    if (!canDownloadDerived || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const content = qualificationArtifacts?.stl
      ? qualificationArtifacts.stl.bytes.slice().buffer as ArrayBuffer
      : fixture.derivedInspectionStl?.content ?? createPublicCubeDerivedStl();
    const href = URL.createObjectURL(new Blob([content], { type: 'model/stl' }));
    const link = document.createElement('a');
    link.href = href;
    link.download = qualificationArtifacts?.stl.fileName ?? fixture.derivedInspectionStl?.fileName
      ?? 'reversr-public-cube-derived-inspection-mesh-mm.stl';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
  };
  const chooseDownload = (download: () => void) => {
    setDownloadMenuOpen(false);
    download();
  };
  return (
    <View testID="cad-qualified-result" style={{ gap: Spacing.md }}>
      <View style={{ flexDirection: desktop ? 'row' : 'column', gap: Spacing.sm, alignItems: desktop ? 'center' : undefined }}>
      <View style={{ gap: Spacing.xs, flex: desktop ? 1 : undefined }}>
        <Text style={[Typography.heading, { color: colors.text }]}>{fixture.fixtureName}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} accessible={false} />
          <Text style={[Typography.caption, { color: colors.success }]}>{isSyntheticQualification
            ? 'Deterministic synthetic inspection ready · Real converter unqualified'
            : isLocalPreview ? 'Local render ready · Internal preview' : 'Local validation passed · Public IGS file'}</Text>
        </View>
      </View>
      {onChangeSource ? <CadAction testID="cad-change-source-from-design" accessibilityLabel="Change CAD source" label="Change source" icon="arrow-back-outline" onPress={onChangeSource} /> : null}
      </View>
      <View style={{ flexDirection: desktop ? 'row' : 'column', gap: Spacing.lg }}>
      <View style={{ flex: desktop ? 1 : undefined, minWidth: 0 }}>
        <CadFixtureViewer geometry={fixture.previewGeometry} label={fixture.fixtureName} height={desktop ? viewerHeight : undefined} />
      </View>
      <DetailsContainer testID="cad-review-rail" style={desktop ? { width: 300, height: viewerHeight, flexGrow: 0 } : { gap: Spacing.md }} contentContainerStyle={{ gap: Spacing.md }}>
      {desktop && onReadiness ? <CadAction label="View implementation readiness" icon="lock-closed-outline" onPress={onReadiness} /> : null}
      <CadSourceFacts fixture={fixture} />
      {(canDownloadSource || canDownloadDerived) ? <View ref={downloadMenuRef} style={downloadStyles.host}>
        <TouchableOpacity
          testID="cad-download-menu-trigger"
          accessibilityRole="button"
          accessibilityLabel="Choose file to download"
          accessibilityState={{ expanded: downloadMenuOpen }}
          aria-expanded={downloadMenuOpen}
          aria-haspopup="menu"
          aria-controls="cad-download-menu"
          onPress={() => setDownloadMenuOpen(open => !open)}
          style={[downloadStyles.trigger, { borderColor: colors.border }]}
        >
          <Text style={[Typography.label, { color: colors.primary, flex: 1 }]}>Download</Text>
          <Ionicons name="download-outline" size={18} color={colors.primary} accessible={false} />
          <Ionicons name={downloadMenuOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} accessible={false} />
        </TouchableOpacity>
        {downloadMenuOpen ? <View nativeID="cad-download-menu" testID="cad-download-menu" role="menu" style={[downloadStyles.menu, { backgroundColor: colors.panel, borderColor: colors.border, shadowColor: colors.shadowColor }]}>
          {canDownloadSource ? <TouchableOpacity
            testID="cad-open-source-iges"
            accessibilityRole="button"
            accessibilityLabel={`Original IGS (.igs), ${fixture.sourceFileName}`}
            role="menuitem"
            onPress={() => chooseDownload(downloadSource)}
            style={downloadStyles.option}
          >
            <Ionicons name="document-outline" size={18} color={colors.primary} accessible={false} />
            <View style={downloadStyles.optionText}>
              <Text style={[Typography.label, { color: colors.text }]}>Original IGS (.igs)</Text>
              <Text style={[Typography.caption, { color: colors.mutedText }]} numberOfLines={1}>{fixture.sourceFileName} · source asset</Text>
            </View>
          </TouchableOpacity> : null}
          {canDownloadDerived ? <TouchableOpacity
            testID="igs-download-derived-stl"
            accessibilityRole="button"
            accessibilityLabel="Inspection mesh (.stl), derived review artifact"
            role="menuitem"
            onPress={() => chooseDownload(downloadDerivedMesh)}
            style={[downloadStyles.option, canDownloadSource && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
          >
            <Ionicons name="cube-outline" size={18} color={colors.primary} accessible={false} />
            <View style={downloadStyles.optionText}>
              <Text style={[Typography.label, { color: colors.text }]}>Inspection mesh (.stl)</Text>
              <Text style={[Typography.caption, { color: colors.mutedText }]} numberOfLines={1}>Derived review artifact · millimeters</Text>
            </View>
          </TouchableOpacity> : null}
        </View> : null}
      </View> : null}
      {qualificationArtifacts && onDeleteQualificationArtifacts ? <TouchableOpacity
        testID="cad-delete-synthetic-artifacts" accessibilityRole="button"
        accessibilityLabel="Delete synthetic artifacts and revoke access"
        onPress={onDeleteQualificationArtifacts}
        style={[downloadStyles.deleteAction, { borderColor: colors.border }]}>
        <Ionicons name="trash-outline" size={16} color={colors.danger} accessible={false} />
        <Text style={[Typography.caption, { color: colors.danger, fontWeight: '700' }]}>Delete synthetic artifacts</Text>
      </TouchableOpacity> : null}
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
          : isSyntheticQualification
            ? 'The interactive cube is a deterministic synthetic inspection adapter output. It proves the bounded local journey only; it is not converted from the generated IGS geometry, and production authentication remains unqualified.'
          : isLocalPreview
            ? 'The interactive model was generated locally in this browser from the selected CAD file. It is an internal preview only and does not activate production upload or conversion.'
            : 'This interactive model represents the digest-verified public IGS file as a deterministic inspection mesh. It does not activate production upload or conversion.'}</Text>
      </CadDetails>
      </DetailsContainer>
      </View>
    </View>
  );
}

const downloadStyles = StyleSheet.create({
  host: { position: 'relative' },
  trigger: { minHeight: 42, borderWidth: 1, borderRadius: Radii.md, paddingHorizontal: Spacing.md, paddingVertical: 9, flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  menu: { marginTop: 6, borderWidth: 1, borderRadius: Radii.md, overflow: 'hidden', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 18, elevation: 8 },
  option: { minHeight: 56, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  optionText: { flex: 1, minWidth: 0, gap: 2 },
  deleteAction: { minHeight: 40, borderWidth: 1, borderRadius: Radii.md, paddingHorizontal: Spacing.md,
    paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
});
