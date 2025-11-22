import { Buffer } from "buffer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { CDPEmbeddedWalletProvider } from "./react/wallet/CDPEmbeddedWalletProvider";
import { useState } from "react";
import { useEffect } from "react";
import { setup } from "./mud/setup";
import { MUDProvider } from "./MUDContext";
import App from "./App";
import "./index.css";
import { createNoaLayer } from "./noa/createNoaLayer";
import { setupPreComputed } from "./setup/setupPreComputed";
// import { createMockSystem } from "./mock/createMockSystem";

globalThis.Buffer = Buffer;

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <CDPEmbeddedWalletProvider>
      <Root />
      <Analytics />
    </CDPEmbeddedWalletProvider>
  </QueryClientProvider>,
);

function Root() {
  const [result, setResult] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function initialize() {
      try {
        setReady(false);
        setError(null);

        // Setup network and components
        const setupResult = await setup();

        setupPreComputed(setupResult.components);

        // Initialize noa engine
        const noa = createNoaLayer(setupResult);
        (window as any).noa = noa;

        // mock system
        // createMockSystem(setupResult);

        setResult(setupResult);
        setReady(true);
      } catch (err) {
        console.error("Failed to initialize:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setReady(false);
      }
    }

    initialize();
  }, []);

  // Show loading screen while setup is in progress
  if (!ready) {
    return (
      <div className="fixed top-0 left-0 w-full h-full bg-[#1a1a1a] flex flex-col items-center justify-center z-[9999] text-white">
        <div className="text-3xl font-bold mb-5">Loading Game...</div>
        <div className="text-base opacity-70">
          Initializing network and game engine
        </div>
        {/* Optional: Add a spinner here */}
      </div>
    );
  }

  // Show error screen if setup failed
  if (error) {
    return (
      <div className="fixed top-0 left-0 w-full h-full bg-[#1a1a1a] flex flex-col items-center justify-center z-[9999] text-red-500">
        <div className="text-2xl font-bold mb-5">Failed to Initialize</div>
        <div className="text-base opacity-70">{error.message}</div>
      </div>
    );
  }

  // Show game UI once everything is loaded
  if (!result || !ready) {
    return (
      <div className="absolute h-full w-full pointer-events-none ">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-2xl font-bold">
          Loading...
        </div>
      </div>
    );
  }

  console.log(result, ready);

  return (
    <MUDProvider value={result}>
      {/* <MobileRotation /> */}
      <App />
    </MUDProvider>
  );
}
