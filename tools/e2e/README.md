# Foundry Login/Logout Smoke Test

This folder contains an isolated Playwright script that exercises only the Foundry login/logout UI flow against a local server (default `http://localhost:30000/game`).

## Run

```powershell
cd tools/e2e
npm install
npm run foundry:login
```

## Options

- Set server URL: `$env:FOUNDRY_URL="http://localhost:30000/game"`
- Run headless: `$env:HEADED="0"`
- Keep browser open: `$env:KEEP_OPEN="1"`
- Slow down UI automation: `$env:SLOW_MO="250"`

