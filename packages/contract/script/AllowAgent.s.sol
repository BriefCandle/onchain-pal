// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import { Script, console } from "forge-std/Script.sol";
import { IPathLogic, PathData, PathLogic } from "../src/logics/PathLogic.sol";
import { IRNGProvider, RNGProvider } from "../src/logics/RNGProvider.sol";
import { AgentNFT, AgentData, AgentType } from "../src/AgentNFT.sol";
import { GameV1 } from "../src/GameV1.sol";

// forge script script/AllowAgent.s.sol:AllowAgentScript --rpc-url https://sepolia.base.org --broadcast
contract AllowAgentScript is Script {
  GameV1 public game;

  function setUp() public {}

  function run() public {
    uint256 adminPk = vm.envUint("ADMIN_PRIVATE_KEY");
    address admin = vm.addr(adminPk);
    console.log("ADMIN: ", admin);

    vm.startBroadcast(adminPk);

    game = GameV1(0x0037C3F66a86f2B134ED0Ce4d0aA5032Be46F5a8);

    game.setAllowedCaller(0x95Ae72885aF9ED40520b64d7180f623dD2163ec9, true);
    game.setAllowedCaller(0x7D1fc62848f068f26fe3463B58aD42cf46bf5eE0, true);
    game.setAllowedCaller(0xC4159Fb57048e6Ac6Bc5015434f7DBDadF669640, true);

    vm.stopBroadcast();
  }
}
