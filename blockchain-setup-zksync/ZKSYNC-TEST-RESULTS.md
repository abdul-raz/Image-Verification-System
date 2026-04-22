# IMAGE VERIFICATION SYSTEM – zkSync L2 TEST RESULTS

**Date:** 30/3/2026, 11:13:16 am  
**Network:** zkSync Sepolia EraVM (Layer 2)  
**L2 Contract:** `0x33627A20d83188BCeCfFed5a82D147D2916B0EC3`  
**L1 Contract:** `0xefBB466D462f090fc3c1866A03126Be824368636`  
**ETH/USD:** $1975  |  **USD/INR:** ₹90.75  

---

## Test Summary

| Metric | Value |
|---|---|
| Total Tests | 7 |
| Passed | ✅ 7 |
| Failed | ❌ 0 |
| Success Rate | **100.0%** |

## Gas & zkSync L2 Actual Costs

| Metric | Value |
|---|---|
| Total Gas Used | 299250 |
| Avg Gas / Write | 149625 |
| **L2 Total Fee (ETH)** | **0.00000748 ETH** |
| **L2 Total Fee (USD)** | **$0.014775** |
| **L2 Total Fee (INR)** | **₹1.3409** |

## L1 vs L2 Cost Comparison (Same Gas, 2 Registrations)

| Network | Gas Price | ETH | USD | INR |
|---|---|---|---|---|
| **zkSync L2 (actual)** | ~0.1-0.5 gwei | 0.00000748 | $0.014775 | ₹1.3409 |
| Ethereum L1 – L1 Low | 3 gwei | 0.000898 | $1.7731 | ₹160.90 |
| Ethereum L1 – L1 Avg | 20 gwei | 0.005985 | $11.8204 | ₹1072.70 |
| Ethereum L1 – L1 High | 80 gwei | 0.023940 | $47.2815 | ₹4290.80 |

> 💡 **L2 is ~99.9% cheaper** than L1 at average gas (20 gwei). Savings: ₹1071.36 for 2 registrations.

## Detailed Test Results

| Test | Function | Status | Gas | Time | L2 Fee (ETH) | L1 Avg (ETH) |
|---|---|---|---|---|---|---|
| Register Image #1 | `registerImage()` | ✅ PASSED | 163670 | 5.30s | 0.00000409 | 0.003273 |
| Verify Image Exists | `verifyImage()` | ✅ PASSED | 0 | < 0.5s | 0 | 0 |
| Get Image Details | `getImage()` | ✅ PASSED | 0 | < 0.5s | 0 | 0 |
| Get Image Status | `getImageStatus()` | ✅ PASSED | 0 | < 0.5s | 0 | 0 |
| Register Image #2 | `registerImage()` | ✅ PASSED | 135580 | 6.25s | 0.00000339 | 0.002712 |
| Duplicate Rejection | `registerImage()` | ✅ PASSED | 0 | < 0.5s | 0 | 0 |
| Non-Existent Image | `verifyImage()` | ✅ PASSED | 0 | < 0.5s | 0 | 0 |

## Transaction Links (zkSync Sepolia Explorer)

1. [Register Image #1](https://sepolia.explorer.zksync.io/tx/0x6b7ff17ec355979b6a58c6981b1cee05aca2813f6fd34c022cef13a6faab6ca4)
2. [Register Image #2](https://sepolia.explorer.zksync.io/tx/0x2edf86484136db8b51284e65f01a1996a9efb35b748ca82edf6db1df5f825566)

## Conclusion

All 7 tests passed (100.0%) on zkSync Sepolia EraVM.
The same `ImageRegistry` contract deployed on zkSync L2 costs **₹1.3409** total, compared to **₹1072.70** on Ethereum L1 (at avg 20 gwei) — a **99.9% cost reduction** while maintaining Ethereum-level security.
