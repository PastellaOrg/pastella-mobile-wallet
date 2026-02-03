import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../theme/colors';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastData {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

let listener: ((toast: ToastData) => void) | null = null;

export const ToastManager = {
  show: (message: string, type: ToastType = 'info', duration: number = 3000) => {
    const id = Date.now().toString();
    if (listener) {
      listener({ id, message, type, duration });
    }
  },
  success: (message: string, duration?: number) => {
    ToastManager.show(message, 'success', duration);
  },
  error: (message: string, duration?: number) => {
    ToastManager.show(message, 'error', duration);
  },
  warning: (message: string, duration?: number) => {
    ToastManager.show(message, 'warning', duration);
  },
  info: (message: string, duration?: number) => {
    ToastManager.show(message, 'info', duration);
  },
};

interface ToastItemProps {
  data: ToastData;
  onHide: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ data, onHide }) => {
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide after duration
    const timer = setTimeout(() => {
      hideToast();
    }, data.duration);

    return () => clearTimeout(timer);
  }, [data.id, data.duration]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  const getIcon = (): string => {
    switch (data.type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'information-circle';
    }
  };

  const getColor = (): string => {
    switch (data.type) {
      case 'success':
        return colors.success;
      case 'error':
        return colors.error;
      case 'warning':
        return colors.warning;
      case 'info':
      default:
        return colors.info;
    }
  };

  const icon = getIcon();
  const color = getColor();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={[styles.toast, { borderLeftColor: color }]}>
        <Ionicons name={icon as any} size={20} color={color} />
        <Text style={styles.message}>{data.message}</Text>
      </View>
    </Animated.View>
  );
};

interface ToastContainerProps {
  children: React.ReactNode;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    listener = (toast: ToastData) => {
      setToasts(prev => [...prev, toast]);
    };
    return () => {
      listener = null;
    };
  }, []);

  const handleHide = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <>
      {children}
      <View style={styles.toastContainer}>
        <View style={styles.toastList}>
          {toasts.map(toast => (
            <ToastItem key={toast.id} data={toast} onHide={() => handleHide(toast.id)} />
          ))}
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  toastContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    zIndex: 9999,
    pointerEvents: 'none',
  },
  toastList: {
    flexDirection: 'column-reverse',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    gap: spacing.sm,
    maxWidth: Dimensions.get('window').width - spacing.lg * 2,
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
});
