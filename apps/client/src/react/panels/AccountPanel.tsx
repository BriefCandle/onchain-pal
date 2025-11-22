import React, { useState } from "react";
import { useCDPWallet } from "../wallet/useCDPWallet";
import { AuthButton } from "@coinbase/cdp-react";
import {
  formatWadNumber,
  truncateAddress,
} from "@onchain-pal/contract-client/utils";
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
  const { isConnected } = useCDPWallet();
  if (isConnected) return null;

  return (
    <div className="absolute pointer-events-auto top-1 right-1 z-30 flex flex-col-reverse items-start">
      <div className="flex flex-col items-end space-y-1">
        <AuthButton />
      </div>
    </div>
  );
}

export function AccountPanel() {
  const { address, isConnected } = useCDPWallet();
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
  const { signOut } = useCDPWallet();

  return (
    <div className="relative bg-black rounded-lg shadow-xl border border-gray-200 px-2 py-1 flex flex-col items-center space-y-1 text-xs">
      <button
        onClick={() => signOut()}
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
