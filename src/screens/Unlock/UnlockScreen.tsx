import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../theme/colors';
import { SecureStorage } from '../../services/secureStorage';
import * as Haptics from 'expo-haptics';
import { useTranslations } from '../../i18n';

type UnlockNavigationProp = StackNavigationProp<any, 'Unlock'>;

interface Props {
  navigation: UnlockNavigationProp;
}

const UnlockScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslations();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePinSubmit = async (pinValue: string) => {
    if (pinValue.length !== 6) {
      return;
    }

    setIsLoading(true);
    const isValid = await SecureStorage.verifyPin(pinValue);
    setIsLoading(false);

    if (isValid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setError('');
      // Navigate to MainTabs
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(t.unlock.error);
      setPin('');
    }
  };

  const handleNumpadPress = (num: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (pin.length < 6) {
      const newPin = pin + num.toString();
      setPin(newPin);
      setError('');

      if (newPin.length === 6) {
        setTimeout(() => {
          handlePinSubmit(newPin);
        }, 300);
      }
    }
  };

  const handleBackspace = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setError('');
    }
  };

  const NumpadButton = ({ num, onPress }: { num: number; onPress: () => void }) => (
    <TouchableOpacity style={styles.numberButton} onPress={onPress}>
      <Text style={styles.numberButtonText}>{num}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      <View style={styles.pinHeader}>
        <View style={styles.logoContainer}>
          <Ionicons name="wallet" size={40} color={colors.primary} />
        </View>
        <Text style={styles.title}>Pastella Wallet</Text>
        <Text style={styles.subtitle}>{t.unlock.subtitle}</Text>
      </View>

      <View style={styles.pinTopContent}>
        <View style={styles.pinDisplayContainer}>
          <View style={styles.pinDisplay}>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <View
                key={index}
                style={[
                  styles.pinDot,
                  pin.length > index && styles.pinDotFilled,
                ]}
              />
            ))}
          </View>
        </View>

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <Text style={styles.hintText}>{t.unlock.hint}</Text>
        )}
      </View>

      <View style={styles.numpad}>
        <View style={styles.numpadRow}>
          <NumpadButton num={1} onPress={() => handleNumpadPress(1)} />
          <NumpadButton num={2} onPress={() => handleNumpadPress(2)} />
          <NumpadButton num={3} onPress={() => handleNumpadPress(3)} />
        </View>
        <View style={styles.numpadRow}>
          <NumpadButton num={4} onPress={() => handleNumpadPress(4)} />
          <NumpadButton num={5} onPress={() => handleNumpadPress(5)} />
          <NumpadButton num={6} onPress={() => handleNumpadPress(6)} />
        </View>
        <View style={styles.numpadRow}>
          <NumpadButton num={7} onPress={() => handleNumpadPress(7)} />
          <NumpadButton num={8} onPress={() => handleNumpadPress(8)} />
          <NumpadButton num={9} onPress={() => handleNumpadPress(9)} />
        </View>
        <View style={styles.numpadRow}>
          <View style={styles.emptyButton} />
          <NumpadButton num={0} onPress={() => handleNumpadPress(0)} />
          <TouchableOpacity
            style={styles.backspaceButton}
            onPress={handleBackspace}
          >
            <Ionicons name="backspace" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  pinHeader: {
    alignItems: 'center',
    paddingTop: spacing.xxl * 2,
    paddingBottom: spacing.xl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  pinTopContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinDisplayContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  pinDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.backgroundLight,
    borderWidth: 2,
    borderColor: colors.borderLight,
    marginHorizontal: spacing.xs,
  },
  pinDotFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  hintText: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
  },
  numpad: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xxl,
  },
  numpadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  numberButton: {
    flex: 1,
    aspectRatio: 1.5,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  numberButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
  },
  emptyButton: {
    flex: 1,
    aspectRatio: 1.5,
    marginHorizontal: spacing.xs,
  },
  backspaceButton: {
    flex: 1,
    aspectRatio: 1.5,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
});

export default UnlockScreen;
