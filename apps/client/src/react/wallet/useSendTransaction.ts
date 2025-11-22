import { useSendUserOperation } from "@coinbase/cdp-hooks";
import { useCDPWallet } from "./useCDPWallet";
import { Hex, encodeFunctionData, Abi } from "viem";

type ContractCallOptions = {
  address: Hex;
  abi: Abi;
  functionName: string;
  args: unknown[];
};

export function useSendTransaction() {
  const { sendUserOperation, status, data, error } = useSendUserOperation();
  const { isConnected, smartAccount } = useCDPWallet();

  const sendContractTransaction = async (options: ContractCallOptions) => {
    if (!isConnected || !smartAccount) {
      throw new Error("Smart account not found");
    }

    const calldata = encodeFunctionData({
      abi: options.abi,
      functionName: options.functionName,
      args: options.args,
    });

    // Send the user operation using CDP smart account
    const result = await sendUserOperation({
      evmSmartAccount: smartAccount as Hex,
      network: "base-sepolia",
      calls: [
        {
          to: options.address,
          data: calldata,
          value: 0n,
        },
      ],
    });

    // Wait for transaction receipt if we have a hash
    if (result.userOperationHash) {
      // Note: userOperationHash is different from transactionHash
      // The actual transaction hash comes after the user op is included
      console.log("User Operation Hash:", result.userOperationHash);
    }

    return result;
  };

  return {
    sendContractTransaction,
    transactionState: data,
    status,
    error,
    isConnected,
  };
}
