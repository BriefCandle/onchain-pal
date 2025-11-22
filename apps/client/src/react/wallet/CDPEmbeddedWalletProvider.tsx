import { CDPReactProvider } from "@coinbase/cdp-react";

export function CDPEmbeddedWalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CDPReactProvider
      config={{
        projectId: "084032fc-4a60-48b9-aab9-794fd3c2077d",
        ethereum: {
          // if you want to create an EVM account on login
          createOnLogin: "smart", // or "smart" for smart accounts
        },
        appName: "onchain-pal",
      }}
    >
      {children}
    </CDPReactProvider>
  );
}
