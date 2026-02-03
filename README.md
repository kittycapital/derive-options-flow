# 🐋 고래 온체인 옵션 거래

Unusual options flow tracker for crypto options on [Derive.xyz](https://derive.xyz).

![Dashboard Preview](preview.png)

## Features

- **Large Premium Detection** - Flags trades with premium ≥ $10K
- **Open Interest Analysis** - Flags when single trade ≥ 2% of total OI
- **Real-time Price** - Shows current asset price with 24h change
- **Multi-Asset Support** - ETH, BTC, SOL options
- **Auto-Refresh** - Price updates every 10s, trades every 60s
- **Korean UI** - 한국어 인터페이스

## Quick Start

### Option 1: Vite + React (Recommended)

```bash
# Create new project
npm create vite@latest derive-options-flow -- --template react
cd derive-options-flow

# Copy DeriveOptionsFlow.jsx to src/

# Update src/App.jsx
```

```jsx
import DeriveOptionsFlow from './DeriveOptionsFlow'

function App() {
  return <DeriveOptionsFlow />
}

export default App
```

```bash
# Run
npm install
npm run dev
```

### Option 2: Next.js

```bash
npx create-next-app@latest derive-options-flow
cd derive-options-flow

# Copy DeriveOptionsFlow.jsx to components/

# Update app/page.js
```

```jsx
'use client'
import DeriveOptionsFlow from '../components/DeriveOptionsFlow'

export default function Home() {
  return <DeriveOptionsFlow />
}
```

```bash
npm run dev
```

## Configuration

Adjust thresholds in `DeriveOptionsFlow.jsx` (line 6-9):

```javascript
const THRESHOLDS = {
  minPremiumUSD: 10000,  // Minimum premium to flag (default: $10K)
  oiPercentage: 2,       // OI ratio threshold (default: 2%)
};
```

## API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `public/get_trade_history` | Fetch last 24h option trades |
| `public/get_ticker` | Get open interest & spot price |

No API key required - uses Derive's free public API.

## Tech Stack

- React 18+
- Derive.xyz JSON-RPC API
- Pure CSS-in-JS (no dependencies)

## Customization Ideas

- [ ] Add WebSocket for real-time trade streaming
- [ ] Export to CSV functionality
- [ ] Historical data comparison
- [ ] Telegram/Discord alerts
- [ ] More assets (DOGE, ARB, OP, etc.)

## License

MIT

---

Built for Korean crypto traders 🇰🇷
