import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../theme/colors';
import { SecureStorage } from '../../services/secureStorage';
import * as Haptics from 'expo-haptics';
import { useTranslations } from '../../i18n';

type BackupMnemonicNavigationProp = StackNavigationProp<any, 'BackupMnemonic'>;
type BackupMnemonicRouteProp = RouteProp<{ BackupMnemonic: { mnemonic?: string[] } }, 'BackupMnemonic'>;

interface Props {
  navigation: BackupMnemonicNavigationProp;
  route: BackupMnemonicRouteProp;
}

type Step = 'verify-pin' | 'display-mnemonic' | 'private-key-info';

const BackupMnemonicScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslations();
  const routeParams = route.params as { mnemonic?: string[] } | undefined;
  const routeMnemonic = routeParams?.mnemonic;
  const [step, setStep] = useState<Step>(routeMnemonic ? 'display-mnemonic' : 'verify-pin');
  const [pin, setPin] = useState('');
  const [mnemonic, setMnemonic] = useState<string[]>(routeMnemonic || []);
  const [privateKey, setPrivateKey] = useState<string>('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isWalletCreationFlow = routeMnemonic !== undefined;

  const handleVerifyPin = async (pinValue: string) => {
    if (pinValue.length !== 6) {
      return;
    }

    setIsLoading(true);
    const isValid = await SecureStorage.verifyPin(pinValue);
    setIsLoading(false);

    if (isValid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const walletData = await SecureStorage.loadWallet();
      if (walletData) {
        // Check if wallet was imported with private key
        if (walletData.privateKey && !walletData.mnemonic) {
          setPrivateKey(walletData.privateKey);
          setStep('private-key-info');
        } else {
          setMnemonic(walletData.mnemonic!.split(' '));
          setStep('display-mnemonic');
        }
        setPin('');
        setError('');
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(t.backupMnemonic.error);
      setPin('');
    }
  };

  const handleConfirm = () => {
    if (isWalletCreationFlow) {
      navigation.navigate('SetupPin', { mnemonic: mnemonic.join(' ') });
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {step === 'verify-pin' ? (
        <View style={styles.pinContainer}>
          <View style={styles.pinHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.goBack();
              }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.pinTitle}>{t.backupMnemonic.verifyPin}</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.pinTopContent}>
            <Text style={styles.pinSubtitle}>
              {t.backupMnemonic.pinSubtitle}
            </Text>

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
              <Text style={styles.hintText}>{t.backupMnemonic.hint}</Text>
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
      ) : step === 'private-key-info' ? (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>{t.backupMnemonic.title}</Text>
            <Text style={styles.subtitle}>
              {t.backupMnemonic.subtitleView}
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={24} color={colors.info} />
            <Text style={styles.infoText}>
              This wallet was imported with a private key. Below is your private key - make sure to save it in a safe place.
            </Text>
          </View>

          <View style={styles.mnemonicContainer}>
            <Text style={styles.mnemonicTitle}>Private Key</Text>
            <View style={styles.privateKeyWrapper}>
              <Text style={styles.privateKeyText}>
                {privateKey.match(/.{1,8}/g)?.join('\u200B') || privateKey}
              </Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={async () => {
                  await Clipboard.setStringAsync(privateKey);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Ionicons name="copy-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.warningBox}>
            <Ionicons name="warning" size={24} color={colors.warning} style={styles.warningIcon} />
            <Text style={styles.warningText}>
              {t.backupMnemonic.warning}
            </Text>
          </View>

          <View style={styles.checklist}>
            <View style={styles.checklistHeader}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.checklistTitle}>Safety Checklist:</Text>
            </View>
            <View style={styles.checklistItem}>
              <Ionicons name="checkmark-done" size={16} color={colors.success} />
              <Text style={styles.checklistItemText}>{t.backupMnemonic.checklistWritten.replace('• ', '')}</Text>
            </View>
            <View style={styles.checklistItem}>
              <Ionicons name="checkmark-done" size={16} color={colors.success} />
              <Text style={styles.checklistItemText}>{t.backupMnemonic.checklistStored.replace('• ', '')}</Text>
            </View>
            <View style={styles.checklistItem}>
              <Ionicons name="checkmark-done" size={16} color={colors.success} />
              <Text style={styles.checklistItemText}>{t.backupMnemonic.checklistScreenshots.replace('• ', '')}</Text>
            </View>
            <View style={styles.checklistItem}>
              <Ionicons name="checkmark-done" size={16} color={colors.success} />
              <Text style={styles.checklistItemText}>{t.backupMnemonic.checklistShared.replace('• ', '')}</Text>
            </View>
            <View style={styles.checklistItem}>
              <Ionicons name="checkmark-done" size={16} color={colors.success} />
              <Text style={styles.checklistItemText}>{t.backupMnemonic.checklistCloud.replace('• ', '')}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.confirmButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.confirmButtonText}>{t.backupMnemonic.doneBtn}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>{t.backupMnemonic.back}</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>{t.backupMnemonic.title}</Text>
            <Text style={styles.subtitle}>
              {isWalletCreationFlow
                ? t.backupMnemonic.subtitleDisplay
                : t.backupMnemonic.subtitleView}
            </Text>
          </View>

          <View style={styles.warningBox}>
            <Ionicons name="warning" size={24} color={colors.warning} style={styles.warningIcon} />
            <Text style={styles.warningText}>
              {t.backupMnemonic.warning}
            </Text>
          </View>

          <View style={styles.mnemonicContainer}>
            <Text style={styles.mnemonicTitle}>{t.backupMnemonic.recoveryPhrase}</Text>
            <View style={styles.mnemonicGrid}>
              {mnemonic.map((word, index) => (
                <View key={index} style={styles.wordItem}>
                  <Text style={styles.wordNumber}>{index + 1}</Text>
                  <Text style={styles.word}>{word}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.checklist}>
            <View style={styles.checklistHeader}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.checklistTitle}>Safety Checklist:</Text>
            </View>
            <View style={styles.checklistItem}>
              <Ionicons name="checkmark-done" size={16} color={colors.success} />
              <Text style={styles.checklistItemText}>{t.backupMnemonic.checklistWritten.replace('• ', '')}</Text>
            </View>
            <View style={styles.checklistItem}>
              <Ionicons name="checkmark-done" size={16} color={colors.success} />
              <Text style={styles.checklistItemText}>{t.backupMnemonic.checklistStored.replace('• ', '')}</Text>
            </View>
            <View style={styles.checklistItem}>
              <Ionicons name="checkmark-done" size={16} color={colors.success} />
              <Text style={styles.checklistItemText}>{t.backupMnemonic.checklistScreenshots.replace('• ', '')}</Text>
            </View>
            <View style={styles.checklistItem}>
              <Ionicons name="checkmark-done" size={16} color={colors.success} />
              <Text style={styles.checklistItemText}>{t.backupMnemonic.checklistShared.replace('• ', '')}</Text>
            </View>
            <View style={styles.checklistItem}>
              <Ionicons name="checkmark-done" size={16} color={colors.success} />
              <Text style={styles.checklistItemText}>{t.backupMnemonic.checklistCloud.replace('• ', '')}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmButtonText}>
              {isWalletCreationFlow ? t.backupMnemonic.backedUpBtn : t.backupMnemonic.doneBtn}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>{t.backupMnemonic.back}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );

  function handleNumpadPress(num: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (pin.length < 6) {
      const newPin = pin + num.toString();
      setPin(newPin);
      setError('');

      if (newPin.length === 6) {
        setTimeout(() => {
          handleVerifyPin(newPin);
        }, 300);
      }
    }
  }

  function handleBackspace() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setError('');
    }
  }

  function NumpadButton({ num, onPress }: { num: number; onPress: () => void }) {
    return (
      <TouchableOpacity style={styles.numberButton} onPress={onPress}>
        <Text style={styles.numberButtonText}>{num}</Text>
      </TouchableOpacity>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pinContainer: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  pinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 40,
  },
  pinTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  pinTopContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
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
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.lg,
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
  warningBox: {
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  warningIcon: {
    marginRight: spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: colors.infoLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  mnemonicContainer: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  mnemonicTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  privateKeyWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  privateKeyText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  copyButton: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginLeft: spacing.sm,
  },
  mnemonicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  wordItem: {
    width: '32%',
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  wordNumber: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginRight: spacing.xs,
    marginLeft: spacing.xs,
    minWidth: 20,
  },
  word: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  checklist: {
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  checklistTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.success,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  checklistItemText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    flex: 1,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.backgroundDark,
  },
  backButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

export default BackupMnemonicScreen;
