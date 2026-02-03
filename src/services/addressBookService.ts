/**
 * Address Book Service
 *
 * Manages storage and retrieval of saved addresses for the wallet
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const ADDRESS_BOOK_STORAGE_KEY = '@pastella_address_book';

export interface AddressBookEntry {
  id: string;
  name: string;
  address: string;
  description?: string;
  createdAt: number;
}

class AddressBookService {
  private entries: AddressBookEntry[] = [];

  /**
   * Load all address book entries from storage
   */
  async loadEntries(): Promise<AddressBookEntry[]> {
    try {
      const data = await AsyncStorage.getItem(ADDRESS_BOOK_STORAGE_KEY);
      if (data) {
        this.entries = JSON.parse(data);
        return this.entries;
      }
      this.entries = [];
      return [];
    } catch (error) {
      console.error('[AddressBookService] Error loading entries:', error);
      this.entries = [];
      return [];
    }
  }

  /**
   * Get all entries
   */
  async getEntries(): Promise<AddressBookEntry[]> {
    if (this.entries.length === 0) {
      await this.loadEntries();
    }
    return this.entries;
  }

  /**
   * Add a new address book entry
   */
  async addEntry(name: string, address: string, description?: string): Promise<AddressBookEntry> {
    // Validate inputs
    if (!name || name.trim().length === 0) {
      throw new Error('Name is required');
    }

    if (!address || address.trim().length === 0) {
      throw new Error('Address is required');
    }

    const trimmedAddress = address.trim();

    // Validate address format (PAS prefix + 54 characters)
    if (!trimmedAddress.startsWith('PAS') || trimmedAddress.length !== 54) {
      throw new Error('Invalid address format');
    }

    const entry: AddressBookEntry = {
      id: Date.now().toString(),
      name: name.trim(),
      address: trimmedAddress,
      description: description?.trim(),
      createdAt: Date.now(),
    };

    this.entries.push(entry);
    await this.saveEntries();

    return entry;
  }

  /**
   * Update an existing entry
   */
  async updateEntry(id: string, name: string, address: string, description?: string): Promise<AddressBookEntry> {
    // Validate inputs
    if (!name || name.trim().length === 0) {
      throw new Error('Name is required');
    }

    if (!address || address.trim().length === 0) {
      throw new Error('Address is required');
    }

    const trimmedAddress = address.trim();

    // Validate address format
    if (!trimmedAddress.startsWith('PAS') || trimmedAddress.length !== 54) {
      throw new Error('Invalid address format');
    }

    const index = this.entries.findIndex(e => e.id === id);
    if (index === -1) {
      throw new Error('Entry not found');
    }

    this.entries[index] = {
      ...this.entries[index],
      name: name.trim(),
      address: trimmedAddress,
      description: description?.trim(),
    };

    await this.saveEntries();
    return this.entries[index];
  }

  /**
   * Delete an entry
   */
  async deleteEntry(id: string): Promise<void> {
    this.entries = this.entries.filter(e => e.id !== id);
    await this.saveEntries();
  }

  /**
   * Save entries to storage
   */
  private async saveEntries(): Promise<void> {
    try {
      await AsyncStorage.setItem(ADDRESS_BOOK_STORAGE_KEY, JSON.stringify(this.entries));
    } catch (error) {
      console.error('[AddressBookService] Error saving entries:', error);
      throw new Error('Failed to save address book entry');
    }
  }

  /**
   * Clear all entries (for testing/reset)
   */
  async clearAll(): Promise<void> {
    this.entries = [];
    await AsyncStorage.removeItem(ADDRESS_BOOK_STORAGE_KEY);
  }
}

export default new AddressBookService();
