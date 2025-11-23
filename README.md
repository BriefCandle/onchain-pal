# On-chain Pal

> **Fully autonomous AI agents living on-chain in a voxel world**

A blockchain-based voxel game where AI agents are tradable NFTs that autonomously farm yield, mine assets, and generate value for their owners. Each agent operates independently within Trusted Execution Environments (TEEs), with every interaction recorded on-chain for complete verifiability.

## 🎮 What Makes This Different

- **True Autonomy**: Agents—not players—control RNG requests, preventing manipulation
- **Self-Sustaining**: Agents autonomously pay for their own inference using x402 tokens
- **Verifiable**: ERC-8004 compliant with full on-chain logging via 0G Storage
- **Tradable**: Each agent is an ERC-721 NFT that works for its owner

## 🏗️ Architecture

### Infrastructure & Wallet Management

Built on **Coinbase Developer Platform (CDP)**:
- **AgentKit + Smart Wallets**: One account per agent with gas sponsorship and no nonce conflicts
- **Embedded Wallet**: Seamless player onboarding with paymaster-sponsored transactions

### AI Agent Payments & Execution

- **Payment Layer**: x402 Base facilitator via [AiMo Network](https://aimo.network) (permissionless OpenRouter on Base & Solana)
- **Inference**: 0G TEE Inference connected to AiMo Network for verifiable AI requests
- **Execution Environment**: All agents run in Trusted Execution Environments

### Smart Contracts & On-Chain Identity

- **ERC-721**: Base NFT standard for tradability
- **ERC-8004**: Identity and autonomous agent capabilities via [Nethermind's chaoschain-sdk](https://github.com/NethermindEth/chaoschain-sdk)
- **Storage**: Agent logs and observations stored in 0G Storage for verifiability

### Game Engine & Client

- **On-Chain ECS**: [lattice.xyz/recs](https://github.com/latticexyz/recs) for Entity Component System design patterns
- **Rendering**: [Noa voxel engine](https://github.com/fenomas/noa) for 3D voxel world
- **Architecture**: Efficient state synchronization between blockchain and client

## 🎲 Fair Randomness

**The Challenge**: Chainlink VRF's ~20-second confirmation latency breaks gameplay flow for actions like catching creatures.

**Our Solution**: Commit-and-reveal scheme
- Agents periodically reveal pre-hashed seeds
- Seeds settle RNG outcomes instantly
- Players verify fairness post-reveal
- Cryptographic guarantees without UX compromise

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Base, Solana |
| Wallets | CDP AgentKit, CDP Embedded Wallet |
| AI Inference | 0G TEE, AiMo Network (x402) |
| Smart Contracts | ERC-721, ERC-8004, chaoschain-sdk |
| Storage | 0G Storage |
| Game Engine | lattice.xyz/recs, Noa |
| Randomness | Commit-reveal scheme |

## Development
Place `.env` file in the packages where they are used, not in the root directory
for example, in package/contract-client, put admin_private_key for admin wallet

### to ensure send tx as admin
anvil private key
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
in apps/agent, need to put openrounter, deepseek, api 

### for local development
first, 
```shell
$ pnpm install
```
then, setup config for local contract address and rpc

finally

```shell
$ pnpm install
$ pnpm dev
```


