import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useEffect } from 'react';

import { AppNavigator } from './navigation/AppNavigator';
import { configureNotificationsAsync } from './services/notifications';
import { useAppContext, useAppTheme } from './state/AppProvider';
import { createNavigationTheme } from './theme';

export function AppShell() {
  const { state } = useAppContext();
  const theme = useAppTheme();

  useEffect(() => {
    void configureNotificationsAsync().catch(() => undefined);
  }, []);

  if (!state.isHydrated) {
    const styles = createStyles(theme);

    return (
      <View style={styles.loadingScreen}>
        <View style={styles.loadingCard}>
          <Text style={styles.loadingEyebrow}>Passport Ledger</Text>
          <Text style={styles.loadingTitle}>Preparing your travel diary</Text>
          <Text style={styles.loadingBody}>
            We&apos;re unfolding your saved stamps, theme, and local journal
            details.
          </Text>
          <ActivityIndicator color={theme.colors.accent} size="small" />
        </View>
        <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <NavigationContainer theme={createNavigationTheme(theme)}>
        <AppNavigator />
      </NavigationContainer>
    </>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    loadingScreen: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: theme.colors.background,
    },
    loadingCard: {
      width: '100%',
      maxWidth: 420,
      padding: 24,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      gap: 14,
      shadowColor: '#000000',
      shadowOpacity: theme.mode === 'dark' ? 0.28 : 0.08,
      shadowOffset: { width: 0, height: 16 },
      shadowRadius: 28,
      elevation: 4,
    },
    loadingEyebrow: {
      color: theme.colors.accent,
      fontFamily: theme.typography.mono,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1.6,
      textTransform: 'uppercase',
    },
    loadingTitle: {
      color: theme.colors.text,
      fontFamily: theme.typography.display,
      fontSize: 30,
      lineHeight: 36,
      fontWeight: '700',
    },
    loadingBody: {
      color: theme.colors.mutedText,
      fontSize: 15,
      lineHeight: 22,
    },
  });
