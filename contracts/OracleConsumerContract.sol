// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@phala/solidity/contracts/PhatRollupAnchor.sol";

contract OracleConsumerContract is PhatRollupAnchor, Ownable {
    event ResponseReceived(uint reqId, address requester, string targetJson, string ownerJson);
    event ErrorReceived(uint reqId, address requester, string targetJson, uint256 errno);

    uint constant TYPE_RESPONSE = 0;
    uint constant TYPE_ERROR = 2;

    mapping(uint => string) requests; // 存储字符串类型的请求
    uint nextRequest = 1;
    mapping(address => mapping(string => string)) requesterToTargetTrustScores; // 存储每个请求者针对特定目标的信任分数（或其他信息）

    constructor(address phatAttestor) {
        _grantRole(PhatRollupAnchor.ATTESTOR_ROLE, phatAttestor);
    }

    function setAttestor(address phatAttestor) public onlyOwner {
        _grantRole(PhatRollupAnchor.ATTESTOR_ROLE, phatAttestor);
    }

    function request(string calldata targetJson) public {
        address requester = msg.sender;
        uint id = nextRequest++;
        requests[id] = targetJson;
        _pushMessage(abi.encode(id, requester, targetJson));
    }

    function _onMessageReceived(bytes calldata action) internal override {
        (uint respType, uint id, address requester, string memory ownerJson) = abi.decode(action, (uint, uint, address, string));
        string memory targetJson = requests[id];
        
        if (respType == TYPE_RESPONSE) {
            emit ResponseReceived(id, requester, targetJson, ownerJson);
            requesterToTargetTrustScores[requester][targetJson] = ownerJson;
        } else if (respType == TYPE_ERROR) {
            uint256 errno = abi.decode(bytes(ownerJson), (uint256)); // 假设错误信息可以被解码为uint256
            emit ErrorReceived(id, requester, targetJson, errno);
        }

        delete requests[id]; // 无论响应类型如何，都删除请求
    }
}
