import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius } from '../../theme/colors';
import { FadeIn } from '../../components/shared';
import addressBookService, { AddressBookEntry } from '../../services/addressBookService';
import * as Haptics from 'expo-haptics';
import { useTranslations } from '../../i18n';

const AddressBookScreen = () => {
  const navigation = useNavigation();
  const { t } = useTranslations();
  const [entries, setEntries] = useState<AddressBookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [isAddressValid, setIsAddressValid] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await addressBookService.getEntries();
      setEntries(data);
    } catch (error) {
      Alert.alert(t.addressBook.error, t.addressBook.loadingError);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const validateAddress = (addr: string) => {
    if (!addr) {
      setIsAddressValid(null);
      return;
    }
    const isValid = addr.startsWith('PAS') && addr.length === 54;
    setIsAddressValid(isValid);
  };

  const handleAddressChange = (value: string) => {
    setAddress(value);
    validateAddress(value);
  };

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(t.addressBook.permissionRequired, t.addressBook.cameraPermission);
        return;
      }
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowScanner(true);
  };

  const handleBarcodeScanned = (data: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const scannedAddress = data.data;
    setAddress(scannedAddress);
    validateAddress(scannedAddress);
    setShowScanner(false);
  };

  const resetForm = () => {
    setName('');
    setAddress('');
    setDescription('');
    setIsAddressValid(null);
  };

  const openAddModal = () => {
    setEditingId(null);
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (entry: AddressBookEntry) => {
    setEditingId(entry.id);
    setName(entry.name);
    setAddress(entry.address);
    setDescription(entry.description || '');
    validateAddress(entry.address);
    setShowAddModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSaveEntry = async () => {
    if (!name || name.trim().length === 0) {
      Alert.alert(t.addressBook.error, t.addressBook.noName);
      return;
    }

    if (!address || address.trim().length === 0) {
      Alert.alert(t.addressBook.error, t.addressBook.noAddress);
      return;
    }

    if (isAddressValid === false) {
      Alert.alert(t.addressBook.error, t.addressBook.invalidAddress);
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await addressBookService.updateEntry(editingId, name, address, description);
      } else {
        await addressBookService.addEntry(name, address, description);
      }
      await loadEntries();
      setShowAddModal(false);
      resetForm();
      setEditingId(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      const message = error instanceof Error ? error.message : t.addressBook.saveError;
      Alert.alert(t.addressBook.error, message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = (entry: AddressBookEntry) => {
    Alert.alert(
      t.addressBook.deleteTitle,
      t.addressBook.deleteMessage.replace('{name}', entry.name),
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.addressBook.delete,
          style: 'destructive',
          onPress: async () => {
            try {
              await addressBookService.deleteEntry(entry.id);
              await loadEntries();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch (error) {
              Alert.alert(t.addressBook.error, t.addressBook.deleteError);
            }
          },
        },
      ]
    );
  };

  const copyToClipboard = async (address: string) => {
    try {
      await Clipboard.setStringAsync(address);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Alert.alert(t.addressBook.copied, t.addressBook.copyMessage);
    } catch (error) {
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const clipboardContent = await Clipboard.getStringAsync();
      if (clipboardContent) {
        setAddress(clipboardContent);
        validateAddress(clipboardContent);
      } else {
        Alert.alert(t.addressBook.clipboardEmpty, t.addressBook.noAddressClipboard);
      }
    } catch (error) {
      Alert.alert(t.addressBook.error, t.addressBook.clipboardError);
    }
  };

  const sendToAddress = (entry: AddressBookEntry) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // @ts-ignore - navigation.navigate accepts params
    navigation.navigate('Send', { address: entry.address });
  };

  if (loading) {
    return (
      <FadeIn>
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      </FadeIn>
    );
  }

  return (
    <FadeIn>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t.addressBook.title}</Text>
          <Text style={styles.subtitle}>{t.addressBook.subtitle}</Text>
        </View>

        {/* Add Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            openAddModal();
          }}
        >
          <Ionicons name="add-circle" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>{t.addressBook.addNew}</Text>
        </TouchableOpacity>

        {/* Empty State */}
        {entries.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={60} color={colors.textTertiary} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>{t.addressBook.noContacts}</Text>
            <Text style={styles.emptyText}>{t.addressBook.noContactsSub}</Text>
          </View>
        )}

        {/* Contact List */}
        {entries.map((entry) => (
          <View key={entry.id} style={styles.contactCard}>
            <View style={styles.contactContent}>
              <View style={styles.contactHeader}>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{entry.name}</Text>
                  {entry.description && (
                    <Text style={styles.contactDescription} numberOfLines={1}>
                      {entry.description}
                    </Text>
                  )}
                  <Text style={styles.contactAddress} numberOfLines={1} ellipsizeMode="middle">
                    {entry.address}
                  </Text>
                </View>
              </View>
              <View style={styles.contactActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.sendActionButton]}
                  onPress={() => sendToAddress(entry)}
                >
                  <Ionicons name="send-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => copyToClipboard(entry.address)}
                >
                  <Ionicons name="copy-outline" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openEditModal(entry)}
                >
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDeleteEntry(entry)}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Add/Edit Contact Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowAddModal(false);
          resetForm();
          setEditingId(null);
        }}
      >
        <View style={styles.modalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={100}
            style={styles.modalKeyboardView}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingId ? t.addressBook.editContact : t.addressBook.addContact}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowAddModal(false);
                    resetForm();
                    setEditingId(null);
                  }}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={28} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Name Input */}
              <Text style={styles.inputLabel}>{t.addressBook.name} *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t.addressBook.namePlaceholder}
                  placeholderTextColor={colors.textTertiary}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              {/* Address Input */}
              <Text style={styles.inputLabel}>{t.addressBook.address} *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  isAddressValid === true && styles.inputWrapperValid,
                  isAddressValid === false && styles.inputWrapperInvalid,
                ]}
              >
                <TextInput
                  style={styles.input}
                  placeholder={t.addressBook.addressPlaceholder}
                  placeholderTextColor={colors.textTertiary}
                  value={address}
                  onChangeText={handleAddressChange}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                <View style={styles.inputActions}>
                  <TouchableOpacity onPress={handlePasteFromClipboard} style={styles.inputActionButton}>
                    <Ionicons name="clipboard-outline" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleOpenScanner} style={styles.inputActionButton}>
                    <Ionicons name="qr-code" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
              {isAddressValid === false && (
                <Text style={styles.validationError}>
                  {t.addressBook.invalidAddress}
                </Text>
              )}

              {/* Description Input */}
              <Text style={styles.inputLabel}>{t.addressBook.description}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="text" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t.addressBook.descriptionPlaceholder}
                  placeholderTextColor={colors.textTertiary}
                  value={description}
                  onChangeText={setDescription}
                />
              </View>

              {/* Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    setShowAddModal(false);
                    resetForm();
                    setEditingId(null);
                  }}
                >
                  <Text style={styles.modalButtonTextCancel}>{t.common.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSave]}
                  onPress={handleSaveEntry}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalButtonTextSave}>{editingId ? t.addressBook.update : t.addressBook.save}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
      </Modal>

      {/* QR Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}
      >
        <View style={styles.scannerContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={handleBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          />
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerHeader}>
              <TouchableOpacity
                onPress={() => setShowScanner(false)}
                style={styles.scannerCloseButton}
              >
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.scannerTitle}>{t.addressBook.scanQr}</Text>
              <View style={styles.scannerHeaderSpacer} />
            </View>
            <View style={styles.scannerFrame} />
            <View style={styles.scannerFooter}>
              <Text style={styles.scannerInstructions}>
                {t.addressBook.scanInstructions}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </FadeIn>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 3,
  },
  emptyIcon: {
    marginBottom: spacing.md,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  contactCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.sm,
  },
  contactContent: {
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactHeader: {
    flex: 1,
  },
  contactInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  contactDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  contactAddress: {
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: 'monospace',
  },
  contactActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  actionButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  sendActionButton: {
    backgroundColor: 'rgba(255, 140, 251, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 251, 0.3)',
  },
  modalContainer: {
    flex: 1,
  },
  modalKeyboardView: {
    flex: 1,
  },
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
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: spacing.sm,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    height: 48,
    marginBottom: spacing.sm,
  },
  inputWrapperValid: {
    borderColor: colors.success,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  inputWrapperInvalid: {
    borderColor: colors.error,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  inputActionButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  qrButton: {
    paddingHorizontal: spacing.sm,
  },
  validationError: {
    fontSize: 11,
    color: colors.error,
    marginBottom: spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  modalButtonSave: {
    backgroundColor: colors.primary,
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalButtonTextSave: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scannerCloseButton: {
    padding: spacing.sm,
  },
  scannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scannerHeaderSpacer: {
    width: 44,
  },
  scannerFrame: {
    alignSelf: 'center',
    width: 280,
    height: 280,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    backgroundColor: 'transparent',
    marginTop: 'auto',
    marginBottom: 'auto',
  },
  scannerFooter: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  scannerInstructions: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default AddressBookScreen;
