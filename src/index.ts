// *** YOU ARE LIMITED TO THE FOLLOWING IMPORTS TO BUILD YOUR PHAT CONTRACT     ***
// *** ADDING ANY IMPORTS WILL RESULT IN ERRORS & UPLOADING YOUR CODE TO PHALA  ***
// *** NETWORK WILL FAIL. IF YOU WANT TO KNOW MORE, JOIN OUR DISCORD TO SPEAK   ***
// *** WITH THE PHALA TEAM AT https://discord.gg/5HfmWQNX THANK YOU             ***
// *** FOR DOCS ON HOW TO CUSTOMIZE YOUR PC 2.0 https://bit.ly/customize-pc-2-0 ***
import "@phala/pink-env";
import {decodeAbiParameters, encodeAbiParameters, parseAbiParameters} from "viem";

type HexString = `0x${string}`;
const encodeReplyAbiParams = 'uint respType, uint id, address requester, string ownerList';
const decodeRequestAbiParams = 'uint id, address sender, string targetJson';

function encodeReply(abiParams: string, reply: any): HexString {
  return encodeAbiParameters(parseAbiParameters(abiParams),
      reply
  );
}

function decodeRequest(abiParams: string, request: HexString): any {
  return decodeAbiParameters(parseAbiParameters(abiParams),
      request
  );
}

// Defined in OracleConsumerContract.sol
const TYPE_RESPONSE = 0;
const TYPE_ERROR = 2;

enum Error {
  BadRequestString = "BadRequestString",
  FailedToFetchData = "FailedToFetchData",
  FailedToDecode = "FailedToDecode",
  MalformedRequest = "MalformedRequest",
}

function errorToCode(error: Error): number {
  switch (error) {
    case Error.BadRequestString:
      return 1;
    case Error.FailedToFetchData:
      return 2;
    case Error.FailedToDecode:
      return 3;
    case Error.MalformedRequest:
      return 4;
    default:
      return 0;
  }
}
function stringToHex(str: string): string {
  var hex = "";
  for (var i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16);
  }
  return "0x" + hex;
}

function getResponseBody(response: any) {
  if (response.statusCode !== 200) {
    console.log(`Fail to read api with status code: ${response.statusCode}, error: ${response.error || response.body}}`);
    throw Error.FailedToFetchData;
  }
  if (typeof response.body !== "string") {
    throw Error.FailedToDecode;
  }
  // console.log(response.body);
  return JSON.parse(response.body)
}

class Owner {
  address: string[];
  score: number;
}

function fetchScore(apiUrl: string, apiKey: string, requester: string, targetJson: string): any {
  let json = JSON.parse(targetJson);
  let jsonKeys = Object.keys(json);
  let jsonValues = Object.values(json);
  let totalValue = 0;
    for (let i = 0; i < jsonValues.length; i++) {
        totalValue += Number(jsonValues[i]);
    }

  let headers = {
        "Content-Type": "application/json",
        "User-Agent": "phat-contract",
    }
  let addressesList = [];
  let ownerList = [];


  for (let i = 0; i < json.length; i++) {
    let target = jsonKeys[i];
    let body = JSON.stringify({ query: `
      query NftOwners($limit: Int) {
          ethereum: TokenBalances(
        input: {filter: {tokenAddress: {_eq: "${target}"}}, blockchain: ethereum, limit: 100}
      ) {
        TokenBalance {
          owner {
            addresses
          }
        }
      }
        }
    `});
    let response = pink.httpRequest({
        url: apiUrl, method: "POST", headers, body: stringToHex(body), returnTextBody: true
    });
    let responseBody = getResponseBody(response);

    for (let j = 0; j < responseBody.data.ethereum.TokenBalance.length; j++) {
      if (!addressesList.includes(responseBody.data.ethereum.TokenBalance[j].owner.addresses[0])){
        let owner = new Owner();
        owner.address = responseBody.data.ethereum.TokenBalance[j].owner.addresses;
        owner.score = 0;
        ownerList.push(owner);
      }
      for (let k = 0; k < ownerList.length; k++) {
        if (ownerList[k].address == responseBody.data.ethereum.TokenBalance[j].owner.addresses[0]) {
          ownerList[k].score += Number(jsonValues[i]) / totalValue;
        }
      }
    }
  }
  ownerList.sort((a, b) => (a.score > b.score) ? -1 : 1);
  return ownerList;
    }
//
// Here is what you need to implemented for Phat Contract, you can customize your logic with
// JavaScript here.
//
// The Phat Contract will be called with two parameters:
//
// - request: The raw payload from the contract call `request` (check the `request` function in TestLensApiConsumerConract.sol).
//            In this example, it's a tuple of two elements: [requestId, profileId]
// - secrets: The custom secrets you set with the `config_core` function of the Action Offchain Rollup Phat Contract. In
//            this example, it just a simple text of the lens api url prefix. For more information on secrets, checkout the SECRETS.md file.
//
// Your returns value MUST be a hex string, and it will send to your contract directly. Check the `_onMessageReceived` function in
// OracleConsumerContract.sol for more details. We suggest a tuple of three elements: [successOrNotFlag, requestId, data] as
// the return value.
//
export default function main(request: HexString, secrets: string): HexString {
  console.log(`handle req: ${request}`);
  // Uncomment to debug the `secrets` passed in from the Phat Contract UI configuration.
  // console.log(`secrets: ${secrets}`);
  let requestId, requesterAddress, targetJson, parsedSecrets;
  try {
    [requestId, requesterAddress, targetJson] = decodeRequest(`${decodeRequestAbiParams}`, request);
    console.log(`[${requestId}]: ${requesterAddress} ${targetJson}`);
    parsedSecrets = JSON.parse(secrets);
  } catch (error) {
    console.info("Malformed request received");
    return encodeReply(encodeReplyAbiParams, [TYPE_ERROR, 0n, 0x0000000000000000000000000000000000000000, errorToCode(error as Error)]);
  }
  console.log(`Request received for profile ${requesterAddress} ${targetJson}`);
  try {
    const ownerList = fetchScore(parsedSecrets.apiUrl, parsedSecrets.apiKey, requesterAddress, targetJson);
    console.log("response:", [TYPE_RESPONSE, requestId, requesterAddress, ownerList]);
    return encodeReply(encodeReplyAbiParams, [TYPE_RESPONSE, requestId, requesterAddress, JSON.stringify(ownerList)]);
  } catch (error) {
    if (error === Error.FailedToFetchData) {
      throw error;
    } else {
      // otherwise tell client we cannot process it
      console.log("error:", [TYPE_ERROR, requestId, requesterAddress, error]);
      return encodeReply(encodeReplyAbiParams, [TYPE_ERROR, requestId, requesterAddress, errorToCode(error as Error)]);
    }
  }
}
