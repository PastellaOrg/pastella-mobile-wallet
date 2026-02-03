export interface Node {
  name: string;
  ip: string;
  port: number;
  ssl: boolean;
}

export interface NodeInfo {
  height: number;
  difficulty: number;
  tx_count: number;
  tx_pool_size: number;
  alt_blocks_count: number;
  outgoing_connections_count: number;
  incoming_connections_count: number;
  white_peerlist_size: number;
  grey_peerlist_size: number;
  last_known_block_index: number;
  network_height: number;
  upgrade_heights: number[];
  supported_height: number;
  hashrate: number;
  synced: boolean;
  major_version: number;
  minor_version: number;
  version: string;
  status: string;
  start_time: number;
}

export interface NodeStatus extends Node {
  online: boolean;
  latency?: number; // in milliseconds
  checking?: boolean;
  info?: NodeInfo;
}
