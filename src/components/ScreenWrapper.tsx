import React from 'react';
import { View, StyleSheet, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenWrapperProps {
  children: React.ReactNode;
  scroll?: boolean;
  backgroundColor?: string;
  horizontalPadding?: number;
}

const ScreenWrapper: React.FC<ScreenWrapperProps> = ({ 
  children, 
  scroll = true, 
  backgroundColor = '#0D0D1A',
  horizontalPadding = 16 
}) => {
  const insets = useSafeAreaInsets();

  const containerStyle = [
    styles.container,
    { 
      backgroundColor,
      paddingTop: Platform.OS === 'android' ? insets.top : 0,
    }
  ];

  const contentStyle = [
    styles.content,
    { paddingHorizontal: horizontalPadding }
  ];

  if (scroll) {
    return (
      <View style={containerStyle}>
        <ScrollView 
          contentContainerStyle={[contentStyle, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[containerStyle, contentStyle, { paddingBottom: insets.bottom + 80 }]}>
      {children}
    </View>
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
