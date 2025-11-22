import { useCDPWallet } from "./react/wallet/useCDPWallet";
import React, { useEffect } from "react";
// import { loadComputedComponents } from "./mud/loadComputedComponents";
import { useMUD } from "./MUDContext";
import { Entity } from "@latticexyz/recs";
import { Overlay } from "./react/Overlay";

export default function App() {
  const { address, isConnected } = useCDPWallet();
  const result = useMUD();
  const { components } = result;

  // useHotkeys();

  useEffect(() => {
    // loadComputedComponents(components, address);
  }, []);

  return <Overlay />;
}
