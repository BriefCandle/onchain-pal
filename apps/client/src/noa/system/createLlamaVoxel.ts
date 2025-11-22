import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Engine } from "noa-engine";

/**
 * Get llama dimensions for entity setup
 */
export function getLlamaDimensions(): { width: number; height: number } {
  return { width: 0.9, height: 1.8 };
}

/**
 * Creates a voxel llama matching the reference image
 * Features: blocky body, white legs with dark hooves, pointed ears, gradient body
 */
export function createLlamaVoxel(noa: Engine): Mesh {
  const scene = noa.rendering.getScene();
  const meshes: Mesh[] = [];

  // Create material once for all parts
  const mat = noa.rendering.makeStandardMaterial();
  mat.useVertexColor = true;

  // Body - main rectangular body with gradient (orange to yellow/green)
  const body = CreateBox("body", { size: 1 }, scene);
  body.scaling.set(1.4, 0.85, 0.95);
  body.position.y = 0.6;
  applyVertexColors(body, [
    new Color3(0.95, 0.6, 0.4), // Top - orange
    new Color3(0.95, 0.85, 0.45), // Mid - yellow
    new Color3(0.6, 0.85, 0.5), // Bottom - yellow-green
  ]);
  meshes.push(body);

  // Neck - thick blocky neck going upward and slightly forward
  const neck = CreateBox("neck", { size: 1 }, scene);
  neck.scaling.set(0.5, 0.9, 0.5);
  neck.position.set(0.4, 1.25, 0);
  applyVertexColors(neck, [
    new Color3(0.9, 0.55, 0.35),
    new Color3(0.9, 0.55, 0.35),
    new Color3(0.85, 0.5, 0.3),
  ]);
  meshes.push(neck);

  // Head - blocky head
  const head = CreateBox("head", { size: 1 }, scene);
  head.scaling.set(0.55, 0.5, 0.45);
  head.position.set(0.45, 1.75, 0);
  applyVertexColors(head, [new Color3(0.9, 0.55, 0.35)]);
  meshes.push(head);

  // Snout/Muzzle - white blocky muzzle
  const snout = CreateBox("snout", { size: 1 }, scene);
  snout.scaling.set(0.3, 0.25, 0.35);
  snout.position.set(0.65, 1.65, 0);
  applyVertexColors(snout, [new Color3(0.95, 0.95, 0.95)]);
  meshes.push(snout);

  // Ears - tall pointed ears on top of head
  const ear1 = CreateBox("ear1", { size: 1 }, scene);
  ear1.scaling.set(0.15, 0.4, 0.1);
  ear1.position.set(0.35, 2.05, -0.18);
  applyVertexColors(ear1, [new Color3(0.9, 0.55, 0.35)]);
  meshes.push(ear1);

  const ear2 = CreateBox("ear2", { size: 1 }, scene);
  ear2.scaling.set(0.15, 0.4, 0.1);
  ear2.position.set(0.35, 2.05, 0.18);
  applyVertexColors(ear2, [new Color3(0.9, 0.55, 0.35)]);
  meshes.push(ear2);

  // Legs - four white legs with dark hooves
  const legPositions = [
    { x: -0.5, z: -0.35 }, // Front left
    { x: 0.5, z: -0.35 }, // Front right
    { x: -0.5, z: 0.35 }, // Back left
    { x: 0.5, z: 0.35 }, // Back right
  ];

  legPositions.forEach((pos, i) => {
    // White leg portion
    const leg = CreateBox(`leg${i}`, { size: 1 }, scene);
    leg.scaling.set(0.22, 0.7, 0.22);
    leg.position.set(pos.x, 0.15, pos.z);
    applyVertexColors(leg, [new Color3(0.95, 0.95, 0.95)]);
    meshes.push(leg);

    // Dark hoof
    const hoof = CreateBox(`hoof${i}`, { size: 1 }, scene);
    hoof.scaling.set(0.23, 0.12, 0.23);
    hoof.position.set(pos.x, -0.14, pos.z);
    applyVertexColors(hoof, [new Color3(0.25, 0.2, 0.15)]);
    meshes.push(hoof);
  });

  // Tail - small blocky tail at back
  const tail = CreateBox("tail", { size: 1 }, scene);
  tail.scaling.set(0.12, 0.25, 0.12);
  tail.position.set(-0.75, 0.7, 0);
  applyVertexColors(tail, [new Color3(0.8, 0.5, 0.3)]);
  meshes.push(tail);

  // Merge all meshes - they all have vertex colors now
  const merged = Mesh.MergeMeshes(
    meshes,
    true, // disposeSource
    true, // allow32BitsIndices
    undefined, // meshSubclass
    false, // subdivideWithSubMeshes
    true // multiMultiMaterials
  );

  if (!merged) {
    // Fallback: return first mesh if merge fails
    console.warn("Mesh merge failed, returning body mesh");
    body.material = mat;
    return body;
  }

  merged.name = "voxel-llama";
  merged.material = mat;

  return merged;
}

/**
 * Apply vertex colors to a mesh
 * @param mesh - The mesh to apply colors to
 * @param colors - Array of 1-3 colors for gradient (top, mid, bottom)
 */
function applyVertexColors(mesh: Mesh, colors: Color3[]) {
  const positions = mesh.getVerticesData("position");
  if (!positions) return;

  const vertexColors: number[] = [];

  // Find Y range
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 1; i < positions.length; i += 3) {
    const y = positions[i];
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const range = maxY - minY;

  // Apply colors
  for (let i = 1; i < positions.length; i += 3) {
    const y = positions[i];
    const t = range > 0 ? (y - minY) / range : 0.5;

    let r, g, b;

    if (colors.length === 1) {
      // Single solid color
      r = colors[0].r;
      g = colors[0].g;
      b = colors[0].b;
    } else if (colors.length === 2) {
      // Two-color gradient
      r = colors[0].r * (1 - t) + colors[1].r * t;
      g = colors[0].g * (1 - t) + colors[1].g * t;
      b = colors[0].b * (1 - t) + colors[1].b * t;
    } else {
      // Three-color gradient (bottom, mid, top)
      if (t > 0.5) {
        // Top half
        const t2 = (t - 0.5) * 2;
        r = colors[1].r * (1 - t2) + colors[0].r * t2;
        g = colors[1].g * (1 - t2) + colors[0].g * t2;
        b = colors[1].b * (1 - t2) + colors[0].b * t2;
      } else {
        // Bottom half
        const t2 = t * 2;
        r = colors[2].r * (1 - t2) + colors[1].r * t2;
        g = colors[2].g * (1 - t2) + colors[1].g * t2;
        b = colors[2].b * (1 - t2) + colors[1].b * t2;
      }
    }

    vertexColors.push(r, g, b, 1.0);
  }

  mesh.setVerticesData("color", vertexColors);
}
