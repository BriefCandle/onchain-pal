import React, { useState } from "react";
import { useWallet } from "../wallet/useWallet";
import { useConnect } from "wagmi";
import { AuthButton } from "@coinbase/cdp-react";
import { truncateAddress } from "@onchain-pal/contract-client/utils";
import { supportedChains } from "../wallet/wagmiConfig";
import { Hex } from "viem";

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
                  },
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
      onChange={(e) =>
        external.switchChain({ chainId: Number(e.target.value) })
      }
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

export function FlaunchUrl({
  name,
  tokenAddress,
}: {
  name: string;
  tokenAddress: Hex;
}) {
  const url = "https://flaunch.gg/base-sepolia/coin/" + tokenAddress;
  return (
    <div className="w-full mx-auto">
      <button
        onClick={() => window.open(url, "_blank")}
        className="btn btn-pink w-full"
      >
        Get {name} on Flaunch
      </button>
    </div>
  );
}
