// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import { Script, console } from "forge-std/Script.sol";

// game.setAllowedCaller(0x95Ae72885aF9ED40520b64d7180f623dD2163ec9, true);
// game.setAllowedCaller(0x7D1fc62848f068f26fe3463B58aD42cf46bf5eE0, true);
// game.setAllowedCaller(0xC4159Fb57048e6Ac6Bc5015434f7DBDadF669640, true);
// game.setAllowedCaller(0xd9d8B991f0E740db0B74bfA978C09D3F87c40B71, true);
// game.setAllowedCaller(0xA2A6E674eC12CCa30d0333bB931b3db25a55B5cC, true);
// game.setAllowedCaller(0x413c5C40fba1b82cf880d68D329f79d823765e77, true);
// game.setAllowedCaller(0x65eBE4D52AC041dE35689dCA9F927F9Bb557183B, true);
// game.setAllowedCaller(0xAd54e40BEDd5098252EFc6E232D996f14E2e7C44, true);
// game.setAllowedCaller(0xf6f8b7835539Ea8CA699e4159E79A0742b251630, true);
// game.setAllowedCaller(0xAf1858CC73DFcAcF19e268a3fA990BB3F9912c04, true);
// game.setAllowedCaller(0xbc2B008F753d1B509B5E9E3a3e6a59c1bBBC8ef4, true);
// game.setAllowedCaller(0x1d3b43369AE9f8683219045c88293fAd83A7ab73, true);
// game.setAllowedCaller(0x9A602D93e38964C816ee8B57435589ceaA3e6ffC, true);

// forge script script/BatchSend.s.sol:BatchSendScript --rpc-url https://sepolia.base.org --broadcast
contract BatchSendScript is Script {
  uint256 public amount = 0.0007 ether;

  function setUp() public {}

  function run() public {
    uint256 adminPk = vm.envUint("ADMIN_PRIVATE_KEY");
    address admin = vm.addr(adminPk);
    console.log("ADMIN: ", admin);

    vm.startBroadcast(adminPk);

    address[] memory addresses = new address[](13);
    addresses[0] = address(0x95Ae72885aF9ED40520b64d7180f623dD2163ec9);
    addresses[1] = address(0x7D1fc62848f068f26fe3463B58aD42cf46bf5eE0);
    addresses[2] = address(0xC4159Fb57048e6Ac6Bc5015434f7DBDadF669640);
    addresses[3] = address(0xd9d8B991f0E740db0B74bfA978C09D3F87c40B71);
    addresses[4] = address(0xA2A6E674eC12CCa30d0333bB931b3db25a55B5cC);
    addresses[5] = address(0x413c5C40fba1b82cf880d68D329f79d823765e77);
    addresses[6] = address(0x65eBE4D52AC041dE35689dCA9F927F9Bb557183B);
    addresses[7] = address(0xAd54e40BEDd5098252EFc6E232D996f14E2e7C44);
    addresses[8] = address(0xf6f8b7835539Ea8CA699e4159E79A0742b251630);
    addresses[9] = address(0xAf1858CC73DFcAcF19e268a3fA990BB3F9912c04);
    addresses[10] = address(0xbc2B008F753d1B509B5E9E3a3e6a59c1bBBC8ef4);
    addresses[11] = address(0x1d3b43369AE9f8683219045c88293fAd83A7ab73);
    addresses[12] = address(0x9A602D93e38964C816ee8B57435589ceaA3e6ffC);

    for (uint256 i = 0; i < addresses.length; i++) {
      address recipient = addresses[i];
      console.log("Sending ", amount, " to: ", recipient);
      (bool success, ) = payable(recipient).call{ value: amount }("");
      require(success, "Transfer failed");
    }

    vm.stopBroadcast();
  }
}
