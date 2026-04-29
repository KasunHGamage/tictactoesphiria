import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../constants/theme';

interface ScreenWrapperProps {
  children: React.ReactNode;
  scroll?: boolean;
  backgroundColor?: string;
  horizontalPadding?: number;
}

const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  scroll = true,
  backgroundColor = Colors.bg,
  horizontalPadding = Spacing.md,
}) => {
  const insets = useSafeAreaInsets();

  const containerStyle = [
    styles.container,
    { backgroundColor },
  ];

  const contentStyle = [styles.content, { paddingHorizontal: horizontalPadding }];

  if (scroll) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={containerStyle}>
        <ScrollView
          contentContainerStyle={[contentStyle, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[containerStyle, contentStyle, { paddingBottom: insets.bottom + 80 }]}>
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
});

export default ScreenWrapper;
