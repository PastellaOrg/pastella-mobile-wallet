export interface Wallet {
  address: string;
  publicKey: string;
  privateKey?: string;
  mnemonic?: string[];
  balance: number;
  pendingBalance: number;
}

export interface Transaction {
  hash: string;
  type: 'incoming' | 'outgoing' | 'staking' | 'coinbase';
  amount: number;
  timestamp: number;
  confirmations: number;
  fromAddress?: string;
  toAddress?: string;
  fee: number;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface WalletState {
  wallet: Wallet | null;
  isInitialized: boolean;
  isLocked: boolean;
  pin: string;
  syncHeight: number;
  lastSync: number;
}
