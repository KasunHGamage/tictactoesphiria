import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Colors } from '../../constants/theme';

const NeonConfetti: React.FC<{ show: boolean; onComplete?: () => void }> = ({ show, onComplete }) => {
  const [active, setActive] = useState(show);

  useEffect(() => {
    setActive(show);
  }, [show]);

  if (!active) return null;

  return (
    <View pointerEvents="none" style={styles.container}>
      <ConfettiCannon
        count={80}
        origin={{ x: -10, y: 0 }}
        colors={[Colors.neonPink, Colors.neonBlue, Colors.neonYellow, Colors.neonGreen, Colors.neonPurple]}
        fadeOut
        onAnimationEnd={() => {
          setActive(false);
          onComplete && onComplete();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
});

export default NeonConfetti;
