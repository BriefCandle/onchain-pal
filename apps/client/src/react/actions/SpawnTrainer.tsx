import { useState } from "react";
import { Hex } from "viem";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mintTrainerTx } from "@onchain-pal/contract-client";
import { useMUD } from "../../MUDContext";
import { useCurrPositionMUD } from "../hooks/usePath";
import { adminClient } from "./Move";

export function SpawnTrainerButton() {
  const { components } = useMUD();

  const handleMintTrainer = async () => {
    if (!adminClient) return;
    await mintTrainerTx(adminClient);
  };

  return (
    <div className="flex flex-col m-2 border-2">
      <button
        className="btn btn-primary bg-blue-500 text-white"
        onClick={async () => await handleMintTrainer()}
      >
        Mint Trainer
      </button>
    </div>
  );
}
