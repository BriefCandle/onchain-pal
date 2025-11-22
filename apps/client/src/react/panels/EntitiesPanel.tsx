import { useComponentValue, useEntityQuery } from "@latticexyz/react";
import { useMUD } from "../../MUDContext";
import { Has, setComponent } from "@latticexyz/recs";
import { TARGET } from "@onchain-pal/contract-client";
import { useMemo } from "react";
import ItemContainer from "../ItemContainer";

export function EntitiesPanel() {
  const { components } = useMUD();
  const { TokenData, SelectedEntity } = components;
  const entities = useEntityQuery([Has(TokenData)]);
  const tokenIds = useMemo(
    () => entities.map((entity) => Number(entity)),
    [entities]
  );
  const selectedTokenId = useComponentValue(SelectedEntity, TARGET)?.tokenId;

  return (
    <div className="flex flex-col space-y-2">
      {tokenIds.map((tokenId) => (
        <div key={tokenId}>
          <span className="flex flex-row items-center space-x-2">
            <ItemContainer selected={selectedTokenId === tokenId}>
              {tokenId}
            </ItemContainer>
            {
              <button
                className="btn-blue"
                onClick={() => {
                  setComponent(SelectedEntity, TARGET, { tokenId });
                }}
              >
                Select
              </button>
            }
          </span>
        </div>
      ))}
    </div>
  );
}
