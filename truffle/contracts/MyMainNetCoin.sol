pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";

contract MyMainNetCoin is StandardToken {
    string public name = "MyMainNetCoin";
    string public symbol = "MMC";
    uint8 public decimals = 18;

    // one billion in initial supply
    uint256 public constant INITIAL_SUPPLY = 1000000000;

    constructor() public {
        totalSupply_ = INITIAL_SUPPLY * (10 ** uint256(decimals));
        balances[msg.sender] = totalSupply_;
    }
}
