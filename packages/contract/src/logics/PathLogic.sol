// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import { LibUtils } from "../utils/LibUtils.sol";
import { random } from "../utils/random.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";

struct PathData {
  uint32 fromX;
  uint32 fromY;
  uint32 toX;
  uint32 toY;
  uint40 lastUpdated;
  uint40 duration;
}

interface IPathLogic {
  function getCurrPosition(PathData calldata pathData, uint40 currTime) external view returns (uint32 x, uint32 y);

  function computeNextPathData(
    PathData calldata pathData,
    uint32 toX,
    uint32 toY,
    uint40 currTime,
    uint32 speed
  ) external view returns (PathData memory nextPathData);

  function withinRange(
    PathData calldata fromPath,
    PathData calldata toPath,
    uint40 currTime,
    uint32 range
  ) external view returns (bool);

  function getRandomPathData(
    uint256 seedX,
    uint256 seedY,
    uint32 range
  ) external view returns (PathData memory pathData);
}

contract PathLogic is IPathLogic {
  using SafeCast for uint256;

  function withinRange(
    PathData calldata fromPath,
    PathData calldata toPath,
    uint40 currTime,
    uint32 range
  ) public pure returns (bool) {
    (uint32 fromX, uint32 fromY) = getCurrPosition(fromPath, currTime);
    (uint32 toX, uint32 toY) = getCurrPosition(toPath, currTime);
    uint32 deltaX = LibUtils.getDelta(fromX, toX);
    uint32 deltaY = LibUtils.getDelta(fromY, toY);
    return uint256(deltaX) ** 2 + uint256(deltaY) ** 2 <= uint256(range) ** 2;
  }

  function computeNextPathData(
    PathData calldata pathData,
    uint32 toX,
    uint32 toY,
    uint40 currTime,
    uint32 speed
  ) public pure returns (PathData memory nextPathData) {
    (uint32 x, uint32 y) = getCurrPosition(pathData, currTime);
    uint40 duration = computeDuration(x, y, toX, toY, speed);
    nextPathData = PathData({ fromX: x, fromY: y, toX: toX, toY: toY, lastUpdated: currTime, duration: duration });
  }

  function getCurrPosition(PathData calldata pathData, uint40 currTime) public pure returns (uint32 x, uint32 y) {
    if (currTime >= pathData.lastUpdated + pathData.duration) {
      return (pathData.toX, pathData.toY);
    }
    x = getPositionInterpolate(pathData.fromX, pathData.toX, currTime, pathData.lastUpdated, pathData.duration);
    y = getPositionInterpolate(pathData.fromY, pathData.toY, currTime, pathData.lastUpdated, pathData.duration);
    return (x, y);
  }

  function getPositionInterpolate(
    uint32 from,
    uint32 to,
    uint40 currTime,
    uint40 lastUpdated,
    uint40 duration
  ) public pure returns (uint32) {
    if (currTime >= lastUpdated + duration) return to;
    if (currTime <= lastUpdated) return from;

    // Calculate elapsed time and progress
    uint40 elapsedTime = currTime - lastUpdated;

    // Interpolate: from + ((to - from) * elapsedTime) / duration
    // This works for both forward (from < to) and backward (from > to) movement
    int256 delta = int256(uint256(to)) - int256(uint256(from));
    int256 progress = (delta * int256(uint256(elapsedTime))) / int256(uint256(duration));
    int256 result = int256(uint256(from)) + progress;

    // Ensure result is non-negative and fits in uint32
    require(result >= 0, "Interpolation result underflow");
    return (uint256(result)).toUint32();
  }

  function computeDuration(
    uint32 fromX,
    uint32 fromY,
    uint32 toX,
    uint32 toY,
    uint32 speed
  ) public pure returns (uint40 duration) {
    uint32 deltaX = LibUtils.getDelta(fromX, toX);
    uint32 deltaY = LibUtils.getDelta(fromY, toY);
    uint256 distance = LibUtils.sqrt(uint256(deltaX) ** 2 + uint256(deltaY) ** 2);
    duration = (distance / speed).toUint40();
  }

  function getRandomPathData(
    uint256 seedX,
    uint256 seedY,
    uint32 range
  ) public view returns (PathData memory pathData) {
    uint32 x = uint32(random(seedX, range - 1));
    uint32 y = uint32(random(seedY, range - 1));
    pathData = PathData({ fromX: x, fromY: y, toX: x, toY: y, lastUpdated: uint40(block.timestamp), duration: 0 });
    return pathData;
  }
}
