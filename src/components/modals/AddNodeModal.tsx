import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../theme/colors';
import { Node } from '../../types/nodes';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (node: Node) => Promise<boolean>;
  existingNodes?: Node[];
}

const AddNodeModal: React.FC<Props> = ({ visible, onClose, onAdd, existingNodes = [] }) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [port, setPort] = useState('');
  const [ssl, setSsl] = useState(false);
  const [adding, setAdding] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateAndAdd = async () => {
    const newErrors: { [key: string]: string } = {};

    // Validate name
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    // Validate address
    if (!address.trim()) {
      newErrors.address = 'Address is required';
    }

    // Validate port
    const portNum = parseInt(port, 10);
    if (!port || isNaN(portNum) || portNum < 1 || portNum > 65535) {
      newErrors.port = 'Port must be between 1 and 65535';
    }

    // Check for duplicate
    const duplicate = existingNodes.find(
      n => n.ip === address.trim() && n.port === portNum
    );
    if (duplicate) {
      newErrors.address = 'This node already exists';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setAdding(true);
    const newNode: Node = {
      name: name.trim(),
      ip: address.trim(),
      port: portNum,
      ssl,
    };

    const success = await onAdd(newNode);
    setAdding(false);

    if (success) {
      // Reset form
      setName('');
      setAddress('');
      setPort('');
      setSsl(false);
      setErrors({});
      onClose();
    } else {
      setErrors({ form: 'Failed to add node. It may already exist.' });
    }
  };

  const handleClose = () => {
    if (!adding) {
      setName('');
      setAddress('');
      setPort('');
      setSsl(false);
      setErrors({});
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={handleClose}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Add Custom Node</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                disabled={adding}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Form */}
            <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
              {/* Error message */}
              {errors.form && (
                <View style={styles.errorContainer}>
                  <Ionicons name="warning" size={16} color={colors.error} />
                  <Text style={styles.errorText}>{errors.form}</Text>
                </View>
              )}

              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Node Name</Text>
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  placeholder="My Custom Node"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  editable={!adding}
                  autoCapitalize="words"
                />
                {errors.name && <Text style={styles.fieldError}>{errors.name}</Text>}
              </View>

              {/* Address Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Address / IP</Text>
                <TextInput
                  style={[styles.input, errors.address && styles.inputError]}
                  placeholder="example.com or 192.168.1.1"
                  placeholderTextColor={colors.textMuted}
                  value={address}
                  onChangeText={setAddress}
                  editable={!adding}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {errors.address && <Text style={styles.fieldError}>{errors.address}</Text>}
              </View>

              {/* Port Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Port</Text>
                <TextInput
                  style={[styles.input, errors.port && styles.inputError]}
                  placeholder="21001"
                  placeholderTextColor={colors.textMuted}
                  value={port}
                  onChangeText={setPort}
                  editable={!adding}
                  keyboardType="number-pad"
                  maxLength={5}
                />
                {errors.port && <Text style={styles.fieldError}>{errors.port}</Text>}
              </View>

              {/* SSL Toggle */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Connection Type</Text>
                <View style={styles.toggleOptions}>
                  <TouchableOpacity
                    style={[styles.toggleOption, !ssl && styles.toggleOptionActive]}
                    onPress={() => !adding && setSsl(false)}
                  >
                    <Ionicons
                      name="lock-open"
                      size={18}
                      color={!ssl ? colors.text : colors.textMuted}
                    />
                    <Text style={[styles.toggleText, !ssl && styles.toggleTextActive]}>
                      Non-SSL (HTTP)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleOption, ssl && styles.toggleOptionActive]}
                    onPress={() => !adding && setSsl(true)}
                  >
                    <Ionicons
                      name="lock-closed"
                      size={18}
                      color={ssl ? colors.text : colors.textMuted}
                    />
                    <Text style={[styles.toggleText, ssl && styles.toggleTextActive]}>
                      SSL (HTTPS)
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.hint}>
                  {ssl
                    ? 'Connect using HTTPS (encrypted)'
                    : 'Connect using HTTP (not encrypted)'}
                </Text>
              </View>
            </ScrollView>

            {/* Footer Buttons */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.button, styles.buttonCancel]}
                onPress={handleClose}
                disabled={adding}
              >
                <Text style={styles.buttonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonAdd]}
                onPress={validateAndAdd}
                disabled={adding}
              >
                {adding ? (
                  <ActivityIndicator size="small" color={colors.backgroundDark} />
                ) : (
                  <>
                    <Ionicons name="add" size={20} color={colors.backgroundDark} />
                    <Text style={styles.buttonAddText}>Add Node</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
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
    backgroundColor: colors.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    padding: spacing.lg,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: `${colors.error}15`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    flex: 1,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputError: {
    borderColor: colors.error,
  },
  fieldError: {
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
  },
  toggleOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleOptionActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}15`,
  },
  toggleText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  toggleTextActive: {
    color: colors.text,
  },
  hint: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    minHeight: 48,
  },
  buttonCancel: {
    backgroundColor: colors.backgroundDark,
  },
  buttonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  buttonAdd: {
    backgroundColor: colors.primary,
  },
  buttonAddText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.backgroundDark,
  },
});

export default AddNodeModal;
