import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { getComponentValue, Has, UpdateType } from "@latticexyz/recs";
import { defineSystem } from "@latticexyz/recs";
import { SetupResult } from "@onchain-pal/contract-client";
import { Engine } from "noa-engine";
import { getPalEntity, isPalEntity } from "./createPalSystem";

// Shared ball mesh
let ballMesh: any;
// Track active ball entities with their creation time and target entity ID
const activeBalls = new Map<
  number,
  {
    createdAt: number;
    targetNoaEntityId: number;
    checkTerrain?: () => void;
    applyAntiGravity?: () => void;
  }
>();

// Helper function to remove a ball
function removeBall(noa: Engine, ballId: number) {
  try {
    noa.entities.getPosition(ballId); // Check if entity exists
    noa.entities.deleteEntity(ballId);
  } catch (e) {
    // Entity already removed
  }
  activeBalls.delete(ballId);
}

export const createAttackSystem = (result: SetupResult, noa: Engine) => {
  const {
    network: { world },
    components,
  } = result;
  const { TokenData, AttackedEvent } = components;

  // Set up ball cleanup tick handler
  setupBallCleanupTick(noa);

  defineSystem(world, [Has(AttackedEvent)], ({ entity, type }) => {
    if (type === UpdateType.Exit) return;
    const eventData = getComponentValue(AttackedEvent, entity)!;
    const { attackerTokenId, targetTokenId, inRange, defeated } = eventData;

    // Get attacker and target PalEntity instances
    const attackerEntity = getPalEntity(Number(attackerTokenId));
    const targetEntity = getPalEntity(Number(targetTokenId));

    if (!attackerEntity || !targetEntity) {
      console.warn("Attacker or target entity not found:", {
        attackerTokenId,
        targetTokenId,
      });
      return;
    }

    // Shoot multiple balls in a burst from attacker to target
    shootAttackBurst(noa, attackerEntity, targetEntity);
  });
};

// Shoot multiple balls in a burst
function shootAttackBurst(
  noa: Engine,
  attackerEntity: any,
  targetEntity: any,
  count: number = 5
) {
  for (let i = 0; i < count; i++) {
    // Small delay between each ball for burst effect
    setTimeout(() => {
      shootAttackBall(noa, attackerEntity, targetEntity, i, count);
    }, i * 100); // 100ms delay between each ball
  }
}

function shootAttackBall(
  noa: Engine,
  attackerEntity: any,
  targetEntity: any,
  index: number = 0,
  total: number = 1,
  radius: number = 0.2
) {
  const ents = noa.entities;

  // Create shared ball mesh if not exists
  if (!ballMesh) {
    ballMesh = CreateSphere(
      "attack-ball",
      {
        segments: 6,
        diameter: 2 * radius,
      },
      noa.rendering.getScene()
    );
    ballMesh.material = noa.rendering.makeStandardMaterial();
    // Make ball red/orange for attack
    if (ballMesh.material) {
      ballMesh.material.diffuseColor.set(1, 0.3, 0);
    }
  }

  // Get attacker position
  const attackerNoaEntityId = attackerEntity.getNoaEntityId();
  const attackerPos = ents.getPosition(attackerNoaEntityId);

  // Add slight spread for burst effect
  const spread = 0.1;
  const angle = (index - (total - 1) / 2) * spread;
  const pos: [number, number, number] = [
    attackerPos[0] + Math.sin(angle) * 0.2,
    attackerPos[1] + 0.5, // Offset upward
    attackerPos[2] + Math.cos(angle) * 0.2,
  ];

  // Get target position
  const targetNoaEntityId = targetEntity.getNoaEntityId();
  const targetPos = ents.getPosition(targetNoaEntityId);

  // Calculate direction to target
  const dir: [number, number, number] = [
    targetPos[0] - pos[0],
    targetPos[1] - pos[1],
    targetPos[2] - pos[2],
  ];

  // Calculate distance and normalize direction
  const distance = Math.sqrt(dir[0] ** 2 + dir[1] ** 2 + dir[2] ** 2);
  if (distance === 0) return;

  const normalizedDir: [number, number, number] = [
    dir[0] / distance,
    dir[1] / distance,
    dir[2] / distance,
  ];

  // Create ball entity
  const width = 2 * radius;
  const height = 2 * radius;
  const mesh = ballMesh.createInstance(
    `attack-ball-instance-${Date.now()}-${index}`
  );
  const meshOffset = [0, radius, 0];
  const doPhysics = true;
  const shadow = false;

  const ballId = ents.add(
    pos,
    width,
    height,
    mesh,
    meshOffset,
    doPhysics,
    shadow
  );

  // Adjust physics body - make it bouncy
  const body = ents.getPhysicsBody(ballId);
  body.restitution = 0.8; // Bouncy for bouncing off entities
  body.friction = 0.7; // Some friction

  // Reduce gravity effect - set lower gravity scale if available
  if (body.gravity !== undefined) {
    body.gravity = [0, 0, 0]; // Reduced gravity (default is usually -9.8 or similar)
  } else if (body.gravityScale !== undefined) {
    body.gravityScale = 0.2; // 20% of normal gravity
  }

  // Apply impulse toward target
  const speed = 50;
  const imp: [number, number, number] = [
    normalizedDir[0] * speed,
    normalizedDir[1] * speed,
    normalizedDir[2] * speed,
  ];
  body.applyImpulse(imp);

  // Track this ball with creation time and target
  activeBalls.set(ballId, {
    createdAt: Date.now(),
    targetNoaEntityId: targetNoaEntityId,
  });

  // Add collision handler to bounce ball off pal entities
  ents.addComponent(ballId, ents.names.collideEntities, {
    cylinder: true,
    callback: (otherId: number) => {
      // Ignore collisions with player or non-pal entities
      if (otherId === noa.playerEntity || !isPalEntity(otherId)) {
        return;
      }

      // Compute normal from positions (ball to pal)
      const p1 = ents.getPosition(ballId);
      const p2 = ents.getPosition(otherId);
      const n: [number, number, number] = [
        p1[0] - p2[0],
        p1[1] - p2[1],
        p1[2] - p2[2],
      ];

      // Normalize
      const len = Math.hypot(n[0], n[1], n[2]) || 1;
      n[0] /= len;
      n[1] /= len;
      n[2] /= len;

      // Apply bounce
      const ballBody = ents.getPhysicsBody(ballId);
      if (ballBody) {
        const currentVel = ballBody.velocity || [0, 0, 0];

        // Apply impulse
        const impulseStrength = 3;
        ballBody.applyImpulse([
          impulseStrength * n[0],
          impulseStrength * n[1],
          impulseStrength * n[2],
        ]);

        // Reflect velocity for proper bounce
        const dot =
          currentVel[0] * n[0] + currentVel[1] * n[1] + currentVel[2] * n[2];
        const reflectedVel: [number, number, number] = [
          currentVel[0] - 2 * dot * n[0],
          currentVel[1] - 2 * dot * n[1],
          currentVel[2] - 2 * dot * n[2],
        ];

        // Set reflected velocity
        const bounceSpeed = 20;
        const velLen =
          Math.hypot(reflectedVel[0], reflectedVel[1], reflectedVel[2]) || 1;
        ballBody.velocity = [
          (reflectedVel[0] / velLen) * bounceSpeed,
          (reflectedVel[1] / velLen) * bounceSpeed,
          (reflectedVel[2] / velLen) * bounceSpeed,
        ];
      }
    },
  });
}

let ballCleanupTickSetup = false;

function setupBallCleanupTick(noa: Engine) {
  if (ballCleanupTickSetup) return;
  ballCleanupTickSetup = true;

  noa.on("tick", (dt: number) => {
    const currentTime = Date.now();
    const ballsToRemove: number[] = [];

    for (const [ballId, ballData] of activeBalls.entries()) {
      const age = currentTime - ballData.createdAt;

      // Remove ball if it's older than 2 seconds
      if (age > 2000) {
        ballsToRemove.push(ballId);
      }
    }

    // Remove expired or hit balls
    for (const ballId of ballsToRemove) {
      removeBall(noa, ballId);
    }
  });
}
