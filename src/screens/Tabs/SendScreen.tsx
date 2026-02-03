import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, spacing, borderRadius } from '../../theme/colors';
import { FadeIn } from '../../components/shared';
import transactionService from '../../services/transactionService';
import { SecureStorage } from '../../services/secureStorage';
import { config } from '../../config/explorer';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useTranslations } from '../../i18n';

// Fee tiers in atomic units (config.decimals = 8, so 1 PAS = 100,000,000 atomic units)
const FEE_TIERS = {
  low: 1000,      // 0.00001 PAS
  medium: 2500,   // 0.000025 PAS
  high: 5000,     // 0.00005 PAS
};

type FeeTier = 'low' | 'medium' | 'high';

interface FeeOption {
  id: FeeTier;
  label: string;
  value: number;
  description: string;
  icon: string;
}

const SendScreen = () => {
  const { t } = useTranslations();
  const route = useRoute();
  const navigation = useNavigation();

  const FEE_OPTIONS: FeeOption[] = [
    {
      id: 'low',
      label: t.send.low,
      value: FEE_TIERS.low,
      description: t.send.slow,
      icon: 'leaf',
    },
    {
      id: 'medium',
      label: t.send.medium,
      value: FEE_TIERS.medium,
      description: t.send.standard,
      icon: 'bicycle',
    },
    {
      id: 'high',
      label: t.send.high,
      value: FEE_TIERS.high,
      description: t.send.fast,
      icon: 'flash',
    },
  ];
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [availableBalance, setAvailableBalance] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [selectedFeeTier, setSelectedFeeTier] = useState<FeeTier>('medium');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [pendingAddress, setPendingAddress] = useState('');
  const [isAddressValid, setIsAddressValid] = useState<boolean | null>(null);

  // QR Scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // Transaction result state
  const [showResultModal, setShowResultModal] = useState(false);
  const [transactionSuccess, setTransactionSuccess] = useState(false);
  const [transactionHash, setTransactionHash] = useState('');
  const [transactionFee, setTransactionFee] = useState(0);
  const [transactionError, setTransactionError] = useState('');

  // Handle address from navigation params
  useEffect(() => {
    const params = route.params as { address?: string } | undefined;
    if (params?.address) {
      setAddress(params.address);
    }
  }, [route.params]);

  // Calculate fee and max spendable based on selected tier
  const fee = useMemo(() => FEE_TIERS[selectedFeeTier], [selectedFeeTier]);

  // Validate wallet address (starts with "PAS" and is 54 characters)
  const validateAddress = (addr: string) => {
    if (!addr) {
      setIsAddressValid(null);
      return;
    }
    const isValid = addr.startsWith('PAS') && addr.length === 54;
    setIsAddressValid(isValid);
  };

  const handleAddressChange = (value: string) => {
    setAddress(value);
    validateAddress(value);
  };

  // Load balance from SecureStorage (where WalletHome saves it)
  const loadBalance = useCallback(async () => {
    try {
      const savedState = await SecureStorage.loadWalletState();
      if (savedState) {
        const available = savedState.syncState.availableBalance;
        setAvailableBalance(available);
      } else {
        setAvailableBalance(0);
      }
    } catch (error) {
      console.error('[SendScreen] Error loading balance:', error);
      setAvailableBalance(0);
    }
  }, []);

  // Calculate max spendable whenever fee or balance changes
  const maxSpendable = useMemo(() => {
    return availableBalance > fee ? availableBalance - fee : 0;
  }, [availableBalance, fee]);

  // Reload balance when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadBalance();
    }, [loadBalance])
  );

  const formatAmount = (value: number): string => {
    const dividedValue = value / Math.pow(10, config.decimals);
    return dividedValue.toLocaleString('en-US', {
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals,
    });
  };

  const parseAmount = (text: string): number => {
    if (!text) return 0;
    // Remove commas for parsing
    const cleanText = text.replace(/,/g, '');
    const parsed = parseFloat(cleanText);
    if (isNaN(parsed)) return 0;
    const multiplier = Math.pow(10, config.decimals);
    const result = Math.floor(parsed * multiplier);
    return result;
  };

  const handleMaxPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAmount(formatAmount(maxSpendable));
  };

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(t.send.cameraPermission, t.send.cameraPermissionDenied);
        return;
      }
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowScanner(true);
  };

  const handleBarcodeScanned = (data: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const scannedAddress = data.data;
    setAddress(scannedAddress);
    validateAddress(scannedAddress);
    setShowScanner(false);
  };

  const handlePasteFromClipboard = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const clipboardContent = await Clipboard.getStringAsync();
      if (clipboardContent) {
        setAddress(clipboardContent);
        validateAddress(clipboardContent);
      } else {
        Alert.alert(t.send.clipboardEmpty, t.send.noAddressClipboard);
      }
    } catch (error) {
      console.error('[SendScreen] Error reading from clipboard:', error);
      Alert.alert(t.send.error, t.send.clipboardError);
    }
  };

  const handleOpenAddressBook = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('Address Book' as never);
  };

  const handleSend = async () => {
    // Validate inputs
    if (!address.trim()) {
      Alert.alert(t.send.error, t.send.noAddress);
      return;
    }

    if (!amount) {
      Alert.alert(t.send.error, t.send.noAmount);
      return;
    }

    const amountAtomic = parseAmount(amount);

    if (amountAtomic <= 0) {
      Alert.alert(t.send.error, t.send.invalidAmount);
      return;
    }

    if (amountAtomic > maxSpendable) {
      Alert.alert(t.send.error, t.send.insufficientFunds.replace('{amount}', `${formatAmount(maxSpendable)} ${config.ticker}`));
      return;
    }

    // Show confirmation modal
    setPendingAddress(address.trim());
    setPendingAmount(amountAtomic);
    setShowConfirmModal(true);
  };

  const handleConfirmSend = async () => {
    setShowConfirmModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await executeSend(pendingAddress, pendingAmount);
  };

  const handleCancelSend = () => {
    setShowConfirmModal(false);
  };

  const executeSend = async (toAddress: string, amountAtomic: number) => {
    setIsSending(true);
    try {
      // Initialize wallet if needed
      const nodeService = require('../../services/nodeService').default;
      const node = await nodeService.getSelectedNode();
      if (!node) {
        throw new Error('No node selected');
      }

      // Initialize wallet for sending
      await transactionService.initWallet(node);

      const result = await transactionService.sendTransaction({
        toAddress,
        amount: amountAtomic,
        fee,
      });

      // Set success state
      setTransactionSuccess(true);
      setTransactionHash(result.hash);
      setTransactionFee(result.fee);
      setShowResultModal(true);

      // Clear form and refresh balance
      setAddress('');
      setAmount('');
      loadBalance();
    } catch (error) {
      console.error('[SendScreen] Transaction error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Set error state
      setTransactionSuccess(false);
      setTransactionError(errorMessage);
      setShowResultModal(true);
    } finally {
      setIsSending(false);
    }
  };

  const handleResultDismiss = () => {
    setShowResultModal(false);
    setTransactionHash('');
    setTransactionFee(0);
    setTransactionError('');
  };

  return (
    <FadeIn>
      <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={100}
        >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t.send.title}</Text>
          <Text style={styles.subtitle}>{t.send.subtitle}</Text>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>{t.send.availableBalance}</Text>
              <View style={styles.balanceAmountRow}>
                <Image source={require('../../assets/logo.png')} style={styles.balanceLogo} />
                <View style={styles.balanceAmountContainer}>
                  <Text style={styles.balanceAmount}>
                    {formatAmount(availableBalance).split('.')[0]}.
                  </Text>
                  <Text style={styles.balanceDecimal}>
                    {formatAmount(availableBalance).split('.')[1]}{' '}
                  </Text>
                  <Text style={styles.balanceTicker}>
                    {config.ticker}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.balanceMaxContainer}>
              <Text style={styles.balanceMaxLabel}>{t.send.maxSpendable}</Text>
              <View style={styles.balanceAmountContainer}>
                <Text style={styles.balanceMaxAmountMain}>
                  {formatAmount(maxSpendable).split('.')[0]}.
                </Text>
                <Text style={styles.balanceMaxAmountDecimal}>
                  {formatAmount(maxSpendable).split('.')[1]}{' '}
                </Text>
                <Text style={styles.balanceMaxTicker}>
                  {config.ticker}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Send Form Card */}
        <View style={styles.formCard}>
          {/* Address Input */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>{t.send.recipientAddress}</Text>
            <View style={[
              styles.inputWrapper,
              isAddressValid === true && styles.inputWrapperValid,
              isAddressValid === false && styles.inputWrapperInvalid,
            ]}>
              <Ionicons name="keypad" size={18} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t.send.addressPlaceholder}
                placeholderTextColor={colors.textTertiary}
                value={address}
                onChangeText={handleAddressChange}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.inputActions}>
                <TouchableOpacity onPress={handlePasteFromClipboard} style={styles.inputActionButton}>
                  <Ionicons name="clipboard-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleOpenAddressBook} style={styles.inputActionButton}>
                  <Ionicons name="book-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleOpenScanner} style={styles.inputActionButton}>
                  <Ionicons name="qr-code" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
            {isAddressValid === false && (
              <Text style={styles.validationError}>{t.send.invalidAddress}</Text>
            )}
          </View>

          <View style={styles.divider} />

          {/* Amount Input */}
          <View style={[styles.formSection, styles.formSectionNoMargin]}>
            <View style={styles.formLabelRow}>
              <Text style={styles.formLabel}>{t.send.amount}</Text>
              <TouchableOpacity onPress={handleMaxPress} style={styles.maxButton}>
                <Text style={styles.maxButtonText}>{t.send.max}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputWrapper}>
              <Ionicons name="cash" size={18} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t.send.placeholder}
                placeholderTextColor={colors.textTertiary}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
              <Text style={styles.ticker}>{config.ticker}</Text>
            </View>
          </View>
        </View>

        {/* Fee Tier Selection */}
        <Text style={styles.feeCardTitle}>{t.send.networkFee}</Text>
        <View style={styles.feeOptionsContainer}>
          {FEE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.feeOption,
                selectedFeeTier === option.id && styles.feeOptionSelected,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedFeeTier(option.id);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.feeOptionIconContainer}>
                <Ionicons
                  name={option.icon as any}
                  size={20}
                  color={selectedFeeTier === option.id ? colors.primary : colors.textSecondary}
                />
              </View>
              <Text style={[
                styles.feeOptionLabel,
                selectedFeeTier === option.id && styles.feeOptionLabelSelected,
              ]}>
                {option.label}
              </Text>
              <Text style={[
                styles.feeOptionAmount,
                selectedFeeTier === option.id && styles.feeOptionAmountSelected,
              ]}>
                {formatAmount(option.value)}
              </Text>
              {selectedFeeTier === option.id && (
                <View style={styles.feeOptionCheckmark}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Send Button */}
        <TouchableOpacity
          style={[styles.sendButton, (!address || !amount || isSending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!address || !amount || isSending}
        >
          {isSending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#FFFFFF" />
              <Text style={styles.sendButtonText}>{t.send.sendBtn}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelSend}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="paper-plane" size={24} color={colors.primary} />
              <Text style={styles.modalTitle}>{t.send.confirmTitle}</Text>
            </View>

            <View style={styles.modalInfoCard}>
              <View style={styles.modalInfo}>
                <Text style={styles.modalLabel}>{t.send.toLabel}</Text>
                <Text style={styles.modalAddress} numberOfLines={1} ellipsizeMode="middle">
                  {pendingAddress}
                </Text>
              </View>

              <View style={styles.modalDivider} />

              <View style={styles.modalInfo}>
                <Text style={styles.modalLabel}>{t.send.sendLabel}</Text>
                <Text style={styles.modalValue}>{formatAmount(pendingAmount)} {config.ticker}</Text>
              </View>

              <View style={styles.modalDivider} />

              <View style={styles.modalInfo}>
                <Text style={styles.modalLabel}>{t.send.feeLabel}</Text>
                <View style={styles.modalFeeInfo}>
                  <Text style={styles.modalValue}>{formatAmount(fee)} {config.ticker}</Text>
                  <Text style={styles.modalFeeDescription}>
                    {selectedFeeTier === 'low' ? t.send.slow : selectedFeeTier === 'medium' ? t.send.standard : t.send.fast}
                  </Text>
                </View>
              </View>

              <View style={styles.modalDivider} />

              <View style={styles.modalTotalRow}>
                <Text style={styles.modalTotalLabel}>Total</Text>
                <Text style={styles.modalTotalValue}>
                  {formatAmount(pendingAmount + fee)} {config.ticker}
                </Text>
              </View>
            </View>

            <View style={styles.modalEstimate}>
              <Ionicons name="time" size={16} color={colors.textSecondary} />
              <Text style={styles.modalEstimateText}>
                Estimated confirmation: {selectedFeeTier === 'low' ? '~5-10 minutes' : selectedFeeTier === 'medium' ? '~2-5 minutes' : '~1-2 minutes'}
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={handleCancelSend}
              >
                <Text style={styles.modalButtonTextCancel}>{t.common.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleConfirmSend}
              >
                <Ionicons name="send" size={16} color="#FFFFFF" style={{ marginRight: spacing.xs }} />
                <Text style={styles.modalButtonTextConfirm}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Transaction Result Modal */}
      <Modal
        visible={showResultModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleResultDismiss}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[
              styles.modalTitle,
              styles.modalResultTitle,
              transactionSuccess ? styles.modalTitleSuccess : styles.modalTitleError
            ]}>
              {transactionSuccess ? t.send.sentAlert : t.send.failedAlert}
            </Text>

            {transactionSuccess ? (
              <>
                <View style={styles.modalInfoCard}>
                  <View style={[styles.modalInfo, { alignItems: 'flex-start' }]}>
                    <Text style={styles.modalLabel}>Transaction Hash</Text>
                    <View style={styles.modalHashContainer}>
                      <TouchableOpacity
                        onPress={async () => {
                          await Clipboard.setStringAsync(transactionHash);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                      >
                        <Text style={styles.modalHash}>
                          {transactionHash.match(/.{1,8}/g)?.join('\u200B') || transactionHash}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.modalDivider} />

                  <View style={styles.modalInfo}>
                    <Text style={styles.modalLabel}>{t.send.feeLabel}</Text>
                    <Text style={styles.modalValue}>{formatAmount(transactionFee)} {config.ticker}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonConfirm, styles.modalButtonFull]}
                  onPress={handleResultDismiss}
                >
                  <Text style={styles.modalButtonTextConfirm}>{t.common.ok}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.modalInfoCard}>
                  <Text style={styles.modalErrorText}>
                    {transactionError}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonConfirm, styles.modalButtonFull]}
                  onPress={handleResultDismiss}
                >
                  <Text style={styles.modalButtonTextConfirm}>{t.common.ok}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* QR Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}
      >
        <View style={styles.scannerContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={handleBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          />
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerHeader}>
              <TouchableOpacity
                onPress={() => setShowScanner(false)}
                style={styles.scannerCloseButton}
              >
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.scannerTitle}>{t.send.scanQr}</Text>
              <View style={styles.scannerHeaderSpacer} />
            </View>
            <View style={styles.scannerFrame} />
            <View style={styles.scannerFooter}>
              <Text style={styles.scannerInstructions}>
                {t.send.scanInstructions}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
      </KeyboardAvoidingView>
    </FadeIn>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 120,
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  balanceCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  balanceLogo: {
    width: 24,
    height: 24,
    marginRight: spacing.xs,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  balanceAmountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  balanceDecimal: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  balanceTicker: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  balanceAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceMaxContainer: {
    alignItems: 'flex-end',
  },
  balanceMaxLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  balanceMaxAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  balanceMaxAmountMain: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  balanceMaxAmountDecimal: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  balanceMaxTicker: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  formCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  formSection: {
    marginBottom: spacing.sm,
  },
  formSectionNoMargin: {
    marginBottom: 0,
  },
  formLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  maxButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(255, 140, 251, 0.1)',
    borderRadius: borderRadius.sm,
  },
  maxButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  inputWrapperValid: {
    borderColor: colors.success,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  inputWrapperInvalid: {
    borderColor: colors.error,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  ticker: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  validationError: {
    fontSize: 11,
    color: colors.error,
    marginTop: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.sm,
  },
  feeCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  feeCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  feeOptionsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  feeOption: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    gap: spacing.xs,
    minHeight: 90,
    justifyContent: 'center',
  },
  feeOptionSelected: {
    backgroundColor: 'rgba(255, 140, 251, 0.1)',
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  feeOptionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feeOptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  feeOptionLabelSelected: {
    color: colors.text,
  },
  feeOptionAmount: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  feeOptionAmountSelected: {
    color: colors.primary,
  },
  feeOptionCheckmark: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  modalInfoCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  modalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  modalDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.xs,
  },
  modalLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  modalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalAddress: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.sm,
  },
  modalFeeInfo: {
    alignItems: 'flex-end',
  },
  modalFeeDescription: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
  modalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  modalTotalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  modalTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  modalEstimate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255, 140, 251, 0.08)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  modalEstimateText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  modalButtonCancel: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  modalButtonConfirm: {
    backgroundColor: colors.primary,
  },
  modalButtonTextCancel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  modalButtonTextConfirm: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalHashContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  modalResultTitle: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalTitleSuccess: {
    color: colors.success,
  },
  modalTitleError: {
    color: colors.error,
  },
  modalButtonFull: {
    width: '100%',
  },
  modalSuccessText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  modalHash: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
  },
  modalErrorText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  qrButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  inputActionButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scannerCloseButton: {
    padding: spacing.sm,
  },
  scannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scannerHeaderSpacer: {
    width: 44,
  },
  scannerFrame: {
    alignSelf: 'center',
    width: 280,
    height: 280,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    backgroundColor: 'transparent',
    marginTop: 'auto',
    marginBottom: 'auto',
  },
  scannerFooter: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  scannerInstructions: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default SendScreen;
