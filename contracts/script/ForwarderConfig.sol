// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

/// @notice EIP-712 domain name of the ERC2771Forwarder, shared by every deploy script.
/// @dev Must stay byte-identical to FORWARDER_NAME in frontend/src/lib/forwardRequest.ts.
///      Nothing can enforce that across the language boundary, and a mismatch has no symptom
///      other than `verify` refusing every request — so the two chains' scripts at least read
///      from one constant rather than three separate string literals.
library ForwarderConfig {
    string internal constant NAME = "DuelMe Forwarder";
}
