/**
 * Settings Service
 *
 * Manages user preferences and settings
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_STORAGE_KEY = '@pastella_settings';

export interface SettingsData {
  hideBalance: boolean;
}

class SettingsService {
  private settings: SettingsData = {
    hideBalance: false,
  };

  /**
   * Load settings from storage
   */
  async loadSettings(): Promise<SettingsData> {
    try {
      const data = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (data) {
        this.settings = JSON.parse(data);
        return this.settings;
      }
      return this.settings;
    } catch (error) {
      console.error('[SettingsService] Error loading settings:', error);
      return this.settings;
    }
  }

  /**
   * Get hide balance setting
   */
  async getHideBalance(): Promise<boolean> {
    await this.loadSettings();
    return this.settings.hideBalance;
  }

  /**
   * Set hide balance setting
   */
  async setHideBalance(value: boolean): Promise<void> {
    try {
      this.settings.hideBalance = value;
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('[SettingsService] Error saving hide balance:', error);
      throw new Error('Failed to save setting');
    }
  }

  /**
   * Clear all settings
   */
  async clearAll(): Promise<void> {
    this.settings = { hideBalance: false };
    await AsyncStorage.removeItem(SETTINGS_STORAGE_KEY);
  }
}

export default new SettingsService();
