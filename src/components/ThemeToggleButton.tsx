import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import { useAppContext, useAppTheme } from '../state/AppProvider';

export function ThemeToggleButton() {
  const {
    state: { themeMode },
    toggleTheme,
  } = useAppContext();
  const theme = useAppTheme();
  const styles = createStyles(theme);

  const buttonLabel = themeMode === 'light' ? 'Dark' : 'Light';

  async function handleToggleTheme() {
    try {
      await toggleTheme();
    } catch {
      Alert.alert(
        'Theme update failed',
        'We could not save your theme preference. Please try again.'
      );
    }
  }

  return (
    <Pressable
      accessibilityLabel={`Switch to ${buttonLabel.toLowerCase()} mode`}
      accessibilityRole="button"
      onPress={() => {
        void handleToggleTheme();
      }}
      style={({ pressed }) => [
        styles.toggleButton,
        pressed ? styles.toggleButtonPressed : null,
      ]}
    >
      <Text style={styles.toggleText}>{buttonLabel}</Text>
    </Pressable>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    toggleButton: {
      minWidth: 72,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    toggleButtonPressed: {
      opacity: 0.88,
    },
    toggleText: {
      color: theme.colors.text,
      fontFamily: theme.typography.mono,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
  });
