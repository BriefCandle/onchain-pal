// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { AllowedCaller } from "./utils/AllowedCaller.sol";
import { Base64 } from "@openzeppelin/contracts/utils/Base64.sol";
import { LibUtils } from "./utils/LibUtils.sol";

enum AgentType {
  NONE,
  PAL,
  TRAINER
}

struct AgentData {
  address owner;
  AgentType agentType;
}

contract AgentNFT is AllowedCaller, ERC721 {
  uint256 public tokenCount;
  mapping(uint256 tokenId => AgentType agentType) public agentTypes;

  constructor(string memory _name, string memory _symbol) AllowedCaller(msg.sender) ERC721(_name, _symbol) {}

  // note: pal should be only minted by game
  function mintPal(address to) external onlyAllowedCaller returns (uint256) {
    tokenCount++;
    _safeMint(to, tokenCount);
    agentTypes[tokenCount] = AgentType.PAL;

    return tokenCount;
  }

  // TODO: add mint fee requirement
  function mintTrainer(address to) external onlyAllowedCaller returns (uint256) {
    tokenCount++;
    _safeMint(to, tokenCount);
    agentTypes[tokenCount] = AgentType.TRAINER;

    return tokenCount;
  }

  function getAgentData(uint256 tokenId) external view returns (AgentData memory agentData) {
    agentData = AgentData({ owner: address(0), agentType: agentTypes[tokenId] });
    try this.ownerOf(tokenId) returns (address owner) {
      agentData.owner = owner;
    } catch {
      agentData.owner = address(0);
    }
  }

  function getAgentType(uint256 tokenId) external view returns (AgentType) {
    return agentTypes[tokenId];
  }

  // #region ------------------------------ TokenURI ------------------------------
  function tokenURI(uint256 tokenId) public view override returns (string memory) {
    _requireOwned(tokenId);
    AgentType agentType = agentTypes[tokenId];
    string memory agentTypeStr = agentType == AgentType.PAL ? "PAL" : agentType == AgentType.TRAINER
      ? "TRAINER"
      : "NONE";

    // SVG image as a string
    string memory svg = string(
      abi.encodePacked(
        '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 400 400">',
        '<rect width="100%" height="100%" fill="black"/>',
        '<text x="10" y="180" fill="white" font-size="70">',
        agentTypeStr,
        " #",
        toString(tokenId),
        "</text>",
        "</svg>"
      )
    );

    // Metadata as a JSON string
    string memory json = Base64.encode(
      bytes(
        string(
          abi.encodePacked(
            '{"name":"',
            this.symbol,
            " #",
            toString(tokenId),
            '","description":"Onchain Agent NFT",',
            '"attributes":[{"trait_type":"agentType","value":',
            agentTypeStr,
            "}],",
            '"image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(svg)),
            '"}'
          )
        )
      )
    );

    return string(abi.encodePacked("data:application/json;base64,", json));
  }

  // Helper: uint to string
  function toString(uint256 value) internal pure returns (string memory) {
    if (value == 0) return "0";
    uint256 temp = value;
    uint256 digits;
    while (temp != 0) {
      digits++;
      temp /= 10;
    }
    bytes memory buffer = new bytes(digits);
    while (value != 0) {
      digits -= 1;
      buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
      value /= 10;
    }
    return string(buffer);
  }

  // #endregion
}
