import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
  Platform,
  Modal,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../theme/colors';
import { FadeIn } from '../../components/shared';
import { SecureStorage } from '../../services/secureStorage';
import settingsService from '../../services/settingsService';
import nodeService from '../../services/nodeService';
import { ConfirmModal } from '../../components/shared';
import { Node } from '../../types/nodes';
import * as Haptics from 'expo-haptics';
import { useTranslation, AVAILABLE_LANGUAGES } from '../../i18n';

type SettingsNavigationProp = StackNavigationProp<any, 'Settings'>;

interface Props {
  navigation: SettingsNavigationProp;
}

interface SettingItem {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { t, language, setLanguage, availableLanguages } = useTranslation();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // SVG content for flags
  const flagSvgs: Record<string, string> = {
    'us.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <path fill="#bd3d44" d="M0 0h640v480H0"/>
      <path stroke="#fff" stroke-width="37" d="M0 55.3h640M0 129h640M0 203h640M0 277h640M0 351h640M0 425h640"/>
      <path fill="#192f5d" d="M0 0h364.8v258.5H0"/>
    </svg>`,
    'nl.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <path fill="#ae1c28" d="M0 0h640v160H0z"/>
      <path fill="#fff" d="M0 160h640v160H0z"/>
      <path fill="#21468b" d="M0 320h640v160H0z"/>
    </svg>`,
    'de.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <path fill="#000" d="M0 0h640v160H0z"/>
      <path fill="#dd0000" d="M0 160h640v160H0z"/>
      <path fill="#ffce00" d="M0 320h640v160H0z"/>
    </svg>`,
  };
  const [hideBalance, setHideBalance] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [resyncHeight, setResyncHeight] = useState('');

  // Resync modal states
  const [resyncModalVisible, setResyncModalVisible] = useState(false);
  const [pendingResyncHeight, setPendingResyncHeight] = useState<number | null>(null);
  const [isResyncing, setIsResyncing] = useState(false);
  const [resyncError, setResyncError] = useState<string | null>(null);

  // Delete wallet modal states
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Language selection modal state
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  useEffect(() => {
    loadSelectedNode();
    loadSettings();
  }, []);

  // Inject custom CSS for web Switch component
  useEffect(() => {
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.innerHTML = `
        /* Override Switch colors on web - use !important to override inline styles */
        [role="switch"][aria-checked="true"] > div:last-child,
        [role="switch"][aria-checked="true"] > div:last-child > div {
          background-color: #FFFFFF !important;
        }
        [role="switch"] input:checked {
          accent-color: #FFFFFF !important;
        }
      `;
      document.head.appendChild(style);

      // MutationObserver to override inline styles dynamically
      const observer = new MutationObserver(() => {
        document.querySelectorAll('[role="switch"][aria-checked="true"]').forEach(switchEl => {
          const thumb = switchEl.querySelector('div:last-child');
          if (thumb) {
            (thumb as HTMLElement).style.setProperty('background-color', '#FFFFFF', 'important');
          }
        });
      });

      observer.observe(document.body, {
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'aria-checked']
      });

      return () => {
        document.head.removeChild(style);
        observer.disconnect();
      };
    }
  }, []);

  const loadSettings = async () => {
    const hidden = await settingsService.getHideBalance();
    setHideBalance(hidden);
  };

  const loadSelectedNode = async () => {
    const node = await nodeService.getSelectedNode();
    setSelectedNode(node);
  };

  const handleResyncFromZero = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPendingResyncHeight(0);
    setResyncModalVisible(true);
  };

  const handleResyncFromCustomHeight = () => {
    const height = parseInt(resyncHeight, 10);
    if (isNaN(height) || height < 0) {
      setResyncError('Please enter a valid block height (0 or greater).');
      setTimeout(() => setResyncError(null), 3000);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPendingResyncHeight(height);
    setResyncModalVisible(true);
  };

  const handleConfirmResync = async () => {
    if (pendingResyncHeight === null) return;

    setIsResyncing(true);
    try {
      // Clear saved wallet state
      await SecureStorage.clearWalletState();

      setResyncModalVisible(false);
      setPendingResyncHeight(null);

      // Navigate to Home tab with resync param to trigger fresh sync
      navigation.navigate('Home', { resyncFromHeight: pendingResyncHeight });
    } catch (error: any) {
      setResyncError(error.message || 'Failed to resync wallet');
    } finally {
      setIsResyncing(false);
    }
  };

  const handleCancelResync = () => {
    setResyncModalVisible(false);
    setPendingResyncHeight(null);
    setResyncError(null);
  };

  const handleLockWallet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Navigate to Unlock screen - user will need to enter PIN again
    navigation.reset({
      index: 0,
      routes: [{ name: 'Unlock' }],
    });
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await SecureStorage.clearWallet();
      setDeleteModalVisible(false);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' }],
      });
    } catch (error) {
      console.error('Failed to delete wallet:', error);
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalVisible(false);
  };

  const Section = ({ title, items }: { title: string; items: SettingItem[] }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.settingItem, index === items.length - 1 && styles.settingItemLast]}
            onPress={item.onPress}
            disabled={!item.onPress}
          >
            <View style={styles.iconContainer}>
              <Ionicons name={item.icon as any} size={20} color={colors.textSecondary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.settingTitle}>{item.title}</Text>
              {item.subtitle && <Text style={styles.settingSubtitle}>{item.subtitle}</Text>}
            </View>
            {item.rightElement}
            {item.onPress && !item.rightElement && (
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const walletItems: SettingItem[] = [
    {
      icon: 'lock-closed',
      title: t.settings.changePin,
      subtitle: t.settings.changePinDesc,
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('ChangePin');
      },
    },
    {
      icon: 'eye',
      title: t.settings.hideBalance,
      subtitle: t.settings.hideBalanceDesc,
      rightElement: (
        <Switch
          value={hideBalance}
          onValueChange={async (value) => {
            setHideBalance(value);
            await settingsService.setHideBalance(value);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          trackColor={{ false: colors.borderLight, true: `${colors.textSecondary}40` }}
          thumbColor={hideBalance ? colors.text : colors.textMuted}
          ios_backgroundColor={hideBalance ? colors.text : colors.borderLight}
          style={Platform.OS === 'web' ? { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] } : {}}
          {...(Platform.OS === 'web' && {
            // @ts-ignore - web-specific prop
            activeThumbColor: colors.text,
            // @ts-ignore - web-specific prop
            activeTrackColor: 'rgba(255, 255, 255, 0.3)',
          })}
        />
      ),
    },
    {
      icon: 'document-text',
      title: t.settings.backupMnemonic,
      subtitle: t.settings.backupMnemonicDesc,
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('BackupMnemonic');
      },
    },
  ];

  const preferencesItems: SettingItem[] = [
    {
      icon: 'language',
      title: t.settings.language,
      subtitle: availableLanguages.find(l => l.code === language)?.name || 'English',
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setLanguageModalVisible(true);
      },
    },
    {
      icon: 'notifications',
      title: t.settings.notifications,
      subtitle: t.settings.pushNotifications,
      rightElement: (
        <Switch
          value={notificationsEnabled}
          onValueChange={(value) => {
            setNotificationsEnabled(value);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          trackColor={{ false: colors.borderLight, true: `${colors.textSecondary}40` }}
          thumbColor={notificationsEnabled ? colors.text : colors.textMuted}
          ios_backgroundColor={notificationsEnabled ? colors.text : colors.borderLight}
          style={Platform.OS === 'web' ? { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] } : {}}
          {...(Platform.OS === 'web' && {
            // @ts-ignore - web-specific prop
            activeThumbColor: colors.text,
            // @ts-ignore - web-specific prop
            activeTrackColor: 'rgba(255, 255, 255, 0.3)',
          })}
        />
      ),
    },
    {
      icon: 'server',
      title: t.settings.nodes,
      subtitle: selectedNode?.name || t.settings.selectNode,
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('Nodes');
      },
    },
  ];

  const supportItems: SettingItem[] = [
    {
      icon: 'information-circle',
      title: t.settings.about,
      subtitle: t.settings.version,
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('About');
      },
    },
  ];

  return (
    <FadeIn>
      <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
        >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Wallet Section */}
      <Section title={t.settings.wallet} items={walletItems} />

      {/* Preferences Section */}
      <Section title={t.settings.preferences} items={preferencesItems} />

      {/* Information Section */}
      <Section title={t.settings.information} items={supportItems} />

      {/* Advanced Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.settings.advanced}</Text>
        <View style={styles.card}>
          {/* Resync from Height 0 */}
          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleResyncFromZero}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="refresh" size={20} color={colors.textSecondary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.settingTitle}>{t.settings.resyncFromGenesis}</Text>
              <Text style={styles.settingSubtitle}>{t.settings.resyncFromGenesisDesc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Custom Height Input with Button */}
          <View style={[styles.settingItem, styles.settingItemLast]}>
            <View style={styles.iconContainer}>
              <Ionicons name="git-branch" size={20} color={colors.textSecondary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.settingTitle}>{t.settings.resyncFromHeight}</Text>
              <Text style={styles.settingSubtitle}>{t.settings.resyncFromHeightDesc}</Text>
            </View>
            <View style={styles.inputWithButtonContainer}>
              <TextInput
                style={styles.heightInput}
                value={resyncHeight}
                onChangeText={setResyncHeight}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity
                style={[styles.resyncIconButton, resyncHeight === '' && styles.resyncIconButtonDisabled]}
                onPress={handleResyncFromCustomHeight}
                disabled={resyncHeight === ''}
              >
                <Ionicons name="sync" size={18} color={resyncHeight !== '' ? colors.text : colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Danger Zone */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.settings.dangerZone}</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.dangerItem} onPress={handleLockWallet}>
            <View style={styles.iconContainer}>
              <Ionicons name="lock-closed" size={20} color={colors.textSecondary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.settingTitle}>{t.settings.lockWallet}</Text>
              <Text style={styles.settingSubtitle}>{t.settings.lockWalletDesc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dangerItem, styles.settingItemLast]}
            onPress={handleLogout}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="log-out" size={20} color={colors.textSecondary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.settingTitle}>{t.settings.deleteWallet}</Text>
              <Text style={styles.settingSubtitle}>{t.settings.deleteWalletDesc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Resync Confirmation Modal */}
      <ConfirmModal
        visible={resyncModalVisible}
        title={pendingResyncHeight === 0 ? t.settings.resyncFromGenesis : `${t.settings.resyncFromHeight} ${pendingResyncHeight}`}
        message={
          pendingResyncHeight === 0
            ? t.settings.resyncMessageGenesis
            : `${t.settings.resyncMessage.replace('{{height}}', String(pendingResyncHeight))}`
        }
        confirmText={t.settings.resync}
        cancelText={t.common.cancel}
        type="danger"
        onConfirm={handleConfirmResync}
        onCancel={handleCancelResync}
        loading={isResyncing}
      />

      {/* Delete Wallet Confirmation Modal */}
      <ConfirmModal
        visible={deleteModalVisible}
        title={t.settings.deleteWalletTitle}
        message={t.settings.deleteWalletMessage}
        confirmText={t.settings.delete}
        cancelText={t.common.cancel}
        type="danger"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        loading={isDeleting}
      />

      {/* Language Selection Modal */}
      <Modal
        visible={languageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t.settings.language}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setLanguageModalVisible(false);
                }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.languageList}>
              {availableLanguages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageOption,
                    language === lang.code && styles.languageOptionSelected,
                  ]}
                  onPress={async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    await setLanguage(lang.code);
                    setLanguageModalVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.languageFlag}>
                    <SvgXml xml={flagSvgs[lang.flag]} width={32} height={24} />
                  </View>
                  <View style={styles.languageInfo}>
                    <Text style={[
                      styles.languageName,
                      language === lang.code && styles.languageNameSelected,
                    ]}>
                      {lang.name}
                    </Text>
                    <Text style={styles.languageNativeName}>{lang.nativeName}</Text>
                  </View>
                  {language === lang.code && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </FadeIn>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingTop: 60,
    paddingBottom: 80,
    paddingHorizontal: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textTertiary,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  settingItemLast: {
    borderBottomWidth: 0,
  },
  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  footer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  inputWithButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heightInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    width: 60,
    height: 44,
  },
  resyncIconButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  resyncIconButtonDisabled: {
    backgroundColor: colors.background,
    borderColor: colors.borderLight,
    opacity: 0.5,
  },
  // Language selection modal styles
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: spacing.sm,
  },
  languageList: {
    gap: spacing.sm,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.borderLight,
    gap: spacing.md,
  },
  languageOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255, 140, 251, 0.1)',
  },
  languageFlag: {
    width: 32,
    height: 24,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  languageNameSelected: {
    color: colors.primary,
  },
  languageNativeName: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

export default SettingsScreen;
