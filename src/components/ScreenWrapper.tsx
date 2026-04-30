import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../context/ThemeContext';
import { Spacing } from '../../constants/themes';

interface ScreenWrapperProps {
  children: React.ReactNode;
  scroll?: boolean;
  backgroundColor?: string;
  horizontalPadding?: number;
  refreshControl?: React.ReactElement<any>;
}

const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  scroll = true,
  backgroundColor,
  horizontalPadding = Spacing.md,
  refreshControl,
}) => {
  const t = useAppTheme();
  const insets = useSafeAreaInsets();
  const bgColor = backgroundColor ?? t.bg;

  const containerStyle = [styles.container, { backgroundColor: bgColor }];
  const contentStyle   = [styles.content,   { paddingHorizontal: horizontalPadding }];

  if (scroll) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={containerStyle}>
        <ScrollView
          contentContainerStyle={[contentStyle, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
          bounces={false}
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[containerStyle, contentStyle, { paddingBottom: insets.bottom + 80 }]}
    >
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { flexGrow: 1, justifyContent: 'flex-start' },
});

export default ScreenWrapper;
