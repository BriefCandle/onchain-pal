import { useState } from "react";
import { Hex } from "viem";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { localhost, moveTx } from "@onchain-pal/contract-client";
import { useMUD } from "../../MUDContext";
import { useCurrPositionMUD } from "../hooks/usePath";
import { baseSepolia } from "viem/chains";

const PRIVATE_KEY = import.meta.env.VITE_PRIVATE_KEY as Hex | undefined;

export const adminClient = PRIVATE_KEY
  ? createWalletClient({
      account: privateKeyToAccount(PRIVATE_KEY),
      chain: localhost,
      transport: http("http://127.0.0.1:8545"),
      // chain: baseSepolia,
      // transport: http("https://sepolia.base.org"),
    })
  : undefined;

export function Move2Button() {}

// for testing purpose
export function MoveButton() {
  const { components } = useMUD();
  const [tokenId, setTokenId] = useState(0);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);

  const currCoord = useCurrPositionMUD(components, tokenId);

  const handleMove = async () => {
    if (!adminClient) return;
    await moveTx(adminClient, components, tokenId, { x, y }, "");
  };

  return (
    <div className="flex flex-col m-2 border-2">
      <div className="flex flex-row gap-2">
        <span>tokenId</span>
        <input
          className="w-12 bg-gray-800"
          type="number"
          value={tokenId}
          onChange={(e) => setTokenId(parseInt(e.target.value))}
        />
      </div>
      <div className="flex flex-row gap-2">
        <span>from coord: </span>
        <span>
          {currCoord?.x}, {currCoord?.y}
        </span>
      </div>

      <div className="flex flex-row gap-2">
        <span>to coord: </span>
        <input
          className="w-20 bg-gray-800"
          type="number"
          value={x}
          onChange={(e) => setX(parseInt(e.target.value))}
        />
        <input
          className="w-20 bg-gray-800"
          type="number"
          value={y}
          onChange={(e) => setY(parseInt(e.target.value))}
        />
      </div>

      <button
        className="btn btn-primary bg-blue-500 text-white"
        onClick={async () => await handleMove()}
      >
        Move
      </button>
    </div>
  );
}
