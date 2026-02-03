import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { colors } from '../../theme/colors';

interface FadeInProps {
  children: React.ReactNode;
}

export const FadeIn: React.FC<FadeInProps> = ({ children }) => {
  const isFocused = useIsFocused();
  const hasAnimated = useRef(false);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isFocused && !hasAnimated.current) {
      hasAnimated.current = true;

      // Start from 0.7 instead of 0 to reduce white flash
      opacity.setValue(0.7);

      // Fade in from 0.7 to 1 (subtle fade)
      Animated.timing(opacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }

    if (!isFocused) {
      hasAnimated.current = false;
      // Don't reset opacity here - keeps screen visible to avoid white flash
    }
  }, [isFocused, opacity]);

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.container, { opacity }]}>
        {children}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
