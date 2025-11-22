// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import { Script, console } from "forge-std/Script.sol";
import { IPathLogic, PathData, PathLogic } from "../src/logics/PathLogic.sol";
import { IRNGProvider, RNGProvider } from "../src/logics/RNGProvider.sol";
import { AgentNFT, AgentData, AgentType } from "../src/AgentNFT.sol";
import { GameV1 } from "../src/GameV1.sol";

// forge script script/Deploy.s.sol:DeployScript --rpc-url https://sepolia.base.org --broadcast
// forge script script/Deploy.s.sol:DeployScript --rpc-url 127.0.0.1:8545 --broadcast
contract DeployScript is Script {
  IPathLogic public pathLogic;
  RNGProvider public rngProvider;
  AgentNFT public agentNFT;
  GameV1 public game;

  function setUp() public {}

  // Compute key commitment matching the TypeScript implementation
  // secret = keccak256(signature of "signToGetSecret:{keyId}")
  // commitment = keccak256(abi.encodePacked("RNG_KEY", keyId, secret))
  function computeKeyCommitment(uint256 privateKey, uint40 keyId) internal pure returns (bytes32) {
    // Create the message to sign: "signToGetSecret:{keyId}"
    string memory message = string(abi.encodePacked("signToGetSecret:", vm.toString(keyId)));
    bytes memory messageBytes = bytes(message);

    // Compute the message hash for EIP-191 signing
    // Format: keccak256("\x19Ethereum Signed Message:\n" + len(message) + message)
    bytes32 messageHash = keccak256(
      abi.encodePacked("\x19Ethereum Signed Message:\n", vm.toString(messageBytes.length), messageBytes)
    );

    // Sign the message hash
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, messageHash);
    bytes memory signature = abi.encodePacked(r, s, v);

    // Secret is keccak256 of the signature
    bytes32 secret = keccak256(signature);

    // Commitment is keccak256("RNG_KEY", keyId, secret)
    bytes32 commitment = keccak256(abi.encodePacked("RNG_KEY", keyId, secret));

    return commitment;
  }

  function run() public {
    uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
    // uint256 deployerPrivateKey = vm.envUint("ADMIN_PRIVATE_KEY");
    address deployer = vm.addr(deployerPrivateKey);
    console.log("DEPLOYER: ", deployer);

    vm.startBroadcast(deployerPrivateKey);

    // Deploy dependencies
    pathLogic = new PathLogic();
    console.log("PATH LOGIC: ", address(pathLogic));

    rngProvider = new RNGProvider();
    console.log("RNG PROVIDER: ", address(rngProvider));

    agentNFT = new AgentNFT("AgentNFT", "AGENT");
    console.log("AGENT NFT: ", address(agentNFT));

    game = new GameV1(address(pathLogic), address(agentNFT), address(rngProvider));
    console.log("GAME: ", address(game));

    // set allowed caller
    rngProvider.setAllowedCaller(address(game), true);
    agentNFT.setAllowedCaller(address(game), true);

    // Compute and commit key 0
    bytes32 commitment = computeKeyCommitment(deployerPrivateKey, 0);
    rngProvider.commitKey(0, commitment);
    console.log("COMMITTED KEY 0: ", vm.toString(commitment));

    game.mintWildPal();
    game.mintWildPal();

    game.mintTrainer();

    vm.stopBroadcast();
  }
}
