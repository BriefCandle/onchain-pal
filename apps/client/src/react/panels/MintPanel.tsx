// display playerEntity (i.e., move to coord) & trainerEntity (what is to moved), their distance, and a move button

import { useComponentValue } from "@latticexyz/react";
import { useMUD } from "../../MUDContext";
import { useCurrPositionMUD } from "../hooks/usePath";
import { adminClient } from "../actions/Move";
import { mintTrainerTx } from "@onchain-pal/contract-client";

export function MintPanel() {
  const handleMint = async () => {
    if (!adminClient) return;
    // To Kelsen: change this to use mintTrainerTxWithSmartAccount
    await mintTrainerTx(adminClient);
  };

  return (
    <div className="absolute pointer-events-auto bottom-1/4 right-1/4 bg-gray-800 p-2 rounded-md z-100 border">
      <div className="flex flex-col space-y-1">
        <button
          className="btn btn-primary bg-blue-500 text-white"
          onClick={async () => await handleMint()}
        >
          Mint Trainer
        </button>
      </div>
    </div>
  );
}
