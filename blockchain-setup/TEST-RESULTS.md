# IMAGE VERIFICATION SYSTEM – TEST RESULTS

**Date:** 5/4/2026, 8:19:04 pm  
**Network:** Ethereum Sepolia Testnet  
**Contract:** `0xefBB466D462f090fc3c1866A03126Be824368636`  
**ETH/USD:** $1975  |  **USD/INR:** ₹90.75  

---

## Test Summary

| Metric | Value |
|---|---|
| Total Tests | 7 |
| Passed | ✅ 7 |
| Failed | ❌ 0 |
| Success Rate | **100.0%** |

## Gas & Sepolia Costs

| Metric | Value |
|---|---|
| Total Gas | 616621 |
| Avg Gas / Write | 308310 |
| Total Fee (ETH) | 0.00003441 ETH |
| Total Fee (USD) | $0.067960 |
| Total Fee (INR) | ₹6.1674 |

## Simulated Mainnet Costs

| Scenario | Gwei | ETH | USD | INR |
|---|---|---|---|---|
| Low   (3 gwei  – post-Dencun typical) | 3 | 0.001850 | $3.6535 | ₹331.55 |
| Avg   (20 gwei – 2023-24 typical) | 20 | 0.012332 | $24.3565 | ₹2210.36 |
| High  (80 gwei – congestion spike) | 80 | 0.049330 | $97.4261 | ₹8841.42 |

## Detailed Results

| Test | Function | Status | Gas | Time | Sepolia ETH | Mainnet Avg ETH |
|---|---|---|---|---|---|---|
| Register Image #1 | `registerImage()` | ✅ PASSED | 319548 | 4.73s | 0.000018 | 0.006391 |
| Verify Image Exists | `verifyImage()` | ✅ PASSED | 0 | < 0.5s | 0 | 0 |
| Get Image Details | `getImage()` | ✅ PASSED | 0 | < 0.5s | 0 | 0 |
| Get Image Status | `getImageStatus()` | ✅ PASSED | 0 | < 0.5s | 0 | 0 |
| Register Image #2 | `registerImage()` | ✅ PASSED | 297073 | 37.29s | 0.000017 | 0.005941 |
| Duplicate Rejection | `registerImage()` | ✅ PASSED | 0 | < 0.5s | 0 | 0 |
| Non-Existent Image | `verifyImage()` | ✅ PASSED | 0 | < 0.5s | 0 | 0 |

## Transaction Links

1. [Register Image #1](https://sepolia.etherscan.io/tx/0xf62cb2e158b8add5e959da6ba2371b5a39157433265194239d9375d8f54a8b80)
2. [Register Image #2](https://sepolia.etherscan.io/tx/0x59f2b6c56fc5ecf28eb28d4d327079edb62185d68717a93ecadf62a10d7bc8c7)

## Conclusion

All 7 tests executed. 7/7 passed (100.0%).
**Next:** Frontend (React + Web3.js), IPFS integration, perceptual hash service.
