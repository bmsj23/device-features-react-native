import { Pressable, StyleSheet, Text } from 'react-native';

import { useAppTheme } from '../state/AppProvider';

type ActionButtonVariant = 'primary' | 'secondary' | 'danger';

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: ActionButtonVariant;
}

export function ActionButton({
  label,
  onPress,
  disabled = false,
  variant = 'primary',
}: ActionButtonProps) {
  const theme = useAppTheme();
  const styles = createStyles(theme);

  const buttonVariantStyle =
    variant === 'primary'
      ? styles.primaryButton
      : variant === 'danger'
        ? styles.dangerButton
        : styles.secondaryButton;
  const textVariantStyle =
    variant === 'primary'
      ? styles.primaryText
      : variant === 'danger'
        ? styles.dangerText
        : styles.secondaryText;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.buttonBase,
        buttonVariantStyle,
        pressed && !disabled ? styles.buttonPressed : null,
        disabled ? styles.buttonDisabled : null,
      ]}
    >
      <Text style={[styles.buttonTextBase, textVariantStyle]}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    buttonBase: {
      minHeight: 50,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
    },
    primaryButton: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    secondaryButton: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.borderStrong,
    },
    dangerButton: {
      backgroundColor: theme.colors.dangerSoft,
      borderColor: theme.colors.danger,
    },
    buttonPressed: {
      opacity: 0.86,
      transform: [{ translateY: 1 }],
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonTextBase: {
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    primaryText: {
      color: theme.mode === 'dark' ? '#132238' : '#FFF9F0',
    },
    secondaryText: {
      color: theme.colors.text,
    },
    dangerText: {
      color: theme.colors.danger,
    },
  });
