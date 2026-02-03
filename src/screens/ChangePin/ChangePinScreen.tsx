import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../theme/colors';
import { SecureStorage } from '../../services/secureStorage';
import * as Haptics from 'expo-haptics';
import { useTranslations } from '../../i18n';

type ChangePinNavigationProp = StackNavigationProp<any, 'ChangePin'>;

interface Props {
  navigation: ChangePinNavigationProp;
}

type Step = 'verify-current' | 'enter-new' | 'confirm-new';

const ChangePinScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslations();
  const [step, setStep] = useState<Step>('verify-current');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getCurrentPin = () => {
    switch (step) {
      case 'verify-current':
        return currentPin;
      case 'enter-new':
        return newPin;
      case 'confirm-new':
        return confirmPin;
    }
  };

  const setCurrentPinValue = (value: string) => {
    switch (step) {
      case 'verify-current':
        setCurrentPin(value);
        break;
      case 'enter-new':
        setNewPin(value);
        break;
      case 'confirm-new':
        setConfirmPin(value);
        break;
    }
  };

  const clearPins = () => {
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setError('');
  };

  // Reset state when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      clearPins();
      setStep('verify-current');
    });

    return unsubscribe;
  }, [navigation]);

  const getTitle = () => {
    switch (step) {
      case 'verify-current':
        return t.changePin.verifyTitle;
      case 'enter-new':
        return t.changePin.newTitle;
      case 'confirm-new':
        return t.changePin.confirmTitle;
    }
  };

  const getSubtitle = () => {
    switch (step) {
      case 'verify-current':
        return t.changePin.verifySubtitle;
      case 'enter-new':
        return t.changePin.newSubtitle;
      case 'confirm-new':
        return t.changePin.confirmSubtitle;
    }
  };

  const getHint = () => {
    if (error) return '';
    switch (step) {
      case 'verify-current':
        return t.changePin.verifyHint;
      case 'enter-new':
        return t.changePin.newHint;
      case 'confirm-new':
        return t.changePin.confirmHint;
    }
  };

  const handleNumberPress = async (num: number) => {
    const currentPinValue = getCurrentPin();
    if (currentPinValue.length < 6) {
      const newPinValue = currentPinValue + num.toString();
      setCurrentPinValue(newPinValue);
      setError('');

      // Auto-submit when PIN is complete
      if (newPinValue.length >= 6) {
        setTimeout(async () => {
          await handlePinComplete(newPinValue);
        }, 300);
      }
    }
  };

  const handlePinComplete = async (pinValue: string) => {
    switch (step) {
      case 'verify-current':
        setIsLoading(true);
        const isValid = await SecureStorage.verifyPin(pinValue);
        setIsLoading(false);
        if (isValid) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setCurrentPin('');
          setStep('enter-new');
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setError(t.changePin.incorrectError);
          setCurrentPin('');
        }
        break;

      case 'enter-new':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Store the new PIN value before changing step
        const savedNewPin = pinValue;
        setTimeout(() => {
          setNewPin(savedNewPin);
          setStep('confirm-new');
        }, 100);
        break;

      case 'confirm-new':
        if (newPin === pinValue) {
          setIsLoading(true);
          try {
            await SecureStorage.updatePin(pinValue);
            setIsLoading(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            navigation.goBack();
          } catch (error) {
            setIsLoading(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setError(t.changePin.updateError);
            setConfirmPin('');
          }
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setError(t.changePin.incorrectError);
          setConfirmPin('');
        }
        break;
    }
  };

  const handleBackspace = () => {
    const currentPinValue = getCurrentPin();
    if (currentPinValue.length > 0) {
      setCurrentPinValue(currentPinValue.slice(0, -1));
      setError('');
    }
  };

  const NumberButton = ({ num, onPress }: { num: number; onPress: () => void }) => (
    <TouchableOpacity style={styles.numberButton} onPress={onPress}>
      <Text style={styles.numberButtonText}>{num}</Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t.changePin.verifying}</Text>
        </View>
      )}

      <View style={isLoading ? styles.contentLoading : styles.content}>
        {/* Header */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>{getTitle()}</Text>
          <Text style={styles.subtitle}>{getSubtitle()}</Text>
        </View>

        {/* PIN Display */}
        <View style={styles.pinContainer}>
          <View style={styles.pinDisplay}>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <View
                key={index}
                style={[
                  styles.pinDot,
                  getCurrentPin().length > index && styles.pinDotFilled,
                ]}
              />
            ))}
          </View>

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <Text style={styles.hint}>{getHint()}</Text>
          )}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color={colors.info} />
          <Text style={styles.infoText}>
            {step === 'verify-current'
              ? t.changePin.verifyInfo
              : step === 'enter-new'
              ? t.changePin.newInfo
              : t.changePin.confirmInfo}
          </Text>
        </View>

        {step === 'confirm-new' && (
          <TouchableOpacity
            style={styles.backNavButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setNewPin('');
              setConfirmPin('');
              setError('');
              setStep('enter-new');
            }}
          >
            <Text style={styles.backNavButtonText}>{t.changePin.back}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Custom Number Pad */}
      <View style={styles.numpad}>
        <View style={styles.numpadRow}>
          <NumberButton num={1} onPress={() => handleNumberPress(1)} />
          <NumberButton num={2} onPress={() => handleNumberPress(2)} />
          <NumberButton num={3} onPress={() => handleNumberPress(3)} />
        </View>
        <View style={styles.numpadRow}>
          <NumberButton num={4} onPress={() => handleNumberPress(4)} />
          <NumberButton num={5} onPress={() => handleNumberPress(5)} />
          <NumberButton num={6} onPress={() => handleNumberPress(6)} />
        </View>
        <View style={styles.numpadRow}>
          <NumberButton num={7} onPress={() => handleNumberPress(7)} />
          <NumberButton num={8} onPress={() => handleNumberPress(8)} />
          <NumberButton num={9} onPress={() => handleNumberPress(9)} />
        </View>
        <View style={[styles.numpadRow, styles.numpadRowLast]}>
          <TouchableOpacity style={styles.emptyButton} />
          <NumberButton num={0} onPress={() => handleNumberPress(0)} />
          <TouchableOpacity
            style={styles.backspaceButton}
            onPress={handleBackspace}
          >
            <Ionicons name="backspace" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  contentLoading: {
    flex: 1,
    padding: spacing.lg,
    paddingBottom: spacing.md,
    opacity: 0.3,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  pinContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  pinDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.lg,
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
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
  },
  hint: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: colors.infoLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  backNavButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backNavButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
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
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  numpad: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    margin: spacing.lg,
    marginBottom: spacing.lg,
  },
  numpadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  numpadRowLast: {
    marginBottom: 0,
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

export default ChangePinScreen;
