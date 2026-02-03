import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius } from '../../theme/colors';
import { PastellaWallet } from '../../wallet';
import { useTranslations, useTranslation } from '../../i18n';

type ImportWalletNavigationProp = StackNavigationProp<any, 'ImportWallet'>;

interface ValidationResult {
  isValid: boolean;
  wordCount: number;
  expectedCount: number;
  checksumValid?: boolean;
  address?: string;
  error?: string;
}

interface Props {
  navigation: ImportWalletNavigationProp;
}

const ImportWalletScreen: React.FC<Props> = ({ navigation }) => {
  const { t, formatString } = useTranslation();
  const [mnemonic, setMnemonic] = useState('');
  const [importMethod, setImportMethod] = useState<'mnemonic' | 'key'>('mnemonic');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Validate mnemonic or private key whenever it changes
  useEffect(() => {
    const trimmed = mnemonic.trim();
    if (trimmed.length > 0) {
      if (importMethod === 'mnemonic') {
        validateMnemonicInput(trimmed);
      } else {
        validatePrivateKeyInput(trimmed);
      }
    } else {
      setValidation(null);
    }
  }, [mnemonic, importMethod]);

  const validateMnemonicInput = async (input: string) => {
    const words = input.trim().split(/\s+/).filter(w => w.length > 0);

    const result: ValidationResult = {
      isValid: false,
      wordCount: words.length,
      expectedCount: 25,
    };

    // Check word count
    if (words.length !== 25) {
      result.error = formatString(t.importWallet.wordCountError, { count: words.length });
      setValidation(result);
      return;
    }

    // Try to import the mnemonic to validate it
    setIsValidating(true);
    try {
      // Use the static PastellaWallet class to validate
      const walletInfo = await PastellaWallet.importFromMnemonic(input.trim());

      result.isValid = true;
      result.address = walletInfo.address;
      result.checksumValid = true;

      // Haptic feedback for success
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      result.isValid = false;
      result.error = t.importWallet.invalidMnemonic;
      result.checksumValid = false;

      // Haptic feedback for error
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsValidating(false);
      setValidation(result);
    }
  };

  const validatePrivateKeyInput = async (input: string) => {
    const result: ValidationResult = {
      isValid: false,
      wordCount: 0,
      expectedCount: 0,
    };

    // Remove 0x prefix if present
    const hexKey = input.replace(/^0x/i, '');

    // Check length (must be exactly 64 hex characters)
    if (hexKey.length !== 64) {
      result.isValid = false;
      result.error = t.importWallet.invalidPrivateKey;
      setValidation(result);
      return;
    }

    // Check if it's a valid hex string
    const hexRegex = /^[0-9a-fA-F]{64}$/;
    if (!hexRegex.test(hexKey)) {
      result.isValid = false;
      result.error = t.importWallet.invalidPrivateKey;
      setValidation(result);
      return;
    }

    // Try to derive address from private key to validate it
    setIsValidating(true);
    try {
      const walletInfo = await PastellaWallet.importFromPrivateKey(hexKey);
      result.isValid = true;
      result.address = walletInfo.address;

      // Haptic feedback for success
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      result.isValid = false;
      result.error = t.importWallet.invalidPrivateKey;

      // Haptic feedback for error
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsValidating(false);
      setValidation(result);
    }
  };

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) {
      setMnemonic(text.trim());
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleImport = () => {
    if (importMethod === 'mnemonic') {
      if (validation && validation.isValid && validation.address) {
        navigation.navigate('ConfirmImport', {
          mnemonic: mnemonic.trim(),
          address: validation.address,
        });
      } else {
        // Show error alert
        const errorMsg = validation?.error || t.importWallet.invalidMnemonic;
        Alert.alert(t.importWallet.title, errorMsg);
      }
    } else {
      // Private key import - only allow if validated
      if (validation && validation.isValid && validation.address) {
        navigation.navigate('ConfirmImport', {
          privateKey: mnemonic.trim().replace(/^0x/i, ''),
          address: validation.address,
        });
      } else {
        // Show error alert
        const errorMsg = validation?.error || t.importWallet.invalidPrivateKey;
        Alert.alert(t.importWallet.title, errorMsg);
      }
    }
  };

  const getStatusColor = () => {
    if (!validation || isValidating) return colors.textTertiary;
    if (validation.isValid) return colors.success;
    return colors.error;
  };

  const getStatusIcon = () => {
    if (isValidating) return 'reload';
    if (!validation) return 'help-circle';
    if (validation.isValid) return 'checkmark-circle';
    return 'close-circle';
  };

  const getStatusText = () => {
    if (isValidating) return t.importWallet.validating;
    if (!validation) {
      return importMethod === 'mnemonic'
        ? t.importWallet.enterMnemonic
        : t.importWallet.privateKeyLabel;
    }
    if (validation.isValid) {
      if (importMethod === 'mnemonic') {
        return t.importWallet.validMnemonic;
      } else {
        return t.importWallet.validPrivateKey;
      }
    }
    return validation.error || (importMethod === 'mnemonic'
      ? t.importWallet.invalidMnemonic
      : t.importWallet.invalidPrivateKey);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>{t.importWallet.title}</Text>
          <Text style={styles.subtitle}>
            {t.importWallet.subtitle}
          </Text>
        </View>

        <View style={styles.methodToggle}>
          <TouchableOpacity
            style={[
              styles.methodButton,
              importMethod === 'mnemonic' && styles.methodButtonActive,
            ]}
            onPress={() => setImportMethod('mnemonic')}
          >
            <Ionicons
              name="text"
              size={20}
              color={importMethod === 'mnemonic' ? colors.backgroundDark : colors.textSecondary}
              style={styles.methodIcon}
            />
            <Text
              style={[
                styles.methodButtonText,
                importMethod === 'mnemonic' && styles.methodButtonTextActive,
              ]}
            >
              {t.importWallet.mnemonicTab}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.methodButton,
              importMethod === 'key' && styles.methodButtonActive,
            ]}
            onPress={() => setImportMethod('key')}
          >
            <Ionicons
              name="key"
              size={20}
              color={importMethod === 'key' ? colors.backgroundDark : colors.textSecondary}
              style={styles.methodIcon}
            />
            <Text
              style={[
                styles.methodButtonText,
                importMethod === 'key' && styles.methodButtonTextActive,
              ]}
            >
              {t.importWallet.privateKeyTab}
            </Text>
          </TouchableOpacity>
        </View>

        {importMethod === 'mnemonic' ? (
          <>
            <View style={styles.inputContainer}>
              <View style={styles.inputHeader}>
                <Text style={styles.label}>{t.importWallet.mnemonicLabel}</Text>
                <View style={styles.wordCountBadge}>
                  <Text style={styles.wordCountText}>
                    {mnemonic.trim().split(/\s+/).filter(w => w.length > 0).length} / 25
                  </Text>
                </View>
              </View>

              <TextInput
                style={styles.textInput}
                placeholder={t.importWallet.mnemonicPlaceholder}
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                value={mnemonic}
                onChangeText={setMnemonic}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.hint}>
                {t.importWallet.mnemonicHint}
              </Text>
            </View>

            <TouchableOpacity style={styles.pasteButton} onPress={handlePaste}>
              <Ionicons name="clipboard-outline" size={20} color={colors.primary} />
              <Text style={styles.pasteButtonText}>{t.importWallet.pasteClipboard}</Text>
            </TouchableOpacity>

            {/* Validation Status */}
            <View style={styles.validationContainer}>
              <View style={styles.validationHeader}>
                <Ionicons
                  name={getStatusIcon()}
                  size={24}
                  color={getStatusColor()}
                  style={styles.validationIcon}
                />
                <Text style={[styles.validationText, { color: getStatusColor() }]}>
                  {getStatusText()}
                </Text>
                {isValidating && (
                  <ActivityIndicator size="small" color={colors.primary} style={styles.validationSpinner} />
                )}
              </View>

              {validation && !isValidating && (validation.wordCount !== 25 || validation.error) && (
                <View style={styles.validationDetails}>
                  {validation.wordCount !== 25 && (
                    <Text style={styles.validationDetailText}>
                      • Word count: {validation.wordCount}/25
                    </Text>
                  )}
                  {validation.error && (
                    <Text style={styles.validationDetailText}>
                      • {validation.error}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </>
        ) : (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t.importWallet.privateKeyLabel}</Text>
            <TextInput
              style={styles.privateKeyInput}
              placeholder={t.importWallet.privateKeyPlaceholder}
              placeholderTextColor={colors.textMuted}
              value={mnemonic}
              onChangeText={setMnemonic}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <Text style={styles.hint}>
              {t.importWallet.privateKeyHint}
            </Text>

            {/* Validation Status for Private Key */}
            {validation && !isValidating && (
              <View style={styles.validationStatus}>
                <Ionicons
                  name={getStatusIcon()}
                  size={20}
                  color={getStatusColor()}
                  style={styles.validationStatusIcon}
                />
                <Text style={[styles.validationStatusText, { color: getStatusColor() }]}>
                  {getStatusText()}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.warningBox}>
          <Ionicons name="warning" size={24} color={colors.warning} style={styles.warningIcon} />
          <Text style={styles.warningText}>
            {t.importWallet.warning}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.importButton,
            (!mnemonic.trim() || (importMethod === 'mnemonic' && (!validation || !validation.isValid)) || isValidating) &&
              styles.importButtonDisabled,
          ]}
          onPress={handleImport}
          disabled={
            !mnemonic.trim() ||
            (importMethod === 'mnemonic' && (!validation || !validation.isValid || isValidating))
          }
        >
          <Text style={styles.importButtonText}>
            {isValidating ? t.importWallet.validating : t.importWallet.importBtn}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>{t.importWallet.cancel}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
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
  methodToggle: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  methodButtonActive: {
    backgroundColor: colors.primary,
  },
  methodIcon: {
    fontSize: 20,
  },
  methodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  methodButtonTextActive: {
    color: colors.backgroundDark,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  wordCountBadge: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  wordCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  textInput: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 120,
    maxHeight: 200,
  },
  privateKeyInput: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    height: 50,
  },
  hint: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
  validationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  validationStatusIcon: {},
  validationStatusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  pasteButton: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  pasteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  validationContainer: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  validationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  validationIcon: {
    fontSize: 24,
  },
  validationText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  validationSpinner: {
    marginLeft: 'auto',
  },
  validationDetails: {
    marginTop: spacing.sm,
  },
  validationDetailText: {
    fontSize: 12,
    color: colors.textTertiary,
    lineHeight: 18,
  },
  warningBox: {
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  warningIcon: {
    fontSize: 24,
    color: colors.warning,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  importButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  importButtonDisabled: {
    opacity: 0.5,
  },
  importButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.backgroundDark,
  },
  cancelButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

export default ImportWalletScreen;
