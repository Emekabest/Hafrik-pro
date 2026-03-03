import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  GestureResponderEvent,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../../theme';

type ButtonProps = {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
};

export default function Button({
  title,
  onPress,
  disabled = false,
  loading = false,
  style,
  textStyle,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      disabled={isDisabled}
      onPress={onPress}
      style={[styles.button, isDisabled && styles.buttonDisabled, style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={Colors.white} />
      ) : (
        <Text style={[styles.buttonText, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    ...Typography.button,
    color: Colors.white,
  },
});
