# Aztec Token Faucet

A simple TypeScript backend service to request and distribute tokens on the Aztec network. This service is intended for
development and testing purposes, allowing users to request tokens through a `/request-tokens` endpoint.

---

## 📦 Installation

```bash
git clone https://github.com/your-org/aztec-token-faucet.git
cd aztec-token-faucet
npm install
```

---

## 🚀 Development

To start the dev server with hot reload:

```bash
yarn dev
```

---

## 🧱 Build

To compile the TypeScript source into `dist/`:

```bash
yarn build
```

Start the compiled version with:

```bash
yarn start
```

---

## 🧪 Token Request Example

```bash
POST /request-tokens
Content-Type: application/json

{
  "address": "aztec:123:0xabc...",
  "amount": "0.1",
  "mode": "private", // or "public"
  "tokenAddress": "0x..."
}
```

Response:

```json
{
  "transactionHash": "0x..."
}
```
