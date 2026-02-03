import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SvgXml } from 'react-native-svg';
import { useTranslation } from '../../i18n';
import { colors, spacing, borderRadius } from '../../theme/colors';

type LanguageNavigationProp = StackNavigationProp<any, 'Language'>;

interface Props {
  navigation: LanguageNavigationProp;
}

const LanguageScreen: React.FC<Props> = ({ navigation }) => {
  const { language, setLanguage, availableLanguages, t } = useTranslation();

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

  const handleLanguageSelect = async (langCode: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await setLanguage(langCode as any);
    // Navigate to welcome screen
    navigation.reset({
      index: 0,
      routes: [{ name: 'Welcome' }],
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Ionicons name="wallet-outline" size={60} color={colors.primary} />
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{t.language.selectTitle}</Text>
          <Text style={styles.subtitle}>{t.language.selectSubtitle}</Text>
        </View>

        {/* Language Options */}
        <View style={styles.optionsContainer}>
          {availableLanguages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageOption,
                language === lang.code && styles.languageOptionSelected,
              ]}
              onPress={() => handleLanguageSelect(lang.code)}
              activeOpacity={0.7}
            >
              <View style={styles.languageInfo}>
                <View style={styles.languageFlag}>
                  <SvgXml xml={flagSvgs[lang.flag]} width={32} height={24} />
                </View>
                <View style={styles.languageTextContainer}>
                  <Text style={[
                    styles.languageName,
                    language === lang.code && styles.languageNameSelected,
                  ]}>
                    {lang.name}
                  </Text>
                  <Text style={styles.languageNativeName}>{lang.nativeName}</Text>
                </View>
              </View>
              {language === lang.code && (
                <View style={styles.checkmarkContainer}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
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
    padding: spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: spacing.xxl * 2,
    marginBottom: spacing.xxl,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 140, 251, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: spacing.sm,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255, 140, 251, 0.1)',
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  languageFlag: {
    width: 32,
    height: 24,
  },
  languageTextContainer: {
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
  checkmarkContainer: {
    marginLeft: spacing.md,
  },
});

export default LanguageScreen;
