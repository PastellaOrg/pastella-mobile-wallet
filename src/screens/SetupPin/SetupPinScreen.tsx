import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../theme/colors';
import { SecureStorage } from '../../services/secureStorage';
import { PastellaWallet } from '../../wallet';
import { useTranslations } from '../../i18n';

type SetupPinNavigationProp = StackNavigationProp<any, 'SetupPin'>;
type SetupPinRouteProp = RouteProp<{ SetupPin: { mnemonic?: string; privateKey?: string; address: string; scanHeight: number } }, 'SetupPin'>;

interface Props {
  navigation: SetupPinNavigationProp;
  route: SetupPinRouteProp;
}

const SetupPinScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslations();
  const { mnemonic, privateKey, address } = route.params;
  const isPrivateKeyImport = !!privateKey && !mnemonic;
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Clear PINs when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setPin('');
      setConfirmPin('');
      setStep('create');
      setError('');
    });

    return unsubscribe;
  }, [navigation]);

  const currentPin = step === 'create' ? pin : confirmPin;
  const setCurrentPin = (value: string) => {
    if (step === 'create') {
      setPin(value);
    } else {
      setConfirmPin(value);
    }
  };

  const handleNumberPress = (num: number) => {
    if (currentPin.length < 6) {
      const newPin = currentPin + num.toString();
      setCurrentPin(newPin);
      setError('');

      // Auto-submit when entering PIN is complete
      if (newPin.length >= 6) {
        setTimeout(async () => {
          if (step === 'create') {
            // Move to confirm step
            setStep('confirm');
          } else {
            // Confirm step - validate and save wallet
            if (pin === newPin) {
              setIsLoading(true);
              try {
                // Verify the wallet data is valid
                let walletInfo: { address: string };
                if (isPrivateKeyImport && privateKey) {
                  walletInfo = await PastellaWallet.importFromPrivateKey(privateKey);
                } else if (mnemonic) {
                  walletInfo = await PastellaWallet.importFromMnemonic(mnemonic);
                } else {
                  throw new Error('No valid import data provided');
                }

                // Save wallet data securely
                const importData = isPrivateKeyImport ? privateKey! : mnemonic!;
                await SecureStorage.saveWallet(importData, pin, walletInfo.address, isPrivateKeyImport);

                // Navigate to wallet home
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'MainTabs' }],
                });
              } catch (error) {
                console.error('Failed to save wallet:', error);
                setError(t.setupPin.saveError);
                setIsLoading(false);
              }
            } else {
              setError(t.setupPin.mismatchError);
              setConfirmPin('');
            }
          }
        }, 300);
      }
    }
  };

  const handleBackspace = () => {
    if (currentPin.length > 0) {
      setCurrentPin(currentPin.slice(0, -1));
      setError('');
    }
  };

  const handlePinSubmit = async () => {
    if (step === 'create') {
      if (pin.length < 6) {
        setError(t.setupPin.pinError);
        return;
      }
      setStep('confirm');
      setError('');
    } else {
      if (pin !== confirmPin) {
        setError(t.setupPin.mismatchError);
        setConfirmPin('');
        return;
      }
      // Save wallet with PIN and navigate to home
      setIsLoading(true);
      try {
        // Verify the wallet data is valid
        let walletInfo: { address: string };
        if (isPrivateKeyImport && privateKey) {
          walletInfo = await PastellaWallet.importFromPrivateKey(privateKey);
        } else if (mnemonic) {
          walletInfo = await PastellaWallet.importFromMnemonic(mnemonic);
        } else {
          throw new Error('No valid import data provided');
        }

        // Save wallet data securely
        const importData = isPrivateKeyImport ? privateKey! : mnemonic!;
        await SecureStorage.saveWallet(importData, pin, walletInfo.address, isPrivateKeyImport);

        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      } catch (error) {
        console.error('Failed to save wallet:', error);
        setError(t.setupPin.saveError);
        setIsLoading(false);
      }
    }
  };

  const NumberButton = ({ num, onPress }: { num: number; onPress: () => void }) => (
    <TouchableOpacity style={styles.numberButton} onPress={onPress}>
      <Text style={styles.numberButtonText}>{num}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t.setupPin.securing}</Text>
        </View>
      )}

      <View style={isLoading ? styles.contentLoading : styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {step === 'create' ? t.setupPin.createPin : t.setupPin.confirmPin}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'create'
              ? t.setupPin.createSubtitle
              : t.setupPin.confirmSubtitle}
          </Text>
        </View>

        <View style={styles.pinContainer}>
          <View style={styles.pinDisplay}>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <View
                key={index}
                style={[
                  styles.pinDot,
                  currentPin.length > index && styles.pinDotFilled,
                ]}
              />
            ))}
          </View>

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <Text style={styles.hint}>
              {step === 'create'
                ? t.setupPin.createHint
                : t.setupPin.confirmHint}
            </Text>
          )}
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color={colors.info} />
          <Text style={styles.infoText}>
            {step === 'create'
              ? t.setupPin.createHint
              : t.setupPin.confirmHint}
          </Text>
        </View>

        {step === 'confirm' && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setStep('create');
              setPin('');
              setConfirmPin('');
              setError('');
            }}
          >
            <Text style={styles.backButtonText}>{t.setupPin.back}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Custom Number Pad - Fixed at bottom */}
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
    </View>
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
    justifyContent: 'center',
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
  hiddenInput: {
    height: 0,
    width: 0,
    opacity: 0,
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
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.backgroundDark,
  },
  backButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backButtonText: {
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
  contentLoading: {
    opacity: 0.3,
  },
  numpad: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    marginLeft: spacing.lg,
    marginRight: spacing.lg,
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

export default SetupPinScreen;
