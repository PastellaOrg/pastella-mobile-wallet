import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, borderRadius } from '../../theme/colors';
import nodeService from '../../services/nodeService';
import { DaemonApi, GetAllStakesResponse, StakeEntry, FinishedStakeEntry } from '../../pastella-utils';
import {
  PendingStake,
  PendingStakeState,
  createPendingStake,
  updatePendingStake,
  checkOutputsAvailable,
  prepareStakingOutputs,
  createStakingTransaction,
  hasPreciseStakingOutputs,
  findPreciseStakingOutputsTxHash,
  MIN_FEE,
  MATURITY_BLOCKS,
} from '../../pastella-utils';
import { PENDING_STAKES_KEY } from '../../constants/storage';
import { config } from '../../config/explorer';
import { SecureStorage } from '../../services/secureStorage';
import { coinsToAtomic, WalletSync } from '../../pastella-utils';
import { useTranslation } from '../../i18n';

type StakingNavigationProp = StackNavigationProp<any, 'Staking'>;
type StakingRouteProp = RouteProp<{ Staking: undefined }, 'Staking'>;

interface Props {
  navigation: StakingNavigationProp;
  route?: StakingRouteProp;
}

type AllStakesData = GetAllStakesResponse;

interface StakeOption {
  days: number;
  rate: number;
}

// Staking fee in atomic units (0.00002 PAS)
const STAKING_FEE = 2000;

const StakingScreen: React.FC<Props> = ({ navigation }) => {
  const { t, formatString } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allStakesData, setAllStakesData] = useState<AllStakesData | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [walletOutputs, setWalletOutputs] = useState<any[]>([]);
  const [currentHeight, setCurrentHeight] = useState<number>(0);
  const [publicKey, setPublicKey] = useState<string>('');
  const [privateKey, setPrivateKey] = useState<string>('');

  // Pending stakes state
  const [pendingStakes, setPendingStakes] = useState<PendingStake[]>([]);

  // Stake modal state
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [stakeAmount, setStakeAmount] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [staking, setStaking] = useState(false);
  const [stakeStep, setStakeStep] = useState<'input' | 'preparing' | 'awaiting_finalization' | 'pending'>('input');
  const [stakeProgress, setStakeProgress] = useState<string>('');

  // Polling refs
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const syncRef = useRef<WalletSync | null>(null);

  // Info modal state
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Expanded stake cards state
  const [expandedStakes, setExpandedStakes] = useState<Set<string>>(new Set());

  // Toggle stake card expansion
  const toggleStakeExpansion = (stakeHash: string) => {
    setExpandedStakes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stakeHash)) {
        newSet.delete(stakeHash);
      } else {
        newSet.add(stakeHash);
      }
      return newSet;
    });
  };

  // Format atomic amount to human-readable
  const formatAmount = (amount: number): string => {
    const dividedValue = amount / Math.pow(10, config.decimals);
    return dividedValue.toLocaleString('en-US', {
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals,
    });
  };

  // Format percentage
  const formatPercentage = (value: number, decimals: number = 2): string => {
    return value.toFixed(decimals) + '%';
  };

  // Load pending stakes from AsyncStorage
  const loadPendingStakes = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(PENDING_STAKES_KEY);
      if (stored) {
        const stakes: PendingStake[] = JSON.parse(stored);
        console.log('[loadPendingStakes] Loaded', stakes.length, 'stakes');
        for (const stake of stakes) {
          console.log('[loadPendingStakes] Stake:', {
            id: stake.id,
            amount: stake.amount,
            preparationTxHash: stake.preparationTxHash?.substring(0, 16) + '...',
            stakingTxHash: stake.stakingTxHash?.substring(0, 16) + '...',
          });
        }
        setPendingStakes(stakes);
      }
    } catch (error) {
      console.error('Failed to load pending stakes:', error);
    }
  }, []);

  // Save pending stakes to AsyncStorage
  const savePendingStakes = useCallback(async (stakes: PendingStake[]) => {
    try {
      await AsyncStorage.setItem(PENDING_STAKES_KEY, JSON.stringify(stakes));
      setPendingStakes(stakes);
    } catch (error) {
      console.error('Failed to save pending stakes:', error);
    }
  }, []);

  // Remove a pending stake
  const removePendingStake = useCallback(async (stakeId: string) => {
    const updated = pendingStakes.filter(s => s.id !== stakeId);
    await savePendingStakes(updated);
  }, [pendingStakes, savePendingStakes]);

  // Update a pending stake
  const updateStake = useCallback(async (stakeId: string, updates: Partial<Omit<PendingStake, 'id' | 'createdAt' | 'amount' | 'lockDurationDays' | 'address'>>) => {
    const updated = pendingStakes.map(s => {
      if (s.id === stakeId) {
        return updatePendingStake(s, updates);
      }
      return s;
    });
    await savePendingStakes(updated);
  }, [pendingStakes, savePendingStakes]);

  const loadNode = async () => {
    return await nodeService.getSelectedNode();
  };

  const loadWalletBalance = async () => {
    try {
      const savedState = await SecureStorage.loadWalletState();
      if (savedState) {
        setWalletBalance(savedState.syncState.availableBalance);
        setCurrentHeight(savedState.syncState.currentHeight);
      }
    } catch (err) {
    }
  };

  // Load wallet keys and outputs
  const loadWalletData = async () => {
    try {
      console.log('[loadWalletData] Starting...');
      const wallet = await SecureStorage.loadWallet();
      if (!wallet) return;

      // Get mnemonic or private key and derive keys
      const { deriveKeysFromMnemonic, derivePublicKeyFromPrivateKey } = await import('../../pastella-utils');
      let pubKey: string;
      let privKey: string;

      if (wallet.privateKey && !wallet.mnemonic) {
        // Private key import
        pubKey = derivePublicKeyFromPrivateKey(wallet.privateKey);
        privKey = wallet.privateKey;
      } else {
        // Mnemonic import
        const keys = deriveKeysFromMnemonic(wallet.mnemonic!);
        pubKey = keys.publicKey;
        privKey = keys.privateKey;
      }

      setPublicKey(pubKey);
      setPrivateKey(privKey);
      console.log('[loadWalletData] Keys derived', { pubKey: pubKey.substring(0, 16) + '...' });

      // Initialize WalletSync to get outputs
      const node = await loadNode();
      if (!node) return;
      console.log('[loadWalletData] Node loaded:', node);

      const { WalletSync } = await import('../../pastella-utils');
      const sync = new WalletSync({
        node: { ip: node.ip, port: node.port, ssl: node.ssl },
        publicKeys: [pubKey],  // Use public key, NOT address!
        startHeight: 0,
      });
      syncRef.current = sync;
      console.log('[loadWalletData] WalletSync created');

      console.log('[loadWalletData] Starting sync...');
      await sync.start();
      console.log('[loadWalletData] Sync started');

      const outputs = sync.getAvailableOutputs();
      console.log('[loadWalletData] Available outputs:', outputs.length);
      setWalletOutputs(outputs);

      const state = sync.getState();
      console.log('[loadWalletData] Sync state:', state);
      setCurrentHeight(state.currentHeight);
    } catch (err) {
      console.error('[loadWalletData] Failed to load wallet data:', err);
    }
  };

  const fetchData = async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      const node = await loadNode();

      if (!node) {
        setError('Node not found');
        return;
      }

      const api = new DaemonApi({
        ip: node.ip,
        port: node.port,
        ssl: node.ssl,
      });

      // Get all stakes using the /getallstakes endpoint
      const response = await api.getAllStakes({ limit: 100 });

      if (response.status === 'OK') {
        setAllStakesData(response as AllStakesData);
      } else {
        setError(t.staking.errorLoadingStakes);
      }
    } catch (err) {
      setError(t.staking.errorLoadingStakes);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchData(false);
    loadWalletBalance();
  };

  useEffect(() => {
    fetchData();
    loadWalletBalance();
    loadPendingStakes();
    loadWalletData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      // Only refresh stakes data when screen comes into focus (not full wallet sync)
      fetchData(false);
      loadPendingStakes();
      loadWalletBalance();
      return () => {
        // Clear polling interval on unmount
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }, [])
  );

  // Poll pending stakes
  useEffect(() => {
    if (pendingStakes.length === 0) return;

    const pollPendingStakes = async () => {
      for (const stake of pendingStakes) {
        if (stake.state === PendingStakeState.PREPARING) {
          // Check if outputs are available
          await checkPreparationComplete(stake);
        } else if (stake.state === PendingStakeState.PENDING && stake.stakingTxHash) {
          // Check if staking transaction is confirmed
          await checkStakingConfirmed(stake);
        }
      }
    };

    // Poll every 5 seconds
    pollingIntervalRef.current = setInterval(pollPendingStakes, 5000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [pendingStakes]);

  // Check if preparation transaction is complete (outputs available)
  const checkPreparationComplete = async (stake: PendingStake) => {
    try {
      console.log('[checkPreparationComplete] Checking stake:', stake.id);

      // Use existing sync instance to get fresh outputs
      if (syncRef.current) {
        console.log('[checkPreparationComplete] Using existing sync to get outputs...');
        const outputs = syncRef.current.getAvailableOutputs();
        const state = syncRef.current.getState();

        console.log('[checkPreparationComplete] Outputs:', outputs.length, 'Height:', state.currentHeight);

        // Update wallet outputs and height
        setWalletOutputs(outputs);
        setCurrentHeight(state.currentHeight);

        // Use MIN_FEE constant
        const currentFee = MIN_FEE;
        console.log('[checkPreparationComplete] Using MIN_FEE:', currentFee);

        const outputsAvailable = hasPreciseStakingOutputs(
          stake.amount,
          outputs,
          state.currentHeight,
          currentFee  // Pass currentFee
        );

        console.log('[checkPreparationComplete] Outputs available:', outputsAvailable);

        if (outputsAvailable) {
          // Move to awaiting finalization
          console.log('[checkPreparationComplete] Outputs ready! Moving to AWAITING_FINALIZATION');
          await updateStake(stake.id, {
            state: PendingStakeState.AWAITING_FINALIZATION,
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        console.log('[checkPreparationComplete] No sync ref, reloading wallet data...');
        await loadWalletData();
      }
    } catch (error) {
      console.error('[checkPreparationComplete] Error:', error);
    }
  };

  // Check if staking transaction is confirmed
  const checkStakingConfirmed = async (stake: PendingStake) => {
    if (!stake.stakingTxHash) return;

    try {
      const node = await loadNode();
      if (!node) return;

      const api = new DaemonApi({
        ip: node.ip,
        port: node.port,
        ssl: node.ssl,
      });

      // Check if transaction is in a block
      const response = await api.getTransactionsStatus({
        transactionHashes: [stake.stakingTxHash],
      });

      if (response.status === 'OK') {
        const txStatus = response.transactionsInBlock?.find(
          t => t.hash === stake.stakingTxHash
        );

        if (txStatus) {
          // Transaction confirmed, check if it appears in stakes
          await fetchData(false);

          // Check if this stake is now in the API
          const foundInStakes = allStakesData?.stakes.some(
            s => s.staking_tx_hash === stake.stakingTxHash
          );

          if (foundInStakes) {
            // Remove from pending stakes
            await removePendingStake(stake.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      }
    } catch (error) {
      console.error('Error checking staking confirmation:', error);
    }
  };

  const handleStake = async () => {
    console.log('handleStake called', { stakeAmount, selectedDuration, walletBalance, staking });

    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      console.log('Invalid amount');
      Alert.alert(t.common.error, t.staking.enterValidAmount);
      return;
    }

    if (selectedDuration === null) {
      console.log('No duration selected');
      Alert.alert(t.common.error, t.staking.selectDuration);
      return;
    }

    console.log('Calculating amount...');
    const amountInAtomic = coinsToAtomic(parseFloat(stakeAmount));
    const totalNeeded = amountInAtomic + STAKING_FEE;
    console.log('Amount calculated:', { amountInAtomic, totalNeeded, walletBalance });

    if (totalNeeded > walletBalance) {
      console.log('Insufficient balance');
      Alert.alert(t.common.error, formatString('staking.insufficientBalance', {
        amount: formatAmount(totalNeeded),
        ticker: config.ticker,
        fee: formatAmount(STAKING_FEE),
      }));
      return;
    }

    console.log('Setting staking state...');
    setStaking(true);
    setStakeStep('preparing');
    setStakeProgress(t.staking.preparingOutputs);

    try {
      console.log('Loading node...');
      const node = await loadNode();
      console.log('Node loaded:', node);
      if (!node) {
        console.log('Node not found');
        Alert.alert('Error', 'Node not found');
        setStakeStep('input');
        setStaking(false);
        return;
      }

      console.log('Loading wallet...');
      const wallet = await SecureStorage.loadWallet();
      console.log('Wallet loaded:', wallet ? 'found' : 'not found');
      if (!wallet) {
        Alert.alert('Error', 'Wallet not found');
        setStakeStep('input');
        setStaking(false);
        return;
      }

      // Check if we already have precise outputs
      console.log('Checking for precise outputs...');

      // Use MIN_FEE constant
      const currentFee = MIN_FEE;
      console.log('[handleStake] Using MIN_FEE:', currentFee);

      const hasOutputs = hasPreciseStakingOutputs(
        amountInAtomic,
        walletOutputs,
        currentHeight,
        currentFee  // Pass currentFee
      );
      console.log('Has precise outputs:', hasOutputs);

      let pendingStake: PendingStake;

      if (hasOutputs) {
        console.log('Skipping preparation, creating staking tx directly...');
        // Skip preparation, go directly to finalization
        setStakeProgress('Outputs ready! Creating staking transaction...');

        // Find the transaction hash that contains the precise outputs
        const preparationTxHash = findPreciseStakingOutputsTxHash(
          amountInAtomic,
          walletOutputs,
          currentHeight,
          currentFee  // Pass currentFee
        );

        if (!preparationTxHash) {
          throw new Error('Failed to find preparation transaction hash');
        }

        console.log('[handleStake] Found preparation tx hash:', preparationTxHash.substring(0, 16) + '...');

        pendingStake = createPendingStake(
          amountInAtomic,
          selectedDuration,
          wallet.address,
          PendingStakeState.AWAITING_FINALIZATION
        );
        pendingStake.preparationTxHash = preparationTxHash;

        await savePendingStakes([...pendingStakes, pendingStake]);

        // Create staking transaction immediately
        setStakeProgress('Creating staking transaction...');

        const result = await createStakingTransaction(
          amountInAtomic,
          selectedDuration,
          wallet.address,
          walletOutputs,
          publicKey,
          privateKey,
          currentHeight,
          { ip: node.ip, port: node.port, ssl: node.ssl },
          MATURITY_BLOCKS,  // maturityBlocks
          preparationTxHash  // Use outputs from this transaction
        );

        if (result.success && result.txHash) {
          await updateStake(pendingStake.id, {
            state: PendingStakeState.PENDING,
            stakingTxHash: result.txHash,
          });

          setStakeStep('pending');
          setStakeProgress('Staking transaction sent! Waiting for confirmation...');

          // Close modal after a delay
          setTimeout(() => {
            closeStakeModal();
            fetchData(false);
          }, 2000);
        } else {
          throw new Error(result.error || 'Failed to create staking transaction');
        }
      } else {
        console.log('Preparing outputs first...');
        // Need to prepare outputs first
        setStakeProgress('Creating preparation transaction...');

        console.log('Calling prepareStakingOutputs with:', {
          amountInAtomic,
          address: wallet.address,
          walletOutputsCount: walletOutputs.length,
          currentHeight,
          hasPublicKey: !!publicKey,
          hasPrivateKey: !!privateKey,
        });
        const prepResult = await prepareStakingOutputs(
          amountInAtomic,
          wallet.address,
          walletOutputs,
          publicKey,
          privateKey,
          currentHeight,
          { ip: node.ip, port: node.port, ssl: node.ssl }
        );
        console.log('prepareStakingOutputs result:', prepResult);

        if (prepResult.success && prepResult.txHash) {
          console.log('[handleStake] Preparation tx successful, hash:', prepResult.txHash);
          console.log('[handleStake] Hash length:', prepResult.txHash.length, 'expected: 64 chars');

          pendingStake = createPendingStake(
            amountInAtomic,
            selectedDuration,
            wallet.address,
            PendingStakeState.PREPARING
          );
          pendingStake.preparationTxHash = prepResult.txHash;

          console.log('[handleStake] Saving pending stake with preparationTxHash:', pendingStake.preparationTxHash);
          await savePendingStakes([...pendingStakes, pendingStake]);
          console.log('[handleStake] Pending stake saved');

          setStakeStep('awaiting_finalization');
          setStakeProgress('Preparation sent! Waiting for outputs to become available...');

          // Close modal and show in list
          setTimeout(() => {
            closeStakeModal();
          }, 2000);
        } else {
          throw new Error(prepResult.error || 'Failed to prepare staking outputs');
        }
      }
    } catch (err) {
      console.error('Error in handleStake:', err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create stake');
      setStakeStep('input');
    } finally {
      setStaking(false);
    }
  };

  // Finalize a pending stake (when outputs are ready)
  const handleFinalizeStake = async (stake: PendingStake) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const node = await loadNode();
      if (!node) {
        Alert.alert('Error', 'Node not found');
        return;
      }

      setShowStakeModal(true);
      setStakeStep('pending');
      setStaking(true);
      setStakeProgress('Creating staking transaction...');

      // If preparationTxHash is not set, try to find it
      let preparationTxHash = stake.preparationTxHash;
      if (!preparationTxHash) {
        console.log('[handleFinalizeStake] No preparationTxHash, finding it...');
        preparationTxHash = findPreciseStakingOutputsTxHash(
          stake.amount,
          walletOutputs,
          currentHeight,
          MIN_FEE
        );
        if (preparationTxHash) {
          console.log('[handleFinalizeStake] Found preparation tx hash:', preparationTxHash.substring(0, 16) + '...');
          // Update the pending stake with the found hash
          await updateStake(stake.id, { preparationTxHash });
        } else {
          console.log('[handleFinalizeStake] Could not find preparation tx hash, using all outputs');
        }
      }

      console.log('[handleFinalizeStake] About to call createStakingTransaction with:');
      console.log('[handleFinalizeStake] preparationTxHash:', preparationTxHash);
      console.log('[handleFinalizeStake] preparationTxHash type:', typeof preparationTxHash);
      console.log('[handleFinalizeStake] preparationTxHash === undefined:', preparationTxHash === undefined);
      console.log('[handleFinalizeStake] preparationTxHash === null:', preparationTxHash === null);
      console.log('[handleFinalizeStake] preparationTxHash length:', preparationTxHash?.length);
      console.log('[handleFinalizeStake] preparationTxHash === "":', preparationTxHash === '');

      const result = await createStakingTransaction(
        stake.amount,
        stake.lockDurationDays,
        stake.address,
        walletOutputs,
        publicKey,
        privateKey,
        currentHeight,
        { ip: node.ip, port: node.port, ssl: node.ssl },
        MATURITY_BLOCKS,  // maturityBlocks
        preparationTxHash  // Use outputs from preparation transaction (or undefined to use any)
      );

      if (result.success && result.txHash) {
        await updateStake(stake.id, {
          state: PendingStakeState.PENDING,
          stakingTxHash: result.txHash,
        });

        setStakeProgress('Staking transaction sent!');

        setTimeout(() => {
          closeStakeModal();
          fetchData(false);
        }, 2000);
      } else {
        throw new Error(result.error || 'Failed to create staking transaction');
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to finalize stake');
    } finally {
      setStaking(false);
    }
  };

  const openStakeModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowStakeModal(true);
    setStakeStep('input');
    setStakeProgress('');
  };

  const closeStakeModal = () => {
    setShowStakeModal(false);
    setStakeAmount('');
    setSelectedDuration(null);
    setStakeStep('input');
    setStakeProgress('');
    setStaking(false);
  };

  const getStakeOptions = (): StakeOption[] => {
    return config.staking.lockPeriods.map((days, index) => ({
      days,
      rate: config.staking.annualRewardRates[index],
    }));
  };

  const renderLoadingState = () => (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>{t.staking.loadingStakingData}</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.centerContainer}>
      <Ionicons name="trophy-outline" size={64} color={colors.textTertiary} />
      <Text style={styles.emptyTitle}>{t.staking.noActiveStakes}</Text>
      <Text style={styles.emptyMessage}>{t.staking.startStaking}</Text>
    </View>
  );

  // Render pending stake card
  const renderPendingStakeCard = (stake: PendingStake) => {
    const state = stake.state || PendingStakeState.PREPARING;
    const isPreparing = state === PendingStakeState.PREPARING;
    const isAwaiting = state === PendingStakeState.AWAITING_FINALIZATION;
    const isPending = state === PendingStakeState.PENDING;

    const statusColor = isPreparing ? colors.warning : (isAwaiting ? colors.info : colors.primary);
    const statusText = isPreparing ? 'Preparing' : (isAwaiting ? 'Ready to Finalize' : 'Pending');
    const statusDescription = isPreparing ? 'Waiting for outputs to become available...' : (isAwaiting ? 'Outputs ready! Tap to finalize your stake.' : 'Waiting for network confirmation...');

    return (
      <View key={stake.id} style={styles.pendingStakeCard}>
        <View style={styles.pendingStakeHeader}>
          <View style={styles.pendingStakeStatusContainer}>
            <View style={[styles.pendingStatusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.pendingStatusText, { color: statusColor }]}>
              {statusText}
            </Text>
          </View>
          <Text style={styles.pendingStakeAmount}>
            {formatAmount(stake.amount)} {config.ticker}
          </Text>
        </View>

        <Text style={styles.pendingStakeDescription}>
          {statusDescription}
        </Text>

        <View style={styles.pendingStakeDetails}>
          <View style={styles.pendingStakeDetailRow}>
            <Text style={styles.pendingStakeDetailLabel}>Duration</Text>
            <Text style={styles.pendingStakeDetailValue}>{stake.lockDurationDays} days</Text>
          </View>
          {isPending && stake.stakingTxHash ? (
            <View style={styles.pendingStakeDetailRow}>
              <Text style={styles.pendingStakeDetailLabel}>TX Hash</Text>
              <Text style={styles.pendingStakeDetailHash} numberOfLines={1}>
                {stake.stakingTxHash.slice(0, 16)}...
              </Text>
            </View>
          ) : null}
        </View>

        {isAwaiting ? (
          <TouchableOpacity
            style={styles.finalizeButton}
            onPress={() => handleFinalizeStake(stake)}
            activeOpacity={0.7}
          >
            <Ionicons name="diamond" size={16} color="#FFFFFF" />
            <Text style={styles.finalizeButtonText}>Finalize Stake</Text>
          </TouchableOpacity>
        ) : null}

        {(isPreparing || isPending) ? (
          <View style={styles.pendingActivityIndicator}>
            <ActivityIndicator size="small" color={statusColor} />
          </View>
        ) : null}
      </View>
    );
  };

  const renderStakeCard = (stake: StakeEntry | FinishedStakeEntry, isFinished: boolean) => {
    const isExpanded = expandedStakes.has(stake.staking_tx_hash);

    return (
      <View key={stake.staking_tx_hash} style={styles.stakeCard}>
        {/* Header - Status, Amount, Duration cramped together */}
        <TouchableOpacity
          style={styles.stakeCardHeader}
          onPress={() => toggleStakeExpansion(stake.staking_tx_hash)}
          activeOpacity={0.7}
        >
          <View style={styles.stakeStatusContainer}>
            <View style={[
              styles.statusDot,
              { backgroundColor: isFinished ? colors.warning : colors.success }
            ]} />
            <Text style={styles.stakeStatusText}>
              {isFinished ? t.staking.done : t.staking.active}
            </Text>
          </View>
          <Text style={styles.stakeAmount}>
            {formatAmount(stake.amount)} {config.ticker}
          </Text>
          <Text style={styles.stakeDurationBadge}>
            {stake.lock_duration_days}d
          </Text>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={colors.textSecondary}
            style={styles.expandIcon}
          />
        </TouchableOpacity>

        {/* Progress Bar - Always visible */}
        <View style={styles.progressSection}>
          <View style={styles.progressBarContainer}>
            <View style={[
              styles.progressBarFill,
              { width: `${stake.progress_percentage}%` },
              isFinished ? { backgroundColor: colors.warning } : { backgroundColor: colors.success }
            ]} />
          </View>
        </View>

        {/* Expanded Details */}
        {isExpanded && (
          <>
            {/* Progress Details - Compact */}
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>
                  {stake.blocks_staked.toLocaleString()} / {(stake.blocks_staked + stake.blocks_remaining).toLocaleString()} blocks
                </Text>
                <Text style={styles.progressPercentage}>
                  {formatPercentage(stake.progress_percentage)}
                </Text>
              </View>
              {stake.blocks_remaining > 0 && (
                <Text style={styles.progressSubtext}>
                  {stake.blocks_remaining.toLocaleString()} {t.staking.blocksLeft}
                </Text>
              )}
            </View>

            {/* Rewards - 2x2 Grid for compactness */}
            <View style={styles.rewardsGrid}>
              {/* Row 1 */}
              <View style={styles.rewardRow}>
                <View style={styles.rewardCell}>
                  <Text style={styles.rewardCellLabel}>{t.staking.rewards}</Text>
                  <Text style={[styles.rewardCellValue, { color: colors.success }]}>
                    +{formatAmount(stake.accumulated_reward)}
                  </Text>
                </View>
                <View style={styles.rewardCell}>
                  <Text style={styles.rewardCellLabel}>{t.staking.daily}</Text>
                  <Text style={[styles.rewardCellValue, { color: colors.success }]}>
                    +{formatAmount((stake as StakeEntry).est_daily_reward || 0)}
                  </Text>
                </View>
              </View>
              {/* Row 2 */}
              <View style={styles.rewardRow}>
                <View style={styles.rewardCell}>
                  <Text style={styles.rewardCellLabel}>Daily ROI</Text>
                  <Text style={[styles.rewardCellValue, { color: colors.primary }]}>
                    {formatPercentage((stake as StakeEntry).roi_daily || 0, 4)}
                  </Text>
                </View>
                <View style={styles.rewardCell}>
                  <Text style={styles.rewardCellLabel}>{t.staking.totalAtMaturity}</Text>
                  <Text style={[styles.rewardCellValue, { color: colors.success }]}>
                    {formatAmount((stake as StakeEntry).total_payout_at_maturity || 0)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Unlock Info - Single compact row */}
            <View style={styles.unlockInfo}>
              <Ionicons name="lock-open-outline" size={13} color={colors.textTertiary} />
              <Text style={styles.unlockText}>
                {stake.is_active
                  ? `Unlocks at block ${stake.unlock_time.toLocaleString()}`
                  : isFinished ? 'Unlocked' : 'Unlocking...'
                }
              </Text>
            </View>
          </>
        )}
      </View>
    );
  };

  if (loading) {
    return renderLoadingState();
  }

  // Show page with error banner instead of blocking on error
  const hasAnyStakes = allStakesData && (allStakesData.stakes.length > 0 || allStakesData.finished_stakes.length > 0);
  const hasPendingStakes = pendingStakes.length > 0;

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
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>{t.staking.title}</Text>
          <View style={styles.subtitleRow}>
            <Text style={styles.headerSubtitle}>{t.staking.earnRewards}</Text>
            <TouchableOpacity
              style={styles.infoIconButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowInfoModal(true);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Error Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
            <Text style={styles.errorBannerText}>{error}</Text>
            <TouchableOpacity
              style={styles.errorBannerRetry}
              onPress={() => fetchData()}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh-outline" size={16} color={colors.background} />
            </TouchableOpacity>
          </View>
        )}

        {/* Your Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>{t.staking.availableBalance}</Text>
              <View style={styles.balanceAmountRow}>
                <Text style={styles.balanceAmount}>
                  {formatAmount(walletBalance).split('.')[0]}.
                </Text>
                <Text style={styles.balanceDecimal}>
                  {formatAmount(walletBalance).split('.')[1]}{' '}
                </Text>
                <Text style={styles.balanceTicker}>{config.ticker}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.stakeButton}
              onPress={openStakeModal}
              activeOpacity={0.7}
            >
              <Ionicons name="diamond" size={16} color="#FFFFFF" />
              <Text style={styles.stakeButtonText}>{t.staking.newStake}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.infoText}>{t.staking.stakingInfoText}</Text>
        </View>

        {/* Pending Stakes Section */}
        {hasPendingStakes && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t.staking.pendingStakes} ({pendingStakes.length})</Text>
            </View>
            {pendingStakes.map(renderPendingStakeCard)}
          </>
        )}

        {/* Stakes Header */}
        {hasAnyStakes && allStakesData && (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {t.staking.networkStakes} ({allStakesData.pagination?.total_stakes || 0})
            </Text>
          </View>
        )}

        {/* Active Stakes */}
        {allStakesData && allStakesData.stakes.map((stake) => renderStakeCard(stake, false))}

        {/* Finished Stakes */}
        {allStakesData && allStakesData.finished_stakes.length > 0 && (
          <View style={styles.finishedSectionHeader}>
            <Text style={styles.finishedSectionTitle}>Completed Stakes</Text>
          </View>
        )}
        {allStakesData && allStakesData.finished_stakes.map((stake) => renderStakeCard(stake, true))}

        {/* Empty State */}
        {!hasAnyStakes && !hasPendingStakes && renderEmptyState()}
      </ScrollView>

      {/* Stake Modal */}
      <Modal
        visible={showStakeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeStakeModal}
      >
        <View style={styles.modalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={100}
            style={styles.modalKeyboardView}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {stakeStep === 'input' ? t.staking.createNewStake : t.staking.processingStake}
                  </Text>
                  {stakeStep === 'input' && (
                    <TouchableOpacity onPress={closeStakeModal} style={styles.closeButton}>
                      <Ionicons name="close" size={28} color={colors.text} />
                    </TouchableOpacity>
                  )}
                </View>

                {stakeStep === 'input' ? (
                  <>
                    {/* Amount Input */}
                    <Text style={styles.inputLabel}>Amount ({config.ticker})</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="cash-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="0.00000000"
                        placeholderTextColor={colors.textTertiary}
                        value={stakeAmount}
                        onChangeText={setStakeAmount}
                        keyboardType="decimal-pad"
                      />
                      <TouchableOpacity
                        style={styles.maxButton}
                        onPress={() => {
                          const maxAmount = walletBalance - STAKING_FEE;
                          setStakeAmount((maxAmount / Math.pow(10, config.decimals)).toFixed(config.decimals));
                        }}
                      >
                        <Text style={styles.maxButtonText}>{t.staking.max}</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Balance Info with Fee */}
                    <View style={styles.balanceInfoContainer}>
                      <View style={styles.balanceInfoRow}>
                        <Ionicons name="wallet-outline" size={14} color={colors.textTertiary} />
                        <Text style={styles.modalBalanceInfoText}>
                          Available: {formatAmount(walletBalance)} {config.ticker}
                        </Text>
                      </View>
                      <View style={styles.balanceInfoRow}>
                        <Ionicons name="receipt-outline" size={14} color={colors.warning} />
                        <Text style={styles.modalBalanceInfoText}>
                          Fee: -{formatAmount(STAKING_FEE)} {config.ticker}
                        </Text>
                      </View>
                      <View style={styles.balanceInfoRow}>
                        <Ionicons name="diamond-outline" size={14} color={colors.primary} />
                        <Text style={styles.modalBalanceInfoTotal}>
                          Max stake: {formatAmount(walletBalance - STAKING_FEE)} {config.ticker}
                        </Text>
                      </View>
                    </View>

                    {/* Duration Selection */}
                    <Text style={styles.inputLabel}>Lock Duration</Text>
                    <View style={styles.durationOptions}>
                      {getStakeOptions().map((option) => (
                        <TouchableOpacity
                          key={option.days}
                          style={[
                            styles.durationOption,
                            selectedDuration === option.days && styles.durationOptionSelected,
                          ]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setSelectedDuration(option.days);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.durationDays,
                            selectedDuration === option.days && styles.durationDaysSelected,
                          ]}>
                            {option.days} {t.staking.days}
                          </Text>
                          <Text style={[
                            styles.durationRate,
                            selectedDuration === option.days && styles.durationRateSelected,
                          ]}>
                            {option.rate}% {t.staking.apy}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Selected Duration Info */}
                    {selectedDuration !== null && (
                      <View style={styles.durationInfo}>
                        <Ionicons name="information-circle-outline" size={16} color={colors.info} />
                        <Text style={styles.durationInfoText}>
                          Your coins will be locked for {selectedDuration} days at {
                            getStakeOptions().find(o => o.days === selectedDuration)?.rate
                          }% annual reward rate.
                        </Text>
                      </View>
                    )}

                    {/* Buttons */}
                    <View style={styles.modalButtons}>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.modalButtonCancel]}
                        onPress={closeStakeModal}
                      >
                        <Text style={styles.modalButtonTextCancel}>{t.common.cancel}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.modalButtonSave]}
                        onPress={handleStake}
                        disabled={staking}
                        activeOpacity={0.7}
                      >
                        {staking ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <Text style={styles.modalButtonTextSave}>{t.staking.stake}</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    {/* Processing State */}
                    <View style={styles.processingContainer}>
                      <ActivityIndicator size="large" color={colors.primary} />
                      <Text style={styles.processingText}>{stakeProgress}</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Staking Info Modal */}
      <Modal
        visible={showInfoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.infoModalOverlay}>
          <View style={styles.infoModalContent}>
            <View style={styles.infoModalHeader}>
              <View style={styles.infoModalIconContainer}>
                <Ionicons name="diamond" size={28} color={colors.primary} />
              </View>
              <Text style={styles.infoModalTitle}>{t.staking.howStakingWorks}</Text>
              <TouchableOpacity
                style={styles.infoModalCloseButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowInfoModal(false);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.infoModalScrollView}
              contentContainerStyle={styles.infoModalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* What is Staking */}
              <View style={styles.infoSection}>
                <View style={styles.infoSectionHeader}>
                  <Ionicons name="lock-closed" size={20} color={colors.primary} />
                  <Text style={styles.infoSectionTitle}>{t.staking.whatIsStaking}</Text>
                </View>
                <Text style={styles.infoSectionText}>
                  {t.staking.whatIsStakingDesc}
                </Text>
              </View>

              {/* How Rewards Work */}
              <View style={styles.infoSection}>
                <View style={styles.infoSectionHeader}>
                  <Ionicons name="trending-up" size={20} color={colors.success} />
                  <Text style={styles.infoSectionTitle}>{t.staking.howRewardsWork}</Text>
                </View>
                <Text style={styles.infoSectionText}>
                  {t.staking.rewardsBased}
                </Text>
                <View style={styles.infoList}>
                  <View style={styles.infoListItem}>
                    <View style={styles.infoBullet} />
                    <Text style={styles.infoListItemText}>{t.staking.stakeAmount}</Text>
                  </View>
                  <View style={styles.infoListItem}>
                    <View style={styles.infoBullet} />
                    <Text style={styles.infoListItemText}>{t.staking.lockDurationLonger}</Text>
                  </View>
                  <View style={styles.infoListItem}>
                    <View style={styles.infoBullet} />
                    <Text style={styles.infoListItemText}>{t.staking.annualRate}</Text>
                  </View>
                </View>
                <Text style={styles.infoSectionText}>
                  {t.staking.rewardsAccumulate}
                </Text>
              </View>

              {/* Lock Periods */}
              <View style={styles.infoSection}>
                <View style={styles.infoSectionHeader}>
                  <Ionicons name="time" size={20} color={colors.warning} />
                  <Text style={styles.infoSectionTitle}>{t.staking.lockPeriods}</Text>
                </View>
                <Text style={styles.infoSectionText}>
                  {t.staking.lockPeriodsDesc}
                </Text>
                <View style={styles.periodsContainer}>
                  {getStakeOptions().map((option) => (
                    <View key={option.days} style={styles.periodCard}>
                      <Text style={styles.periodDays}>{option.days} Days</Text>
                      <Text style={styles.periodRate}>{option.rate}% APY</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Important Notes */}
              <View style={styles.infoSection}>
                <View style={styles.infoSectionHeader}>
                  <Ionicons name="alert-circle" size={20} color={colors.info} />
                  <Text style={styles.infoSectionTitle}>{t.staking.importantNotes}</Text>
                </View>
                <View style={styles.infoList}>
                  <View style={styles.infoListItem}>
                    <Ionicons name="close-circle" size={16} color={colors.error} />
                    <Text style={styles.infoListItemText}>{t.staking.noEarlyUnstake}</Text>
                  </View>
                  <View style={styles.infoListItem}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={styles.infoListItemText}>{t.staking.rewardsCompound}</Text>
                  </View>
                  <View style={styles.infoListItem}>
                    <Ionicons name="information-circle" size={16} color={colors.info} />
                    <Text style={styles.infoListItemText}>{t.staking.stakingFee}</Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.infoModalButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowInfoModal(false);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.infoModalButtonText}>{t.staking.gotIt}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.md,
    paddingBottom: spacing.lg,
  },
  backButton: {
    marginRight: spacing.md,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoIconButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 140,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(242, 85, 85, 0.3)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginHorizontal: 0,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: colors.error,
  },
  errorBannerRetry: {
    padding: spacing.sm,
    backgroundColor: colors.error,
    borderRadius: borderRadius.sm,
  },
  balanceCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
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
    letterSpacing: -0.5,
  },
  balanceDecimal: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  balanceTicker: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  balanceAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  balanceAmountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  stakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  stakeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionHeader: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textTertiary,
    letterSpacing: 0.5,
  },
  pendingStakeCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  pendingStakeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  pendingStakeStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pendingStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pendingStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pendingStakeAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  pendingStakeDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  pendingStakeDetails: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  pendingStakeDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  pendingStakeDetailLabel: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  pendingStakeDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  pendingStakeDetailHash: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  finalizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  finalizeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pendingActivityIndicator: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  stakeCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    paddingBottom: spacing.md,
    marginBottom: spacing.sm,
    overflow: 'visible',
  },
  stakeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  stakeStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stakeStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  stakeAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  stakeDurationBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  expandIcon: {},
  progressSection: {
    marginBottom: spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  progressLabel: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: colors.background,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressSubtext: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  rewardsGrid: {
    marginBottom: spacing.md,
  },
  rewardRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  rewardCell: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  rewardCellLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  rewardCellValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  unlockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  unlockText: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  finishedSectionHeader: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  finishedSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textTertiary,
    letterSpacing: 0.5,
  },
  infoCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: 'rgba(129, 140, 248, 0.1)',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.3)',
    marginBottom: spacing.xl,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  modalContainer: {
    flex: 1,
  },
  modalKeyboardView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: spacing.sm,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
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
    marginBottom: spacing.sm,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  maxButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(255, 140, 251, 0.15)',
    borderRadius: borderRadius.sm,
  },
  maxButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  balanceInfoContainer: {
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  balanceInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  modalBalanceInfoText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  modalBalanceInfoTotal: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  durationOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  durationOption: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  durationOptionSelected: {
    backgroundColor: 'rgba(255, 140, 251, 0.15)',
    borderColor: colors.primary,
  },
  durationDays: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  durationDaysSelected: {
    color: colors.primary,
  },
  durationRate: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  durationRateSelected: {
    color: colors.primary,
  },
  durationInfo: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: 'rgba(129, 140, 248, 0.1)',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  durationInfoText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  modalButtonSave: {
    backgroundColor: colors.primary,
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalButtonTextSave: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  processingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  processingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Staking Info Modal Styles
  infoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  infoModalContent: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.xl,
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
  },
  infoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  infoModalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 140, 251, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  infoModalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  infoModalCloseButton: {
    padding: spacing.sm,
  },
  infoModalScrollView: {
    maxHeight: 400,
  },
  infoModalScrollContent: {
    padding: spacing.lg,
  },
  infoSection: {
    marginBottom: spacing.lg,
  },
  infoSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  infoSectionText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  infoList: {
    gap: spacing.sm,
    marginLeft: spacing.md,
    marginBottom: spacing.sm,
  },
  infoListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  infoBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  infoListItemText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  periodsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  periodCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
  },
  periodDays: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  periodRate: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  infoModalButton: {
    backgroundColor: colors.primary,
    margin: spacing.lg,
    marginTop: 0,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  infoModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default StakingScreen;