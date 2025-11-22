import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Entity } from "@latticexyz/recs";
import {
  getCurrPositionMUD,
  TokenDataFlat,
  NetworkComponents,
  pathCoordToNoaCoord,
  pathSpeedToNoaSpeed,
  AgentType,
} from "@onchain-pal/contract-client";
import { unixTime, unixTimeSecond } from "@onchain-pal/contract-client/utils";
import { Engine } from "noa-engine";
import { normalizeVec3 } from "../createNoaLayer";
import { createLlamaVoxel, getLlamaDimensions } from "./createLlamaVoxel";

export const getVoxelHeight = (x: number, z: number): number => {
  return 2 * Math.sin(x / 10) + 3 * Math.cos(z / 20);
};
export class PalEntity {
  private components: NetworkComponents;
  private noa: Engine;

  private tokenId: number;
  private tokenEntity: Entity;
  private noaEntityId: number;
  private palData: TokenDataFlat;
  private noaPosition: [number, number, number]; // x, y, z
  private mesh: any; // Babylon mesh
  private meshOffset: [number, number, number];
  private textMesh: any; // Text label mesh
  private textEntityId: number | null = null; // Text entity ID in noa
  private healthBarMesh: any; // Health bar mesh
  private healthBarEntityId: number | null = null; // Health bar entity ID in noa
  private currentHealth: number = 100; // Current health value (0-100)

  constructor(
    components: NetworkComponents,
    noa: Engine,
    tokenId: number,
    palData: TokenDataFlat
  ) {
    this.components = components;
    this.noa = noa;
    this.palData = palData;
    this.tokenId = tokenId;
    this.tokenEntity = tokenId.toString() as Entity;
    this.noaPosition = this.getNoaPosition();

    console.log("Creating PalEntity:", this.tokenId, this.palData);

    // // Entity dimensions
    // const width = 0.8;
    // const height = 0.8;
    // this.meshOffset = [0, height / 2, 0];

    // // Create unique mesh
    // this.mesh = CreateBox(`pal-mesh-${tokenId}`, {}, noa.rendering.getScene());
    // this.mesh.scaling.set(width, height, width);
    // Determine animal type based on tokenId
    // const animalType = getAnimalTypeFromTokenId(tokenId);
    // const animalType = "llama";
    // // Get dimensions for this animal type
    // const dimensions = getAnimalDimensions(animalType);
    // const width = dimensions.width;
    // const height = dimensions.height;
    // this.meshOffset = [0, height / 2, 0];
    // this.mesh = createSimpleVoxelAnimal(noa, animalType);

    this.mesh =
      this.palData.agentType === AgentType.PAL
        ? createLlamaVoxel(noa)
        : CreateBox("player-mesh", { height: 5 });

    // Get dimensions for llama
    const dimensions = getLlamaDimensions();
    const width = dimensions.width;
    const height = dimensions.height;
    this.meshOffset = [0, -height, 0];

    // Set material with color
    const mat = noa.rendering.makeStandardMaterial();
    const colors = [
      [1, 0, 0], // Red
      [0, 1, 0], // Green
      [0, 0, 1], // Blue
      [1, 1, 0], // Yellow
    ];
    const color = colors[tokenId % colors.length];
    mat.diffuseColor.set(color[0], color[1], color[2]);
    this.mesh.material = mat;
    this.mesh.setEnabled(true);
    this.mesh.visibility = 1;
    this.mesh.isVisible = true;
    this.mesh.isPickable = false;

    console.log("Creating entity at noa position:", this.noaPosition);

    this.noaEntityId = noa.entities.add(
      this.noaPosition,
      width,
      height,
      this.mesh,
      this.meshOffset,
      false, // doPhysics - false for smooth interpolation
      false // shadow
    );

    // Add collideEntities component so balls can detect collisions with this pal
    noa.entities.addComponent(
      this.noaEntityId,
      noa.entities.names.collideEntities,
      {
        cylinder: true,
        callback: () => {
          // Empty callback - ball's collision handler will process the collision
        },
      }
    );

    // Create text label above the entity
    this.createTextLabel();

    // Create health bar below the text label
    this.createHealthBar();
  }

  // Shared function to create/update text label texture
  private setTextLabel(text: string): Texture | null {
    const scene = this.noa.rendering.getScene();
    const textureSize = 1024;

    // Create canvas and draw text
    const canvas = document.createElement("canvas");
    canvas.width = textureSize;
    canvas.height = textureSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("Failed to get canvas context for text label");
      return null;
    }
    ctx.clearRect(0, 0, textureSize, textureSize);

    const fontSize = 48;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // Function to wrap text into multiple lines
    const wrapText = (
      context: CanvasRenderingContext2D,
      textStr: string,
      maxWidth: number
    ): string[] => {
      const words = textStr.split(" ");
      const lines: string[] = [];
      let currentLine = words[0] || "";
      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = context.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
          currentLine += " " + word;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }
      lines.push(currentLine);
      return lines;
    };

    const padding = 80;
    const maxWidth = textureSize - padding * 2;
    const lines = wrapText(ctx, text, maxWidth);

    const lineHeight = fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    const startY = (textureSize - totalHeight) / 2;
    const x = textureSize / 2;

    // Draw outline + fill
    ctx.lineWidth = 12;
    ctx.lineJoin = "round";
    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";

    lines.forEach((line, i) => {
      const y = startY + i * lineHeight;
      ctx.strokeText(line, x, y);
      ctx.fillText(line, x, y);
    });

    // Convert canvas to data URL and create texture
    const dataURL = canvas.toDataURL("image/png");
    const texture = new Texture(dataURL, scene);
    texture.hasAlpha = true;

    return texture;
  }

  private currentText: string = "";

  public updateText(text: string): void {
    if (!this.textMesh || !this.textMesh.material) {
      console.warn(
        `Text mesh or material not found for tokenId ${this.tokenId}`
      );
      return;
    }

    // Only update if text actually changed
    if (this.currentText === text) {
      return;
    }
    this.currentText = text;

    // Dispose old texture if it exists
    const oldTexture = this.textMesh.material.diffuseTexture;
    if (oldTexture) {
      oldTexture.dispose();
    }

    // Create new texture with updated text using shared function
    const newTexture = this.setTextLabel(text);
    if (!newTexture) {
      return;
    }

    // Update material with new texture
    const textMaterial = this.textMesh.material as any;
    textMaterial.diffuseTexture = newTexture;
    textMaterial.emissiveTexture = newTexture;
    textMaterial.useAlphaFromDiffuseTexture = true;
  }

  // uses Babylon's DynamicTexture
  private createTextLabel(): void {
    const scene = this.noa.rendering.getScene();

    // Create a plane for the text (1x1) and then scale it — more explicit control
    this.textMesh = CreatePlane(
      `pal-text-${this.tokenId}`,
      { width: 1, height: 1, sideOrientation: Mesh.DOUBLESIDE },
      scene
    );

    // Make it face the camera
    this.textMesh.billboardMode = Mesh.BILLBOARDMODE_ALL;

    // DON'T force the mesh to be unindexed or block bounding updates — these often cause
    // frustum/occlusion/culling artifacts. Remove or avoid these lines:
    // this.textMesh.isUnIndexed = true;
    // this.textMesh.doNotSyncBoundingInfo = true;
    // this.textMesh.alwaysSelectAsActiveMesh = true;

    // Create texture with initial text (tokenId)
    const initialText =
      "Pal testing area 123 blahblahblahblahblahb; Pal testing area 123 blahblahblahblahblahb; Pal testing area 123 blahblahblahblahblahb"; // this.tokenId.toString();
    this.currentText = initialText; // Track initial text
    const textTexture = this.setTextLabel(initialText);
    if (!textTexture) {
      return;
    }

    // Create material via noa helper (standard material)
    const textMaterial = this.noa.rendering.makeStandardMaterial(
      `pal-text-material-${this.tokenId}`
    );

    textMaterial.diffuseTexture = textTexture;
    // also set as emissive so it appears bright regardless of scene lighting
    textMaterial.emissiveTexture = textTexture;
    textMaterial.emissiveColor.set(1, 1, 1);
    textMaterial.disableLighting = true;
    textMaterial.backFaceCulling = false;

    // IMPORTANT: enable alpha blending from the texture
    textMaterial.useAlphaFromDiffuseTexture = true;
    textMaterial.alpha = 1.0; // Ensure full opacity

    // Set alpha mode for proper blending (Babylon.js 5.0+)
    if ((textMaterial as any).alphaMode !== undefined) {
      (textMaterial as any).alphaMode = 2; // ALPHA_COMBINE mode
    }

    // Avoid extreme zOffset unless you know the consequences; small positive zOffset
    // or renderingGroupId can be used to ensure it draws on top.
    textMaterial.zOffset = 0;

    // assign material
    this.textMesh.material = textMaterial;
    this.textMesh.isPickable = false;
    this.textMesh.visibility = 1;
    this.textMesh.setEnabled(true);

    // scale the plane to the size you want in-world (width/height in world units)
    this.textMesh.scaling.set(5, 5, 1);

    // Refresh bounding info so culling uses correct extents
    this.textMesh.computeWorldMatrix(true);
    this.textMesh.refreshBoundingInfo();

    // Create the noa entity using reasonable entity bounds — no need for huge values
    const textPosition = this.getNoaPosition();
    const textY = textPosition[1] + 1.5;
    this.textEntityId = this.noa.entities.add(
      [textPosition[0], textY, textPosition[2]],
      2.5, // width (half-size should still work)
      2.5, // height
      this.textMesh,
      [0, 0, 0],
      false,
      false
    );
  }

  // Shared function to create/update health bar texture
  private setHealthBarTexture(health: number): Texture | null {
    const scene = this.noa.rendering.getScene();
    const textureSize = 512; // Smaller than text texture
    const barWidth = 400;
    const barHeight = 40;

    // Create canvas and draw health bar
    const canvas = document.createElement("canvas");
    canvas.width = textureSize;
    canvas.height = textureSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("Failed to get canvas context for health bar");
      return null;
    }
    ctx.clearRect(0, 0, textureSize, textureSize);

    // Calculate health percentage (0-100)
    const healthPercent = Math.max(0, Math.min(100, health));
    const fillWidth = (barWidth * healthPercent) / 100;

    // Position bar in center of texture
    const barX = (textureSize - barWidth) / 2;
    const barY = (textureSize - barHeight) / 2;

    // Draw background (dark red/gray)
    ctx.fillStyle = "rgba(50, 50, 50, 0.8)";
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Draw border
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Draw health fill (green to red gradient based on health)
    const healthColor =
      healthPercent > 50
        ? `rgb(${255 - (healthPercent - 50) * 5.1}, 255, 0)` // Green to yellow
        : `rgb(255, ${healthPercent * 5.1}, 0)`; // Yellow to red
    ctx.fillStyle = healthColor;
    ctx.fillRect(barX + 2, barY + 2, fillWidth - 4, barHeight - 4);

    // Convert canvas to data URL and create texture
    const dataURL = canvas.toDataURL("image/png");
    const texture = new Texture(dataURL, scene);
    texture.hasAlpha = true;

    return texture;
  }

  private createHealthBar(): void {
    const scene = this.noa.rendering.getScene();

    // Create a plane for the health bar
    this.healthBarMesh = CreatePlane(
      `pal-health-${this.tokenId}`,
      { width: 1, height: 1, sideOrientation: Mesh.DOUBLESIDE },
      scene
    );

    // Make it face the camera
    this.healthBarMesh.billboardMode = Mesh.BILLBOARDMODE_ALL;

    // Create texture with initial health (100%)
    const healthTexture = this.setHealthBarTexture(this.currentHealth);
    if (!healthTexture) {
      return;
    }

    // Create material via noa helper
    const healthMaterial = this.noa.rendering.makeStandardMaterial(
      `pal-health-material-${this.tokenId}`
    );

    healthMaterial.diffuseTexture = healthTexture;
    healthMaterial.emissiveTexture = healthTexture;
    healthMaterial.emissiveColor.set(1, 1, 1);
    healthMaterial.disableLighting = true;
    healthMaterial.backFaceCulling = false;
    healthMaterial.useAlphaFromDiffuseTexture = true;
    healthMaterial.alpha = 1.0;

    if ((healthMaterial as any).alphaMode !== undefined) {
      (healthMaterial as any).alphaMode = 2;
    }

    healthMaterial.zOffset = 0;

    // Assign material
    this.healthBarMesh.material = healthMaterial;
    this.healthBarMesh.isPickable = false;
    this.healthBarMesh.visibility = 1;
    this.healthBarMesh.setEnabled(true);

    // Scale the plane - make it wider and taller
    this.healthBarMesh.scaling.set(3, 3.0, 1); // Increased height from 0.5 to 1.0

    // Refresh bounding info
    this.healthBarMesh.computeWorldMatrix(true);
    this.healthBarMesh.refreshBoundingInfo();

    // Create the noa entity - position it below the text label
    const healthPosition = this.getNoaPosition();
    const healthY = healthPosition[1] + 0.8; // Below text label (1.5 - 0.7)
    this.healthBarEntityId = this.noa.entities.add(
      [healthPosition[0], healthY, healthPosition[2]],
      1.5, // width
      1, // height - increased from 0.25 to 0.5
      this.healthBarMesh,
      [0, 0, 0],
      false,
      false
    );
  }

  public updateHealth(health: number): void {
    if (!this.healthBarMesh || !this.healthBarMesh.material) {
      return;
    }

    // Only update if health actually changed
    if (this.currentHealth === health) {
      return;
    }
    this.currentHealth = health;

    // Dispose old texture if it exists
    const oldTexture = this.healthBarMesh.material.diffuseTexture;
    if (oldTexture) {
      oldTexture.dispose();
    }

    // Create new texture with updated health
    const newTexture = this.setHealthBarTexture(health);
    if (!newTexture) {
      return;
    }

    // Update material with new texture
    const healthMaterial = this.healthBarMesh.material as any;
    healthMaterial.diffuseTexture = newTexture;
    healthMaterial.emissiveTexture = newTexture;
    healthMaterial.useAlphaFromDiffuseTexture = true;
  }

  private updateTextPosition(): void {
    if (!this.textMesh) {
      console.warn(`Text mesh not found for tokenId ${this.tokenId}`);
      return;
    }

    // Get current entity position from noa
    const entityPos = this.noa.entities.getPosition(this.noaEntityId);
    if (!entityPos) {
      console.warn(`Entity position not found for tokenId ${this.tokenId}`);
      return;
    }

    // Position text above the entity
    const newY = entityPos[1] + 1.5; // 1.5 units above

    // Update the text entity position in noa if it exists
    if (this.textEntityId !== null) {
      this.noa.entities.setPosition(
        this.textEntityId,
        entityPos[0],
        newY,
        entityPos[2]
      );
    } else {
      // Fallback: update mesh position directly
      this.textMesh.position.set(entityPos[0], newY, entityPos[2]);
      this.textMesh.computeWorldMatrix(true);
    }

    // Update health bar position (below text label)
    const healthY = entityPos[1] + 0.8;
    if (this.healthBarEntityId !== null) {
      this.noa.entities.setPosition(
        this.healthBarEntityId,
        entityPos[0],
        healthY,
        entityPos[2]
      );
    } else if (this.healthBarMesh) {
      this.healthBarMesh.position.set(entityPos[0], healthY, entityPos[2]);
      this.healthBarMesh.computeWorldMatrix(true);
    }
  }

  getNoaPosition(): [number, number, number] {
    const coord = getCurrPositionMUD(this.components, this.tokenId);
    if (!coord) return [0, 0, 0];
    const noaCoord = pathCoordToNoaCoord(coord);
    const terrainHeight = getVoxelHeight(noaCoord.x, noaCoord.y);
    const heightY = terrainHeight + 2.5;
    return [noaCoord.x, heightY, noaCoord.y];
  }

  // Update movement state when network data changes
  updatePalData(palData: TokenDataFlat): void {
    this.palData = palData;
  }

  hasArrived(): boolean {
    const { duration, lastUpdated } = this.palData;
    const currentTime = unixTime() / 1000;
    return currentTime >= lastUpdated + duration;
  }

  // Update position during tick
  updatePosition() {
    if (this.hasArrived()) {
      // Still update text position even if arrived
      this.updateTextPosition();
      return;
    }
    const toPosition = this.getNoaPosition();
    const [toX, toY, toZ] = toPosition;
    const [x, y, z] = this.noaPosition;
    const distance = Math.sqrt(
      Math.pow(toX - x, 2) + Math.pow(toY - y, 2) + Math.pow(toZ - z, 2)
    );
    if (distance > 0.8) {
      const speed = pathSpeedToNoaSpeed() / 15; // smaller than tick rate
      // interpolate position with speed
      const progress = Math.min(speed / distance, 1);
      // console.log("Moving entity:", this.tokenId, distance, speed, progress);

      const newX = x + (toX - x) * progress;
      const newY = y + (toY - y) * progress;
      const newZ = z + (toZ - z) * progress;
      this.noa.entities.setPosition(this.noaEntityId, newX, newY, newZ);
      this.noaPosition = [newX, newY, newZ];
    } else {
      // Update noa entity position
      this.noa.entities.setPosition(this.noaEntityId, toX, toY, toZ);
      this.noaPosition = [toX, toY, toZ];
    }

    // Update text position to follow entity
    this.updateTextPosition();

    // console.log("Updating entity position:", this.tokenId, this.noaPosition);

    // Return true if movement is complete
    // return progress >= 1;
    return true;
  }

  // Get token entity ID
  getTokenEntity(): Entity {
    return this.tokenEntity;
  }

  // Get noa entity ID
  getNoaEntityId(): number {
    return this.noaEntityId;
  }

  // Get current position from noa entity (more accurate than internal noaPosition)
  getCurrentPosition(): [number, number, number] {
    const pos = this.noa.entities.getPosition(this.noaEntityId);
    return [pos[0], pos[1], pos[2]];
  }

  // Check if camera is centered on this pal entity
  isCameraCentered(
    cameraPosition: [number, number, number],
    cameraDirection: [number, number, number],
    maxAngleDegrees: number = 5,
    maxDistance: number = 200,
    horizontalOnly: boolean = false
  ): boolean {
    const palPosition = this.getCurrentPosition();
    // console.log("palPosition", palPosition);
    const [palX, palY, palZ] = palPosition;
    const [camX, camY, camZ] = cameraPosition;

    const dx = palX - camX;
    const dy = palY - camY;
    const dz = palZ - camZ;
    const dist = Math.hypot(dx, dy, dz);

    // Check distance bounds
    if (dist > maxDistance || dist < 0.1) {
      console.log("Distance check failed:", dist);
      return false;
    }

    // Vector from camera to pal
    let toPal: [number, number, number] = [dx / dist, dy / dist, dz / dist];
    let camDir: [number, number, number] = [...cameraDirection];

    if (horizontalOnly) {
      // Project both onto XZ plane
      toPal = [toPal[0], 0, toPal[2]];
      camDir = [camDir[0], 0, camDir[2]];

      // Check if horizontal projection is valid
      const toPalHorizLen = Math.hypot(toPal[0], toPal[2]);
      const camDirHorizLen = Math.hypot(camDir[0], camDir[2]);

      if (toPalHorizLen < 1e-6 || camDirHorizLen < 1e-6) {
        // console.log("Horizontal projection too small");
        return false;
      }

      // Normalize
      toPal = [toPal[0] / toPalHorizLen, 0, toPal[2] / toPalHorizLen];
      camDir = [camDir[0] / camDirHorizLen, 0, camDir[2] / camDirHorizLen];
    }

    // Calculate dot product
    const dot =
      toPal[0] * camDir[0] + toPal[1] * camDir[1] + toPal[2] * camDir[2];

    // Calculate threshold with some tolerance
    const cosThreshold = Math.cos((maxAngleDegrees * Math.PI) / 180);

    // Debug output
    const angleDegrees =
      (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI;
    // console.log(
    //   `Angle: ${angleDegrees.toFixed(2)}°, Threshold: ${maxAngleDegrees}°, Dot: ${dot.toFixed(4)}, CosThreshold: ${cosThreshold.toFixed(4)}`
    // );

    // Use a slightly more forgiving tolerance
    const isCentered = dot >= cosThreshold - 0.01;
    // console.log("Is centered:", isCentered);

    return isCentered;
  }

  // Cleanup and dispose
  dispose(): void {
    console.log("Disposing entity:", this.tokenEntity);

    // Remove health bar entity from noa
    if (this.healthBarEntityId !== null) {
      this.noa.entities.deleteEntity(this.healthBarEntityId);
      this.healthBarEntityId = null;
    }

    // Dispose health bar mesh if not already disposed
    if (this.healthBarMesh && !this.healthBarMesh.isDisposed()) {
      if (this.healthBarMesh.material) {
        if (this.healthBarMesh.material.diffuseTexture) {
          this.healthBarMesh.material.diffuseTexture.dispose();
        }
        if (this.healthBarMesh.material.emissiveTexture) {
          this.healthBarMesh.material.emissiveTexture.dispose();
        }
        this.healthBarMesh.material.dispose();
      }
      this.healthBarMesh.dispose();
    }

    // Remove text entity from noa
    if (this.textEntityId !== null) {
      this.noa.entities.deleteEntity(this.textEntityId);
      this.textEntityId = null;
    }

    // Dispose text mesh if not already disposed
    if (this.textMesh && !this.textMesh.isDisposed()) {
      // Dispose material and texture
      if (this.textMesh.material) {
        if (this.textMesh.material.diffuseTexture) {
          this.textMesh.material.diffuseTexture.dispose();
        }
        if (this.textMesh.material.emissiveTexture) {
          this.textMesh.material.emissiveTexture.dispose();
        }
        this.textMesh.material.dispose();
      }
      this.textMesh.dispose();
    }

    // Remove entity from noa
    this.noa.entities.deleteEntity(this.noaEntityId);

    // Dispose mesh if not already disposed
    if (this.mesh && !this.mesh.isDisposed()) {
      this.mesh.dispose();
    }

    console.log("Entity disposal complete:", this.tokenEntity);
  }
}
