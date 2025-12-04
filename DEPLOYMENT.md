# Deployment Checklist

## Pre-Deployment Verification

### 1. Hardware Check
- [ ] Verify Windows Display Settings shows 8 independent displays (not duplicated)
- [ ] Each display should have a unique resolution/position in Display Settings
- [ ] Test that displays are detected: Run `npm start` and check console output for display detection

### 2. Configuration
- [ ] Update `config.json` with actual URLs for each display (replace example.com URLs)
- [ ] Verify `displayIndex` values match the display order in Windows Display Settings
- [ ] Set `reloadIntervalSec` if you want periodic page refreshes (0 = disabled)

### 3. Build & Package
```bash
npm install
npm run build
```
This creates:
- Installer: `dist/signage-windows Setup 1.0.0.exe`
- Portable: `dist/signage-windows-1.0.0.exe` (in win-unpacked folder)

### 4. Testing on Target Machine
1. Copy the entire project folder OR the built installer to the target machine
2. If using installer: Run the installer
3. If using portable: Extract `win-unpacked` folder
4. Update `config.json` with production URLs
5. Test: Run `npm start` (development) or the .exe (production)
6. Verify each display shows the correct URL

### 5. Auto-Start Setup

**Automatic Configuration (Recommended):**
When you first run the application, it will automatically ask if you want to configure auto-start. Simply click "Yes" and the app will set it up for you using Windows Task Scheduler.

**Manual Configuration (Alternative):**

#### Option A: Task Scheduler
1. Open Task Scheduler
2. Create Basic Task
3. Trigger: "When the computer starts" or "When I log on"
4. Action: "Start a program"
5. Program: Path to `signage-windows.exe` (or `npm start` if using source)
6. Settings: Check "Run with highest privileges"
7. Test: Restart machine and verify app starts

#### Option B: Startup Folder
1. Press `Win+R`, type `shell:startup`
2. Create shortcut to `signage-windows.exe`
3. Test: Log out and back in

**Note:** The app will only ask about auto-start once. If you choose "Ask Later", it will ask again on the next run. If you choose "No", it won't ask again unless you delete the `.signage-settings.json` file.

### 6. Network & Security
- [ ] Ensure target machine can reach all URLs in config.json
- [ ] If URLs require authentication, configure long-lived tokens or SSO
- [ ] Check firewall rules allow outbound connections
- [ ] Verify SSL certificates are valid for HTTPS URLs

### 7. Monitoring
- [ ] Set up log rotation (logs go to console/stdout)
- [ ] Consider adding a health-check endpoint or script
- [ ] Test display hotplugging (disconnect/reconnect a monitor)

## Troubleshooting

### Displays Not Detected
- Check Windows Display Settings
- Verify GPU drivers are up to date
- Ensure displays are set to "Extend" not "Duplicate"

### Windows Not Appearing
- Check console output for errors
- Verify config.json syntax is valid JSON
- Check that displayIndex values are within range (0-7 for 8 displays)

### App Crashes
- Check console logs
- Verify URLs are accessible
- Test with `about:blank` URLs first to isolate network issues

### Closing the Application
- **Keyboard shortcuts to exit:**
  - Press `Ctrl+Q` to close all windows and exit
  - Press `Escape` to close all windows and exit
- The app will now quit when all windows are closed (no auto-reopen)
- For kiosk mode, use keyboard shortcuts since mouse clicks won't close windows

### Auto-Start Not Working
- Check Task Scheduler task is enabled
- Verify path to .exe is correct
- Check "Run whether user is logged on or not" if needed
- Test manually first before relying on auto-start

## Files to Deploy

**Minimum files needed:**
- `main.js`
- `config.json`
- `package.json`
- `node_modules/` (or use built .exe)

**Or use built installer:**
- `dist/signage-windows Setup 1.0.0.exe` (installer)
- Or `dist/win-unpacked/` folder (portable)

