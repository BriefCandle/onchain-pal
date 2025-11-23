import {
  defineSystem,
  Entity,
  getComponentValue,
  Has,
  UpdateType,
} from "@latticexyz/recs";
import {
  getCurrPositionMUD,
  NetworkComponents,
  TARGET,
  TokenDataFlat,
} from "@onchain-pal/contract-client";
import { SetupResult } from "../../mud/setup";
import { unixTimeSecond } from "@onchain-pal/contract-client/utils";
import { Engine } from "noa-engine";
import { PalEntity } from "./PalEntity";

// Map from tokenEntity to MonEntity instance
const entityMap = new Map<Entity, PalEntity>();

// Track which PalEntity the player is attached to (null if not attached)
let attachedPalEntity: PalEntity | null = null;

// Export function to check if an entity is a pal
export function isPalEntity(entityId: number): boolean {
  return Array.from(entityMap.values()).some(
    (palEntity: PalEntity) => palEntity.getNoaEntityId() === entityId
  );
}

export const createPalSystem = (result: SetupResult, noa: Engine) => {
  const {
    network: { world },
    components,
  } = result;
  const {
    TokenData,
    PathUpdatedEvent,
    SelectedEntity,
    TalkedEvent,
    MovedEvent,
  } = components;

  // Set up tick handler once
  setupMovementTick(noa);
  // setupPlayerLockTick(noa);

  defineSystem(world, [Has(TokenData)], ({ entity, type }) => {
    const tokenEntity = entity as Entity;
    const tokenId = Number(entity);

    if (type === UpdateType.Exit) {
      const monEntity = entityMap.get(tokenEntity);
      if (monEntity) {
        monEntity.dispose();
        entityMap.delete(tokenEntity);
      }
      return;
    }
    const palData = getComponentValue(TokenData, tokenEntity)!;

    if (type === UpdateType.Enter) {
      createPalEntity(tokenEntity, palData);
      return;
    }
  });

  function createPalEntity(tokenEntity: Entity, palData: TokenDataFlat) {
    const palEntity = new PalEntity(
      components,
      noa,
      Number(tokenEntity),
      palData
    );
    entityMap.set(tokenEntity, palEntity);
    return palEntity;
  }

  defineSystem(world, [Has(PathUpdatedEvent)], ({ entity, type }) => {
    if (type === UpdateType.Exit) return;
    const eventData = getComponentValue(PathUpdatedEvent, entity)!;
    const { tokenId, fromX, fromY, toX, toY, lastUpdated, duration } =
      eventData;
    const tokenEntity = tokenId.toString() as Entity;
    const palData = getComponentValue(TokenData, tokenEntity)!;

    if (type === UpdateType.Enter) {
      entityMap.get(tokenEntity)?.updatePalData(palData);
    }
  });

  defineSystem(world, [Has(SelectedEntity)], ({ entity, type }) => {
    if (type === UpdateType.Exit) {
      return detachPlayerFromPal(noa);
    }
    const tokenId = getComponentValue(SelectedEntity, TARGET)?.tokenId;
    if (!tokenId) return;
    const palEntity = getPalEntity(tokenId);
    if (!palEntity) return;

    attachPlayerToPal(noa, tokenId);
  });

  // // define system to update text when token data changes
  // // mock: update text every 10 seconds
  // setInterval(() => {
  //   for (const [tokenEntity, palEntity] of entityMap.entries()) {
  //     palEntity.updateText(`${Math.random()}`);
  //   }
  // }, 10000);
  defineSystem(world, [Has(TalkedEvent)], ({ entity, type }) => {
    if (type === UpdateType.Exit) return;
    const eventData = getComponentValue(TalkedEvent, entity)!;
    const { fromTokenId, toTokenId, message } = eventData;
    const fromPalEntity = getPalEntity(Number(fromTokenId));
    if (!fromPalEntity) return;
    fromPalEntity.updateText(`Talked to token #${toTokenId}: ${message}`);
  });

  defineSystem(world, [Has(MovedEvent)], ({ entity, type }) => {
    if (type === UpdateType.Exit) return;
    const eventData = getComponentValue(MovedEvent, entity)!;
    const { tokenId, message } = eventData;
    const fromPalEntity = getPalEntity(Number(tokenId));
    if (!fromPalEntity) return;
    fromPalEntity.updateText(`token #${tokenId}: ${message}`);
  });
};

let tickHandlerSetup = false;
let playerLockTickSetup = false;

function setupMovementTick(noa: Engine) {
  if (tickHandlerSetup) return;
  tickHandlerSetup = true;

  noa.on("tick", (dt: number) => {
    if (entityMap.size === 0) return;
    for (const [tokenEntity, palEntity] of entityMap.entries()) {
      palEntity.updatePosition();
    }
  });
}

function setupPlayerLockTick(noa: Engine) {
  if (playerLockTickSetup) return;
  playerLockTickSetup = true;

  const playerId = noa.playerEntity;

  noa.on("tick", (dt: number) => {
    if (attachedPalEntity) {
      // Get the PalEntity's current position from the noa entity
      const palPosition = attachedPalEntity.getCurrentPosition();
      const [palX, palY, palZ] = palPosition;

      // Lock player position to PalEntity position
      noa.entities.setPosition(playerId, palX, palY, palZ);

      // Disable player movement by zeroing velocity
      // Get physics body each tick in case it wasn't ready initially
      const playerBody = noa.entities.getPhysicsBody(playerId);
      if (playerBody) {
        if (playerBody.velocity) {
          playerBody.velocity.set(0, 0, 0);
        }
        if (playerBody.angularVelocity) {
          playerBody.angularVelocity.set(0, 0, 0);
        }
      }
    }
  });
}

// Public function to manually remove an entity if needed
export function removePalEntity(noa: Engine, tokenId: number) {
  const tokenEntity = tokenId.toString() as Entity;
  const palEntity = entityMap.get(tokenEntity);
  if (palEntity) {
    // If the player is attached to this PalEntity, detach it
    if (attachedPalEntity === palEntity) {
      attachedPalEntity = null;
      console.log(`Player auto-detached: PalEntity ${tokenId} was removed`);
    }
    palEntity.dispose();
    entityMap.delete(tokenEntity);
  }
}

// Public function to get MonEntity by tokenId
export function getPalEntity(tokenId: number): PalEntity | undefined {
  const tokenEntity = tokenId.toString() as Entity;
  return entityMap.get(tokenEntity);
}

// Public function to attach player entity to a PalEntity
// This locks the player position to the PalEntity and disables movement
// Camera controls remain active
export function attachPlayerToPal(noa: Engine, tokenId: number): boolean {
  const palEntity = getPalEntity(tokenId);
  if (!palEntity) {
    console.warn(`PalEntity with tokenId ${tokenId} not found`);
    return false;
  }

  attachedPalEntity = palEntity;
  console.log(`Player attached to PalEntity ${tokenId}`);
  return true;
}

// Public function to detach player entity from PalEntity
// This restores normal player movement
export function detachPlayerFromPal(noa: Engine): void {
  if (attachedPalEntity) {
    console.log(`Player detached from PalEntity`);
    attachedPalEntity = null;
  }
}

// Public function to check if player is attached to a PalEntity
export function isPlayerAttachedToPal(): boolean {
  return attachedPalEntity !== null;
}

// Public function to get the currently attached PalEntity tokenId
export function getAttachedPalTokenId(): number | null {
  if (!attachedPalEntity) return null;
  // We need to find the tokenId from the entityMap
  for (const [tokenEntity, palEntity] of entityMap.entries()) {
    if (palEntity === attachedPalEntity) {
      return Number(tokenEntity);
    }
  }
  return null;
}

// Public function to get all pal entities
export function getAllPalEntities(): PalEntity[] {
  return Array.from(entityMap.values());
}
