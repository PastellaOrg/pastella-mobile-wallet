import AsyncStorage from '@react-native-async-storage/async-storage';
import { WalletOutput, WalletSpend, WalletSyncState, AddressInfo } from '../pastella-utils';

const WALLET_STORAGE_KEY = '@pastella_wallet_data';
const WALLET_STATE_KEY = '@pastella_wallet_state';

interface WalletData {
  mnemonic?: string;
  privateKey?: string;
  pin: string;
  address: string;
}

export interface WalletStateData {
  syncState: WalletSyncState;
  outputs: WalletOutput[];
  spends: WalletSpend[];
  transactions: Array<{
    hash: string;
    type: 'incoming' | 'outgoing' | 'staking' | 'coinbase';
    amount: number;
    timestamp: number;
    status: 'confirmed' | 'pending';
    blockHeight: number;
    from?: AddressInfo[];
    to?: AddressInfo[];
  }>;
  lastSaved: number;
}

export class SecureStorage {
  /**
   * Save wallet data securely
   */
  static async saveWallet(
    mnemonicOrPrivateKey: string,
    pin: string,
    address: string,
    isPrivateKey: boolean = false
  ): Promise<void> {
    try {
      const walletData: WalletData = {
        pin,
        address,
        ...(isPrivateKey ? { privateKey: mnemonicOrPrivateKey } : { mnemonic: mnemonicOrPrivateKey }),
      };
      await AsyncStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(walletData));
    } catch (error) {
      console.error('Failed to save wallet:', error);
      throw new Error('Failed to save wallet');
    }
  }

  /**
   * Load wallet data from storage
   */
  static async loadWallet(): Promise<WalletData | null> {
    try {
      const data = await AsyncStorage.getItem(WALLET_STORAGE_KEY);
      if (data) {
        return JSON.parse(data) as WalletData;
      }
      return null;
    } catch (error) {
      console.error('Failed to load wallet:', error);
      return null;
    }
  }

  /**
   * Check if wallet exists
   */
  static async hasWallet(): Promise<boolean> {
    try {
      const wallet = await this.loadWallet();
      return wallet !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear wallet data (for logout/wipe)
   */
  static async clearWallet(): Promise<void> {
    try {
      await AsyncStorage.removeItem(WALLET_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear wallet:', error);
      throw new Error('Failed to clear wallet');
    }
  }

  /**
   * Verify PIN
   */
  static async verifyPin(pin: string): Promise<boolean> {
    try {
      const wallet = await this.loadWallet();
      if (!wallet) {
        return false;
      }
      return wallet.pin === pin;
    } catch (error) {
      console.error('Failed to verify PIN:', error);
      return false;
    }
  }

  /**
   * Update PIN
   */
  static async updatePin(newPin: string): Promise<void> {
    try {
      const wallet = await this.loadWallet();
      if (!wallet) {
        throw new Error('No wallet found');
      }
      const walletData: WalletData = {
        pin: newPin,
        address: wallet.address,
        ...(wallet.mnemonic ? { mnemonic: wallet.mnemonic } : {}),
        ...(wallet.privateKey ? { privateKey: wallet.privateKey } : {}),
      };
      await AsyncStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(walletData));
    } catch (error) {
      console.error('Failed to update PIN:', error);
      throw new Error('Failed to update PIN');
    }
  }

  /**
   * Get wallet address
   */
  static async getWalletAddress(): Promise<string | null> {
    try {
      const wallet = await this.loadWallet();
      return wallet?.address || null;
    } catch (error) {
      console.error('Failed to get wallet address:', error);
      return null;
    }
  }

  /**
   * Save wallet state (balance, outputs, transactions) to avoid resyncing
   */
  static async saveWalletState(
    syncState: WalletSyncState,
    outputs: WalletOutput[],
    spends: WalletSpend[],
    transactions: any[]
  ): Promise<void> {
    try {
      const stateData: WalletStateData = {
        syncState,
        outputs,
        spends,
        transactions,
        lastSaved: Date.now(),
      };
      await AsyncStorage.setItem(WALLET_STATE_KEY, JSON.stringify(stateData));
    } catch (error) {
      console.error('Failed to save wallet state:', error);
      // Don't throw - this is a cache, failure shouldn't block the app
    }
  }

  /**
   * Load wallet state from storage
   */
  static async loadWalletState(): Promise<WalletStateData | null> {
    try {
      const data = await AsyncStorage.getItem(WALLET_STATE_KEY);
      if (data) {
        const state = JSON.parse(data) as WalletStateData;
        return state;
      }
      return null;
    } catch (error) {
      console.error('Failed to load wallet state:', error);
      return null;
    }
  }

  /**
   * Clear wallet state (force resync on next load)
   */
  static async clearWalletState(): Promise<void> {
    try {
      await AsyncStorage.removeItem(WALLET_STATE_KEY);
    } catch (error) {
      console.error('Failed to clear wallet state:', error);
    }
  }
}
