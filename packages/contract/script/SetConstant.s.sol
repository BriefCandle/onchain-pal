// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import { Script, console } from "forge-std/Script.sol";
import { IPathLogic, PathData, PathLogic } from "../src/logics/PathLogic.sol";
import { IRNGProvider, RNGProvider } from "../src/logics/RNGProvider.sol";
import { AgentNFT, AgentData, AgentType } from "../src/AgentNFT.sol";
import { GameV1 } from "../src/GameV1.sol";

// forge script script/SetConstant.s.sol:SetConstantScript --rpc-url https://sepolia.base.org --broadcast
contract SetConstantScript is Script {
  GameV1 public game;

  function setUp() public {}

  function run() public {
    uint256 adminPk = vm.envUint("ADMIN_PRIVATE_KEY");
    address admin = vm.addr(adminPk);
    console.log("ADMIN: ", admin);

    vm.startBroadcast(adminPk);

    game = GameV1(0x1D0bDd089ef24eFC0a902201AC2a65C354E30eBd);

    game.setConstant(150, 8000, 150 * 1 minutes, 1 minutes);
    vm.stopBroadcast();
  }
}
