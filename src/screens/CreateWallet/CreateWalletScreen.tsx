import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../theme/colors';
import { PastellaWallet } from '../../wallet';
import { useTranslations } from '../../i18n';

type CreateWalletNavigationProp = StackNavigationProp<any, 'CreateWallet'>;

interface Props {
  navigation: CreateWalletNavigationProp;
}

const CreateWalletScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslations();
  const [mnemonic, setMnemonic] = useState<string>('');
  const [address, setAddress] = useState<string>('');

  useEffect(() => {
    generateWallet();
  }, []);

  const generateWallet = async () => {
    try {
      // Generate real wallet using PastellaWallet
      const wallet = await PastellaWallet.generateWallet();
      setMnemonic(wallet.mnemonic);
      setAddress(wallet.address);
    } catch (error) {
      console.error('Failed to generate wallet:', error);
    }
  };

  const handleContinue = () => {
    navigation.navigate('SetupPin', { mnemonic });
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>{t.createWallet.title}</Text>
        </View>

      {mnemonic ? (
        <>
          <View style={styles.warningBox}>
            <Ionicons name="warning" size={24} color={colors.warning} style={styles.warningIcon} />
            <Text style={styles.warningText}>
              {t.createWallet.warning}
            </Text>
          </View>

          <View style={styles.addressContainer}>
            <Text style={styles.addressLabel}>{t.createWallet.walletAddress}</Text>
            <Text style={styles.address}>{address}</Text>
          </View>

          <View style={styles.mnemonicContainer}>
            <View style={styles.mnemonicGrid}>
              {mnemonic.split(' ').map((word, index) => (
                <View key={index} style={styles.wordItem}>
                  <Text style={styles.wordNumber}>{index + 1}.</Text>
                  <Text style={styles.word}>{word}</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t.createWallet.generating}</Text>
        </View>
      )}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>{t.createWallet.continue}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.regenerateButton}
          onPress={generateWallet}
        >
          <Text style={styles.regenerateButtonText}>{t.createWallet.generateNew}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  header: {
    marginBottom: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
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
  addressContainer: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  addressLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  address: {
    fontSize: 13,
    color: colors.text,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  warningBox: {
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  warningIcon: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.warning,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  mnemonicContainer: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  mnemonicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  wordItem: {
    width: '31%',
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  wordNumber: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  word: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  buttonContainer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  continueButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  regenerateButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  regenerateButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

export default CreateWalletScreen;
