import { useIsSignedIn, useCurrentUser, useSignOut } from "@coinbase/cdp-hooks";

export function useCDPWallet() {
  const { isSignedIn } = useIsSignedIn();
  const { currentUser } = useCurrentUser();
  const { signOut } = useSignOut();

  // Get smart account address (preferred) or EOA as fallback
  const smartAccount = currentUser?.evmSmartAccounts?.[0];
  const eoaAddress = currentUser?.evmAccounts?.[0];

  return {
    isConnected: isSignedIn,
    address: smartAccount ?? eoaAddress,
    smartAccount,
    eoaAddress,
    signOut,
  };
}
