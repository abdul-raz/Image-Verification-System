# 🔐 Privacy-Preserving Blockchain Image Verification System

A full-stack **blockchain-based image copyright and verification system** that enables creators to prove ownership **without revealing identity**, while detecting tampered or modified images using **multi-hash perceptual matching**.

---

## 📄 Research Paper

📌 This project is based on our published research:

**“Privacy-Preserving Blockchain Image Verification System Using Multi-Hash Perceptual Matching and Dual-Layer Deployment”**
(Implemented as a working prototype on live testnets)

---

## 🚀 Problem Statement

In today’s digital world:

* Images are easily copied, edited, and redistributed
* Creators struggle to prove ownership
* Existing systems:

  * ❌ Expose identity
  * ❌ Fail on edited images
  * ❌ Are expensive on blockchain

---

## 💡 Proposed Solution

This system solves **3 major gaps** identified in research:

### 🔐 1. Privacy-Preserving Ownership

* No personal identity stored on-chain
* Uses:

  * `SHA-256(email + salt)` → anonymous identity
  * Secret-code based ownership proof

---

### 🧠 2. Multi-Hash Perceptual Detection

Instead of one hash → uses **5 complementary hashes**:

* pHash
* dHash
* aHash
* wHash
* Crop-resistant hash

👉 Combined using a **weighted scoring model** to classify images as:

* EXACT
* EDITED
* DIFFERENT

---

### ⚡ 3. Dual-Layer Blockchain Deployment

* Ethereum Sepolia (L1)
* zkSync Era (L2)

👉 Results:

* ~50% less gas
* ~99.9% cost reduction on L2 

---

## 🏗️ System Architecture

The system follows a **layered architecture** (see diagram in paper, page 4):

### 🔹 Frontend

* React.js Web App
* Upload, Verify, Dashboard
* MetaMask integration

### 🔹 Backend

* Node.js API Server
* Python microservice for hashing

### 🔹 Storage

* IPFS (via Pinata) → stores images
* PostgreSQL → stores metadata

### 🔹 Blockchain

* Solidity Smart Contract (`ImageRegistry`)
* Stores:

  * SHA-256 hash
  * Creator hash
  * IPFS CID
  * Timestamp

---

## 🔄 Workflow

1. User uploads image
2. System generates:

   * SHA-256
   * 5 perceptual hashes
3. Image stored in IPFS
4. Hash metadata stored on blockchain
5. Secret code generated for ownership proof
6. Later verification:

   * Compare hashes
   * Validate secret code
   * Generate certificate

---

## 📊 Verification Model

Similarity is computed using:

* Hamming distance
* Exponential decay similarity
* Weighted composite scoring

The final score determines:

* Classification (Exact / Edited / Different)
* Severity of modification

---

## 📈 Results (from real testnet experiments)

### ⛓️ Blockchain Performance

* Ethereum Sepolia:

  * ~300k gas per registration
  * ~10–15 sec confirmation

* zkSync Era:

  * ~50% less gas
  * ~3 sec confirmation
  * ~₹1.34 cost vs ₹2000+ on mainnet 

---

### 🖼️ Image Verification Accuracy

* Correctly detects:

  * Cropped images
  * Resized images
  * Color edited images
  * Compressed images

* No false positives in test cases

* Clear distinction between edited vs unrelated images

---

## 🛠️ Tech Stack

### 💻 Frontend

* React.js
* JavaScript

### ⚙️ Backend

* Node.js
* Express.js
* Python (Pillow, imagehash)

### ⛓️ Blockchain

* Solidity
* Hardhat
* zkSync

### 🗄️ Storage

* PostgreSQL
* IPFS (Pinata)

---

## 📂 Project Structure

```bash
image-verification-system/
├── frontend/
├── Backend/
├── blockchain-setup/
├── blockchain-setup-zksync/
├── .gitignore
└── README.md
```

---

## ⚙️ Setup Instructions

### 1️⃣ Clone repo

```bash
git clone https://github.com/abdul-raz/Image-Verification-System.git
cd Image-Verification-System
```

---

### 2️⃣ Install dependencies

```bash
cd frontend && npm install
cd ../Backend && npm install
cd ../blockchain-setup && npm install
```

---

### 3️⃣ Configure environment

Create `.env`:

```bash
PRIVATE_KEY=
RPC_URL=
PINATA_API_KEY=
```

---

### 4️⃣ Run project

```bash
# Backend
cd Backend
npm start

# Frontend
cd frontend
npm start
```

---

### 5️⃣ Deploy smart contract

```bash
cd blockchain-setup
npx hardhat run scripts/deploy.js --network sepolia
```

---

## 🌍 Real-World Applications

* 📸 Digital copyright protection
* 🏥 Medical image integrity
* 🧾 Legal evidence verification
* 📰 Journalism & media authenticity
* 🎨 Artist ownership protection

---

## 🔮 Future Work

* IPFS-hosted frontend (fully decentralized)
* Deep learning-based similarity detection
* Mobile-first application
* Integration with C2PA standards
* Video content verification

---

## 👨‍💻 Author

**Abdul Razack Kasim**
B.Tech CSE (AI/ML), SRM Institute of Science and Technology

---

## ⭐ Support

If you found this project useful:

* ⭐ Star the repo
* 🍴 Fork it
* 📢 Share it

---

## 📜 License

MIT License
