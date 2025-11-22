import { useSendUserOperation } from "@coinbase/cdp-hooks";
import { useWriteContract, useAccount } from "wagmi";
import { useCDPWallet } from "./useCDPWallet";
import { useWallet, WalletType } from "./useWallet";
import { Hex, encodeFunctionData, Abi } from "viem";

type ContractCallOptions = {
  address: Hex;
  abi: Abi;
  functionName: string;
  args: unknown[];
  value?: bigint;
};

type SendTransactionResult = {
  // CDP returns userOperationHash, wagmi returns txHash
  hash?: Hex;
  userOperationHash?: string;
  walletType: WalletType;
};

export function useSendTransaction() {
  const { walletType, isConnected } = useWallet();

  // CDP hooks
  const {
    sendUserOperation,
    status: cdpStatus,
    data: cdpData,
    error: cdpError,
  } = useSendUserOperation();
  const { smartAccount } = useCDPWallet();

  // Wagmi hooks
  const {
    writeContractAsync,
    status: wagmiStatus,
    data: wagmiData,
    error: wagmiError,
    reset: resetWagmi,
  } = useWriteContract();
  const { chainId } = useAccount();

  const sendContractTransaction = async (
    options: ContractCallOptions,
  ): Promise<SendTransactionResult> => {
    if (!isConnected) {
      throw new Error("No wallet connected");
    }

    if (walletType === "cdp") {
      if (!smartAccount) {
        throw new Error("CDP smart account not found");
      }

      const calldata = encodeFunctionData({
        abi: options.abi,
        functionName: options.functionName,
        args: options.args,
      });

      const result = await sendUserOperation({
        evmSmartAccount: smartAccount as Hex,
        network: "base-sepolia",
        calls: [
          {
            to: options.address,
            data: calldata,
            value: options.value ?? 0n,
          },
        ],
      });

      return {
        userOperationHash: result.userOperationHash,
        walletType: "cdp",
      };
    }

    if (walletType === "external") {
      const hash = await writeContractAsync({
        address: options.address,
        abi: options.abi,
        functionName: options.functionName,
        args: options.args,
        value: options.value,
      });

      return {
        hash,
        walletType: "external",
      };
    }

    throw new Error("Unknown wallet type");
  };

  // Determine current status based on active wallet type
  const status = walletType === "cdp" ? cdpStatus : wagmiStatus;
  const data = walletType === "cdp" ? cdpData : wagmiData;
  const error = walletType === "cdp" ? cdpError : wagmiError;

  return {
    sendContractTransaction,
    status,
    data,
    error,
    walletType,
    isConnected,
    // Expose chain info for external wallet
    chainId: walletType === "external" ? chainId : undefined,
    // Reset function (useful for clearing errors)
    reset: walletType === "external" ? resetWagmi : undefined,
  };
}
