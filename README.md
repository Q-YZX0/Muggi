# 🎥 Muggi: The Sovereign Media Hub

**Muggi** is the beautiful, high-performance frontend for the Wara ecosystem. It is a decentralized media manager that allows you to discover, verify, and stream content directly from independent peers without ever touching a centralized server.

> **"Experience the future of streaming: Zero censorship, Zero central control, Total sovereignty."**

---

## ✨ The Muggi Experience

Muggi isn't just a UI; it's your personal gateway to a global, user-owned network.

-   **💎 Premium Aesthetics**: A state-of-the-art "Glassmorphic" interface built with **Tailwind CSS v4** and **Next.js 15**.
-   **📺 Unified Player**: High-performance HLS streaming with integrated **Gasless Rewards** – earn as you watch (or host).
-   **🏛️ Direct Governance**: Participate in the Wara DAO. Vote on new titles, verify links, and build the network's reputation of trust.
-   **🔌 Node Cockpit**: Complete control over your local or remote WaraNodes. Monitor bandwidth, manage storage, and sync your identity seamlessly.

---

## 🛠️ Technology Stack

Muggi is built using the latest industry standards for web and blockchain:

-   **Frontend**: Next.js 20 (App Router), React 20, Tailwind CSS v4.
-   **Web3**: Ethers.js v6, EIP-712 Signatures (Gasless).
-   **Node Connection**: Direct P2P API interaction with `WaraNode`.
-   **Local Storage**: Prisma & SQLite for local profiles and caching.

---

## 🚀 Getting Started

Setting up your Sovereign Hub is easy and automated.

### 1. Requirements
-   **Node.js 20+**
-   **Git**

### 2. Quick Installation
```bash
git clone https://github.com/Q-YZX0/Muggi.git
cd Muggi
bash ./setup.sh
```

### 3. Launching
Start the frontend and your local node simultaneously:
```bash
npm run dev        # Starts the UI at http://localhost:3000
npm run dev:node   # Starts your local P2P node
```

---

## 🛡️ Responsible Streaming
Muggi is a **protocol client**. It provides a discovery and reputation layer for independent nodes. Users are responsible for the content they choose to host or consume through their private nodes.

---

## 🤝 Community
Stay in loop with the community:

-   Check our **[CONTRIBUTING.md](CONTRIBUTING.md)** for developer guidelines.
-   Join the **[Wara Network](https://github.com/Q-YZX0/Wara)** discussion.

**License**: MIT. Developed by the Muggi Community.
