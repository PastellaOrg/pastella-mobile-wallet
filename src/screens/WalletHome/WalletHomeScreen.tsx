import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius } from '../../theme/colors';
import { SecureStorage } from '../../services/secureStorage';
import settingsService from '../../services/settingsService';
import nodeService from '../../services/nodeService';
import { Node } from '../../types/nodes';
import { WalletSyncState, derivePublicKeyFromMnemonic, derivePublicKeyFromPrivateKey, WalletSync, WalletDisplayTransaction, MATURITY_BLOCKS } from '../../pastella-utils';
import type { WalletStateData } from '../../services/secureStorage';
import * as Haptics from 'expo-haptics';
import { config } from '../../config/explorer';
import { FadeIn } from '../../components/shared';
import { useTranslation } from '../../i18n';

type WalletHomeNavigationProp = StackNavigationProp<any, 'WalletHome'>;
type WalletHomeRouteProp = RouteProp<{ WalletHome: { mnemonic: string; pin: string; resyncFromHeight?: number } }, 'WalletHome'>;

interface Props {
  navigation: WalletHomeNavigationProp;
  route?: WalletHomeRouteProp;
}

const WalletHomeScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t, formatString } = useTranslation();

  // Helper function to format atomic amount to human-readable format
  const formatAmount = (amount: number): string => {
    const dividedValue = amount / Math.pow(10, config.decimals);
    return dividedValue.toLocaleString('en-US', {
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals,
    });
  };
  const [walletData, setWalletData] = useState<{
    address: string;
    balance: number;
    lockedBalance: number;
    stakingLocked: number;
    ticker: string;
  } | null>(null);
  const [transactions, setTransactions] = useState<WalletDisplayTransaction[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [pressedButton, setPressedButton] = useState<'prev' | 'next' | null>(null);
  const transactionsPerPage = 10;

  // Sync state
  const [syncState, setSyncState] = useState<WalletSyncState | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Connection state
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  // Local WalletSync instance
  const [walletSync, setWalletSync] = useState<WalletSync | null>(null);

  // Track handled resync to avoid infinite loops
  const handledResyncKey = useRef<string | null>(null);

  // Hide balance state
  const [hideBalance, setHideBalance] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const revealTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Reload settings when screen comes into focus (in case user changed it in Settings)
  useFocusEffect(
    React.useCallback(() => {
      loadSettings();
    }, [])
  );

  const loadSettings = async () => {
    const hidden = await settingsService.getHideBalance();
    setHideBalance(hidden);
  };

  // Load wallet and start sync on mount
  useEffect(() => {
    loadWalletAndStartSync();
  }, []);

  // Handle resync request when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      const checkForResync = async () => {
        const resyncHeight = route?.params?.resyncFromHeight;
        const resyncKey = resyncHeight !== undefined ? `resync-${resyncHeight}` : null;

        // Only proceed if this is a new resync request (via navigation param)
        if (resyncKey !== null && resyncKey !== handledResyncKey.current) {
          // Stop the old sync if running
          if (walletSync) {
            walletSync.stop();
            setWalletSync(null);
          }

          // Mark this resync as handled
          handledResyncKey.current = resyncKey;

          // Clear the resync param by resetting navigation
          navigation.setParams({ resyncFromHeight: undefined } as any);

          // Clear local state
          setTransactions([]);
          setSyncState(null);
          setIsSyncing(true);

          // Restart sync with the specified height
          const storedWallet = await SecureStorage.loadWallet();
          const node = await nodeService.getSelectedNode();

          if (!storedWallet || !node) {
            console.error('Cannot resync - wallet or node not found');
            setIsSyncing(false);
            return;
          }

          // Derive public key from mnemonic or private key
          const publicKeyHex = storedWallet.mnemonic
            ? derivePublicKeyFromMnemonic(storedWallet.mnemonic)
            : derivePublicKeyFromPrivateKey(storedWallet.privateKey!);
          const startHeight = resyncHeight ?? 0;

          // Reset wallet data
          setWalletData({
            address: storedWallet.address,
            balance: 0,
            lockedBalance: 0,
            stakingLocked: 0,
            ticker: 'PAS',
          });

          // Start fresh sync WITHOUT loading saved state
          await startWalletSync(node, publicKeyHex, startHeight, true);
        }
      };

      checkForResync();
    }, [route?.params?.resyncFromHeight, navigation]) // Removed walletSync from dependencies
  );

  const loadWalletAndStartSync = async () => {
    try {
      // Load wallet from storage
      const storedWallet = await SecureStorage.loadWallet();

      if (!storedWallet) {
        // No wallet found, redirect to welcome
        navigation.reset({
          index: 0,
          routes: [{ name: 'Welcome' }],
        });
        return;
      }

      // Get selected node
      const node = await nodeService.getSelectedNode();
      setSelectedNode(node);

      // Derive the public key from mnemonic or private key
      const publicKeyHex = storedWallet.mnemonic
        ? derivePublicKeyFromMnemonic(storedWallet.mnemonic)
        : derivePublicKeyFromPrivateKey(storedWallet.privateKey!);

      // Try to load saved wallet state
      const savedState = await SecureStorage.loadWalletState();
      let startHeight = 0;

      // Always start with zero balance - will be updated from WalletSync's real balance
      setWalletData({
        address: storedWallet.address,
        balance: 0,
        lockedBalance: 0,
        stakingLocked: 0,
        ticker: 'PAS',
      });

      if (savedState) {
        setSyncState(savedState.syncState);
        setTransactions(savedState.transactions.map(tx => ({
          hash: tx.hash,
          type: tx.type,
          amount: tx.amount,
          timestamp: tx.timestamp,
          status: tx.status,
          blockHeight: tx.blockHeight || 0,
          confirmations: 0, // Will be recalculated by sync
          from: tx.from,
          to: tx.to,
        })));
        startHeight = savedState.syncState.currentHeight;
      }

      // Start sync if we have a node
      if (node) {
        await startWalletSync(node, publicKeyHex, startHeight);
      }
    } catch (error) {
      console.error('Failed to load wallet:', error);
    }
  };

  const startWalletSync = async (node: Node, publicKey: string, startHeight: number = 0, skipInitialState: boolean = false) => {
    setIsSyncing(true);

    // Try to load saved state to pass to WalletSync (unless doing a fresh resync)
    let initialState = undefined;
    if (!skipInitialState) {
      const savedState = await SecureStorage.loadWalletState();
      initialState = savedState ? {
        outputs: savedState.outputs,
        spends: savedState.spends,
        currentHeight: savedState.syncState.currentHeight,
        syncState: savedState.syncState, // Pass full syncState including stakingTxHashes
      } : undefined;
    }

    // Create WalletSync instance with event handlers
    const sync = new WalletSync({
      node: {
        ip: node.ip,
        port: node.port,
        ssl: node.ssl,
      },
      publicKeys: [publicKey],
      startHeight,
      initialState,
      onSyncProgress: (state) => {
        setSyncState(state);
        setIsSyncing(state.isSyncing);

        // Always get real balance from WalletSync methods instead of using state values
        const availableBalance = sync.getAvailableBalance();
        const lockedBalance = sync.getLockedBalance();
        const stakingLocked = sync.getStakingLockedBalance();
        setWalletData(prev => prev ? { ...prev, balance: availableBalance, lockedBalance, stakingLocked } : null);

        // Refresh transactions to update confirmation counts
        const sortedTransactions = sync.getTransactions();
        setTransactions(sortedTransactions);
      },
      // High-level callback with pre-classified transactions from pastella-utils
      onTransactionDiscovered: (transaction) => {
        setTransactions(prev => {
          const updated = [...prev];
          const existingIndex = updated.findIndex(tx => tx.hash === transaction.hash);

          if (existingIndex >= 0) {
            updated[existingIndex] = transaction;
          } else {
            updated.unshift(transaction);
          }

          return updated;
        });
      },
      // Connection status callback - reuses the /info calls from WalletSync polling
      onConnectionStatusChange: (isConnected, latency) => {
        setIsConnected(isConnected);
      },
    });

    setWalletSync(sync);

    try {
      await sync.start();
      // Note: Don't set isSyncing(false) here - polling is still running
      // The onSyncProgress callback will handle isSyncing state

      // Save wallet state when initial sync completes
      await saveCurrentWalletState(sync);

      // Rebuild transactions from the synced data for proper display
      await rebuildTransactionsFromSync(sync);
    } catch (error) {
      console.error('Sync error:', error);
      setIsSyncing(false);
    }
  };

  const rebuildTransactionsFromSync = async (sync: WalletSync) => {
    try {
      // Use the getTransactions method from pastella-utils - get all transactions
      const sortedTransactions = sync.getTransactions();
      setTransactions(sortedTransactions);
    } catch (error) {
      console.error('Failed to rebuild transactions:', error);
    }
  };

  const saveCurrentWalletState = async (sync: WalletSync) => {
    try {
      const state = sync.getState();
      const outputs = sync.getOutputs();
      const spends = sync.getSpends();

      // Use the getTransactions method from pastella-utils for classification - get all transactions
      const sortedTransactions = sync.getTransactions();

      await SecureStorage.saveWalletState(state, outputs, spends, sortedTransactions);
    } catch (error) {
      console.error('Failed to save wallet state:', error);
    }
  };

  // Save state when component unmounts
  useEffect(() => {
    return () => {
      if (walletSync && !isSyncing) {
        saveCurrentWalletState(walletSync);
      }
    };
  }, [walletSync, isSyncing]);

  const formatTime = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return t.time.secondsAgo.replace('{s}', seconds.toString());
    if (seconds < 3600) return t.time.minutesAgo.replace('{m}', Math.floor(seconds / 60).toString());
    if (seconds < 86400) return t.time.hoursAgo.replace('{h}', Math.floor(seconds / 3600).toString());
    return t.time.daysAgo.replace('{d}', Math.floor(seconds / 86400).toString());
  };

  const getTransactionIcon = (type: string): { name: string; color: string } => {
    switch (type) {
      case 'incoming': return { name: 'arrow-down', color: colors.success };
      case 'outgoing': return { name: 'arrow-up', color: colors.error };
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

  const getSyncProgressText = (): string => {
    if (!syncState) return '';

    const { currentHeight, networkHeight } = syncState;

    // If we're synced (currentHeight equals networkHeight or is only 1 behind), show synced state
    if (currentHeight >= networkHeight - 1) {
      // Show we're synced at the current height
      const syncedHeight = Math.max(currentHeight, networkHeight - 1);
      return formatString(t.walletHome.synced, { height: syncedHeight });
    }

    // Otherwise show progress
    return currentHeight && networkHeight
      ? formatString(t.walletHome.syncing, { current: currentHeight, network: networkHeight })
      : t.walletHome.starting;
  };

  if (!walletData) {
    return null;
  }

  // Calculate paginated transactions
  const totalPages = Math.ceil(transactions.length / transactionsPerPage);
  const paginatedTransactions = transactions.slice(
    currentPage * transactionsPerPage,
    (currentPage + 1) * transactionsPerPage
  );

  const handlePreviousPage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };

  return (
    <FadeIn>
      <View style={styles.container}>
      {/* Sync Status Indicator */}
        {(isSyncing || syncState) && (
          <>
            {isSyncing ? (
              <View style={styles.syncStatusContainer}>
                <View style={styles.syncingIconContainer}>
                  <ActivityIndicator size={14} color={colors.primary} />
                </View>
                <Text style={styles.syncStatusText}>{getSyncProgressText()}</Text>
              </View>
            ) : (
              <LinearGradient
                style={styles.syncedContainer}
                colors={['rgba(16, 185, 129, 0.15)', 'rgba(16, 185, 129, 0.05)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.syncedIconContainer}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                </View>
                <Text style={styles.syncedText}>{getSyncProgressText()}</Text>
              </LinearGradient>
            )}
          </>
        )}

        {/* Balance Card with Gradient */}
        <LinearGradient
          style={styles.balanceCard}
          colors={[colors.backgroundLight, '#1e2222']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={styles.balanceHeader}>
            <View style={styles.balanceLabelContainer}>
              <Text style={styles.balanceLabel}>{t.walletHome.balance}</Text>
              {hideBalance && (
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIsRevealed(true);
                    // Clear any existing timeout
                    if (revealTimeoutRef.current) {
                      clearTimeout(revealTimeoutRef.current);
                    }
                    // Auto-hide after 3 seconds
                    revealTimeoutRef.current = setTimeout(() => {
                      setIsRevealed(false);
                    }, 3000);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={isRevealed ? 'eye' : 'eye-off'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>
            {selectedNode && (
              <TouchableOpacity
                style={styles.nodeIndicator}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate('Nodes');
                }}
              >
                <Ionicons name="server" size={14} color={colors.textTertiary} />
                <Text style={styles.nodeText}>{selectedNode.name}</Text>
                <View style={[
                  styles.connectionDot,
                  isConnected === null ? styles.connectionDotUnknown : null,
                  isConnected ? styles.connectionDotConnected : styles.connectionDotDisconnected
                ]} />
                <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.balanceSection}>
            <TouchableOpacity
              style={styles.balanceAmountContainer}
              activeOpacity={0.7}
              onPress={() => {
                if (hideBalance && !isRevealed) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsRevealed(true);
                  // Clear any existing timeout
                  if (revealTimeoutRef.current) {
                    clearTimeout(revealTimeoutRef.current);
                  }
                  // Auto-hide after 3 seconds
                  revealTimeoutRef.current = setTimeout(() => {
                    setIsRevealed(false);
                  }, 3000);
                }
              }}
            >
              {hideBalance && !isRevealed ? (
                <>
                  <Text style={styles.balanceAmount}>•••••••</Text>
                  <Text style={styles.balanceDecimal}>••</Text>
                  <Text style={styles.balanceTicker}>{walletData.ticker}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.balanceAmount}>
                    {formatAmount(walletData.balance).split('.')[0]}.
                  </Text>
                  <Text style={styles.balanceDecimal}>
                    {formatAmount(walletData.balance).split('.')[1]}{' '}
                  </Text>
                  <Text style={styles.balanceTicker}>{walletData.ticker}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {walletData.lockedBalance > 0 && (
            <View style={styles.pendingBalance}>
              <Ionicons name="lock-closed" size={14} color={colors.warning} />
              <Text style={styles.pendingText}>
                {formatAmount(walletData.lockedBalance)} {walletData.ticker} {t.walletHome.locked}
              </Text>
            </View>
          )}

          {walletData.stakingLocked > 0 && (
            <View style={[styles.pendingBalance, { backgroundColor: colors.infoLight }]}>
              <Ionicons name="diamond" size={14} color={colors.info} />
              <Text style={[styles.pendingText, { color: colors.info }]}>
                {formatAmount(walletData.stakingLocked)} {walletData.ticker} {t.walletHome.stakingLocked}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.balanceActions}
            style={styles.balanceActionsScroll}
          >
            <View style={styles.balanceActionButton}>
              <Ionicons name="add" size={20} color={colors.textMuted} />
              <Text style={[styles.balanceActionText, styles.disabledText]}>{t.walletHome.buy}</Text>
            </View>

            <TouchableOpacity
              style={styles.balanceActionButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('Send');
              }}
            >
              <Ionicons name="arrow-up" size={20} color={colors.text} />
              <Text style={styles.balanceActionText}>{t.nav.send}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.balanceActionButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('Receive');
              }}
            >
              <Ionicons name="arrow-down" size={20} color={colors.text} />
              <Text style={styles.balanceActionText}>{t.nav.receive}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.balanceActionButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('Staking');
              }}
            >
              <Ionicons name="diamond" size={20} color={colors.text} />
              <Text style={styles.balanceActionText}>{t.nav.staking}</Text>
            </TouchableOpacity>
          </ScrollView>
        </LinearGradient>

        {/* Transactions Section */}
        <View style={styles.transactionsSectionWrapper}>
          <ScrollView
            style={styles.transactionsScroll}
            contentContainerStyle={styles.transactionsScrollContent}
            showsVerticalScrollIndicator={true}
          >
          {transactions.length === 0 ? (
            <View style={styles.emptyTransactions}>
              <Ionicons name="document-text-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyText}>{t.walletHome.noTransactions}</Text>
              <Text style={styles.emptySubtext}>{t.walletHome.noTransactionsSub}</Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {paginatedTransactions.map((tx) => (
                <View key={tx.hash}>
                  <TouchableOpacity
                    style={styles.transactionItem}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      navigation.navigate('TransactionDetails', {
                        transaction: tx,
                        ticker: walletData.ticker,
                        currentHeight: syncState?.currentHeight,
                      });
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.transactionIconContainer}>
                      <Ionicons
                        name={getTransactionIcon(tx.type).name as any}
                        size={20}
                        color={getTransactionIcon(tx.type).color}
                      />
                    </View>

                    <View style={styles.transactionDetails}>
                      <View style={styles.transactionTypeRow}>
                        <Text style={styles.transactionType}>
                          {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                        </Text>
                        <View style={[
                          styles.statusBadge,
                          { backgroundColor: tx.status === 'confirmed' ? `${colors.success}20` : `${colors.warning}20` }
                        ]}>
                          <Text style={[
                            styles.statusText,
                            { color: tx.status === 'confirmed' ? colors.success : colors.warning }
                          ]}>
                            {tx.status === 'confirmed'
                              ? 'Confirmed'
                              : `Pending ${Math.min(tx.confirmations, MATURITY_BLOCKS)}/${MATURITY_BLOCKS}`}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.transactionTime}>{formatTime(tx.timestamp)}</Text>
                      <Text style={styles.transactionBlock}>Block #{tx.blockHeight}</Text>
                    </View>

                    <View style={styles.transactionAmountContainer}>
                      <Text
                        style={[
                          styles.transactionAmount,
                          { color: getTransactionIcon(tx.type).color },
                        ]}
                      >
                        {hideBalance && !isRevealed
                          ? '•••••••'
                          : tx.type === 'staking'
                            ? formatAmount(tx.amount)
                            : `${tx.type === 'outgoing' ? '-' : '+'}${formatAmount(tx.amount)}`
                        }
                      </Text>
                      {!(hideBalance && !isRevealed) && (
                        <Text style={styles.transactionTicker}>{walletData.ticker}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                  {tx.hash !== paginatedTransactions[paginatedTransactions.length - 1]?.hash && (
                    <View style={styles.transactionDivider} />
                  )}
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Pagination Controls */}
        {transactions.length > transactionsPerPage && (
          <View style={styles.paginationContainer}>
            <TouchableOpacity
              style={[
                styles.paginationButton,
                pressedButton === 'prev' && styles.paginationButtonPressed,
                currentPage === 0 && styles.paginationButtonDisabled,
              ]}
              onPress={handlePreviousPage}
              onPressIn={() => setPressedButton('prev')}
              onPressOut={() => setPressedButton(null)}
              disabled={currentPage === 0}
              activeOpacity={0.8}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={currentPage === 0 ? colors.textMuted : colors.primary}
              />
            </TouchableOpacity>

            <Text style={styles.paginationText}>
              {currentPage + 1} / {totalPages}
            </Text>

            <TouchableOpacity
              style={[
                styles.paginationButton,
                pressedButton === 'next' && styles.paginationButtonPressed,
                currentPage >= totalPages - 1 && styles.paginationButtonDisabled,
              ]}
              onPress={handleNextPage}
              onPressIn={() => setPressedButton('next')}
              onPressOut={() => setPressedButton(null)}
              disabled={currentPage >= totalPages - 1}
              activeOpacity={0.8}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={currentPage >= totalPages - 1 ? colors.textMuted : colors.primary}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
    </FadeIn>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  syncStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: `${colors.primary}10`,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xxl,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  syncStatusText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  syncedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xxl,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.12)',
  },
  syncedIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncingIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncedText: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  balanceCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginLeft: spacing.lg,
    marginRight: spacing.lg,
    marginTop: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  balanceLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  balanceLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    textTransform: 'capitalize',
    letterSpacing: 0.5,
  },
  eyeIcon: {
    padding: spacing.xs,
  },
  nodeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  nodeText: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  connectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  connectionDotUnknown: {
    backgroundColor: colors.textTertiary,
  },
  connectionDotConnected: {
    backgroundColor: colors.success,
  },
  connectionDotDisconnected: {
    backgroundColor: colors.error,
  },
  balanceSection: {
    marginBottom: spacing.md,
  },
  balanceAmountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  balanceDecimal: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  balanceTicker: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  pendingBalance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  pendingText: {
    fontSize: 13,
    color: colors.warning,
    fontWeight: '500',
  },
  balanceActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  balanceActionsScroll: {
    marginHorizontal: -spacing.sm,
  },
  balanceActionButton: {
    minWidth: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  balanceActionText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  disabledText: {
    color: colors.textMuted,
  },
  addressCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginLeft: spacing.lg,
    marginRight: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  addressTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressText: {
    fontSize: 13,
    color: colors.text,
    fontFamily: 'monospace',
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  transactionsContainer: {
    marginHorizontal: spacing.lg,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  transactionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary,
  },
  transactionsList: {
    paddingVertical: spacing.sm,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  transactionItemLast: {
    marginBottom: 0,
  },
  transactionDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginLeft: spacing.md + 40, // icon width + padding
  },
  transactionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  transactionIcon: {
    fontSize: 20,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  transactionType: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  transactionTime: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  transactionBlock: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  transactionTicker: {
    fontSize: 11,
    color: colors.textTertiary,
    marginLeft: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textTertiary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyTransactions: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  transactionsSectionWrapper: {
    flex: 1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: 120,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  transactionsScroll: {
    flex: 1,
  },
  transactionsScrollContent: {
    padding: 0,
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  paginationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationButtonPressed: {
    backgroundColor: colors.primaryLighter,
  },
  paginationButtonDisabled: {
    opacity: 0.4,
    backgroundColor: 'transparent',
    borderColor: colors.borderLight,
  },
  paginationText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    minWidth: 50,
    textAlign: 'center',
  },
});

export default WalletHomeScreen;
