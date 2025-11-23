declare module '@chaoschain/sdk' {
  export enum AgentRole {
    SERVER = 'server',
    CLIENT = 'client',
    VALIDATOR = 'validator',
    BOTH = 'both',
  }

  export enum NetworkConfig {
    SEPOLIA = 'sepolia',
    BASE_SEPOLIA = 'base-sepolia',
    LINEA_SEPOLIA = 'linea-sepolia',
    HEDERA_TESTNET = 'hedera-testnet',
    OG_GALILEO = '0g-galileo',
  }

  export interface ChaosChainSDKConfig {
    agentName: string;
    agentDomain: string;
    agentRole: AgentRole | string;
    network: NetworkConfig | string;
    privateKey?: string;
    mnemonic?: string;
    rpcUrl?: string;
    enablePayments?: boolean;
    enableStorage?: boolean;
    storageProvider?: unknown;
    computeProvider?: unknown;
    walletFile?: string;
  }

  export interface StorageResult {
    cid?: string;
    uri?: string;
  }

  export interface StorageProvider {
    upload(data: unknown): Promise<StorageResult>;
    download(cid: string): Promise<unknown>;
  }

  export interface AgentStats {
    totalFeedback?: number;
    averageRating?: number;
  }

  export interface AgentMetadata {
    name?: string;
    description?: string;
    capabilities?: string[];
    supportedTrust?: string[];
    [key: string]: unknown;
  }

  export class ChaosChainSDK {
    constructor(config: ChaosChainSDKConfig);

    storage: StorageProvider;

    registerIdentity(): Promise<{ agentId: string; txHash: string }>;
    updateAgentMetadata(agentId: bigint, metadata: AgentMetadata): Promise<void>;
    getAgentMetadata(agentId: bigint): Promise<AgentMetadata>;
    getAgentStats(agentId: bigint): Promise<AgentStats>;
    giveFeedback(params: {
      agentId: bigint;
      rating: number;
      feedbackUri?: string;
      feedbackData?: unknown;
    }): Promise<string>;
    getAddress(): string;
    getBalance(): Promise<string>;
    signMessage(message: string): Promise<string>;
  }
}
