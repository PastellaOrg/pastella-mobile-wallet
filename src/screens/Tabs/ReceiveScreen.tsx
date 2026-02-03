import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius } from '../../theme/colors';
import { FadeIn, ToastManager } from '../../components/shared';
import { SecureStorage } from '../../services/secureStorage';
import { useTranslations } from '../../i18n';

const ReceiveScreen = () => {
  const { t } = useTranslations();
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWalletAddress();
  }, []);

  const loadWalletAddress = async () => {
    try {
      const wallet = await SecureStorage.loadWallet();
      if (wallet) {
        setWalletAddress(wallet.address);
      }
    } catch (error) {
      console.error('Failed to load wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAddress = async () => {
    await Clipboard.setStringAsync(walletAddress);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    ToastManager.success('Address copied to clipboard');
  };

  const handleShareAddress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: walletAddress,
        title: t.receive.shareTitle,
      });
    } catch (error) {
      // User cancelled the share sheet or there was an error
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <FadeIn>
      <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
        >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t.receive.title}</Text>
        <Text style={styles.subtitle}>{t.receive.subtitle}</Text>
      </View>

      {/* QR Code Card */}
      <View style={styles.qrCard}>
        <View style={styles.qrContainer}>
          {walletAddress ? (
            <QRCode
              value={walletAddress}
              size={250}
              color={colors.text}
              backgroundColor="transparent"
            />
          ) : (
            <View style={styles.qrPlaceholder}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
        </View>

        <View style={styles.addressContainer}>
          <Text style={styles.addressLabel}>{t.receive.yourAddress}</Text>
          <View style={styles.addressRow}>
            <Text style={styles.addressText} numberOfLines={1} ellipsizeMode="middle">
              {walletAddress}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleCopyAddress}
          >
            <Ionicons name="copy-outline" size={20} color={colors.primary} />
            <Text style={styles.actionText}>{t.receive.copyAddress}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShareAddress}
          >
            <Ionicons name="share-outline" size={20} color={colors.primary} />
            <Text style={styles.actionText}>{t.receive.share}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={20} color={colors.info} />
        <View style={styles.infoTextContainer}>
          <Text style={styles.infoTitle}>{t.receive.infoTitle}</Text>
          <Text style={styles.infoText}>
            {t.receive.infoText}
          </Text>
        </View>
      </View>
    </ScrollView>
    </FadeIn>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 120,
    flexGrow: 1,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(129, 140, 248, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  qrCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  qrContainer: {
    width: 250,
    height: 250,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholder: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressContainer: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  addressLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  addressRow: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  addressText: {
    fontSize: 14,
    color: colors.text,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.warning,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});

export default ReceiveScreen;
