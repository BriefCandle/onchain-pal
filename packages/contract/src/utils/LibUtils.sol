// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library LibUtils {
  // function withinRange(uint16 x1, uint16 y1, uint16 x2, uint16 y2, uint16 range) internal pure returns (bool) {
  //   uint16 dX = getDelta(x1, x2);
  //   uint16 dY = getDelta(y1, y2);
  //   return dX <= range && dY <= range;
  // }

  // function withinRangeManhattan(uint16 x1, uint16 y1, uint16 x2, uint16 y2, uint16 range) internal pure returns (bool) {
  //   uint16 dX = getDelta(x1, x2);
  //   uint16 dY = getDelta(y1, y2);
  //   return dX + dY <= range;
  // }

  function getDelta(uint32 from, uint32 to) internal pure returns (uint32) {
    return from > to ? from - to : to - from;
  }

  // combine two uint16 into one uint32
  function combine(uint16 x, uint16 y) internal pure returns (uint32) {
    return (uint32(x) << 16) | y;
  }

  // split one uint32 into two uint16
  function split(uint32 xy) internal pure returns (uint16, uint16) {
    uint16 x = uint16(xy >> 16);
    uint16 y = uint16(xy);
    return (x, y);
  }

  function getInterpolate(
    uint256 sourceValue,
    uint256 sourceMin,
    uint256 sourceMax,
    uint256 targetMin,
    uint256 targetMax
  ) public pure returns (uint256 targetValue) {
    require(sourceMax > sourceMin, "Invalid source range");

    if (sourceValue <= sourceMin) {
      return targetMin;
    }
    if (sourceValue >= sourceMax) {
      return targetMax;
    }

    // Calculate elapsed progress in source range
    uint256 sourceRange = sourceMax - sourceMin;
    uint256 sourceElapsed = sourceValue - sourceMin;

    // Use signed arithmetic to handle both forward (targetMin < targetMax)
    // and backward (targetMin > targetMax) interpolation
    int256 targetDelta = int256(targetMax) - int256(targetMin);
    int256 progress = (targetDelta * int256(sourceElapsed)) / int256(sourceRange);
    int256 result = int256(targetMin) + progress;

    // Ensure result is non-negative
    require(result >= 0, "Interpolation result underflow");
    targetValue = uint256(result);

    // Clamp to valid range (handles both directions)
    if (targetMin <= targetMax) {
      if (targetValue < targetMin) return targetMin;
      if (targetValue > targetMax) return targetMax;
    } else {
      if (targetValue > targetMin) return targetMin;
      if (targetValue < targetMax) return targetMax;
    }

    return targetValue;
  }

  function getInverseInterpolate(
    uint256 sourceValue,
    uint256 sourceMin,
    uint256 sourceMax,
    uint256 targetMin,
    uint256 targetMax
  ) public pure returns (uint256 targetValue) {
    // Validate input ranges
    require(sourceMax > sourceMin, "Invalid source range");
    require(targetMax >= targetMin, "Invalid target range");

    // Handle edge cases
    if (sourceValue <= sourceMin) {
      return targetMax;
    }
    if (sourceValue >= sourceMax) {
      return targetMin;
    }

    uint256 sourceRange = sourceMax - sourceMin;
    uint256 targetRange = targetMax - targetMin;

    // Inverse interpolation: larger sourceValue -> closer to targetMin
    uint256 inverseRatio = ((sourceMax - sourceValue) * targetRange) / sourceRange;
    targetValue = inverseRatio + targetMin;

    if (targetValue < targetMin) return targetMin;
    if (targetValue > targetMax) return targetMax;

    return targetValue;
  }

  function min(uint256 a, uint256 b) internal pure returns (uint256) {
    return a < b ? a : b;
  }

  function max(uint256 a, uint256 b) internal pure returns (uint256) {
    return a > b ? a : b;
  }

  function addressToEntityKey(address _address) internal pure returns (bytes32 key) {
    return bytes32(uint256(uint160(_address)));
  }

  function getArrayUpToIndex(uint8[] memory arr, uint256 index) internal pure returns (uint8[] memory) {
    if (arr.length == 0) return new uint8[](0);
    require(index < arr.length, "Index out of bounds");
    uint8[] memory result = new uint8[](index + 1);
    for (uint256 i = 0; i <= index; i++) {
      result[i] = arr[i];
    }
    return result;
  }

  function stringToBytes16(string memory str) internal pure returns (bytes16 result) {
    require(bytes(str).length <= 16, "String too long to convert to bytes16");
    assembly {
      result := mload(add(str, 16))
    }
  }

  function combineUint32(uint16 x, uint16 y) internal pure returns (uint32 xy) {
    xy = (uint32(x) << 16) | y;
  }

  function splitUint32(uint32 xy) internal pure returns (uint16 x, uint16 y) {
    x = uint16(xy >> 16);
    y = uint16(xy);
  }

  function splitBytes32(bytes32 value) internal pure returns (bytes16 left, bytes16 right) {
    assembly {
      left := value
      right := shl(128, value)
    }
  }

  function combineBytes32(bytes16 left, bytes16 right) internal pure returns (bytes32 result) {
    result = bytes32(left) | (bytes32(right) >> 128);
  }

  function sortBytes16(bytes16[] memory arr) public pure returns (bytes16[] memory) {
    uint256 len = arr.length;
    for (uint256 i = 0; i < len; i++) {
      for (uint256 j = 0; j < len - i - 1; j++) {
        if (arr[j] > arr[j + 1]) {
          bytes16 temp = arr[j];
          arr[j] = arr[j + 1];
          arr[j + 1] = temp;
        }
      }
    }
    return arr;
  }

  function hashArray(bytes16[] memory arr) public pure returns (bytes32) {
    bytes memory buffer = new bytes(arr.length * 16);
    for (uint i = 0; i < arr.length; i++) {
      for (uint j = 0; j < 16; j++) {
        buffer[i * 16 + j] = arr[i][j];
      }
    }
    return keccak256(buffer);
  }

  function compileCosts(
    bytes16[] memory entityTypes,
    uint128[] memory amounts
  ) internal pure returns (bytes32[] memory costs) {
    if (entityTypes.length != amounts.length) revert("Invalid input");

    costs = new bytes32[](entityTypes.length);

    for (uint256 i = 0; i < entityTypes.length; i++) {
      // if (amounts[i] == 0) break;
      costs[i] = combineBytes32(entityTypes[i], bytes16(amounts[i]));
    }
  }

  function compileOneType(bytes16 erc20Type, uint128 amount) internal pure returns (bytes32[] memory inputs) {
    bytes16[] memory types = new bytes16[](1);
    uint128[] memory amounts = new uint128[](1);
    types[0] = erc20Type;
    amounts[0] = amount;
    inputs = compileCosts(types, amounts);
  }

  function compileTwoTypes(
    bytes16 erc20Type1,
    bytes16 erc20Type2,
    uint128 amount1,
    uint128 amount2
  ) internal pure returns (bytes32[] memory inputs) {
    bytes16[] memory types = new bytes16[](2);
    uint128[] memory amounts = new uint128[](2);
    types[0] = erc20Type1;
    types[1] = erc20Type2;
    amounts[0] = amount1;
    amounts[1] = amount2;
    inputs = compileCosts(types, amounts);
  }

  /// @notice Calculates the square root of x, rounding down.
  /// @dev Uses the Babylonian method https://en.wikipedia.org/wiki/Methods_of_computing_square_roots#Babylonian_method.
  /// @param x The uint256 number for which to calculate the square root.
  /// @return result The result as an uint256.
  function sqrt(uint256 x) internal pure returns (uint256 result) {
    if (x == 0) {
      return 0;
    }

    // Calculate the square root of the perfect square of a power of two that is the closest to x.
    uint256 xAux = uint256(x);
    result = 1;
    if (xAux >= 0x100000000000000000000000000000000) {
      xAux >>= 128;
      result <<= 64;
    }
    if (xAux >= 0x10000000000000000) {
      xAux >>= 64;
      result <<= 32;
    }
    if (xAux >= 0x100000000) {
      xAux >>= 32;
      result <<= 16;
    }
    if (xAux >= 0x10000) {
      xAux >>= 16;
      result <<= 8;
    }
    if (xAux >= 0x100) {
      xAux >>= 8;
      result <<= 4;
    }
    if (xAux >= 0x10) {
      xAux >>= 4;
      result <<= 2;
    }
    if (xAux >= 0x8) {
      result <<= 1;
    }

    // The operations can never overflow because the result is max 2^127 when it enters this block.
    unchecked {
      result = (result + x / result) >> 1;
      result = (result + x / result) >> 1;
      result = (result + x / result) >> 1;
      result = (result + x / result) >> 1;
      result = (result + x / result) >> 1;
      result = (result + x / result) >> 1;
      result = (result + x / result) >> 1; // Seven iterations should be enough
      uint256 roundedDownResult = x / result;
      return result >= roundedDownResult ? roundedDownResult : result;
    }
  }
}
