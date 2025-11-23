// ============================================
// Configuration Types
// ============================================

export interface ChaosChainServiceConfig {
  /** Private key for operations wallet (pays storage fees) */
  operationsPrivateKey: string;
  /** Game contract address for AgentNFT */
  gameContractAddress: string;
  /** 0G Indexer RPC URL */
  zgIndexerRpc: string;
  /** 0G EVM RPC URL */
  zgEvmRpc: string;
}

export interface AgentIdentityConfig {
  /** Agent's CDP smart account private key (owns identity) */
  agentPrivateKey: string;
  /** Game token ID from AgentNFT */
  gameTokenId: number;
  /** Agent type from game */
  agentType: "PAL" | "TRAINER";
}

// ============================================
// Identity Types
// ============================================

export interface ChaosIdentity {
  /** ChaosChain ERC-8004 agent ID */
  chaosAgentId: string;
  /** Game token ID (cross-reference) */
  gameTokenId: number;
  /** Registration timestamp */
  registeredAt: number;
}

// ============================================
// Storage Types
// ============================================

export interface AgentLogEntry {
  step: number;
  timestamp: number;
  /** What the agent observed */
  observation: string;
  /** AI's reasoning/thought process */
  reasoning: string;
  /** Tool that was called (null if none) */
  toolCalled: string | null;
  /** Parameters passed to tool */
  toolParams: Record<string, unknown> | null;
  /** Result of tool execution */
  result: string | null;
}

export interface AgentLogBatch {
  type: "agent_logs";
  agentId: number;
  chaosAgentId: string;
  startStep: number;
  endStep: number;
  createdAt: number;
  entries: AgentLogEntry[];
}

// ============================================
// Storage Reference Types
// ============================================

export interface StorageReference {
  /** 0G Storage root hash */
  rootHash: string;
  /** Type of data stored */
  dataType: "agent_logs";
  /** When it was stored */
  storedAt: number;
  /** Step range for logs */
  stepRange?: { start: number; end: number };
}
