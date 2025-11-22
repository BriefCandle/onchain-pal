import React, { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useSignInWithEmail, useVerifyEmailOTP } from "@coinbase/cdp-hooks";
import { truncateAddress } from "@onchain-pal/contract-client/utils";

// shadcn/ui components
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChainSelector } from "./ChainSelector";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function MultiWalletButton() {
  const { address, isConnected, connector, chain } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  // Email OTP state
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [flowId, setFlowId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // CDP hooks for email auth
  const { signInWithEmail } = useSignInWithEmail();
  const { verifyEmailOTP } = useVerifyEmailOTP();

  // Filter connectors by type
  const cdpConnector = connectors.find((c) => c.id === "cdp-embedded-wallet");
  const externalConnectors = connectors.filter(
    (c) => c.id !== "cdp-embedded-wallet",
  );

  const handleEmailSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!flowId) {
        // Send OTP to email
        const result = await signInWithEmail({ email });
        setFlowId(result.flowId);
      } else {
        // Verify OTP
        await verifyEmailOTP({ flowId, otp });
        // After verification, connect via CDP connector
        if (cdpConnector) {
          connect({ connector: cdpConnector });
        }
        setShowEmailDialog(false);
        resetEmailState();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const resetEmailState = () => {
    setEmail("");
    setOtp("");
    setFlowId(null);
    setError(null);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      resetEmailState();
    }
    setShowEmailDialog(open);
  };

  // Connected state
  if (isConnected && address) {
    const isCDP = connector?.id === "cdp-embedded-wallet";
    const walletType = isCDP ? "cdp" : "external";

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={isCDP ? "secondary" : "default"}
            size="sm"
            className="gap-2"
          >
            {/* Chain indicator */}
            <span className="text-xs opacity-70">[{chain?.name || "?"}]</span>
            {/* Wallet type indicator */}
            <span className="text-xs opacity-70">
              {isCDP ? "[CDP]" : "[EXT]"}
            </span>
            {truncateAddress(address)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{connector?.name || "Wallet"}</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Chain Selector Submenu */}
          <ChainSelector walletType={walletType} />

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => navigator.clipboard.writeText(address)}
          >
            Copy Address
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => disconnect()}>
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Disconnected state
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isPending}>
            {isPending ? "Connecting..." : "Connect Wallet"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Social/Email Login Section */}
          <DropdownMenuLabel>Sign in with</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setShowEmailDialog(true)}>
            Email
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          {/* External Wallets Section */}
          <DropdownMenuLabel>External Wallets</DropdownMenuLabel>
          {externalConnectors.map((connector) => (
            <DropdownMenuItem
              key={connector.uid}
              onClick={() => connect({ connector })}
              disabled={isPending}
            >
              {connector.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Email OTP Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {flowId ? "Enter Verification Code" : "Sign in with Email"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {error && <div className="text-red-500 text-sm">{error}</div>}
            {!flowId ? (
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
              />
            ) : (
              <Input
                type="text"
                placeholder="Enter OTP code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
              />
            )}
            <Button
              onClick={handleEmailSubmit}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Loading..." : flowId ? "Verify" : "Send Code"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
