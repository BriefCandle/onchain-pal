import { useSwitchChain, useAccount } from "wagmi";
import type { Chain } from "viem";
import {
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { CDP_SUPPORTED_CHAINS, EXTERNAL_SUPPORTED_CHAINS } from "./wagmiConfig";

interface ChainSelectorProps {
  walletType: "cdp" | "external";
}

export function ChainSelector({ walletType }: ChainSelectorProps) {
  const { chain: currentChain } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  // Filter chains based on wallet type
  const availableChains =
    walletType === "cdp" ? CDP_SUPPORTED_CHAINS : EXTERNAL_SUPPORTED_CHAINS;

  const handleSwitchChain = async (chain: Chain) => {
    if (chain.id === currentChain?.id) return;

    try {
      await switchChain({ chainId: chain.id });
    } catch (error) {
      toast.error("Failed to switch chain", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger disabled={isPending}>
        {isPending
          ? "Switching..."
          : `Chain: ${currentChain?.name || "Unknown"}`}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {availableChains.map((chain) => (
          <DropdownMenuItem
            key={chain.id}
            onClick={() => handleSwitchChain(chain)}
            disabled={chain.id === currentChain?.id || isPending}
          >
            {chain.name}
            {chain.id === currentChain?.id && " (current)"}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
