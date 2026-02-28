import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../theme/colors';
import nodeService, { Node, NodeStatus } from '../../services/nodeService';
import { ToastManager } from '../../components/shared';
import AddNodeModal from '../../components/modals/AddNodeModal';
import * as Haptics from 'expo-haptics';

type NodesNavigationProp = StackNavigationProp<any, 'Nodes'>;

interface Props {
  navigation: NodesNavigationProp;
}

const NodesScreen: React.FC<Props> = ({ navigation }) => {
  const [nodes, setNodes] = useState<NodeStatus[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [checkingAll, setCheckingAll] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    initAndLoadNodes();
  }, []);

  const initAndLoadNodes = async () => {
    await nodeService.init();
    loadNodes();
  };

  const loadNodes = async () => {
    try {
      const allNodes = nodeService.getNodes();
      const savedNode = await nodeService.getSelectedNode();

      // Initialize all nodes as checking
      const initialStatus: NodeStatus[] = allNodes.map(node => ({
        ...node,
        online: false,
        checking: true,
      }));

      setNodes(initialStatus);
      setSelectedNode(savedNode);

      // Check latency for each node
      for (let i = 0; i < allNodes.length; i++) {
        checkNodeLatency(allNodes[i], i);
      }
    } catch (error) {
      setCheckingAll(false);
    }
  };

  const checkNodeLatency = async (node: Node, index: number) => {
    const status = await nodeService.checkNodeLatency(node);

    setNodes(prevNodes => {
      const newNodes = [...prevNodes];
      newNodes[index] = {
        ...status,
        checking: false,
      };

      // If this was the last node to check, stop the loading state
      const allChecked = newNodes.every(n => !n.checking);
      if (allChecked) {
        setCheckingAll(false);
      }

      return newNodes;
    });
  };

  const handleRefreshAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCheckingAll(true);
    loadNodes();
  };

  const handleSelectNode = async (node: NodeStatus) => {
    if (!node.online) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      ToastManager.warning('This node is currently offline. Please select an online node.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await nodeService.setSelectedNode(node);
    setSelectedNode(node);
    ToastManager.success(`Switched to ${node.name}`);
  };

  const isSelected = (node: NodeStatus): boolean => {
    return selectedNode?.ip === node.ip && selectedNode?.port === node.port;
  };

  const handleAddNode = async (node: Node): Promise<boolean> => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const success = await nodeService.addCustomNode(node);
    if (success) {
      ToastManager.success(`Added ${node.name}`);
      loadNodes();
    }
    return success;
  };

  const handleDeleteNode = (node: NodeStatus) => {
    const isCustom = nodeService.isCustomNode(node);
    if (!isCustom) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      ToastManager.warning('Cannot delete default nodes');
      return;
    }

    Alert.alert(
      'Delete Node',
      `Are you sure you want to delete "${node.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            const success = await nodeService.removeCustomNode(node);
            if (success) {
              ToastManager.success(`Deleted ${node.name}`);
              // If deleted node was selected, clear selection
              if (isSelected(node)) {
                setSelectedNode(null);
              }
              loadNodes();
            } else {
              ToastManager.error('Failed to delete node');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Nodes</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowAddModal(true);
            }}
          >
            <Ionicons name="add" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleRefreshAll}
            disabled={checkingAll}
          >
            <Ionicons
              name="refresh"
              size={20}
              color={checkingAll ? colors.textMuted : colors.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Nodes List */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {checkingAll && nodes.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Checking nodes...</Text>
          </View>
        ) : (
          nodes.map((node, index) => (
            <TouchableOpacity
              key={`${node.ip}-${node.port}`}
              style={[
                styles.nodeCard,
                isSelected(node) && styles.nodeCardSelected,
              ]}
              onPress={() => handleSelectNode(node)}
              disabled={node.checking}
            >
              <View style={styles.nodeCardContent}>
                {/* Left: Status and Node Info */}
                <View style={styles.nodeLeftSection}>
                  <View
                    style={[
                      styles.statusIndicator,
                      {
                        backgroundColor: node.checking
                          ? colors.textMuted
                          : nodeService.getOnlineStatusColor(node.online),
                      },
                    ]}
                  >
                    {node.checking ? (
                      <ActivityIndicator size={14} color={colors.backgroundDark} />
                    ) : node.online ? (
                      <Ionicons name="checkmark" size={18} color={colors.backgroundDark} />
                    ) : (
                      <Ionicons name="close" size={18} color={colors.backgroundDark} />
                    )}
                  </View>

                  <View style={styles.nodeInfoSection}>
                    <View style={styles.nameRow}>
                      {isSelected(node) && (
                        <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={styles.selectedCheckmark} />
                      )}
                      <Text style={styles.nodeName}>{node.name}</Text>
                    </View>
                    <Text style={styles.nodeAddress}>{node.ip}:{node.port}</Text>
                    <View style={styles.badgesRow}>
                      <View
                        style={[
                          styles.sslBadge,
                          { backgroundColor: node.ssl ? `${colors.success}15` : `${colors.warning}15` },
                          { borderColor: node.ssl ? `${colors.success}30` : `${colors.warning}30` },
                        ]}
                      >
                        <Ionicons
                          name={node.ssl ? 'lock-closed' : 'lock-open'}
                          size={10}
                          color={node.ssl ? colors.success : colors.warning}
                        />
                        <Text style={[styles.sslBadgeText, { color: node.ssl ? colors.success : colors.warning }]}>
                          {node.ssl ? 'HTTPS' : 'Non SSL'}
                        </Text>
                      </View>

                      {/* Sync status (online only) */}
                      {node.online && node.info && (
                        <View
                          style={[
                            styles.sslBadge,
                            {
                              backgroundColor: node.info.synced
                                ? `${colors.success}15`
                                : `${colors.warning}15`,
                              borderColor: node.info.synced
                                ? `${colors.success}30`
                                : `${colors.warning}30`,
                            },
                          ]}
                        >
                          <Ionicons
                            name={node.info.synced ? 'sync' : 'sync-outline'}
                            size={10}
                            color={node.info.synced ? colors.success : colors.warning}
                          />
                          <Text
                            style={[
                              styles.sslBadgeText,
                              { color: node.info.synced ? colors.success : colors.warning },
                            ]}
                          >
                            {node.info.synced ? 'Synced' : 'Syncing'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Right: Badges Stack */}
                <View style={styles.nodeRightSection}>
                  {/* Delete button for custom nodes */}
                  {nodeService.isCustomNode(node) && (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteNode(node)}
                      disabled={node.checking}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                    </TouchableOpacity>
                  )}

                  {/* Ping/Latency */}
                  {node.checking ? (
                    <ActivityIndicator size={14} color={colors.textMuted} />
                  ) : node.online ? (
                    <View style={styles.pingBadge}>
                      <Text style={styles.pingLabel}>Ping</Text>
                      <Text
                        style={[
                          styles.pingValue,
                          { color: nodeService.getLatencyColor(node.latency) },
                        ]}
                      >
                        {nodeService.formatLatency(node.latency)}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.offlineBadge}>
                      <Text style={styles.offlineText}>Offline</Text>
                    </View>
                  )}

                  {/* Height (online only) */}
                  {node.online && node.info && (
                    <View
                      style={[
                        styles.nodeBadge,
                        { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` },
                      ]}
                    >
                      <Ionicons name="layers" size={12} color={colors.primary} />
                      <Text style={[styles.nodeBadgeText, { color: colors.primary }]}>
                        {nodeService.formatNumber(node.info.height)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Add Node Modal */}
      <AddNodeModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddNode}
        existingNodes={nodes}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  nodeCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  nodeCardSelected: {
    borderColor: `${colors.primary}50`,
    backgroundColor: `${colors.primary}08`,
  },
  nodeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nodeLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  statusIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeInfoSection: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectedCheckmark: {
    marginTop: 2,
  },
  nodeName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  nodeAddress: {
    fontSize: 13,
    color: colors.textTertiary,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sslBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  sslBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  nodeRightSection: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  pingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.backgroundDark,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    minWidth: 70,
    justifyContent: 'center',
  },
  pingLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    marginRight: 4,
  },
  pingValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  offlineBadge: {
    backgroundColor: `${colors.error}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  offlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
  },
  nodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  nodeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${colors.error}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default NodesScreen;
