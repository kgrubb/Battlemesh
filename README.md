# BattleMesh

**A real-time capture point system for airsoft, paintball, and nerf games**

Turn any device into a capture point with GPS tracking, live maps, and instant score updates. Perfect for outdoor battles with multiple objectives.

![BattleMesh Admin Control Panel](./public/AdminPanel.png)

## 🎮 What It Does

Creates a **King of the Hill** style game:
- **Admin Control Station**: Start/stop games, view live tactical map, manage teams
- **Capture Point Devices**: Tablets placed around the field - players tap to capture
- **Live GPS Tracking**: See all capture points on a satellite map in real-time
- **Instant Scoring**: Points update immediately when captured or held

**Typical Setup**: 1 admin laptop + 4-8 tablets as capture points

## 🚀 Quick Start

### Install & Run Locally

```bash
npm install
npm run dev
```

Then open:
- **Admin**: http://localhost:3000/admin
- **Capture Point**: http://localhost:3000/capture-point (open multiple tabs)

**Try it**: Click "Start Mission" on admin, then capture points in multiple browser tabs.

## 📱 Game Setup

### Requirements
- **Admin**: Computer with Node.js
- **Capture Points**: Tablets/phones with web browsers only (no Node.js needed!)
- **Network**: All devices on the same WiFi

### Setup Steps

1. **Build & start admin server:**
   ```bash
   npm run build
   node .output/server/index.mjs
   ```

2. **Find admin IP:**
   ```bash
   # Linux
   ip addr
   
   # Windows
   ipconfig
   ```
   Note the IP (e.g., `192.168.1.10`)

3. **Open on tablets:**
   - Open browser on each tablet
   - Navigate to: `http://192.168.1.10:3000/capture-point`
   - Each tablet automatically gets a unique NATO name

4. **Play:**
   - Open admin: `http://192.168.1.10:3000/admin`
   - Click "Start Game"
   - Place tablets around field
   - Players tap buttons to capture!

## ⚙️ Configuration

### Game Settings

Create a `.env` file (copy from `env.example`):

```bash
# Teams
DEFAULT_TEAMS='[{"id":1,"name":"Red Team","color":"#ef4444"},{"id":2,"name":"Blue Team","color":"#3b82f6"}]'

# Scoring
POINTS_PER_CAPTURE=10
POINTS_PER_SECOND=1

# Timing
GPS_UPDATE_FREQUENCY=1000
CAPTURE_COOLDOWN=1000
```

### State Management

```bash
LOAD_PREVIOUS_STATE=true              # Load previous game state
STATE_FILE_PATH=.battlemesh-state.json
```

**Note**: Environment variables have sensible defaults - only set what you want to change.

## 📊 How Scoring Works

- **Capture Bonus**: +10 points when you capture a point
- **Hold Points**: +1 point per second for each point your team controls

**Example**: Red Team holds 3 points for 60 seconds = 3 × 10 + (3 × 1 × 60) = 210 points

## 🐛 Troubleshooting

### Capture Points Won't Connect
- Check devices are on the same WiFi network
- Verify admin IP address is correct
- Check server is running

### GPS Not Working
- Allow location permissions in browser
- System automatically falls back to browser location if GPS hardware unavailable

### Reset NATO Names (Testing)
1. **URL parameter**: `http://192.168.1.10:3000/capture-point?reset=1`
2. **Reset button**: Click "Reset Identity" in capture point interface
3. **Console**: `localStorage.removeItem('battlemesh-nato-names')`

## 📂 Important Files

**Server:**
- `.battlemesh-state.json` - Game state (scores, captures, teams)

**Browser (capture points):**
- `sessionStorage['battlemesh-tab-id']` - Tab identifier
- `localStorage['battlemesh-nato-names']` - NATO name mapping

## 🎯 Features

### For Players
- Big tap buttons for quick captures
- Real-time score display
- Tactical map view
- Connection & GPS status

### For Game Masters
- Full game control (start/stop/reset)
- Live tactical map with satellite imagery
- Real-time scoreboard
- Activity feed (all captures)
- Node monitoring

### Bonus
- NATO callsigns (Alpha, Bravo, Charlie...)
- GPS tracking (hardware or browser location)
- State persistence (survives restarts)
- Keyboard shortcuts (`S` start/stop, `R` reset, `C` center map)

## 🛠️ Development

### Unit Tests
```bash
npm test              # Run unit tests
npm run lint          # Check code style
npm run test:coverage # Test coverage
```

### End-to-End Tests
```bash
npm run test:e2e        # Run all e2e tests (10-12 seconds, CI optimized)
npm run test:e2e:ui     # Run e2e tests with UI mode
npm run test:e2e:headed # Run e2e tests in headed mode
```

#### E2E Test Options
- **All tests**: `npm run test:e2e` - Complete test suite across all browsers (10-12 seconds)
- **Run specific browser**: `npx playwright test --project=chromium`
- **Run specific test file**: `npx playwright test tests/e2e/core.spec.ts`
- **Run in debug mode**: `npx playwright test --debug`
- **Generate test report**: `npx playwright show-report`

#### E2E Test Coverage
- **Core Functionality**: Landing page, admin page, capture point page, multi-page integration
- **Core Gameplay**: Game start/stop, capture operations, team management, score tracking, state synchronization
- **Responsive Design**: Mobile and tablet viewport compatibility
- **Cross-Browser Compatibility**: All pages load correctly across browsers
- **Performance**: Pages load within reasonable time limits
- **Browsers**: Chrome, Firefox, Mobile Chrome, iPad Pro

## 🏗️ Tech Stack

- **Nuxt 4** - Vue.js framework
- **Pinia** - State management
- **Tailwind CSS** - Styling
- **Leaflet.js** - Maps
- **WebSockets** - Real-time communication

## 🤝 Contributing

1. Fork the repo
2. Create a branch: `git checkout -b my-feature`
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## 📄 License

MIT License

## 💡 Tips

- Pre-cache map tiles by zooming around your field area
- Do a practice run before game day
- Ensure all devices are fully charged
- Use static IPs for stable connections
- Test GPS functionality before placing devices

