import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../theme/colors';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { config } from '../../config/explorer';

type AboutNavigationProp = StackNavigationProp<any, 'About'>;

interface Props {
  navigation: AboutNavigationProp;
}

interface AboutItem {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  color?: string;
}

const APP_VERSION = '1.0.0';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AboutScreen: React.FC<Props> = ({ navigation }) => {
  const openUrl = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (error) {
    }
  };

  const Section = ({ title, items }: { title: string; items: AboutItem[] }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.item, index === items.length - 1 && styles.itemLast]}
            onPress={item.onPress}
            disabled={!item.onPress}
          >
            <View style={[styles.iconContainer, { backgroundColor: item.color ? `${item.color}20` : colors.infoLight }]}>
              <Ionicons name={item.icon as any} size={16} color={item.color || colors.info} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              {item.subtitle && <Text style={styles.itemSubtitle}>{item.subtitle}</Text>}
            </View>
            {item.onPress && (
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const generalItems: AboutItem[] = [
    {
      icon: 'information-circle',
      title: 'Version',
      subtitle: `v${APP_VERSION}`,
      color: colors.primary,
    },
  ];

  const supportItems: AboutItem[] = [
    {
      icon: 'globe',
      title: 'Website',
      color: colors.success,
      onPress: () => openUrl(config.websiteUrl),
    },
    {
      icon: 'logo-github',
      title: 'GitHub',
      color: colors.text,
      onPress: () => openUrl(config.githubUrl),
    },
  ];

  const communityItems: AboutItem[] = [
    {
      icon: 'logo-discord',
      title: 'Discord',
      color: '#5865F2',
      onPress: () => openUrl(config.discordUrl),
    },
    {
      icon: 'close',
      title: 'X',
      color: '#ffffff',
      onPress: () => openUrl(config.twitterUrl),
    },
  ];

  return (
    <View style={Platform.OS === 'ios' ? styles.overlay : styles.androidContainer}>
      {Platform.OS === 'ios' && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
        />
      )}
      <View style={Platform.OS === 'ios' ? styles.modalContainer : styles.androidModalContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>About</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.goBack();
            }}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* App Info */}
          <View style={styles.appInfo}>
            <View style={styles.logoContainer}>
              <Ionicons name="wallet" size={32} color={colors.primary} />
            </View>
            <Text style={styles.appName}>Pastella Wallet</Text>
            <Text style={styles.appVersion}>v{APP_VERSION}</Text>
          </View>

          {/* Sections */}
          <Section title="General" items={generalItems} />
          <Section title="Support" items={supportItems} />
          <Section title="Community" items={communityItems} />

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>© 2025 Pastella Project</Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  androidContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: SCREEN_WIDTH * 0.85,
    maxHeight: SCREEN_WIDTH * 1.2,
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  androidModalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  appName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  appVersion: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  itemLast: {
    borderBottomWidth: 0,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 1,
  },
  itemSubtitle: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  footerText: {
    fontSize: 11,
    color: colors.textMuted,
  },
});

export default AboutScreen;
