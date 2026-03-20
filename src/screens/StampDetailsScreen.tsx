import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';

import { ActionButton } from '../components/ActionButton';
import type { RootStackParamList } from '../navigation/types';
import { useAppContext, useAppTheme } from '../state/AppProvider';
import { formatEntryDate } from '../utils/date';

type StampDetailsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'StampDetails'
>;

export function StampDetailsScreen({
  navigation,
  route,
}: StampDetailsScreenProps) {
  const { state } = useAppContext();
  const theme = useAppTheme();
  const styles = createStyles(theme);

  const selectedEntry = state.entries.find(
    (entry) => entry.id === route.params.entryId
  );

  if (!selectedEntry) {
    return (
      <View style={styles.missingScreen}>
        <View style={styles.missingCard}>
          <Text style={styles.eyebrow}>Stamp Missing</Text>
          <Text style={styles.missingTitle}>This travel stamp is no longer here.</Text>
          <Text style={styles.missingBody}>
            It may have been removed from the diary already. Head back to the
            gallery to choose another saved entry.
          </Text>
          <ActionButton
            label="Back to Gallery"
            onPress={() => {
              navigation.navigate('Home');
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      contentInsetAdjustmentBehavior="automatic"
      style={styles.screen}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Stamp Details</Text>
        <Text style={styles.title}>A closer look at this saved stop.</Text>
        <Text style={styles.bodyText}>
          Each stamp keeps the captured image, resolved address, and location
          coordinates stored in your diary.
        </Text>
      </View>

      <View style={styles.imageCard}>
        <Image
          cachePolicy="memory-disk"
          contentFit="cover"
          source={{ uri: selectedEntry.imageUri }}
          style={styles.image}
          transition={180}
        />
      </View>

      <View style={styles.detailsCard}>
        <View style={styles.stampMetaRow}>
          <View style={styles.metaChip}>
            <Text style={styles.metaChipLabel}>Saved</Text>
            <Text style={styles.metaChipValue}>
              {formatEntryDate(selectedEntry.createdAt)}
            </Text>
          </View>
          <View style={styles.metaChip}>
            <Text style={styles.metaChipLabel}>Stamp ID</Text>
            <Text numberOfLines={1} style={styles.metaChipValue}>
              {selectedEntry.id}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Address</Text>
          <Text style={styles.addressValue}>{selectedEntry.address}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Coordinates</Text>
          <Text style={styles.coordinateValue}>
            Latitude: {selectedEntry.latitude.toFixed(5)}
          </Text>
          <Text style={styles.coordinateValue}>
            Longitude: {selectedEntry.longitude.toFixed(5)}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
      gap: theme.spacing.lg,
    },
    heroCard: {
      gap: theme.spacing.md,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.xl,
    },
    eyebrow: {
      color: theme.colors.accent,
      fontFamily: theme.typography.mono,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1.6,
      textTransform: 'uppercase',
    },
    title: {
      color: theme.colors.text,
      fontFamily: theme.typography.display,
      fontSize: 30,
      lineHeight: 36,
      fontWeight: '700',
    },
    bodyText: {
      color: theme.colors.mutedText,
      fontSize: 15,
      lineHeight: 22,
    },
    imageCard: {
      overflow: 'hidden',
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.sm,
    },
    image: {
      width: '100%',
      height: 360,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.paper,
    },
    detailsCard: {
      gap: theme.spacing.lg,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.xl,
    },
    stampMetaRow: {
      gap: theme.spacing.md,
    },
    metaChip: {
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
      padding: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    metaChipLabel: {
      color: theme.colors.mutedText,
      fontFamily: theme.typography.mono,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    metaChipValue: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    section: {
      gap: theme.spacing.sm,
    },
    sectionLabel: {
      color: theme.colors.accent,
      fontFamily: theme.typography.mono,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    addressValue: {
      color: theme.colors.text,
      fontFamily: theme.typography.display,
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '700',
    },
    coordinateValue: {
      color: theme.colors.mutedText,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '600',
    },
    missingScreen: {
      flex: 1,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
    },
    missingCard: {
      gap: theme.spacing.md,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.xl,
    },
    missingTitle: {
      color: theme.colors.text,
      fontFamily: theme.typography.display,
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '700',
    },
    missingBody: {
      color: theme.colors.mutedText,
      fontSize: 15,
      lineHeight: 22,
    },
  });
