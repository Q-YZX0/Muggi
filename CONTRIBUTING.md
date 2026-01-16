# Contributing to Muggi Frontend

First off, thank you for considering contributing to **Muggi**! It's people like you that make Muggi a truly community-driven protocol.

This guide is specifically for the **Muggi Frontend** application. If you wish to contribute to the smart contracts or the P2P node, please check their respective repositories.

---

## 🎨 Design Philosophy: "The Sovereign UI"

Muggi is built on the principle of **Media Sovereignty**. Unlike traditional streaming platforms, our UI does not talk to a centralized server.

-   **Node-First**: Every piece of data you see (catalog, profiles, wallets) comes from your **Local Node** (`WaraNode`) or directly from the blockchain.
-   **Aesthetics**: We aim for a premium, "Glassmorphic" look. We use **Tailwind CSS v4** to build interfaces that feel alive, using gradients, sub-pixel borders, and smooth transitions.
-   **No Placeholders**: We prioritize real data and metadata. If content isn't there, we show its status (e.g., "Pending DAO Approval").

---

## 🛠️ Project Structure

The project is a **Next.js 15+** application using the **App Router** for optimized performance and SEO.

```text
muggi/
├── src/
│   ├── app/            # Routes & Server Components (movie, tv, node, ads...)
│   ├── components/     # High-performance React components
│   │   ├── WaraPlayer      # Custom HLS/P2P player with proof-of-view logic
│   │   ├── WaraNodeDash    # The cockpit for your local Node management
│   │   └── VotingButtons   # EIP-712 Signature-based governance
│   ├── context/        # Global state (WalletContext, etc.)
│   ├── lib/            # Utilities (ethers helpers, node-helpers)
│   └── types/          # TypeScript definitions
├── public/             # Static assets
└── wara/               # (Dynamic) Local WaraNode instance (installed via setup.sh)
```

---

## 🚀 Development Setup

We've automated the environment setup to make it as simple as possible.

### 1. Prerequisites
- **Node.js 20+** (LTS recommended)
- **Git**
- A **Web3 Wallet** (MetaMask, Rabby, etc.) for testing on-chain features.

### 2. Quick Start
```bash
# Clone the repository
git clone https://github.com/Q-YZX0/Muggi.git
cd Muggi

# Run the ecosystem setup (Installs deps & WaraNode)
bash ./setup.sh

# Start the frontend
npm run dev
```

### 3. Connecting to your Node
The frontend automatically tries to connect to `http://localhost:21746`. 
- To start your backend node in parallel: `npm run dev:node`.
- You can manage your node's identity and connection via the `/node` dashboard in the UI.

---

## 📋 Contribution Guidelines

### 1. Coding Standards
- **TypeScript**: We enforce strict typing. Avoid `any` at all costs.
- **Components**: Keep components atomic. If a piece of UI is used twice, move it to `src/components/`.
- **Server vs Client**: Use Server Components (`default`) for data fetching and Client Components (`'use client'`) only for interactivity.

### 2. UI/UX Rules
- Use the **Wara Color Palette**: Deep purples, vibrant greens for availability, and sunset oranges for requests.
- **Glassmorphism**: Use `backdrop-blur-md` and semi-transparent backgrounds for cards.
- **Responsiveness**: Everything must work on Desktop and Mobile. Use Tailwind's `md:` and `lg:` prefixes properly.

### 3. Pull Request Process
1.  **Issue First**: Open an issue to discuss your feature or bug fix before writing code.
2.  **Feature Branch**: Create a branch off `main` (e.g., `feature/improved-player`).
3.  **Clean Commits**: Use conventional commits (e.g., `feat: add season selector`).
4.  **Verification**: Ensure your code doesn't break the build (`npm run build`).

---

## 🤝 Community
Stay connected through our official channels. We value constructive feedback and "Wows" – if you build a beautiful component, share a screenshot!

**License**: MIT. Developed by the Muggi Community.