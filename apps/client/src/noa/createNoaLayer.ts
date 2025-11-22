import { Engine } from "noa-engine";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { SetupResult } from "../mud/setup";
import { createPalSystem, getAllPalEntities } from "./system/createPalSystem";
import { createAttackSystem } from "./system/createAttackSystem";
import { createPlayerEntity } from "./system/PlayerEntity";
import { getComponentValue, setComponent } from "@latticexyz/recs";
import { SOURCE, TARGET, voxelToCoord } from "@onchain-pal/contract-client";

export function createNoaLayer(result: SetupResult) {
  // Engine options object, and engine instantiation.
  const opts = {
    debug: true,
    showFPS: true,
    chunkSize: 32,
    chunkAddDistance: 2.5,
    chunkRemoveDistance: 3.5,
    // See `test` example, or noa docs/source, for more options
  };
  const noa = new Engine(opts);

  /*
   *      Registering voxel types
   *
   *  Two step process. First you register a material, specifying the
   *  color/texture/etc. of a given block face, then you register a
   *  block, which specifies the materials for a given block type.
   *
   */

  // block materials (just colors for this demo)
  const brownish: [number, number, number] = [0.45, 0.36, 0.22];
  const greenish: [number, number, number] = [0.1, 0.8, 0.2];
  noa.registry.registerMaterial("dirt", { color: brownish });
  noa.registry.registerMaterial("grass", { color: greenish });

  // block types and their material names
  const dirtID = noa.registry.registerBlock(1, { material: "dirt" });
  const grassID = noa.registry.registerBlock(2, { material: "grass" });

  /*
   *
   *      World generation
   *
   *  The world is divided into chunks, and `noa` will emit an
   *  `worldDataNeeded` event for each chunk of data it needs.
   *  The game client should catch this, and call
   *  `noa.world.setChunkData` whenever the world data is ready.
   *  (The latter can be done asynchronously.)
   *
   *  Now you can use `network.components` and `network.world` to
   *  control what gets displayed based on on-chain data!
   *
   */

  // simple height map worldgen function
  // You can now use network.components to query on-chain state here
  function getVoxelID(x: number, y: number, z: number): number {
    // Example: You could query network.components for block data at (x, y, z)
    // const blockData = network.components.SomeBlockComponent.get(x, y, z);
    // if (blockData) return blockData.blockType;

    if (y < -3) return dirtID;
    const height = 2 * Math.sin(x / 10) + 3 * Math.cos(z / 20);
    if (y < height) return grassID;
    return 0; // signifying empty space
  }

  // register for world events
  noa.world.on(
    "worldDataNeeded",
    function (id: string, data: any, x: number, y: number, z: number) {
      // `id` - a unique string id for the chunk
      // `data` - an `ndarray` of voxel ID data (see: https://github.com/scijs/ndarray)
      // `x, y, z` - world coords of the corner of the chunk

      // You can query network.components here to get on-chain data for the chunk
      // and use it to determine what blocks to place

      for (let i = 0; i < data.shape[0]; i++) {
        for (let j = 0; j < data.shape[1]; j++) {
          for (let k = 0; k < data.shape[2]; k++) {
            const voxelID = getVoxelID(x + i, y + j, z + k);
            data.set(i, j, k, voxelID);
          }
        }
      }
      // tell noa the chunk's terrain data is now set
      noa.world.setChunkData(id, data);
    }
  );

  // /*
  //  *
  //  *      Create a mesh to represent the player:
  //  *
  //  */

  // // get the player entity's ID and other info (position, size, ..)
  // const player = noa.playerEntity;
  // const dat = noa.entities.getPositionData(player);
  // const w = dat.width;
  // const h = dat.height;

  // // add a mesh to represent the player, and scale it, etc.
  // const scene = noa.rendering.getScene();
  // const mesh = CreateBox("player-mesh", {}, scene);
  // mesh.scaling.x = w;
  // mesh.scaling.z = w;
  // mesh.scaling.y = h;

  // // this adds a default flat material, without specularity
  // mesh.material = noa.rendering.makeStandardMaterial();

  // // add "mesh" component to the player entity
  // // this causes the mesh to move around in sync with the player entity
  // noa.entities.addComponent(player, noa.entities.names.mesh, {
  //   mesh: mesh,
  //   // offset vector is needed because noa positions are always the
  //   // bottom-center of the entity, and Babylon's CreateBox gives a
  //   // mesh registered at the center of the box
  //   offset: [0, h / 2, 0],
  // });
  // Create player entity with reverse triangle mesh
  const playerEntity = createPlayerEntity(noa, result.components);

  /*
   *
   *      Minimal interactivity
   *
   */

  // clear targeted block on on left click
  noa.inputs.down.on("fire", function () {
    if (noa.targetedBlock) {
      const pos = noa.targetedBlock.position;
      // You could send a transaction to network here to update on-chain state
      // await network.world.send("SomeSystem", { position: pos, blockType: 0 });
      noa.setBlock(0, pos[0], pos[1], pos[2]);
    }
  });

  // place some grass on right click
  noa.inputs.down.on("alt-fire", function () {
    if (noa.targetedBlock) {
      const pos = noa.targetedBlock.adjacent;
      // You could send a transaction to network here to update on-chain state
      // await network.world.send("SomeSystem", { position: pos, blockType: grassID });
      noa.setBlock(grassID, pos[0], pos[1], pos[2]);
    }
  });

  // add a key binding for "E" to do the same as alt-fire
  noa.inputs.bind("alt-fire", "KeyE");

  // Track last centered pal entity to avoid logging every tick
  let lastCenteredPalEntity: string | null = null;

  // each tick, consume any scroll events and use them to zoom camera
  noa.on("tick", function (dt: number) {
    const scroll = noa.inputs.pointerState.scrolly;
    if (scroll !== 0) {
      noa.camera.zoomDistance += scroll > 0 ? 1 : -1;
      if (noa.camera.zoomDistance < 0) noa.camera.zoomDistance = 0;
      if (noa.camera.zoomDistance > 10) noa.camera.zoomDistance = 10;
    }
    try {
      const palEntities = getAllPalEntities();
      if (palEntities.length === 0) return;

      const scene = noa.rendering.getScene();
      const camera = scene.activeCamera;
      if (!camera) return;

      // Get player entity position (use player position instead of camera position)
      const playerPos = noa.entities.getPosition(noa.playerEntity);
      const cameraPosition: [number, number, number] = [
        playerPos[0],
        playerPos[1], // + 1.6, // Add eye height
        playerPos[2],
      ];

      // set PlayerEntityCoord if changes
      const playerComp = result.components.PlayerEntityCoord;
      const playerCoord = getComponentValue(playerComp, SOURCE);
      const voxelCoord = { x: playerPos[0], y: playerPos[2] };
      const currPathCoord = voxelToCoord(voxelCoord);
      if (
        !playerCoord ||
        !(
          currPathCoord.x === playerCoord.x && currPathCoord.y === playerCoord.y
        )
      ) {
        setComponent(playerComp, SOURCE, currPathCoord);
      }

      // Get camera forward direction robustly
      const cameraDirection = getCameraForwardDirection(camera);

      if (!cameraDirection) {
        // Could not determine a direction
        if (Math.random() < 0.01)
          console.warn("Couldn't determine camera direction");
        return;
      }

      // // Optional quick debug log occasionally
      // if (Math.random() < 0.01) {
      //   console.log("Camera debug:", {
      //     position: cameraPosition,
      //     direction: cameraDirection,
      //     hasGetTarget: typeof (camera as any).getTarget === "function",
      //     hasGetForwardRay: typeof (camera as any).getForwardRay === "function",
      //   });
      // }

      for (const palEntity of palEntities) {
        const isCentered = palEntity.isCameraCentered(
          cameraPosition,
          cameraDirection
        );
        if (isCentered) {
          const tokenEntity = palEntity.getTokenEntity();
          if (lastCenteredPalEntity !== tokenEntity) {
            // console.log(
            //   "Player camera is centered on pal entity:",
            //   tokenEntity,
            //   lastCenteredPalEntity
            // );

            lastCenteredPalEntity = tokenEntity;
            // set hoveredTarget comp
            const targetComp = result.components.HoveredTarget;
            const targetId =
              getComponentValue(targetComp, TARGET)?.tokenId ?? 0;
            if (targetId !== Number(tokenEntity)) {
              setComponent(targetComp, TARGET, {
                tokenId: Number(tokenEntity),
              });
            }
          }
          break;
        }
      }

      lastCenteredPalEntity = null;
    } catch (err) {
      console.error("Camera centering tick error:", err);
    }
  });

  createPalSystem(result, noa);
  createAttackSystem(result, noa);

  return noa;
}

export function getCameraForwardDirection(
  camera: any
): [number, number, number] | null {
  try {
    // Method 1: Use getForwardRay
    if (typeof camera.getForwardRay === "function") {
      const fr = camera.getForwardRay();
      if (fr && fr.direction) {
        const d = fr.direction;
        const normalized = normalizeVec3([d.x, d.y, d.z]);
        if (normalized) return normalized;
      }
    }

    // Method 3: Calculate from rotation (fallback)
    if (camera.rotation) {
      const pitch = camera.rotation.x;
      const yaw = camera.rotation.y;

      const x = Math.sin(yaw) * Math.cos(pitch);
      const y = -Math.sin(pitch);
      const z = Math.cos(yaw) * Math.cos(pitch);

      const normalized = normalizeVec3([x, y, z]);
      if (normalized) return normalized;
    }
  } catch (e) {
    console.error("Error getting camera direction:", e);
  }

  return null;
}

export function normalizeVec3(
  v: [number, number, number]
): [number, number, number] | null {
  const len = Math.hypot(v[0], v[1], v[2]);
  if (len < 1e-8) return null;
  return [v[0] / len, v[1] / len, v[2] / len];
}
