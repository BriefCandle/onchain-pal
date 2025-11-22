import { Hex } from "viem";

export function FlaunchUrl({
  name,
  tokenAddress,
}: {
  name: string;
  tokenAddress: Hex;
}) {
  const url = "https://flaunch.gg/base-sepolia/coin/" + tokenAddress;
  return (
    <div className="w-full mx-auto">
      <button
        onClick={() => window.open(url, "_blank")}
        className="btn btn-pink w-full"
      >
        Get {name} on Flaunch
      </button>
    </div>
  );
}
