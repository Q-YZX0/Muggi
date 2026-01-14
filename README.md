# Muggi: Decentralized Content Reputation Protocol

**Muggi** is a community-driven, decentralized application (dApp) designed to index, verify, and stream media content using peer-to-peer (P2P) technology and Web3 reputation systems.

> **"Your Content, Your Trust, Your Network."**

---

## ⚠️ Important Disclaimer

**Muggi is a protocol and a client interface.** 
*   **Muggi DOES NOT host, store, or distribute any copyrighted media content on its central servers.**
*   All content is hosted by independent nodes (users) running the `wara-node` software on their own devices.
*   The "Muggi" platform serves only as a **discovery and reputation layer**, connecting users to independent peers.
*   Users are solely responsible for the content they choose to host, share, or consume.

---

## 🌟 What is Muggi?

Muggi addresses the problem of centralized censorship and lack of trust in P2P networks. By combining a local P2P streaming engine with a blockchain-based reputation system, Muggi ensures that:
1.  **Content is Permanent**: Distributed across a user-owned network, resistant to single points of failure.
2.  **Trust is verifiable**: Links are voted on by the community. A "Trust Score" is recorded on the blockchain, rewarding honest curators and burying fake/malicious content.
3.  **Economy is Fair**: (Future) Hosters and curators are rewarded for their contribution to the network's health.

## 🚀 Key Features (v0.1.0)

### 🔗 Web3 Ownership & Reputation
*   **Proof of Content**: Every link submitted is hashed and registered on the blockchain.
*   **Community Voting**: Upvote valid content, downvote fakes.
*   **Trust Score**: A transparent, on-chain metric calculated from community consensus (Upvotes - Downvotes).
*   **Leaderboard**: Visualize the top-trusted hosters and the most verified content in the ecosystem.

### 📡 Local P2P Node (`wara-node`)
*   **Self-Hosting**: Run your own node to host media files directly from your PC.
*   **Direct Streaming**: Stream verified content directly from peers without central intermediaries.
*   **Gossip Protocol**: Nodes discover each other and share metadata decentrally.

### 🛡️ Decentralized Ads Manager (In Development)
*   **User-Centric**: Ads are funded and managed by users via smart contracts.
*   **Consensus Moderation**: Bad ads are flagged and removed by community vote, not by a central authority.

## 🛠️ Technology Stack
*   **Frontend**: Next.js, React, TailwindCSS.
*   **Backend / Node**: Node.js, Express, Wara Protocol (Custom P2P).
*   **Web3**: Hardhat, Ethers.js, Solidity (Reputation Contracts).
*   **Storage**: Local Filesystem + P2P Distribution.

## 📦 Installation & Setup

### 1. Prerequisites
*   Node.js (v18+)
*   Git

### 2. Clone & Install
```bash
git clone https://github.com/Q-YZX0/Muggi.git
cd Muggi
npm install
```

### 3. Run the Development Environment
This starts both the Muggi Frontend and the Wara Node locally.
```bash
npm run dev
```
*   **Frontend**: `http://localhost:3000`
*   **Node Dashboard**: `http://localhost:21746`

## 🤝 Contributing
We believe in open source and community governance. Check out [CONTRIBUTING.md](docs/CONTRIBUTING.md) to join us in building the future of decentralized streaming.

## 📄 License
MIT License. Created by the Muggi Community.
