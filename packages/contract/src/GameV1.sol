// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { IERC721Receiver } from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import { AgentNFT, AgentData, AgentType } from "./AgentNFT.sol";
import { IRNGProvider } from "./logics/RNGProvider.sol";
import { IPathLogic, PathData } from "./logics/PathLogic.sol";
import { AllowedCaller } from "./utils/AllowedCaller.sol";
import { Base64 } from "@openzeppelin/contracts/utils/Base64.sol";
import { LibUtils } from "./utils/LibUtils.sol";

struct StatsData {
  uint32 health;
}

struct TimeData {
  uint40 lastDeadTime;
}

struct TokenData {
  uint256 tokenId;
  StatsData statsData;
  PathData pathData;
  AgentData agentData;
  TimeData timeData;
}

struct TokenDataFlat {
  uint256 tokenId;
  // statsData
  uint32 health;
  // pathData
  uint32 fromX;
  uint32 fromY;
  uint32 toX;
  uint32 toY;
  uint40 lastUpdated;
  uint40 duration;
  // agentData
  address owner;
  uint8 agentType;
  // timeData
  uint40 lastDeadTime;
}

struct CaptureAttemptData {
  address playerAddress;
  uint256 targetTokenId;
}

interface IGameV1 {
  function revive(uint256 tokenId) external;

  function move(uint256 tokenId, uint32 toX, uint32 toY, string calldata message) external;

  function attack(uint256 tokenId, uint256 targetTokenId) external;

  function talk(uint256 fromTokenId, uint256 toTokenId, string calldata message) external;

  function mintWildPal() external;

  function mintTrainer() external;

  function attemptCapture(uint256 tokenId, uint256 targetTokenId) external;

  function settleCapture(bytes32 attemptHash, bytes32 seed) external;

  function getTokensData(uint256 start, uint256 count) external view returns (TokenData[] memory tokenData);

  event Revived(uint256 tokenId, uint32 health);
  event Defeated(uint256 tokenId, uint40 lastDeadTime);
  event Spawned(uint256 tokenId, TokenDataFlat tokenDataFlat);
  event PathUpdated(uint256 tokenId, PathData pathData);
  event Attacked(uint256 attackerTokenId, uint256 targetTokenId, bool inRange, bool defeated);
  event CaptureAttempted(uint256 attackerTokenId, uint256 targetTokenId, bool inRange);
  event CaptureSettled(uint256 targetTokenId, address playerAddress, bool caught);

  event Moved(uint256 tokenId, string message);
  event Talked(uint256 fromTokenId, uint256 toTokenId, string message);
}

contract GameV1 is AllowedCaller, IGameV1, IERC721Receiver {
  IPathLogic public pathLogic;
  IRNGProvider public rngProvider;
  AgentNFT public agentNFT;

  uint32 public MOVE_SPEED = 150;
  uint32 public ATTACK_RANGE = 8000;
  uint32 public SPAWN_WIDTH = MOVE_SPEED * 30 seconds;
  uint40 public REVIVE_TIME = 1 minutes;

  mapping(uint256 tokenId => PathData) public pathDatas;
  mapping(uint256 tokenId => StatsData) public statsDatas;
  mapping(uint256 tokenId => TimeData) public timeDatas;

  mapping(bytes32 attemptHash => CaptureAttemptData) public captureAttempts;

  constructor(address _pathLogic, address _agentNFT, address _rngProvider) AllowedCaller(msg.sender) {
    pathLogic = IPathLogic(_pathLogic);
    agentNFT = AgentNFT(_agentNFT);
    rngProvider = IRNGProvider(_rngProvider);
  }

  function setConstant(
    uint32 moveSpeed,
    uint32 attackRange,
    uint32 spawnWidth,
    uint40 revivedTime
  ) external onlyAllowedCaller {
    MOVE_SPEED = moveSpeed;
    ATTACK_RANGE = attackRange;
    SPAWN_WIDTH = spawnWidth;
    REVIVE_TIME = revivedTime;
  }

  function talk(uint256 fromTokenId, uint256 toTokenId, string calldata message) external {
    emit Talked(fromTokenId, toTokenId, message);
  }

  function move(
    uint256 tokenId,
    uint32 toX,
    uint32 toY,
    string calldata message
  ) external onlyOwnerOrAllowedCaller(tokenId) onlyAlive(tokenId) {
    PathData memory nextPathData = pathLogic.computeNextPathData(
      pathDatas[tokenId],
      toX,
      toY,
      uint40(block.timestamp),
      MOVE_SPEED
    );
    _updatePath(tokenId, nextPathData);

    emit Moved(tokenId, message);
  }

  function attack(
    uint256 tokenId,
    uint256 targetTokenId
  ) external onlyOwnerOrAllowedCaller(tokenId) onlyAlive(tokenId) onlyAlive(targetTokenId) {
    bool defeated = false;
    bool inRange = pathLogic.withinRange(
      pathDatas[tokenId],
      pathDatas[targetTokenId],
      uint40(block.timestamp),
      ATTACK_RANGE
    );
    if (!inRange) {
      emit Attacked(tokenId, targetTokenId, false, defeated);
      return;
    }

    // TODO: handle defeated

    emit Attacked(tokenId, targetTokenId, true, defeated);
  }

  modifier onlyOwnerOrAllowedCaller(uint256 tokenId) {
    {
      AgentType agentType = agentNFT.getAgentType(tokenId);
      if (agentType == AgentType.TRAINER) {
        if (agentNFT.ownerOf(tokenId) != msg.sender) revert("NotOwner");
      } else if (agentType == AgentType.PAL) {
        if (agentNFT.ownerOf(tokenId) != msg.sender && !isAllowedCaller(msg.sender)) revert("NotOwnerOrAllowedCaller");
      }
    }
    _;
  }

  // called by server
  function mintWildPal() external onlyAllowedCaller {
    uint256 tokenId = agentNFT.mintPal(address(this));
    _spawn(tokenId);
  }

  function revive(uint256 tokenId) external onlyCanRevive(tokenId) {
    if (agentNFT.ownerOf(tokenId) != msg.sender) revert("NotOwner");
    statsDatas[tokenId].health = 100;
    emit Revived(tokenId, statsDatas[tokenId].health);
  }

  modifier onlyCanRevive(uint256 tokenId) {
    {
      if (!canRevive(tokenId)) revert("CannotRevive");
    }
    _;
  }

  function canRevive(uint256 tokenId) internal view returns (bool) {
    return timeDatas[tokenId].lastDeadTime + REVIVE_TIME <= uint40(block.timestamp);
  }

  function mintTrainer() external {
    uint256 tokenId = agentNFT.mintTrainer(msg.sender);
    _spawn(tokenId);
  }

  function attemptCapture(
    uint256 tokenId,
    uint256 targetTokenId
  )
    external
    onlyOwnerOrAllowedCaller(tokenId)
    onlyAlive(tokenId)
    onlyAlive(targetTokenId)
    onlyPal(targetTokenId)
    onlyTrainer(tokenId)
  {
    if (agentNFT.ownerOf(targetTokenId) != address(this)) revert("TargetNotOwnedByGame");
    bool inRange = pathLogic.withinRange(
      pathDatas[tokenId],
      pathDatas[targetTokenId],
      uint40(block.timestamp),
      ATTACK_RANGE // CATCH_RANGE
    );
    if (inRange) {
      bytes32 attemptHash = keccak256(abi.encodePacked(tokenId, targetTokenId, uint40(block.timestamp)));
      captureAttempts[attemptHash] = CaptureAttemptData({
        playerAddress: agentNFT.ownerOf(tokenId),
        targetTokenId: targetTokenId
      });
      rngProvider.requestRNG(attemptHash);
    }
    emit CaptureAttempted(tokenId, targetTokenId, inRange);
  }

  // called by server
  function settleCapture(bytes32 attemptHash, bytes32 seed) external onlyAllowedCaller {
    CaptureAttemptData memory attemptData = captureAttempts[attemptHash];
    if (attemptData.playerAddress == address(0)) revert("AttemptNotFound");
    if (attemptData.targetTokenId == 0) revert("TargetNotFound");
    bytes32 rng = rngProvider.settleRNG(attemptHash, seed);
    bool caught = uint256(rng) % 100 < 60;

    delete captureAttempts[attemptHash];

    if (caught) {
      if (agentNFT.ownerOf(attemptData.targetTokenId) != address(this)) revert("TargetNotOwnedByGame");
      agentNFT.safeTransferFrom(address(this), attemptData.playerAddress, attemptData.targetTokenId);
    }
    emit CaptureSettled(attemptData.targetTokenId, attemptData.playerAddress, caught);
  }

  // TODO: whether to punish players for losing trainer and pal
  function _handleDefeat(uint256 tokenId) internal {
    statsDatas[tokenId].health = 0;
    timeDatas[tokenId].lastDeadTime = uint40(block.timestamp);
    emit Defeated(tokenId, timeDatas[tokenId].lastDeadTime);
  }

  // pal & trainer first spawn in GAME
  function _spawn(uint256 tokenId) internal onlyNotSpawned(tokenId) {
    PathData memory pathData = pathLogic.getRandomPathData(
      uint256(keccak256(abi.encodePacked(tokenId, "spawnX"))),
      uint256(keccak256(abi.encodePacked(tokenId, "spawnY"))),
      SPAWN_WIDTH // temp map size
    );
    pathDatas[tokenId] = pathData;
    statsDatas[tokenId] = StatsData({ health: 100 });
    timeDatas[tokenId] = TimeData({ lastDeadTime: 0 });

    emit Spawned(tokenId, _getTokenDataFlat(tokenId));
  }

  // #region ------------------------------ getters ------------------------------
  modifier onlyNFTOwner(uint256 tokenId) {
    {
      if (agentNFT.ownerOf(tokenId) != msg.sender) revert("NotNFTOwner");
    }
    _;
  }

  modifier onlySpawned(uint256 tokenId) {
    {
      if (!isSpawned(tokenId)) revert("NotSpawned");
    }
    _;
  }

  modifier onlyNotSpawned(uint256 tokenId) {
    {
      if (isSpawned(tokenId)) revert("HasSpawned");
    }
    _;
  }

  // note: path exists => isSpawned
  function isSpawned(uint256 tokenId) internal view returns (bool) {
    return pathDatas[tokenId].lastUpdated > 0;
  }

  modifier onlyPal(uint256 tokenId) {
    {
      if (!isPal(tokenId)) revert("NotPal");
    }
    _;
  }

  function isPal(uint256 tokenId) internal view returns (bool) {
    return agentNFT.getAgentType(tokenId) == AgentType.PAL;
  }

  modifier onlyTrainer(uint256 tokenId) {
    {
      if (!isTrainer(tokenId)) revert("NotTrainer");
    }
    _;
  }

  function isTrainer(uint256 tokenId) internal view returns (bool) {
    return agentNFT.getAgentType(tokenId) == AgentType.TRAINER;
  }

  modifier onlyAlive(uint256 tokenId) {
    {
      if (!isAlive(tokenId)) revert("NotAlive");
    }
    _;
  }

  function isAlive(uint256 tokenId) internal view returns (bool) {
    return statsDatas[tokenId].health > 0;
  }

  function _updatePath(uint256 tokenId, PathData memory pathData) internal {
    pathDatas[tokenId] = pathData;
    emit PathUpdated(tokenId, pathData);
  }

  function _getTokenData(uint256 tokenId) internal view returns (TokenData memory tokenData) {
    tokenData = TokenData({
      tokenId: tokenId,
      statsData: statsDatas[tokenId],
      pathData: pathDatas[tokenId],
      timeData: timeDatas[tokenId],
      agentData: agentNFT.getAgentData(tokenId)
    });
  }

  function getTokensData(uint256 start, uint256 count) external view returns (TokenData[] memory tokenData) {
    require(start >= 1, "start must be >= 1");
    uint256 end = start + count;
    uint256 tokenCount = agentNFT.tokenCount();
    if (end > tokenCount) end = tokenCount;
    uint256 length = end >= start ? end - start + 1 : 0;
    tokenData = new TokenData[](length);
    for (uint256 i = 0; i < length; i++) {
      tokenData[i] = _getTokenData(start + i);
    }
  }

  function _getTokenDataFlat(uint256 tokenId) internal view returns (TokenDataFlat memory tokenDataFlat) {
    tokenDataFlat = flattenTokenData(_getTokenData(tokenId));
  }

  function flattenTokenData(TokenData memory tokenData) internal pure returns (TokenDataFlat memory tokenDataFlat) {
    StatsData memory statsData = tokenData.statsData;
    PathData memory pathData = tokenData.pathData;
    AgentData memory agentData = tokenData.agentData;
    TimeData memory timeData = tokenData.timeData;
    tokenDataFlat = TokenDataFlat({
      tokenId: tokenData.tokenId,
      health: statsData.health,
      fromX: pathData.fromX,
      fromY: pathData.fromY,
      toX: pathData.toX,
      toY: pathData.toY,
      lastUpdated: pathData.lastUpdated,
      duration: pathData.duration,
      owner: agentData.owner,
      agentType: uint8(agentData.agentType),
      lastDeadTime: timeData.lastDeadTime
    });
  }

  function onERC721Received(
    address operator,
    address from,
    uint256 tokenId,
    bytes calldata data
  ) external pure override returns (bytes4) {
    return IERC721Receiver.onERC721Received.selector;
  }
  // #endregion
}
