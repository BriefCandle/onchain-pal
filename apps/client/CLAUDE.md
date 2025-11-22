# Chain Switching Implementation Guide

## Overview

Add chain switching functionality to `MultiWalletButton.tsx` with:
- Dropdown submenu for chain selection
- Chain filtering by wallet type (CDP vs External)
- Toast notifications for switch failures
- Visual indicator of current chain

## Prerequisites

Install shadcn toast component:
```bash
# Already have Radix primitives, just need the toast component files
```

## Implementation Steps

### Step 1: Create Toast Component

Create `src/components/ui/toast.tsx` and `src/components/ui/toaster.tsx` using shadcn/ui toast pattern with Radix `@radix-ui/react-toast`.

Create `src/components/ui/use-toast.ts` hook for toast state management.

### Step 2: Define Chain Configuration

Update `src/react/wallet/wagmiConfig.tsx`:

```typescript
import { base, baseSepolia } from "wagmi/chains";
import type { Chain } from "viem";

// Define which chains each wallet type supports
export const CDP_SUPPORTED_CHAINS: Chain[] = [baseSepolia]; // CDP smart wallet - testnet only for now
export const EXTERNAL_SUPPORTED_CHAINS: Chain[] = [base, baseSepolia]; // External wallets - both networks

// All supported chains (union)
export const ALL_SUPPORTED_CHAINS: Chain[] = [base, baseSepolia];
```

### Step 3: Create Chain Selector Submenu Component

Create `src/react/wallet/ChainSelector.tsx`:

```typescript
import { useSwitchChain, useAccount } from "wagmi";
import type { Chain } from "viem";
import {
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { CDP_SUPPORTED_CHAINS, EXTERNAL_SUPPORTED_CHAINS } from "./wagmiConfig";

interface ChainSelectorProps {
  walletType: "cdp" | "external";
}

export function ChainSelector({ walletType }: ChainSelectorProps) {
  const { chain: currentChain } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  const { toast } = useToast();

  // Filter chains based on wallet type
  const availableChains = walletType === "cdp" 
    ? CDP_SUPPORTED_CHAINS 
    : EXTERNAL_SUPPORTED_CHAINS;

  const handleSwitchChain = async (chain: Chain) => {
    if (chain.id === currentChain?.id) return;
    
    try {
      await switchChain({ chainId: chain.id });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to switch chain",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger disabled={isPending}>
        {isPending ? "Switching..." : `Chain: ${currentChain?.name || "Unknown"}`}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {availableChains.map((chain) => (
          <DropdownMenuItem
            key={chain.id}
            onClick={() => handleSwitchChain(chain)}
            disabled={chain.id === currentChain?.id || isPending}
          >
            {chain.name}
            {chain.id === currentChain?.id && " (current)"}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
```

### Step 4: Update MultiWalletButton.tsx

Add chain indicator and ChainSelector to the connected state dropdown:

```typescript
import { ChainSelector } from "./ChainSelector";

// In the connected state return:
if (isConnected && address) {
  const isCDP = connector?.id === "cdp-embedded-wallet";
  const walletType = isCDP ? "cdp" : "external";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={isCDP ? "secondary" : "default"} size="sm" className="gap-2">
          {/* Chain indicator */}
          <span className="text-xs opacity-70">[{chain?.name || "?"}]</span>
          {/* Wallet type indicator */}
          <span className="text-xs opacity-70">{isCDP ? "[CDP]" : "[EXT]"}</span>
          {truncateAddress(address)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{connector?.name || "Wallet"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Chain Selector Submenu */}
        <ChainSelector walletType={walletType} />
        
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(address)}>
          Copy Address
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => disconnect()}>
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Step 5: Add Toaster to App Root

Update `src/main.tsx` to include the Toaster component:

```typescript
import { Toaster } from "@/components/ui/toaster";

// In the render:
ReactDOM.createRoot(document.getElementById("root")!).render(
  <CDPHooksProvider config={cdpConfig}>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <Root />
        <Toaster />
        <Analytics />
      </QueryClientProvider>
    </WagmiProvider>
  </CDPHooksProvider>,
);
```

### Step 6: Update dropdown-menu.tsx

Add submenu components to `src/components/ui/dropdown-menu.tsx`:

```typescript
// Add these exports for submenu support
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuSubTrigger = React.forwardRef<...>(...);
const DropdownMenuSubContent = React.forwardRef<...>(...);

export {
  // ... existing exports
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};
```

## File Changes Summary

| File | Action |
|------|--------|
| `src/components/ui/toast.tsx` | Create |
| `src/components/ui/toaster.tsx` | Create |
| `src/components/ui/use-toast.ts` | Create |
| `src/components/ui/dropdown-menu.tsx` | Update (add submenu components) |
| `src/react/wallet/wagmiConfig.tsx` | Update (add chain type exports) |
| `src/react/wallet/ChainSelector.tsx` | Create |
| `src/react/wallet/MultiWalletButton.tsx` | Update (add chain indicator + selector) |
| `src/main.tsx` | Update (add Toaster) |

## Chain Support Configuration

Adjust these arrays in `wagmiConfig.tsx` based on your requirements:

```typescript
// CDP embedded wallet supported chains
export const CDP_SUPPORTED_CHAINS: Chain[] = [baseSepolia];

// External wallet supported chains  
export const EXTERNAL_SUPPORTED_CHAINS: Chain[] = [base, baseSepolia];
```

## Visual Design

**Button appearance when connected:**
```
[Base Sepolia] [CDP] 0x1234...5678
```

**Dropdown menu structure:**
```
Coinbase Wallet
─────────────────
Chain: Base Sepolia  →  ┌─────────────────┐
                        │ Base            │
                        │ Base Sepolia ✓  │
                        └─────────────────┘
─────────────────
Copy Address
─────────────────
Disconnect
```

## Error Handling

Toast notifications appear for:
- Chain switch rejection by user (external wallets)
- Network errors during switch
- Unsupported chain errors

Toast styling uses `variant="destructive"` for errors.
