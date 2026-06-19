import React from 'react';
import {
  Modal, View, Text, Pressable, StyleSheet, Animated, Dimensions,
} from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import { Spacing, Typography } from '../../constants/themes';

export interface ThemedAlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: ThemedAlertButton[];
  onDismiss?: () => void;
}

export default function ThemedAlert({ visible, title, message, buttons, onDismiss }: Props) {
  const t = useAppTheme();
  const isCalm = t.mode === 'calm';

  const resolvedButtons: ThemedAlertButton[] = buttons?.length
    ? buttons
    : [{ text: 'OK', style: 'default' }];

  const handlePress = (btn: ThemedAlertButton) => {
    onDismiss?.();
    btn.onPress?.();
  };

  const buttonColor = (style?: string) => {
    if (style === 'destructive') return t.lose;
    if (style === 'cancel')      return t.textSecondary;
    return t.primary;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Pressable style={s.overlay} onPress={onDismiss}>
        <Pressable
          style={[
            s.card,
            {
              backgroundColor: t.card,
              borderColor: t.border,
              borderWidth: isCalm ? 0.8 : 1.5,
            },
            isCalm
              ? (t.shadowElevation('lg') as any)
              : (t.glow(t.primary, 20) as any),
          ]}
          // Prevent overlay press from firing when card is tapped
          onPress={(e) => e.stopPropagation()}
        >
          {/* Title */}
          <Text style={[s.title, { color: t.textPrimary }]}>{title}</Text>

          {/* Message */}
          {message ? (
            <Text style={[s.message, { color: t.textSecondary }]}>{message}</Text>
          ) : null}

          {/* Divider */}
          <View style={[s.divider, { backgroundColor: t.border }]} />

          {/* Buttons */}
          <View style={[s.buttonRow, resolvedButtons.length === 1 && s.buttonRowCenter]}>
            {resolvedButtons.map((btn, i) => (
              <React.Fragment key={btn.text}>
                {i > 0 && (
                  <View style={[s.buttonDividerV, { backgroundColor: t.border }]} />
                )}
                <Pressable
                  style={({ pressed }) => [
                    s.button,
                    resolvedButtons.length === 1 && s.buttonFull,
                    pressed && { opacity: 0.6 },
                  ]}
                  onPress={() => handlePress(btn)}
                >
                  <Text
                    style={[
                      s.buttonText,
                      { color: buttonColor(btn.style) },
                      btn.style !== 'cancel' && { fontWeight: '700' },
                    ]}
                  >
                    {btn.text}
                  </Text>
                </Pressable>
              </React.Fragment>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const { width } = Dimensions.get('window');

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    overflow: 'hidden',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  buttonRow: {
    flexDirection: 'row',
  },
  buttonRowCenter: {
    justifyContent: 'center',
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonFull: {
    flex: 1,
  },
  buttonDividerV: {
    width: StyleSheet.hairlineWidth,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: Typography.fontFamily,
    letterSpacing: 0.2,
  },
});
