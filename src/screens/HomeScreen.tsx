import { useCallback } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ActionButton } from '../components/ActionButton';
import { EntryCard } from '../components/EntryCard';
import type { RootStackParamList } from '../navigation/types';
import { useAppContext, useAppTheme } from '../state/AppProvider';
import type { TravelEntry } from '../types/app';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: HomeScreenProps) {
  const { state, removeEntry } = useAppContext();
  const theme = useAppTheme();
  const styles = createStyles(theme);

  const handleNavigateToAddEntry = useCallback(() => {
    navigation.navigate('AddEntry');
  }, [navigation]);

  const handleOpenEntry = useCallback(
    (entryId: string) => {
      navigation.navigate('StampDetails', { entryId });
    },
    [navigation]
  );

  const handleRemoveConfirmed = useCallback(
    async (entryId: string, imageUri: string) => {
      try {
        await removeEntry(entryId, imageUri);
      } catch {
        Alert.alert(
          'Could not remove entry',
          'We could not remove this travel entry right now. Please try again.'
        );
      }
    },
    [removeEntry]
  );

  const handleRemoveRequest = useCallback(
    (entryId: string) => {
      const matchingEntry = state.entries.find((entry) => entry.id === entryId);

      if (!matchingEntry) {
        return;
      }

      Alert.alert(
        'Remove travel entry',
        'This will remove the saved photo and address from your diary.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              void handleRemoveConfirmed(
                matchingEntry.id,
                matchingEntry.imageUri
              );
            },
          },
        ]
      );
    },
    [handleRemoveConfirmed, state.entries]
  );

  const renderEntry = useCallback(
    ({ item }: ListRenderItemInfo<TravelEntry>) => (
      <EntryCard
        address={item.address}
        createdAt={item.createdAt}
        id={item.id}
        imageUri={item.imageUri}
        onOpen={handleOpenEntry}
        onRemove={handleRemoveRequest}
      />
    ),
    [handleOpenEntry, handleRemoveRequest]
  );

  const keyExtractor = useCallback((item: TravelEntry) => item.id, []);

  const listHeader = (
    <View style={styles.headerBlock}>
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>Passport Editorial</Text>
        <Text style={styles.heroTitle}>Frame every stop with a photo stamp.</Text>
        <Text style={styles.heroBody}>
          Capture a memory, let the app fetch your current address, and keep
          your travel notes stored on the device for the next revisit.
        </Text>
        <ActionButton
          label="Add Travel Entry"
          onPress={handleNavigateToAddEntry}
        />
      </View>
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Saved Stamps</Text>
        <Text style={styles.sectionCount}>{state.entries.length} total</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        contentContainerStyle={
          state.entries.length > 0
            ? styles.contentContainer
            : styles.emptyContentContainer
        }
        data={state.entries}
        keyExtractor={keyExtractor}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Entries yet</Text>
            <Text style={styles.emptyBody}>
              Start your first stamp to build a local travel journal with photo
              memories and automatic addresses.
            </Text>
            <ActionButton
              label="Create First Entry"
              onPress={handleNavigateToAddEntry}
            />
          </View>
        }
        ListHeaderComponent={listHeader}
        renderItem={renderEntry}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    contentContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
      gap: theme.spacing.lg,
    },
    emptyContentContainer: {
      flexGrow: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
      gap: theme.spacing.lg,
    },
    headerBlock: {
      gap: theme.spacing.lg,
    },
    heroCard: {
      gap: theme.spacing.md,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.xl,
      shadowColor: '#000000',
      shadowOpacity: theme.mode === 'dark' ? 0.34 : 0.08,
      shadowOffset: { width: 0, height: 16 },
      shadowRadius: 28,
      elevation: 4,
    },
    heroEyebrow: {
      color: theme.colors.accent,
      fontFamily: theme.typography.mono,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1.6,
      textTransform: 'uppercase',
    },
    heroTitle: {
      color: theme.colors.text,
      fontFamily: theme.typography.display,
      fontSize: 34,
      lineHeight: 40,
      fontWeight: '700',
    },
    heroBody: {
      color: theme.colors.mutedText,
      fontSize: 15,
      lineHeight: 23,
    },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.xs,
    },
    sectionTitle: {
      color: theme.colors.text,
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    sectionCount: {
      color: theme.colors.mutedText,
      fontFamily: theme.typography.mono,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    emptyCard: {
      flex: 1,
      justifyContent: 'center',
      gap: theme.spacing.md,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.xl,
      minHeight: 260,
    },
    emptyTitle: {
      color: theme.colors.text,
      fontFamily: theme.typography.display,
      fontSize: 30,
      lineHeight: 36,
      fontWeight: '700',
    },
    emptyBody: {
      color: theme.colors.mutedText,
      fontSize: 15,
      lineHeight: 22,
    },
  });
