import { Entity, getComponentValue } from "@latticexyz/recs";
import { NetworkComponents } from "../mud";
import { getInterpolate, unixTime, unixTimeSecond, Vector } from "../utils";
import { MOVE_SPEED, VOXEL_DECIMAL } from "../contract/constant";

export const getCurrPositionMUD = (
  components: NetworkComponents,
  tokenId: number,
  currTime?: number
): Vector | undefined => {
  currTime = currTime ?? unixTime() / 1000;
  const data = getComponentValue(
    components.TokenData,
    tokenId.toString() as Entity
  );
  if (!data) return;
  const { fromX, fromY, toX, toY, lastUpdated, duration } = data;
  if (currTime >= lastUpdated + duration) return { x: toX, y: toY };
  const x = getPositionInterpolate(fromX, toX, currTime, lastUpdated, duration);
  const y = getPositionInterpolate(fromY, toY, currTime, lastUpdated, duration);
  return { x, y };
};

export const getPositionInterpolate = (
  from: number,
  to: number,
  currTime: number,
  lastUpdated: number,
  duration: number
): number => {
  if (currTime >= lastUpdated + duration) return to;
  if (currTime <= lastUpdated) return from;

  // Calculate elapsed time and progress
  const elapsedTime = currTime - lastUpdated;
  const delta = to - from;
  const progress = (delta * elapsedTime) / duration;
  const result = from + progress;
  if (result < 0) return 0;
  return result;
  // return Math.floor(result);
};

export const pathSpeedToNoaSpeed = (): number => {
  return MOVE_SPEED / VOXEL_DECIMAL;
};

export const pathCoordToNoaCoord = (coord: Vector): Vector => {
  return {
    x: coord.x / VOXEL_DECIMAL,
    y: coord.y / VOXEL_DECIMAL,
  };
};

export const coordToVoxel = (coord: Vector): Vector => {
  return {
    x: Math.floor(coord.x / VOXEL_DECIMAL),
    y: Math.floor(coord.y / VOXEL_DECIMAL),
  };
};

export const voxelToCoord = (voxel: Vector): Vector => {
  return {
    x: Math.floor(voxel.x * VOXEL_DECIMAL),
    y: Math.floor(voxel.y * VOXEL_DECIMAL),
  };
};
