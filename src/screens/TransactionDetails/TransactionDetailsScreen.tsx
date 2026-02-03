import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { colors, spacing, borderRadius } from '../../theme/colors';
import { WalletDisplayTransaction, AddressInfo } from '../../pastella-utils';
import { config } from '../../config/explorer';
import settingsService from '../../services/settingsService';
import addressBookService from '../../services/addressBookService';
import { SecureStorage } from '../../services/secureStorage';
import { useTranslations } from '../../i18n';

type TransactionDetailsNavigationProp = StackNavigationProp<any, 'TransactionDetails'>;
type TransactionDetailsRouteProp = RouteProp<{ TransactionDetails: { transaction: WalletDisplayTransaction; ticker: string; currentHeight?: number } }, 'TransactionDetails'>;

interface Props {
  navigation: TransactionDetailsNavigationProp;
  route: TransactionDetailsRouteProp;
}

const TransactionDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslations();
  const { transaction, ticker, currentHeight } = route.params;
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [hideBalance, setHideBalance] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [addressBook, setAddressBook] = useState<Map<string, string>>(new Map());
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    loadHideBalanceSetting();
    loadAddressBook();
    loadWalletAddress();
  }, []);

  const loadHideBalanceSetting = async () => {
    const hidden = await settingsService.getHideBalance();
    setHideBalance(hidden);
  };

  const loadAddressBook = async () => {
    const entries = await addressBookService.getEntries();
    const map = new Map<string, string>();
    for (const entry of entries) {
      map.set(entry.address, entry.name);
    }
    setAddressBook(map);
  };

  const loadWalletAddress = async () => {
    const address = await SecureStorage.getWalletAddress();
    setWalletAddress(address);
  };

  const getAddressLabel = (address: string): string | undefined => {
    return addressBook.get(address);
  };

  const isWalletAddress = (address: string): boolean => {
    return address === walletAddress;
  };

  const formatAmount = (amount: number): string => {
    const dividedValue = amount / Math.pow(10, config.decimals);
    return dividedValue.toLocaleString('en-US', {
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals,
    });
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return t.time.secondsAgo.replace('{s}', seconds.toString());
    if (seconds < 3600) return t.time.minutesAgo.replace('{m}', Math.floor(seconds / 60).toString());
    if (seconds < 86400) return t.time.hoursAgo.replace('{h}', Math.floor(seconds / 3600).toString());
    if (seconds < 2592000) return t.time.daysAgo.replace('{d}', Math.floor(seconds / 86400).toString());
    return t.time.monthsAgo.replace('{mo}', Math.floor(seconds / 2592000).toString());
  };

  const getConfirmations = (): number => {
    if (!currentHeight || !transaction.blockHeight) return 0;
    return Math.max(0, currentHeight - transaction.blockHeight + 1);
  };

  const getTransactionIcon = (type: string): { name: string; color: string } => {
    switch (type) {
      case 'incoming': return { name: 'arrow-down-circle', color: colors.success };
      case 'outgoing': return { name: 'arrow-up-circle', color: colors.error };
      case 'staking': return { name: 'diamond', color: colors.info };
      case 'coinbase': return { name: 'construct', color: colors.warning };
      default: return { name: 'ellipse', color: colors.textSecondary };
    }
  };

  const getTransactionColor = (type: string): string => {
    switch (type) {
      case 'incoming': return colors.success;
      case 'outgoing': return colors.error;
      case 'staking': return colors.info;
      case 'coinbase': return colors.warning;
      default: return colors.textSecondary;
    }
  };

  const getTransactionDescription = (type: string): string => {
    switch (type) {
      case 'incoming': return t.transactionDetails.received;
      case 'outgoing': return t.transactionDetails.sent;
      case 'staking': return t.transactionDetails.stakingDeposit;
      case 'coinbase': return t.transactionDetails.miningReward;
      default: return t.transactionDetails.transaction;
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedField(field);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const openExplorer = async () => {
    const explorerUrl = `${config.transactionExplorerUrl}${transaction.hash}`;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await Linking.openURL(explorerUrl);
    } catch (error) {
      Alert.alert(
        t.transactionDetails.explorerAlertTitle,
        `${t.transactionDetails.explorerAlertMsg}\n\n${explorerUrl}`,
        [
          { text: t.transactionDetails.cancel, style: 'cancel' },
          {
            text: t.transactionDetails.open,
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              Linking.openURL(explorerUrl);
            }
          },
        ]
      );
    }
  };

  const icon = getTransactionIcon(transaction.type);
  const txColor = getTransactionColor(transaction.type);
  const confirmations = getConfirmations();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
        >
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.transactionDetails.title}</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={openExplorer}
        >
          <Ionicons name="open-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Transaction Type Card */}
        <LinearGradient
          style={styles.typeCard}
          colors={[colors.backgroundLight, '#1e2222']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={styles.typeCardRow}>
            <View style={styles.typeInfoRow}>
              <View style={styles.typeIconContainer}>
                <Ionicons name={icon.name as any} size={32} color={icon.color} />
              </View>
              <View style={styles.typeTextContainer}>
                <Text style={styles.typeText}>
                  {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                </Text>
                <Text style={styles.typeDescription}>{getTransactionDescription(transaction.type)}</Text>
              </View>
            </View>
            <View style={styles.amountContainer}>
              <Text
                style={[
                  styles.amountText,
                  { color: txColor },
                ]}
              >
                {hideBalance && !isRevealed
                  ? '••••••••'
                  : transaction.type === 'staking'
                    ? formatAmount(transaction.amount)
                    : `${transaction.type === 'outgoing' ? '-' : '+'}${formatAmount(transaction.amount)}`
                }
              </Text>
              {!(hideBalance && !isRevealed) && (
                <Text style={styles.tickerText}>{ticker}</Text>
              )}
            </View>
          </View>
        </LinearGradient>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusIndicator}>
            <Ionicons
              name={transaction.status === 'confirmed' ? 'checkmark-circle' : 'time'}
              size={20}
              color={transaction.status === 'confirmed' ? colors.success : colors.warning}
            />
            <Text style={[
              styles.statusText,
              { color: transaction.status === 'confirmed' ? colors.success : colors.warning },
            ]}>
              {transaction.status === 'confirmed' ? t.transactionDetails.confirmed : t.transactionDetails.pending}
            </Text>
          </View>
          {transaction.status === 'confirmed' && transaction.blockHeight && (
            <View style={styles.confirmationBadge}>
              <Text style={styles.confirmationText}>
                {confirmations === 1
                  ? t.transactionDetails.confirmation.replace('{count}', confirmations.toString())
                  : t.transactionDetails.confirmations.replace('{count}', confirmations.toString())
                }
              </Text>
            </View>
          )}
        </View>

        {/* Transaction Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.transactionDetails.txInfo}</Text>

          <DetailRow
            label={t.transactionDetails.txHash}
            value={transaction.hash}
            isMono
            onCopy={() => copyToClipboard(transaction.hash, 'hash')}
            copied={copiedField === 'hash'}
          />

          {transaction.blockHeight && (
            <DetailRow
              label={t.transactionDetails.blockHeight}
              value={`#${transaction.blockHeight.toLocaleString()}`}
              valueColor={colors.text}
            />
          )}

          <DetailRow
            label={t.transactionDetails.timestamp}
            value={formatDate(transaction.timestamp)}
          />

          <DetailRow
            label={t.transactionDetails.timeAgo}
            value={formatTimeAgo(transaction.timestamp)}
            valueColor={colors.textSecondary}
          />

          <DetailRow
            label={t.transactionDetails.status}
            value={transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
            valueColor={transaction.status === 'confirmed' ? colors.success : colors.warning}
          />

          <DetailRow
            label={t.transactionDetails.type}
            value={transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
            valueColor={txColor}
          />

          <DetailRow
            label={t.transactionDetails.amount}
            value={
              hideBalance && !isRevealed
                ? '••••••••'
                : `${formatAmount(transaction.amount)} ${ticker}`
            }
            valueColor={txColor}
          />
        </View>

        {/* From/To Addresses */}
        {(transaction.from || transaction.to) && (
          <View style={styles.addressesSection}>
            <Text style={styles.sectionTitle}>{t.transactionDetails.addresses}</Text>

            {transaction.from && transaction.from.length > 0 && (
              <View style={[styles.addressGroup, !transaction.to && styles.addressGroupFirst]}>
                {transaction.from.map((addr, index) => (
                  <TouchableOpacity
                    key={`from-${index}`}
                    style={styles.addressCard}
                    onPress={() => copyToClipboard(addr.address, `from-${index}`)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.addressCardHeader}>
                      <View style={styles.addressCardLabelRow}>
                        <Ionicons name="arrow-up-circle" size={16} color={colors.error} />
                        <Text style={styles.addressCardLabel}>{t.transactionDetails.sender}</Text>
                      </View>
                      <Ionicons
                        name={copiedField === `from-${index}` ? 'checkmark-circle' : 'copy-outline'}
                        size={16}
                        color={copiedField === `from-${index}` ? colors.success : colors.textTertiary}
                      />
                    </View>
                    <Text style={styles.addressText} numberOfLines={2}>
                      {addr.address}
                    </Text>
                    <View style={styles.addressBadgesRow}>
                      {isWalletAddress(addr.address) && (
                        <View style={[styles.addressTag, styles.addressTagYou]}>
                          <Ionicons name="person" size={11} color={colors.success} />
                          <Text style={[styles.addressTagText, { color: colors.success }]}>{t.transactionDetails.you}</Text>
                        </View>
                      )}
                      {getAddressLabel(addr.address) && !isWalletAddress(addr.address) && (
                        <View style={styles.addressTag}>
                          <Ionicons name="person" size={12} color={colors.primary} />
                          <Text style={styles.addressTagText}>{getAddressLabel(addr.address)}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {transaction.to && transaction.to.length > 0 && (
              <View style={[styles.addressGroup, transaction.from && transaction.from.length > 0 && styles.addressGroupWithMargin, (!transaction.from || transaction.from.length === 0) && styles.addressGroupFirst]}>
                {transaction.to.map((addr, index) => (
                  <TouchableOpacity
                    key={`to-${index}`}
                    style={styles.addressCard}
                    onPress={() => copyToClipboard(addr.address, `to-${index}`)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.addressCardHeader}>
                      <View style={styles.addressCardLabelRow}>
                        <Ionicons name="arrow-down-circle" size={16} color={colors.success} />
                        <Text style={styles.addressCardLabel}>{t.transactionDetails.recipient}</Text>
                      </View>
                      <Ionicons
                        name={copiedField === `to-${index}` ? 'checkmark-circle' : 'copy-outline'}
                        size={16}
                        color={copiedField === `to-${index}` ? colors.success : colors.textTertiary}
                      />
                    </View>
                    <Text style={styles.addressText} numberOfLines={2}>
                      {addr.address}
                    </Text>
                    <View style={styles.addressBadgesRow}>
                      {isWalletAddress(addr.address) && (
                        <View style={[styles.addressTag, styles.addressTagYou]}>
                          <Ionicons name="person" size={11} color={colors.success} />
                          <Text style={[styles.addressTagText, { color: colors.success }]}>{t.transactionDetails.you}</Text>
                        </View>
                      )}
                      {getAddressLabel(addr.address) && !isWalletAddress(addr.address) && (
                        <View style={styles.addressTag}>
                          <Ionicons name="person" size={12} color={colors.primary} />
                          <Text style={styles.addressTagText}>{getAddressLabel(addr.address)}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

      </ScrollView>

      {/* Copied Toast */}
      {copiedField && (
        <View style={styles.toast}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.toastText}>{t.transactionDetails.copied}</Text>
        </View>
      )}
    </View>
  );
};

interface DetailRowProps {
  label: string;
  value: string;
  isMono?: boolean;
  valueColor?: string;
  onCopy?: () => void;
  copied?: boolean;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, isMono, valueColor, onCopy, copied }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <View style={styles.detailValueContainer}>
      <Text
        style={[
          styles.detailValue,
          isMono && styles.monoText,
          valueColor && { color: valueColor },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
      {onCopy && (
        <TouchableOpacity
          style={styles.copyButton}
          onPress={onCopy}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={copied ? 'checkmark' : 'copy-outline'}
            size={16}
            color={copied ? colors.success : colors.textTertiary}
          />
        </TouchableOpacity>
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  typeCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  typeCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeInfoContainer: {
    flex: 1,
  },
  typeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  typeTextContainer: {
    flex: 1,
  },
  typeText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  typeDescription: {
    fontSize: 13,
    color: colors.textTertiary,
    marginTop: 2,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 24,
    fontWeight: '700',
  },
  tickerText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmationBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  confirmationText: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '600',
  },
  section: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  // New improved addresses section styles
  addressesSection: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  addressGroup: {
    marginTop: spacing.sm,
  },
  addressGroupFirst: {
    marginTop: 0,
  },
  addressGroupWithMargin: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  addressGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  addressGroupTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3,
  },
  addressCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  addressCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  addressCardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addressCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressText: {
    fontSize: 12,
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: spacing.xs,
  },
  addressBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addressTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255, 140, 251, 0.1)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  addressTagYou: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  addressTagText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '500',
  },
  // Legacy styles (kept for compatibility)
  addressItem: {
    marginBottom: spacing.md,
  },
  addressLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  detailValueContainer: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
    flex: 1,
  },
  monoText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
  copyButton: {
    padding: spacing.xs,
  },
  actionsSection: {
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primaryLighter,
    width: '100%',
    marginHorizontal: 0,
    marginTop: spacing.sm
  },
  actionButtonFirst: {
    marginTop: 0,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  toast: {
    position: 'absolute',
    bottom: spacing.xxl,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.backgroundDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  toastText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
});

export default TransactionDetailsScreen;
