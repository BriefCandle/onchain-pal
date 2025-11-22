import { Engine } from "noa-engine";
import { Mesh, Vector3, VertexData, StandardMaterial } from "@babylonjs/core";
import { ClientComponents } from "../../mud/createClientComponents";
import { Hex } from "viem";
import {
  getCurrPositionMUD,
  getPlayerTokenIds,
  getPlayerTrainerIds,
  pathCoordToNoaCoord,
  SOURCE,
} from "@onchain-pal/contract-client";
import { Vector } from "@onchain-pal/contract-client/utils";
import { getVoxelHeight } from "./PalEntity";
import { getComponentValue } from "@latticexyz/recs";

/**
 * Creates and manages the player entity mesh as a reverse triangle
 */
export class PlayerEntity {
  private mesh!: Mesh;
  private noa: Engine;
  private playerEntityId: number;

  constructor(noa: Engine, coord?: Vector) {
    this.noa = noa;
    this.playerEntityId = noa.playerEntity;
    this.createMesh();
    this.attachMeshToEntity();

    // If coord is provided, set the initial position
    if (coord) {
      const noaCoord = pathCoordToNoaCoord(coord);
      const terrainHeight = getVoxelHeight(noaCoord.x, noaCoord.y);
      const heightY = terrainHeight + 2.5;
      this.noa.entities.setPosition(
        this.playerEntityId,
        noaCoord.x,
        heightY,
        noaCoord.y
      );
    }
  }

  /**
   * Creates a reverse triangle mesh (pointing downward)
   * Base at top (wider), point at bottom (narrower)
   */
  private createMesh(): void {
    const scene = this.noa.rendering.getScene();
    const dat = this.noa.entities.getPositionData(this.playerEntityId);
    const w = dat.width;
    const h = dat.height;

    // Create a reverse triangle (pointing downward)
    const baseWidth = w;
    const baseDepth = w;
    const height = h;

    // Create custom mesh for reverse triangle
    this.mesh = new Mesh("player-mesh", scene);

    // Define vertices for reverse triangle
    // Top base vertices (wider)
    const topFrontLeft = new Vector3(-baseWidth / 2, height / 2, baseDepth / 2);
    const topFrontRight = new Vector3(baseWidth / 2, height / 2, baseDepth / 2);
    const topBackLeft = new Vector3(-baseWidth / 2, height / 2, -baseDepth / 2);
    const topBackRight = new Vector3(baseWidth / 2, height / 2, -baseDepth / 2);

    // Bottom point (narrower)
    const bottomPoint = new Vector3(0, -height / 2, 0);

    // Create positions array (flattened)
    const positions: number[] = [
      // Top face (base) - 4 vertices
      topFrontLeft.x,
      topFrontLeft.y,
      topFrontLeft.z, // 0
      topFrontRight.x,
      topFrontRight.y,
      topFrontRight.z, // 1
      topBackRight.x,
      topBackRight.y,
      topBackRight.z, // 2
      topBackLeft.x,
      topBackLeft.y,
      topBackLeft.z, // 3

      // Bottom point - 1 vertex
      bottomPoint.x,
      bottomPoint.y,
      bottomPoint.z, // 4
    ];

    // Create indices (triangles) with proper winding order (counter-clockwise when viewed from outside)
    const indices: number[] = [
      // Top face (base) - 2 triangles (viewed from above, counter-clockwise)
      0,
      1,
      2, // First triangle: front-left -> front-right -> back-right
      0,
      2,
      3, // Second triangle: front-left -> back-right -> back-left

      // Front face - 1 triangle (viewed from front, counter-clockwise: 0 -> 1 -> 4)
      0,
      1,
      4, // front-left -> front-right -> bottom-point

      // Right face - 1 triangle (viewed from right, counter-clockwise: 1 -> 2 -> 4)
      1,
      2,
      4, // front-right -> back-right -> bottom-point

      // Back face - 1 triangle (viewed from back, counter-clockwise: 2 -> 3 -> 4)
      2,
      3,
      4, // back-right -> back-left -> bottom-point

      // Left face - 1 triangle (viewed from left, counter-clockwise: 3 -> 0 -> 4)
      3,
      0,
      4, // back-left -> front-left -> bottom-point
    ];

    // Create vertex data
    const vertexData = new VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;

    // Initialize normals array and compute normals
    const normals: number[] = [];
    VertexData.ComputeNormals(positions, indices, normals);
    vertexData.normals = normals;

    vertexData.applyToMesh(this.mesh);

    // Make the mesh double-sided so it renders properly from all angles
    const material = this.noa.rendering.makeStandardMaterial();
    if (material instanceof StandardMaterial) {
      material.backFaceCulling = false;
    }
    this.mesh.material = material;
  }

  /**
   * Attaches the mesh to the player entity
   */
  private attachMeshToEntity(): void {
    const dat = this.noa.entities.getPositionData(this.playerEntityId);
    const h = dat.height;

    // Add "mesh" component to the player entity
    // This causes the mesh to move around in sync with the player entity
    this.noa.entities.addComponent(
      this.playerEntityId,
      this.noa.entities.names.mesh,
      {
        mesh: this.mesh,
        // Offset vector is needed because noa positions are always the
        // bottom-center of the entity, and the reverse triangle point is at the bottom
        offset: [0, h / 2, 0],
      }
    );
  }

  /**
   * Gets the player entity ID
   */
  public getPlayerEntityId(): number {
    return this.playerEntityId;
  }

  /**
   * Gets the mesh
   */
  public getMesh(): Mesh {
    return this.mesh;
  }

  /**
   * Disposes of the mesh and cleans up resources
   */
  public dispose(): void {
    if (this.mesh) {
      this.mesh.dispose();
    }
  }

  // TODO: add defineSystem to sync with player token data
}

/**
 * Factory function to create a PlayerEntity
 * NOTE: need to wait for setupPreComputed, and rely on SelectedTrainer
 */
export function createPlayerEntity(
  noa: Engine,
  components: ClientComponents
): PlayerEntity {
  // const MOCK_PLAYER = adminClient?.account.address as Hex;
  // const trainerIds = getPlayerTrainerIds(components, MOCK_PLAYER);
  // if (trainerIds && trainerIds.length > 0) {
  //   const tokenId = trainerIds[0];
  //   const coord = getCurrPositionMUD(components, tokenId)!;
  //   console.log("coord", coord);
  //   return new PlayerEntity(noa, coord);
  // }
  // return new PlayerEntity(noa);
  const trainerId = getComponentValue(
    components.SelectedTrainer,
    SOURCE
  )?.tokenId;
  if (!!trainerId) {
    const coord = getCurrPositionMUD(components, trainerId)!;
    return new PlayerEntity(noa, coord);
  }
  return new PlayerEntity(noa);
}
