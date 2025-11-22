// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import { AllowedCaller } from "../utils/AllowedCaller.sol";

uint40 constant KEY_VALID_SESSION = 2 hours;

struct Key {
  bytes32 commitment; // keccak256("RNG_KEY", keyId, secret)
  bytes32 secret; // revealed
  bool revealed;
}

struct RNGRequest {
  uint40 requestTime;
  uint40 keyId;
  bytes32 requestHash; // keccak256()
  bytes32 seed; // post-verifiable seed sent by server
  bytes32 rng; // final result
  bool settled;
}

interface IRNGProvider {
  function commitKey(uint40 keyId, bytes32 commitment) external;

  function revealKey(uint40 keyId, bytes32 secret) external;

  function requestRNG(bytes32 requestHash) external;

  function settleRNG(bytes32 requestHash, bytes32 seed) external returns (bytes32 rng);

  function verifyRNGSeed(bytes32 requestHash) external view returns (bool);

  event KeyCommitted(uint40 keyId, bytes32 keyValue);
  event KeyRevealed(uint40 keyId, bytes32 secret);
  event RNGRequested(bytes32 requestHash, uint40 requestTime, uint40 keyId);
  event RNGSettled(bytes32 requestHash, bytes32 seed, bytes32 rng);
}

/**
[Day Start]
Server → commitKey(keyId, keccak256("RNG_KEY", keyId, secret))

[During Day]
Game → requestRNG() → emits requestHash
Server → settleRNG(requestHash, keccak256("RNG_SEED", requestHash, secret))

[Day End + 1h]
Server → revealKey(keyId, secret)

[Anyone]→ verifyRNG(requestHash) → true
 */
contract RNGProvider is AllowedCaller, IRNGProvider {
  uint40 public immutable startTime;
  mapping(uint40 keyId => Key key) public keys;
  mapping(bytes32 requestHash => RNGRequest request) public requests;

  constructor() AllowedCaller(msg.sender) {
    startTime = uint40(block.timestamp);
  }

  function commitKey(uint40 keyId, bytes32 commitment) external onlyAllowedCaller {
    require(keys[keyId].commitment == bytes32(0), "KeyAlreadyExists");
    keys[keyId] = Key(commitment, bytes32(0), false);
    emit KeyCommitted(keyId, commitment);
  }

  // === SERVER: REVEAL DAILY KEY ===
  function revealKey(uint40 keyId, bytes32 secret) external onlyAllowedCaller {
    Key storage k = keys[keyId];
    require(k.commitment != bytes32(0), "KeyCommitmentNotFound");
    require(!k.revealed, "KeyAlreadyRevealed");
    require(keccak256(abi.encodePacked("RNG_KEY", keyId, secret)) == k.commitment, "InvalidKeySecret");
    k.secret = secret;
    k.revealed = true;
    emit KeyRevealed(keyId, secret);
  }

  // === GAME: REQUEST RNG ===
  function requestRNG(bytes32 requestHash) external onlyAllowedCaller {
    require(requests[requestHash].requestTime == 0, "RequestExists");
    (uint40 keyId, bytes32 secret) = getKey(uint40(block.timestamp));
    requests[requestHash] = RNGRequest({
      requestTime: uint40(block.timestamp),
      keyId: keyId,
      requestHash: requestHash,
      seed: bytes32(0),
      rng: bytes32(0),
      settled: false
    });
    emit RNGRequested(requestHash, uint40(block.timestamp), keyId);
  }

  // === SERVER+GAME: REVEAL & SETTLE RNG ===
  function settleRNG(bytes32 requestHash, bytes32 seed) external onlyAllowedCaller returns (bytes32 rng) {
    RNGRequest storage req = requests[requestHash];
    require(req.requestTime > 0, "RequestNotFound");
    require(!req.settled, "RequestAlreadySettled");

    // Final RNG
    rng = keccak256(abi.encodePacked("RNG_OUT", requestHash, seed));
    req.rng = rng;
    req.settled = true;
    req.seed = seed;

    emit RNGSettled(requestHash, seed, rng);
    return rng;
  }

  // === PUBLIC: VERIFY RNG SEED ===
  function verifyRNGSeed(bytes32 requestHash) external view returns (bool) {
    RNGRequest memory req = requests[requestHash];
    if (req.requestTime == 0) revert("RequestNotFound");
    if (!req.settled) revert("RequestNotSettled");

    bytes32 secret = keys[req.keyId].secret;
    if (secret == bytes32(0)) revert("KeyNotRevealed");

    bytes32 expectedSeed = keccak256(abi.encodePacked("RNG_SEED", requestHash, secret));
    return expectedSeed == req.seed;
  }

  function getKey(uint40 timestamp) public view returns (uint40 keyId, bytes32 secret) {
    require(timestamp >= startTime, "TimestampTooEarly");
    keyId = uint40(timestamp - startTime) / KEY_VALID_SESSION;
    secret = keys[keyId].secret;
  }

  // when nextKeyStartTime is reached in 1 hour, call commitKey(nextKeyId, commitment)
  function getNextKeyStartTime() public view returns (uint40 nextStartTime, uint40 nextKeyId, bool hasKey) {
    uint40 currentKeyId = uint40(block.timestamp - startTime) / KEY_VALID_SESSION;
    nextKeyId = currentKeyId + 1;
    nextStartTime = nextKeyId * KEY_VALID_SESSION + startTime;
    hasKey = keys[nextKeyId].commitment != bytes32(0);
  }

  // when currKeyStartTime has passed 1 hour, call revealKey(currKeyId - 1, secret) if currKeyId > 0
  function getPrevKeyEndTime() public view returns (uint40 prevKeyEndTime, uint40 prevKeyId, bool revealed) {
    uint40 currentKeyId = uint40(block.timestamp - startTime) / KEY_VALID_SESSION;
    prevKeyEndTime = currentKeyId * KEY_VALID_SESSION + startTime;
    prevKeyId = currentKeyId > 0 ? currentKeyId - 1 : 0;
    revealed = keys[prevKeyId].revealed;
  }
}
