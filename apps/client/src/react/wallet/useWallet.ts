import { useAccount, useDisconnect, useSwitchChain } from "wagmi";
import { useCDPWallet } from "./useCDPWallet";
import { Hex } from "viem";
import { useState, useCallback, useEffect } from "react";

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
  const isConnected =
    activeWalletType === "cdp"
      ? cdp.isConnected
      : activeWalletType === "external"
        ? externalConnected
        : false;

  const address: Hex | undefined =
    activeWalletType === "cdp"
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
