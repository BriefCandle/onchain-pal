import { useState } from "react";
import { Hex } from "viem";
import { gameContractConfig } from "@onchain-pal/contract-client";
import { useMUD } from "../../MUDContext";
import { useCurrPositionMUD } from "../hooks/usePath";

import { useSendTransaction } from "../wallet/useSendTransaction";

// for testing purpose
export function MoveButton() {
  const { components } = useMUD();
  const [tokenId, setTokenId] = useState(0);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const { sendContractTransaction, isConnected } = useSendTransaction();

  const currCoord = useCurrPositionMUD(components, tokenId);

  const handleMove = async () => {
    if (!isConnected) return;
    try {
      await sendContractTransaction({
        address: gameContractConfig.address as Hex,
        abi: gameContractConfig.abi,
        functionName: "move",
        args: [BigInt(tokenId), x, y],
      });
    } catch (error) {
      console.error("Move tx failed:", error);
    }
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
        disabled={!isConnected}
      >
        Move
      </button>
    </div>
  );
}
