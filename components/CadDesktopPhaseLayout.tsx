import React from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Spacing } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';

export default function CadDesktopPhaseLayout({
  children,
  inspector,
  canvasTestID,
  inspectorTestID,
}: {
  children: React.ReactNode;
  inspector: React.ReactNode;
  canvasTestID: string;
  inspectorTestID: string;
}) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const inspectorWidth = width >= 1600 ? 360 : width >= 1280 ? 336 : 300;

  return (
    <View testID="cad-desktop-phase-layout" style={styles.layout}>
      <View testID={canvasTestID} style={styles.canvas}>{children}</View>
      <ScrollView
        testID={inspectorTestID}
        style={[
          styles.inspector,
          { width: inspectorWidth, minWidth: inspectorWidth, maxWidth: inspectorWidth, borderLeftColor: colors.hairline },
        ]}
        contentContainerStyle={styles.inspectorContent}
        showsVerticalScrollIndicator
        nestedScrollEnabled
      >
        {inspector}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  layout: { flex: 1, minWidth: 0, minHeight: 0, flexDirection: 'row', gap: Spacing.lg },
  canvas: { flex: 1, minWidth: 0, gap: Spacing.md },
  inspector: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', borderLeftWidth: 1 },
  inspectorContent: { flexGrow: 1, paddingLeft: Spacing.md, gap: Spacing.md },
});
