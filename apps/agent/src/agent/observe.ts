import {
  NetworkComponents,
  unixTimeSecond,
} from "@onchain-pal/contract-client";
import { getAgentContext } from "@onchain-pal/contract-client";

export function observe({
  components,
  agentId,
}: {
  components: NetworkComponents;
  agentId: number;
}) {
  const agentContext = getAgentContext(components, agentId);
  const currentTime = unixTimeSecond();

  const observations =
    `Current state:\n${agentContext}\nTime: ${currentTime}`.trim();
  return observations;
}
