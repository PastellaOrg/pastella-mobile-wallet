import React from 'react';
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
import { useTranslations } from '../../i18n';

type CreateOrImportNavigationProp = StackNavigationProp<any, 'CreateOrImport'>;

interface Props {
  navigation: CreateOrImportNavigationProp;
}

const CreateOrImportScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslations();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.createOrImport.title}</Text>
        <Text style={styles.subtitle}>
          {t.createOrImport.subtitle}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.optionCard}
        onPress={() => navigation.navigate('CreateWallet')}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="sparkles" size={32} color={colors.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.cardTitle}>{t.createOrImport.createNew}</Text>
          <Text style={styles.cardDescription}>
            {t.createOrImport.createDesc}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.optionCard}
        onPress={() => navigation.navigate('ImportWallet')}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="download" size={32} color={colors.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.cardTitle}>{t.createOrImport.import}</Text>
          <Text style={styles.cardDescription}>
            {t.createOrImport.importDesc}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.infoBox}>
        <View style={styles.infoTitleContainer}>
          <Ionicons name="lock-closed" size={20} color={colors.info} />
          <Text style={styles.infoTitle}>{t.createOrImport.securityTitle}</Text>
        </View>
        <Text style={styles.infoText}>
          {t.createOrImport.securityDesc}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: colors.infoLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
  },
  infoTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.info,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

export default CreateOrImportScreen;
