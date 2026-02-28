import AsyncStorage from '@react-native-async-storage/async-storage';
import { Node, NodeStatus, NodeInfo } from '../types/nodes';

// Import nodes configuration from JSON file
const nodesConfig = require('../../nodes.json') as Node[];

const SELECTED_NODE_KEY = '@pastella_selected_node';
const CUSTOM_NODES_KEY = '@pastella_custom_nodes';

class NodeService {
  private nodes: Node[] = nodesConfig;
  private customNodes: Node[] = [];

  async init(): Promise<void> {
    await this.loadCustomNodes();
  }

  private async loadCustomNodes(): Promise<void> {
    try {
      const customNodesJson = await AsyncStorage.getItem(CUSTOM_NODES_KEY);
      if (customNodesJson) {
        this.customNodes = JSON.parse(customNodesJson);
      }
    } catch (error) {
      console.error('Error loading custom nodes:', error);
      this.customNodes = [];
    }
  }

  getNodes(): Node[] {
    return [...this.nodes, ...this.customNodes];
  }

  async addCustomNode(node: Node): Promise<boolean> {
    try {
      // Check if node already exists
      const exists = this.customNodes.find(
        n => n.ip === node.ip && n.port === node.port
      );
      if (exists) {
        return false; // Node already exists
      }

      this.customNodes.push(node);
      await AsyncStorage.setItem(CUSTOM_NODES_KEY, JSON.stringify(this.customNodes));
      return true;
    } catch (error) {
      console.error('Error adding custom node:', error);
      return false;
    }
  }

  async removeCustomNode(node: Node): Promise<boolean> {
    try {
      const index = this.customNodes.findIndex(
        n => n.ip === node.ip && n.port === node.port
      );
      if (index === -1) {
        return false; // Node not found in custom nodes
      }

      this.customNodes.splice(index, 1);
      await AsyncStorage.setItem(CUSTOM_NODES_KEY, JSON.stringify(this.customNodes));
      return true;
    } catch (error) {
      console.error('Error removing custom node:', error);
      return false;
    }
  }

  isCustomNode(node: Node): boolean {
    return this.customNodes.some(
      n => n.ip === node.ip && n.port === node.port
    );
  }

  async getSelectedNode(): Promise<Node | null> {
    try {
      const selectedNodeJson = await AsyncStorage.getItem(SELECTED_NODE_KEY);
      if (selectedNodeJson) {
        const savedNode: Node = JSON.parse(selectedNodeJson);
        // Verify the saved node still exists in our list
        const exists = this.nodes.find(
          n => n.ip === savedNode.ip && n.port === savedNode.port
        );
        return exists || this.nodes[0]; // Return first node if saved node no longer exists
      }
      // Default to first node if nothing saved
      return this.nodes[0];
    } catch (error) {
      console.error('Error getting selected node:', error);
      return this.nodes[0];
    }
  }

  async setSelectedNode(node: Node): Promise<void> {
    try {
      await AsyncStorage.setItem(SELECTED_NODE_KEY, JSON.stringify(node));
    } catch (error) {
      console.error('Error setting selected node:', error);
    }
  }

  async checkNodeLatency(node: Node): Promise<NodeStatus> {
    const startTime = Date.now();

    try {
      const protocol = node.ssl ? 'https' : 'http';
      const url = `${protocol}://${node.ip}:${node.port}/info`;

      // Create a fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      const latency = Date.now() - startTime;

      if (response.ok) {
        // Try to parse the JSON response
        try {
          const info: NodeInfo = await response.json();

          // Check if the status is OK
          if (info.status === 'OK') {
            return {
              ...node,
              online: true,
              latency,
              info,
            };
          }
        } catch (parseError) {
          // If we can't parse JSON, still consider it online
        }

        // Consider it online even if JSON parsing fails
        return {
          ...node,
          online: true,
          latency,
        };
      }

      return {
        ...node,
        online: false,
      };
    } catch (error) {
      return {
        ...node,
        online: false,
      };
    }
  }

  formatLatency(latency?: number): string {
    if (latency === undefined) return '...';
    if (latency < 100) return `${latency}ms`;
    if (latency < 1000) return `${latency}ms`;
    return `${(latency / 1000).toFixed(1)}s`;
  }

  getLatencyColor(latency?: number): string {
    if (latency === undefined) return '#9ca3af';
    if (latency < 100) return '#10b981'; // Green
    if (latency < 300) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  }

  getOnlineStatusColor(online: boolean): string {
    return online ? '#10b981' : '#ef4444';
  }

  formatHashrate(hashrate: number): string {
    if (hashrate < 1000) return `${hashrate} H/s`;
    if (hashrate < 1000000) return `${(hashrate / 1000).toFixed(1)} KH/s`;
    if (hashrate < 1000000000) return `${(hashrate / 1000000).toFixed(2)} MH/s`;
    return `${(hashrate / 1000000000).toFixed(2)} GH/s`;
  }

  formatNumber(num: number): string {
    return num.toLocaleString();
  }

  formatConnections(incoming: number, outgoing: number): string {
    return `${incoming} in / ${outgoing} out`;
  }
}

export default new NodeService();
