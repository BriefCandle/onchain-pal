import { useAccount, useDisconnect, useSwitchChain } from "wagmi";
import { Hex } from "viem";

export type WalletType = "cdp" | "external" | null;

export function useWallet() {
  const { address, isConnected, connector, chain, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();

  // Determine wallet type from connector
  const walletType: WalletType = isConnected
    ? connector?.id === "cdp-embedded-wallet"
      ? "cdp"
      : "external"
    : null;

  return {
    address: address as Hex | undefined,
    isConnected,
    walletType,
    chain,
    chainId,
    switchChain,
    isSwitchingChain,
    disconnect,
    connector,
  };
}
