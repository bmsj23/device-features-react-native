import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { useAppTheme } from '../state/AppProvider';
import { formatEntryDate } from '../utils/date';

interface EntryCardProps {
  id: string;
  imageUri: string;
  address: string;
  createdAt: string;
  onOpen: (entryId: string) => void;
  onRemove: (entryId: string) => void;
}

export const EntryCard = memo(function EntryCard({
  id,
  imageUri,
  address,
  createdAt,
  onOpen,
  onRemove,
}: EntryCardProps) {
  const theme = useAppTheme();
  const styles = createStyles(theme);

  const handleOpen = useCallback(() => {
    onOpen(id);
  }, [id, onOpen]);

  const handleRemove = useCallback(() => {
    onRemove(id);
  }, [id, onRemove]);

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityHint="Opens the full travel stamp details"
        accessibilityRole="button"
        onPress={handleOpen}
        style={({ pressed }) => [
          styles.openArea,
          pressed ? styles.openAreaPressed : null,
        ]}
      >
        <View style={styles.imageShell}>
          <Image
            cachePolicy="memory-disk"
            contentFit="cover"
            recyclingKey={id}
            source={{ uri: imageUri }}
            style={styles.image}
            transition={180}
          />
        </View>
        <View style={styles.body}>
          <View style={styles.metaRow}>
            <Text style={styles.stampLabel}>Stamped</Text>
            <Text style={styles.metaValue}>{formatEntryDate(createdAt)}</Text>
          </View>
          <Text style={styles.addressLabel}>Address</Text>
          <Text style={styles.addressValue}>{address}</Text>
          <Text style={styles.openHint}>Tap card to view full stamp details</Text>
        </View>
      </Pressable>
      <View style={styles.footerRow}>
        <Pressable
          accessibilityRole="button"
          onPress={handleRemove}
          style={({ pressed }) => [
            styles.removeButton,
            pressed ? styles.removeButtonPressed : null,
          ]}
        >
          <Text style={styles.removeText}>Remove</Text>
        </Pressable>
      </View>
    </View>
  );
});

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    card: {
      overflow: 'hidden',
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      shadowColor: '#000000',
      shadowOpacity: theme.mode === 'dark' ? 0.34 : 0.08,
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 24,
      elevation: 4,
    },
    openArea: {
      flexShrink: 1,
    },
    openAreaPressed: {
      opacity: 0.94,
    },
    imageShell: {
      height: 208,
      backgroundColor: theme.colors.surfaceMuted,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      padding: theme.spacing.sm,
    },
    image: {
      width: '100%',
      height: '100%',
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.paper,
    },
    body: {
      gap: theme.spacing.sm,
      padding: theme.spacing.lg,
    },
    footerRow: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    stampLabel: {
      color: theme.colors.accent,
      fontFamily: theme.typography.mono,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    metaValue: {
      color: theme.colors.mutedText,
      fontSize: 13,
      fontWeight: '600',
    },
    addressLabel: {
      color: theme.colors.mutedText,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    addressValue: {
      color: theme.colors.text,
      fontSize: 17,
      lineHeight: 24,
      fontFamily: theme.typography.display,
    },
    openHint: {
      color: theme.colors.mutedText,
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    removeButton: {
      alignSelf: 'flex-start',
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.danger,
      backgroundColor: theme.colors.dangerSoft,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    removeButtonPressed: {
      opacity: 0.86,
    },
    removeText: {
      color: theme.colors.danger,
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
  });
