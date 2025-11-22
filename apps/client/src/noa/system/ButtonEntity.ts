import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Engine } from "noa-engine";

export class ButtonEntity {
  private noa: Engine;
  private buttonId: string;
  private label: string;
  private mesh: any; // Babylon mesh
  private entityId: number | null = null;
  private onClickCallback?: () => void;

  constructor(
    noa: Engine,
    buttonId: string,
    label: string,
    onClick?: () => void
  ) {
    this.noa = noa;
    this.buttonId = buttonId;
    this.label = label;
    this.onClickCallback = onClick;

    this.createButton();
  }

  // Create/update button texture
  private setButtonTexture(
    text: string,
    isHovered: boolean = false
  ): Texture | null {
    const scene = this.noa.rendering.getScene();
    const textureSize = 512;
    const buttonWidth = 300;
    const buttonHeight = 80;

    // Create canvas and draw button
    const canvas = document.createElement("canvas");
    canvas.width = textureSize;
    canvas.height = textureSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("Failed to get canvas context for button");
      return null;
    }
    ctx.clearRect(0, 0, textureSize, textureSize);

    // Position button in center of texture
    const buttonX = (textureSize - buttonWidth) / 2;
    const buttonY = (textureSize - buttonHeight) / 2;

    // Draw button background (darker when hovered)
    const bgColor = isHovered
      ? "rgba(60, 100, 150, 0.9)"
      : "rgba(80, 120, 180, 0.9)";
    ctx.fillStyle = bgColor;
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

    // Draw border
    ctx.strokeStyle = "white";
    ctx.lineWidth = 3;
    ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

    // Draw text
    const fontSize = 32;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "white";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    const textX = textureSize / 2;
    const textY = textureSize / 2;
    ctx.strokeText(text, textX, textY);
    ctx.fillText(text, textX, textY);

    // Convert canvas to data URL and create texture
    const dataURL = canvas.toDataURL("image/png");
    const texture = new Texture(dataURL, scene);
    texture.hasAlpha = true;

    return texture;
  }

  private createButton(): void {
    const scene = this.noa.rendering.getScene();

    // Create a plane for the button
    this.mesh = CreatePlane(
      `button-${this.buttonId}`,
      { width: 1, height: 1, sideOrientation: Mesh.DOUBLESIDE },
      scene
    );

    // Make it face the camera
    this.mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;

    // Create texture with button text
    const buttonTexture = this.setButtonTexture(this.label);
    if (!buttonTexture) {
      return;
    }

    // Create material via noa helper
    const buttonMaterial = this.noa.rendering.makeStandardMaterial(
      `button-material-${this.buttonId}`
    );

    buttonMaterial.diffuseTexture = buttonTexture;
    buttonMaterial.emissiveTexture = buttonTexture;
    buttonMaterial.emissiveColor.set(1, 1, 1);
    buttonMaterial.disableLighting = true;
    buttonMaterial.backFaceCulling = false;
    buttonMaterial.useAlphaFromDiffuseTexture = true;
    buttonMaterial.alpha = 1.0;

    if ((buttonMaterial as any).alphaMode !== undefined) {
      (buttonMaterial as any).alphaMode = 2;
    }

    buttonMaterial.zOffset = 0;

    // Assign material
    this.mesh.material = buttonMaterial;
    this.mesh.isPickable = true; // Make it pickable for clicking
    this.mesh.visibility = 1;
    this.mesh.setEnabled(true);

    // Store reference for click handling
    (this.mesh as any).buttonEntity = this;
    (this.mesh as any).onClick = () => {
      if (this.onClickCallback) {
        this.onClickCallback();
      }
    };

    // Scale the plane
    this.mesh.scaling.set(2, 0.8, 1);

    // Refresh bounding info
    this.mesh.computeWorldMatrix(true);
    this.mesh.refreshBoundingInfo();
  }

  // Add button to noa at specified position
  public addToNoa(
    position: [number, number, number],
    width: number = 1,
    height: number = 0.4
  ): void {
    if (this.entityId !== null) {
      console.warn(`Button ${this.buttonId} already added to noa`);
      return;
    }

    this.entityId = this.noa.entities.add(
      position,
      width,
      height,
      this.mesh,
      [0, 0, 0],
      false,
      false
    );
  }

  // Update button position
  public updatePosition(position: [number, number, number]): void {
    if (this.entityId !== null) {
      this.noa.entities.setPosition(
        this.entityId,
        position[0],
        position[1],
        position[2]
      );
    } else if (this.mesh) {
      this.mesh.position.set(position[0], position[1], position[2]);
      this.mesh.computeWorldMatrix(true);
    }
  }

  // Update button label
  public updateLabel(newLabel: string): void {
    if (this.label === newLabel) {
      return;
    }
    this.label = newLabel;

    if (!this.mesh || !this.mesh.material) {
      return;
    }

    // Dispose old texture
    const oldTexture = this.mesh.material.diffuseTexture;
    if (oldTexture) {
      oldTexture.dispose();
    }

    // Create new texture with updated label
    const newTexture = this.setButtonTexture(newLabel);
    if (!newTexture) {
      return;
    }

    // Update material with new texture
    const buttonMaterial = this.mesh.material as any;
    buttonMaterial.diffuseTexture = newTexture;
    buttonMaterial.emissiveTexture = newTexture;
    buttonMaterial.useAlphaFromDiffuseTexture = true;
  }

  // Get button mesh (for click detection)
  public getMesh(): any {
    return this.mesh;
  }

  // Get entity ID
  public getEntityId(): number | null {
    return this.entityId;
  }

  // Cleanup and dispose
  public dispose(): void {
    // Remove entity from noa
    if (this.entityId !== null) {
      this.noa.entities.deleteEntity(this.entityId);
      this.entityId = null;
    }

    // Dispose mesh if not already disposed
    if (this.mesh && !this.mesh.isDisposed()) {
      // Dispose material and texture
      if (this.mesh.material) {
        if (this.mesh.material.diffuseTexture) {
          this.mesh.material.diffuseTexture.dispose();
        }
        if (this.mesh.material.emissiveTexture) {
          this.mesh.material.emissiveTexture.dispose();
        }
        this.mesh.material.dispose();
      }
      this.mesh.dispose();
    }
  }
}
