# External Wallet Integration Guide

## Overview

This guide documents the implementation plan for supporting both CDP embedded wallet and external wallets (via wagmi) in the onchain-pal client.

**Design Decisions:**
- User can choose between CDP wallet OR external wallet (not both simultaneously active)
- External wallet supports all configured chains with chain switching
- Two separate connect buttons in UI
- Transaction hook exposes which wallet type is being used

---

## File Changes

### 1. `src/react/wallet/wagmiConfig.tsx`

Add connectors for external wallets and include `baseSepolia` chain.

```tsx
import { createConfig, http } from "wagmi";
import { ronin, zeroGMainnet, base, baseSepolia } from "wagmi/chains";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";

// Get from https://cloud.walletconnect.com
const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "";

export const wagmiConfig = createConfig({
  chains: [base, baseSepolia, ronin, zeroGMainnet],
  connectors: [
    injected(),
    coinbaseWallet({ appName: "onchain-pal" }),
    walletConnect({ projectId: WALLETCONNECT_PROJECT_ID }),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
    [ronin.id]: http(),
    [zeroGMainnet.id]: http(),
  },
});

// Export chain list for UI usage
export const supportedChains = [base, baseSepolia, ronin, zeroGMainnet];
```

**Notes:**
- Add `VITE_WALLETCONNECT_PROJECT_ID` to `.env` file
- WalletConnect projectId is required for WalletConnect connector to work

---

### 2. `src/react/wallet/useWallet.ts` (NEW FILE)

Unified wallet hook that manages both wallet types and exposes active wallet info.

```tsx
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { useCDPWallet } from "./useCDPWallet";
import { Hex } from "viem";
import { useState, useCallback } from "react";

export type WalletType = "cdp" | "external" | null;

export function useWallet() {
  // Track which wallet user has chosen to use
  const [activeWalletType, setActiveWalletType] = useState<WalletType>(null);

  // CDP wallet state
  const cdp = useCDPWallet();

  // External wallet state (wagmi)
  const { 
    address: externalAddress, 
    isConnected: externalConnected,
    chain: currentChain,
    chainId,
  } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();

  // Determine effective connection based on user choice
  const isConnected = activeWalletType === "cdp" 
    ? cdp.isConnected 
    : activeWalletType === "external" 
      ? externalConnected 
      : false;

  const address: Hex | undefined = activeWalletType === "cdp"
    ? cdp.address
    : activeWalletType === "external"
      ? externalAddress
      : undefined;

  // Activate CDP wallet
  const activateCDP = useCallback(() => {
    if (cdp.isConnected) {
      // Disconnect external if connected
      if (externalConnected) wagmiDisconnect();
      setActiveWalletType("cdp");
    }
  }, [cdp.isConnected, externalConnected, wagmiDisconnect]);

  // Activate external wallet (called after successful wagmi connect)
  const activateExternal = useCallback(() => {
    if (externalConnected) {
      // Sign out CDP if connected
      if (cdp.isConnected) cdp.signOut();
      setActiveWalletType("external");
    }
  }, [externalConnected, cdp]);

  // Unified disconnect
  const disconnect = useCallback(() => {
    if (activeWalletType === "cdp") {
      cdp.signOut();
    } else if (activeWalletType === "external") {
      wagmiDisconnect();
    }
    setActiveWalletType(null);
  }, [activeWalletType, cdp, wagmiDisconnect]);

  // Auto-detect wallet type on mount if already connected
  // (handles page refresh scenarios)
  useEffect(() => {
    if (activeWalletType === null) {
      if (cdp.isConnected) {
        setActiveWalletType("cdp");
      } else if (externalConnected) {
        setActiveWalletType("external");
      }
    }
  }, [cdp.isConnected, externalConnected, activeWalletType]);

  return {
    // Unified state
    isConnected,
    address,
    walletType: activeWalletType,

    // CDP-specific
    cdp: {
      ...cdp,
      activate: activateCDP,
    },

    // External wallet specific
    external: {
      address: externalAddress,
      isConnected: externalConnected,
      currentChain,
      chainId,
      switchChain,
      isSwitchingChain,
      disconnect: wagmiDisconnect,
      activate: activateExternal,
    },

    // Actions
    disconnect,
    setActiveWalletType,
  };
}
```

**Notes:**
- Add `import { useEffect } from "react";` at the top
- The hook tracks which wallet type the user has chosen
- Auto-detects existing connections on page refresh
- Provides chain switching for external wallets

---

### 3. `src/react/wallet/useSendTransaction.ts`

Update to support both wallet types with explicit type exposure.

```tsx
import { useSendUserOperation } from "@coinbase/cdp-hooks";
import { useWriteContract, useAccount } from "wagmi";
import { useCDPWallet } from "./useCDPWallet";
import { useWallet, WalletType } from "./useWallet";
import { Hex, encodeFunctionData, Abi } from "viem";

type ContractCallOptions = {
  address: Hex;
  abi: Abi;
  functionName: string;
  args: unknown[];
  value?: bigint;
};

type SendTransactionResult = {
  // CDP returns userOperationHash, wagmi returns txHash
  hash?: Hex;
  userOperationHash?: string;
  walletType: WalletType;
};

export function useSendTransaction() {
  const { walletType, isConnected } = useWallet();
  
  // CDP hooks
  const { 
    sendUserOperation, 
    status: cdpStatus, 
    data: cdpData, 
    error: cdpError 
  } = useSendUserOperation();
  const { smartAccount } = useCDPWallet();

  // Wagmi hooks
  const { 
    writeContractAsync, 
    status: wagmiStatus, 
    data: wagmiData, 
    error: wagmiError,
    reset: resetWagmi,
  } = useWriteContract();
  const { chainId } = useAccount();

  const sendContractTransaction = async (
    options: ContractCallOptions
  ): Promise<SendTransactionResult> => {
    if (!isConnected) {
      throw new Error("No wallet connected");
    }

    if (walletType === "cdp") {
      if (!smartAccount) {
        throw new Error("CDP smart account not found");
      }

      const calldata = encodeFunctionData({
        abi: options.abi,
        functionName: options.functionName,
        args: options.args,
      });

      const result = await sendUserOperation({
        evmSmartAccount: smartAccount as Hex,
        network: "base-sepolia",
        calls: [
          {
            to: options.address,
            data: calldata,
            value: options.value ?? 0n,
          },
        ],
      });

      return {
        userOperationHash: result.userOperationHash,
        walletType: "cdp",
      };
    }

    if (walletType === "external") {
      const hash = await writeContractAsync({
        address: options.address,
        abi: options.abi,
        functionName: options.functionName,
        args: options.args,
        value: options.value,
      });

      return {
        hash,
        walletType: "external",
      };
    }

    throw new Error("Unknown wallet type");
  };

  // Determine current status based on active wallet type
  const status = walletType === "cdp" ? cdpStatus : wagmiStatus;
  const data = walletType === "cdp" ? cdpData : wagmiData;
  const error = walletType === "cdp" ? cdpError : wagmiError;

  return {
    sendContractTransaction,
    status,
    data,
    error,
    walletType,
    isConnected,
    // Expose chain info for external wallet
    chainId: walletType === "external" ? chainId : undefined,
    // Reset function (useful for clearing errors)
    reset: walletType === "external" ? resetWagmi : undefined,
  };
}
```

---

### 4. `src/react/panels/AccountPanel.tsx`

Add separate buttons for CDP and external wallet, with chain selector for external.

```tsx
import React, { useState } from "react";
import { useWallet } from "../wallet/useWallet";
import { useConnect } from "wagmi";
import { AuthButton } from "@coinbase/cdp-react";
import { truncateAddress } from "@onchain-pal/contract-client/utils";
import { supportedChains } from "../wallet/wagmiConfig";

// CDP Connect Button - used in landing overlay
export function CDPConnectButton() {
  const { cdp } = useWallet();
  if (cdp.isConnected) return null;

  return <AuthButton />;
}

// External Wallet Connect Button
export function ExternalConnectButton() {
  const { connectors, connect, isPending } = useConnect();
  const { external, setActiveWalletType } = useWallet();
  const [showOptions, setShowOptions] = useState(false);

  if (external.isConnected) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions((prev) => !prev)}
        className="px-2 py-1.5 rounded text-white text-sm shadow bg-blue-700 hover:bg-blue-600 transition-colors"
        disabled={isPending}
      >
        {isPending ? "Connecting..." : "External Wallet"}
      </button>
      
      {showOptions && (
        <div className="absolute right-0 mt-1 bg-gray-800 rounded-lg shadow-xl border border-gray-600 p-2 min-w-[160px] z-50">
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => {
                connect(
                  { connector },
                  {
                    onSuccess: () => {
                      setActiveWalletType("external");
                      setShowOptions(false);
                    },
                  }
                );
              }}
              disabled={isPending}
              className="w-full text-left px-3 py-2 rounded text-white text-sm hover:bg-gray-700 transition-colors"
            >
              {connector.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Chain Selector for External Wallet
export function ChainSelector() {
  const { external, walletType } = useWallet();

  if (walletType !== "external" || !external.isConnected) return null;

  return (
    <select
      value={external.chainId}
      onChange={(e) => external.switchChain({ chainId: Number(e.target.value) })}
      disabled={external.isSwitchingChain}
      className="px-2 py-1 rounded bg-gray-700 text-white text-xs border border-gray-600"
    >
      {supportedChains.map((chain) => (
        <option key={chain.id} value={chain.id}>
          {chain.name}
        </option>
      ))}
    </select>
  );
}

// Connect Buttons Container (for landing overlay)
export function ConnectButton() {
  const { isConnected } = useWallet();
  if (isConnected) return null;

  return (
    <div className="absolute pointer-events-auto top-1 right-1 z-30 flex flex-col-reverse items-start">
      <div className="flex flex-col items-end space-y-2">
        <CDPConnectButton />
        <ExternalConnectButton />
      </div>
    </div>
  );
}

// Main Account Panel
export function AccountPanel() {
  const { address, isConnected, walletType } = useWallet();
  const [toggled, setToggled] = useState<boolean>(false);

  if (!isConnected) return null;

  return (
    <div className="absolute pointer-events-auto top-1 right-1 z-50 flex flex-col-reverse items-start">
      <div className="flex flex-col items-end space-y-0.5">
        <div className="flex items-center gap-2">
          <ChainSelector />
          <button
            onClick={() => setToggled((prev) => !prev)}
            className={`px-2 py-1.5 rounded text-white text-sm shadow transition-colors ${
              walletType === "cdp" 
                ? "bg-gray-800 hover:bg-gray-700" 
                : "bg-blue-700 hover:bg-blue-600"
            } ${toggled ? "border border-green-500" : ""}`}
          >
            <span className="text-xs opacity-70 mr-1">
              {walletType === "cdp" ? "[CDP]" : "[EXT]"}
            </span>
            {address ? truncateAddress(address) : "Connect"}
          </button>
        </div>
        {toggled && <ConnectedAccountPanel />}
      </div>
    </div>
  );
}

// Connected Account Details Panel
export function ConnectedAccountPanel() {
  const { disconnect, walletType, external } = useWallet();

  return (
    <div className="relative bg-black rounded-lg shadow-xl border border-gray-200 px-2 py-1 flex flex-col items-center space-y-1 text-xs">
      {walletType === "external" && external.currentChain && (
        <div className="text-gray-400 text-xs py-1">
          Chain: {external.currentChain.name}
        </div>
      )}
      <button
        onClick={() => disconnect()}
        className="m-1 px-4 py-2 rounded bg-black text-white border border-gray-300 hover:bg-gray-900 transition self-end"
      >
        Disconnect
      </button>
    </div>
  );
}
```

---

### 5. Environment Variables

Add to `.env` or `.env.local`:

```env
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

Get a project ID from https://cloud.walletconnect.com

---

## Implementation Checklist

- [ ] Update `wagmiConfig.tsx` with connectors and chains
- [ ] Create `useWallet.ts` unified wallet hook
- [ ] Update `useSendTransaction.ts` to support both wallet types
- [ ] Update `AccountPanel.tsx` with dual connect buttons and chain selector
- [ ] Add WalletConnect project ID to environment variables
- [ ] Test CDP wallet flow (sign in, transaction, disconnect)
- [ ] Test external wallet flow (connect, chain switch, transaction, disconnect)
- [ ] Test switching between wallet types
- [ ] Update any components that import from old `useCDPWallet` to use `useWallet`

---

## Dependencies to Verify

Ensure these packages are installed:

```bash
pnpm add wagmi viem @tanstack/react-query
```

The wagmi connectors are included in the wagmi package, no separate install needed.

---

## Architecture Diagram

```
                    +------------------+
                    |   useWallet()    |  <-- Unified hook
                    +------------------+
                           |
          +----------------+----------------+
          |                                 |
  +-------v-------+               +---------v---------+
  |  useCDPWallet |               |  wagmi hooks      |
  |  (CDP hooks)  |               |  (useAccount,     |
  +---------------+               |   useConnect,     |
          |                       |   useDisconnect,  |
          |                       |   useSwitchChain) |
          |                       +-------------------+
          |                                 |
  +-------v-------+               +---------v---------+
  | CDP Provider  |               |  WagmiProvider    |
  | (Smart Acct)  |               |  (EOA)            |
  +---------------+               +-------------------+
```

---

## Transaction Flow

```
useSendTransaction.sendContractTransaction(options)
    |
    v
Check walletType from useWallet()
    |
    +-- walletType === "cdp"
    |       |
    |       v
    |   sendUserOperation() --> ERC-4337 UserOp
    |       |
    |       v
    |   Return { userOperationHash, walletType: "cdp" }
    |
    +-- walletType === "external"
            |
            v
        writeContractAsync() --> Standard TX
            |
            v
        Return { hash, walletType: "external" }
```
