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

### 🏛️ Community Governance (DAO)
*   **Media Proposals**: Submit new content to the global registry directly from the UI.
*   **Decentralized Voting**: The community approves or rejects media via on-chain consensus, replacing central moderators.
*   **Trust Economy**: Verified content gains visibility, while malicious links are buried by community vote.

### 📡 Advanced P2P Architecture
*   **WaraID Manifests**: A new global identification system for secure content discovery.
*   **Atomic Upload Flow**: Integrated "Sealing" process that verifies physical content availability before registry.
*   **Live Stream Routing**: Direct peer-to-peer streaming with automated metadata sharding (Posters & Backdrops).

### 🛡️ Sentinel & Monitoring
*   **Node Self-Update**: Background service ensures your node's public IP is always synchronized in the registry.
*   **Security Cockpit**: Manage your node's security modes (Local vs Remote) directly from the dashboard.

## 🛠️ Technology Stack
*   **Frontend**: Next.js, React, TailwindCSS.
*   **Backend / Node**: Node.js, Express, Wara Protocol (Custom P2P).
*   **Web3**: Hardhat, Ethers.js, Solidity (Reputation Contracts).
*   **Storage**: Local Filesystem + P2P Distribution.

## 📦 Installation & Setup

### 1. Prerequisites
*   Node.js (v18+)
*   Git

### 2. Quick Setup (Automated)
This script will install Node.js (if missing), fetch the required `wara-node` component and set up the entire environment.

```bash
git clone https://github.com/Q-YZX0/Muggi.git
cd Muggi
chmod +x setup.sh
./setup.sh
```

### 3. Run the Development Environment
Once configured, you can start components separately:
- **Frontend**: `npm run dev`
- **Node**: `npm run dev:node`
*   **Frontend**: `http://localhost:3000`
*   **Node Dashboard**: `http://localhost:21746`

## 🤝 Contributing
We believe in open source and community governance. Check out [CONTRIBUTING.md](CONTRIBUTING.md) to join us in building the future of decentralized streaming.

## 📄 License
MIT License. Created by the Muggi Community.
