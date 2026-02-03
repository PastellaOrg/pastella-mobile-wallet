import React, { useRef, useEffect } from 'react';
import { StyleSheet, Animated } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { colors } from '../../theme/colors';

interface AnimatedScreenWrapperProps {
  children: React.ReactNode;
}

export const AnimatedScreenWrapper: React.FC<AnimatedScreenWrapperProps> = ({
  children,
}) => {
  const isFocused = useIsFocused();
  const previousFocusRef = useRef(false);

  // Animated values
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Only animate when switching TO this screen (focused becomes true)
    // AND when we were previously not focused
    if (isFocused && !previousFocusRef.current) {
      // Start with a subtle scale down
      scaleAnim.setValue(0.98);

      // Run animation - spring for smoother feel
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: false,
        tension: 50,
        friction: 7,
      }).start();
    }

    // Update the previous focus ref
    if (isFocused !== previousFocusRef.current) {
      previousFocusRef.current = isFocused;
    }
  }, [isFocused, scaleAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
