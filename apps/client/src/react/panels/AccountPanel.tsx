import React, { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import {
  formatWadNumber,
  truncateAddress,
} from "@onchain-pal/contract-client/utils";
import { config } from "../../wagmi";
import { Hex } from "viem";
// import {
//   useERC20Balance,
//   useERC20BalanceContract,
//   useERC20BalancePlayer,
// } from "../../hooks/useBalance";
// import { useERC20Balance } from "../../hooks/useERC20Balance";
// import { ERC20_CONTRACT_ADDRESS, FT_NAME } from "@voxelai/contract-client";

// used in landing overlay
export function ConnectButton() {
  const { isConnected } = useAccount();
  const [toggled, setToggled] = useState<boolean>(false);
  const { status } = useAccount();
  const { connectors, connect, error } = useConnect();
  const connected = isConnected;
  if (connected) return null;

  return (
    <div className="absolute pointer-events-auto top-1 right-1 z-30 flex flex-col-reverse items-start">
      <div className="flex flex-col items-end space-y-1">
        <button
          onClick={() => setToggled((prev) => !prev)}
          className={`px-4 py-2 rounded bg-gray-800 text-white shadow hover:bg-gray-700 transition-colors ${toggled ? "border-1 border-red-500 " : ""}`}
        >
          Connect
        </button>
        {toggled && (
          <div className="relative bg-black rounded-lg shadow-xl border border-gray-200 p-2 flex flex-col items-center space-y-3 w-[140px] text-sm">
            {connectors.map((connector) => (
              <button
                className="px-4 py-1 rounded bg-black text-white font-semibold border border-gray-300 hover:bg-gray-900 transition text-sm"
                key={connector.uid}
                onClick={() =>
                  connect({ connector, chainId: config.chains[0].id })
                }
                type="button"
              >
                {connector.name}
              </button>
            ))}
            {/* <div className="text-gray-700 text-sm mt-2">{status}</div> */}
            {error && (
              <div className="text-red-400 text-xs">{error.message}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function AccountPanel() {
  const { address, isConnected } = useAccount();
  const [toggled, setToggled] = useState<boolean>(false);
  if (!isConnected) return null;
  return (
    <div className="absolute pointer-events-auto top-1 right-1 z-50 flex flex-col-reverse items-start">
      <div className="flex flex-col items-end space-y-0.5">
        <button
          onClick={() => setToggled((prev) => !prev)}
          className={`px-2 py-1.5 rounded text-white text-sm shadow bg-gray-800 hover:bg-gray-700 transition-colors ${toggled ? "border-1 border-green-500 " : ""}`}
        >
          {address ? truncateAddress(address) : "Connect"}
        </button>
        {toggled && <ConnectedAccountPanel />}
      </div>
    </div>
  );
}

export function ConnectedAccountPanel() {
  const { disconnect } = useDisconnect();

  return (
    <div className="relative bg-black rounded-lg shadow-xl border border-gray-200 px-2 py-1 flex flex-col items-center space-y-1 text-xs">
      {/* <div className="flex flex-col items-end">
        <div className="grid grid-cols-2 gap-1.5 italic text-gray-400">
          <span>Parcel: </span>
          <span className="flex flex-row space-x-1">
            <HexDisplay hex={PARCEL_CONTRACT_ADDRESS} />
            <ExplorerUrl address={PARCEL_CONTRACT_ADDRESS} />
          </span>
          <span>Hero: </span>
          <span className="flex flex-row space-x-1">
            <HexDisplay hex={HERO_CONTRACT_ADDRESS} />
            <ExplorerUrl address={HERO_CONTRACT_ADDRESS} />
          </span> 
          <span>Player Balances:</span>
          <PlayerBalances />
          <span>In Game Balances:</span>
          <ContractBalances />
        </div>
      </div> */}
      {/* <div className="mt-2 self-center text-xs text-gray-400 max-w-[350px] text-center">
        <HintDisplay />
      </div> */}
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

// export function ERC20Balance({
//   owner,
//   erc20Address,
// }: {
//   owner: Hex;
//   erc20Address: Hex;
// }) {
//   const balance = useERC20Balance(owner, erc20Address);
//   const balanceStr = formatWadNumber(balance.data?.value ?? 0n, 0);
//   return (
//     <div>
//       {FT_NAME}: <span className="underline">{balanceStr}</span>
//     </div>
//   );
// }
