// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

function sample(uint256 seed, bytes32[] memory arr) pure returns (bytes32) {
  return arr[random(seed, arr.length)];
}

function sample(uint256 seed, bytes32[] memory arr, uint256 count)
  pure
  returns (bytes32[] memory)
{
  bytes32[] memory result = new bytes32[](count);
  for (uint256 i = 0; i < count;) {
    result[i] = arr[random(seed, arr.length)];
    seed = random(seed);
    unchecked {
      ++i;
    }
  }
  return result;
}

function sample(uint256 seed, bytes16[] memory arr) pure returns (bytes16) {
  return arr[random(seed, arr.length)];
}

function sample(uint256 seed, bytes16[] memory arr, uint256 count)
  pure
  returns (bytes16[] memory)
{
  bytes16[] memory result = new bytes16[](count);
  for (uint256 i = 0; i < count;) {
    result[i] = arr[random(seed, arr.length)];
    seed = random(seed);
    unchecked {
      ++i;
    }
  }
  return result;
}

function random(uint256 seed, uint256 max) pure returns (uint256) {
  return random(seed) % max;
}

function random(uint256 seed) pure returns (uint256) {
  return uint256(keccak256(abi.encodePacked(seed)));
}
