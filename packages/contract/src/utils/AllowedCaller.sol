// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract AllowedCaller is Ownable {
  mapping(address caller => bool allowed) public allowedCallers;

  constructor(address _owner) Ownable(_owner) {
    allowedCallers[_owner] = true;
  }

  function setAllowedCaller(address caller, bool allowed) external onlyOwner {
    allowedCallers[caller] = allowed;
  }

  function isAllowedCaller(address caller) public view returns (bool) {
    return allowedCallers[caller];
  }

  modifier onlyAllowedCaller() {
    if (!isAllowedCaller(msg.sender)) revert("NotAllowedCaller");
    _;
  }
}
