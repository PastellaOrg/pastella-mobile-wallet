import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Clipboard } from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius } from '../../theme/colors';
import { useTranslations } from '../../i18n';

type ConfirmImportNavigationProp = StackNavigationProp<any, 'ConfirmImport'>;
type ConfirmImportRouteProp = RouteProp<any, 'ConfirmImport'>;

interface Props {
  navigation: ConfirmImportNavigationProp;
  route: ConfirmImportRouteProp;
}

const ConfirmImportScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t, formatString } = useTranslations();
  const { mnemonic, privateKey, address } = route.params;
  const [scanHeight, setScanHeight] = useState('0');
  const [isImporting, setIsImporting] = useState(false);

  const isMnemonicImport = !!mnemonic;

  const handleCopyAddress = async () => {
    if (address) {
      await Clipboard.setStringAsync(address);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Alert.alert(t.confirmImport.copied, formatString(t.confirmImport.copyMessage, { address }));
    }
  };

  const handleConfirmImport = async () => {
    // Validate scan height
    const height = parseInt(scanHeight);
    if (isNaN(height) || height < 0) {
      Alert.alert(t.confirmImport.invalidHeight, t.confirmImport.invalidHeightMsg);
      return;
    }

    setIsImporting(true);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Navigate to SetupPin with all the import data
      setTimeout(() => {
        navigation.navigate('SetupPin', {
          mnemonic: mnemonic || null,
          privateKey: privateKey || null,
          address: address,
          scanHeight: height,
        });
        setIsImporting(false);
      }, 500);
    } catch (error) {
      setIsImporting(false);
      Alert.alert(t.confirmImport.importFailed, t.confirmImport.importFailedMsg);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle" size={64} color={colors.success} />
          </View>
          <Text style={styles.title}>{t.confirmImport.title}</Text>
          <Text style={styles.subtitle}>
            {t.confirmImport.subtitle}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={24} color={colors.primary} />
            <Text style={styles.infoTitle}>{t.confirmImport.walletInfo}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t.confirmImport.importMethod}</Text>
            <Text style={styles.infoValue}>
              {isMnemonicImport ? t.confirmImport.mnemonicPhrase : t.confirmImport.privateKey}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.addressSection}>
            <Text style={styles.addressLabel}>{t.confirmImport.walletAddress}</Text>
            <View style={styles.addressBox}>
              <Text style={styles.addressText} numberOfLines={1} ellipsizeMode="middle">
                {address}
              </Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={handleCopyAddress}
              >
                <Ionicons name="copy-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.syncCard}>
          <View style={styles.syncHeader}>
            <Ionicons name="sync" size={24} color={colors.primary} />
            <Text style={styles.syncTitle}>{t.confirmImport.syncConfig}</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t.confirmImport.scanHeight}</Text>
            <Text style={styles.hint}>
              {t.confirmImport.scanHeightHint}
            </Text>

            <TextInput
              style={styles.textInput}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={scanHeight}
              onChangeText={setScanHeight}
              autoFocus
            />

            <View style={styles.quickOptions}>
              <TouchableOpacity
                style={styles.quickOptionButton}
                onPress={() => setScanHeight('0')}
              >
                <Text style={styles.quickOptionText}>{t.confirmImport.fullSync}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickOptionButton}
                onPress={() => setScanHeight('100000')}
              >
                <Text style={styles.quickOptionText}>100K</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickOptionButton}
                onPress={() => setScanHeight('500000')}
              >
                <Text style={styles.quickOptionText}>500K</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickOptionButton}
                onPress={() => setScanHeight('1000000')}
              >
                <Text style={styles.quickOptionText}>1M</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.warningBox}>
          <Ionicons name="alert-circle" size={24} color={colors.warning} style={styles.warningIcon} />
          <Text style={styles.warningText}>
            {t.confirmImport.warning}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.importButton, isImporting && styles.importButtonDisabled]}
          onPress={handleConfirmImport}
          disabled={isImporting}
        >
          <Text style={styles.importButtonText}>
            {isImporting ? t.confirmImport.importing : t.confirmImport.confirmBtn}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={isImporting}
        >
          <Text style={styles.cancelButtonText}>{t.confirmImport.goBack}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  addressSection: {
    marginTop: spacing.sm,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  addressBox: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontFamily: 'monospace',
    marginRight: spacing.sm,
  },
  copyButton: {
    padding: spacing.sm,
  },
  syncCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  syncHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  syncTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  inputContainer: {
    marginTop: spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  textInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  quickOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickOptionButton: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  quickOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  warningBox: {
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  warningIcon: {
    fontSize: 24,
    color: colors.warning,
    marginTop: 2,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  importButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  importButtonDisabled: {
    opacity: 0.5,
  },
  importButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.backgroundDark,
  },
  cancelButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

export default ConfirmImportScreen;
