// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
// import { AllowedCaller } from "./utils/AllowedCaller.sol";
// import { Base64 } from "@openzeppelin/contracts/utils/Base64.sol";

enum AgentType {
  NONE,
  PAL,
  TRAINER
}

struct AgentData {
  address owner;
  AgentType agentType;
  uint32 credit;
}

contract AgentNFT is ERC721 {
  constructor(string memory _name, string memory _symbol) ERC721(_name, _symbol) {}
}
