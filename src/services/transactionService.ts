/**
 * Transaction Service
 *
 * Handles transaction creation and sending for the wallet
 */

import { Wallet, TransactionDestination, derivePublicKeyFromMnemonic, derivePublicKeyFromPrivateKey } from '../pastella-utils';
import { Node } from '../types/nodes';
import { SecureStorage } from './secureStorage';

interface SendRequest {
  toAddress: string;
  amount: number;
  fee?: number;
}

interface SendResult {
  hash: string;
  fee: number;
  inputsUsed: number;
  change: number;
}

class TransactionService {
  private wallet: Wallet | null = null;

  /**
   * Initialize wallet with node
   */
  async initWallet(node: Node): Promise<void> {
    const storedWallet = await SecureStorage.loadWallet();
    if (!storedWallet) {
      throw new Error('Wallet not found');
    }

    // Derive public key from mnemonic or private key
    const publicKey = storedWallet.mnemonic
      ? derivePublicKeyFromMnemonic(storedWallet.mnemonic)
      : derivePublicKeyFromPrivateKey(storedWallet.privateKey!);

    this.wallet = new Wallet({
      ip: node.ip,
      port: node.port,
      ssl: node.ssl,
      publicKey,
    });

    // Sync wallet
    await this.wallet.performSync();
  }

  /**
   * Create and send a transaction
   */
  async sendTransaction(request: SendRequest): Promise<SendResult> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized. Call initWallet first.');
    }

    const storedWallet = await SecureStorage.loadWallet();
    if (!storedWallet) {
      throw new Error('Wallet not found');
    }

    const destinations: TransactionDestination[] = [
      {
        address: request.toAddress,
        amount: request.amount,
      },
    ];

    // Use mnemonic or private key for signing
    const signingKey = storedWallet.mnemonic || storedWallet.privateKey!;

    const result = await this.wallet.sendTransaction({
      mnemonic: signingKey,
      destinations,
      fee: request.fee,
    });

    return {
      hash: result.hash,
      fee: result.fee,
      inputsUsed: result.inputsUsed,
      change: result.change,
    };
  }

  /**
   * Estimate fee for a transaction
   */
  async estimateFee(toAddress: string, amount: number): Promise<number> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized. Call initWallet first.');
    }

    const availableOutputs = this.wallet.getAvailableOutputs();
    if (availableOutputs.length === 0) {
      throw new Error('No spendable outputs available');
    }

    const syncState = this.wallet.getSyncState();
    if (!syncState) {
      throw new Error('Wallet not synced');
    }

    // Use transaction picker to estimate inputs needed
    const { TransactionPicker } = require('../pastella-utils');
    const picker = new TransactionPicker(availableOutputs, syncState.currentHeight, 10);
    const result = picker.pickInputs(amount);

    if (!result) {
      throw new Error('Insufficient funds');
    }

    return result.fee;
  }

  /**
   * Get maximum spendable amount
   */
  getMaxSpendable(): number {
    if (!this.wallet) {
      return 0;
    }

    const availableBalance = this.wallet.getAvailableBalance();
    const fee = 1000; // Default fee

    if (availableBalance <= fee) {
      return 0;
    }

    return availableBalance - fee;
  }

  /**
   * Get available balance
   */
  getAvailableBalance(): number {
    if (!this.wallet) {
      return 0;
    }
    return this.wallet.getAvailableBalance();
  }

  /**
   * Helper to get selected node
   */
  private async getSelectedNode(): Promise<Node | null> {
    const nodeService = require('./nodeService').default;
    return await nodeService.getSelectedNode();
  }

  /**
   * Resync wallet from a specific height
   */
  async resyncFromHeight(height: number): Promise<void> {
    if (!this.wallet) {
      // Wallet not initialized, initialize it first
      const node = await this.getSelectedNode();
      if (!node) {
        throw new Error('No node selected');
      }

      const storedWallet = await SecureStorage.loadWallet();
      if (!storedWallet) {
        throw new Error('Wallet not found');
      }

      // Derive public key from mnemonic or private key
      const publicKey = storedWallet.mnemonic
        ? derivePublicKeyFromMnemonic(storedWallet.mnemonic)
        : derivePublicKeyFromPrivateKey(storedWallet.privateKey!);

      this.wallet = new Wallet({
        ip: node.ip,
        port: node.port,
        ssl: node.ssl,
        publicKey,
        startHeight: height,
      });
    }

    // Use the wallet's resyncFromHeight method
    await this.wallet.resyncFromHeight(height);
  }
}

export default new TransactionService();
