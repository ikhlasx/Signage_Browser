const { app, BrowserWindow, screen, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Get config path - works in both development and packaged builds
// In packaged builds, config.json should be next to the exe or in resources/
function getConfigPath() {
  // Try next to the executable (for easy editing after installation)
  const exeDir = path.dirname(process.execPath);
  const configNextToExe = path.join(exeDir, 'config.json');
  if (fs.existsSync(configNextToExe)) {
    return configNextToExe;
  }
  
  // Try in resources directory (for portable builds)
  const resourcesPath = process.resourcesPath || path.join(exeDir, 'resources');
  const configInResources = path.join(resourcesPath, 'config.json');
  if (fs.existsSync(configInResources)) {
    return configInResources;
  }
  
  // Fall back to __dirname (development mode or if bundled in asar)
  return path.join(__dirname, 'config.json');
}

const CONFIG = getConfigPath();

// Auto-restart configuration
const AUTO_CLOSE_SECONDS = 5; // Close app after 5 seconds (on each system boot)
const FRESH_BOOT_UPTIME_SECONDS = 120; // Consider system fresh boot if uptime < 2 minutes

// Flag to track if we're doing an automatic restart
let isAutoRestarting = false;

// Function to check if we should delay startup (after app restart)
function shouldDelayStartup() {
  // Check if a marker file exists indicating we just restarted
  const exeDir = path.dirname(process.execPath);
  const restartMarker = path.join(exeDir, '.app-restart-marker');
  return fs.existsSync(restartMarker);
}

// Function to create restart marker
function createRestartMarker() {
  try {
    const exeDir = path.dirname(process.execPath);
    const restartMarker = path.join(exeDir, '.app-restart-marker');
    fs.writeFileSync(restartMarker, new Date().toISOString(), 'utf8');
    console.log('Created app restart marker file');
  } catch (e) {
    console.error('Failed to create restart marker:', e);
  }
}

// Function to remove restart marker
function removeRestartMarker() {
  try {
    const exeDir = path.dirname(process.execPath);
    const restartMarker = path.join(exeDir, '.app-restart-marker');
    if (fs.existsSync(restartMarker)) {
      fs.unlinkSync(restartMarker);
      console.log('Removed app restart marker file');
    }
  } catch (e) {
    console.error('Failed to remove restart marker:', e);
  }
}

// Function to check if system just booted (fresh boot detection)
function isFreshSystemBoot() {
  const uptimeSeconds = os.uptime();
  return uptimeSeconds < FRESH_BOOT_UPTIME_SECONDS;
}

// Function to check if we've already done the restart cycle for this boot session
function hasRestartCompletedForThisBoot() {
  const exeDir = path.dirname(process.execPath);
  const bootMarker = path.join(exeDir, '.app-boot-restart-marker');
  
  if (!fs.existsSync(bootMarker)) {
    return false;
  }
  
  try {
    // Read the boot marker and check if it matches current boot time
    const markerContent = fs.readFileSync(bootMarker, 'utf8');
    const bootTime = parseFloat(markerContent);
    const currentUptime = os.uptime();
    
    // If marker was created when system had similar uptime, it's the same boot session
    // We check if uptime difference is small (within 10 seconds)
    return Math.abs(currentUptime - bootTime) < 10;
  } catch (e) {
    return false;
  }
}

// Function to mark restart as completed for this boot session
function markRestartCompletedForThisBoot() {
  try {
    const exeDir = path.dirname(process.execPath);
    const bootMarker = path.join(exeDir, '.app-boot-restart-marker');
    // Store current system uptime as marker
    fs.writeFileSync(bootMarker, os.uptime().toString(), 'utf8');
    console.log('Marked app restart as completed for this boot session');
  } catch (e) {
    console.error('Failed to mark restart as completed:', e);
  }
}

// Function to restart the application
function restartApplication() {
  console.log('Restarting application (boot cycle restart)...');
  
  // Set flag to prevent window-all-closed from interfering
  isAutoRestarting = true;
  
  // Create marker so we know to delay on next startup
  createRestartMarker();
  
  // Mark that restart will be completed for this boot session
  markRestartCompletedForThisBoot();
  
  // Unregister shortcuts
  globalShortcut.unregisterAll();
  
  // Close all windows
  BrowserWindow.getAllWindows().forEach(w => w.close());
  
  // Small delay before restarting to ensure windows are closed
  setTimeout(() => {
    console.log('Relaunching application...');
    app.relaunch();
    app.exit(0); // Use exit instead of quit for more reliable restart
  }, 500);
}

function readConfig() {
  try {
    const configPath = getConfigPath();
    console.log('Reading config from:', configPath);
    console.log('Executable path:', process.execPath);
    console.log('Resources path:', process.resourcesPath);
    console.log('__dirname:', __dirname);
    
    if (!fs.existsSync(configPath)) {
      console.error('Config file not found at:', configPath);
      console.log('Searched in:');
      console.log('  1. Next to exe:', path.join(path.dirname(process.execPath), 'config.json'));
      if (process.resourcesPath) {
        console.log('  2. In resources:', path.join(process.resourcesPath, 'config.json'));
      }
      console.log('  3. In __dirname:', path.join(__dirname, 'config.json'));
      console.log('\nPlease ensure config.json exists in one of these locations.');
      return { windows: [] };
    }
    
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);
    console.log('Config loaded successfully with', config.windows?.length || 0, 'windows');
    return config;
  } catch (e) {
    console.error('Failed to read config.json:', e.message);
    console.error('Error details:', e);
    console.error('Config path was:', getConfigPath());
    return { windows: [] };
  }
}

function createWindows() {
  const displays = screen.getAllDisplays();
  const cfg = readConfig();

  console.log('Detected displays:', displays.map(d => ({id: d.id, bounds: d.bounds, name: d.displayName})));

  cfg.windows.forEach((wConf, i) => {
    const idx = wConf.displayIndex ?? i;
    const display = displays[idx] || displays[0];
    const bounds = display.bounds || { x: 0, y: 0, width: 1920, height: 1080 };
    const url = wConf.url || cfg.fallbackUrl || 'about:blank';

    const win = new BrowserWindow({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      kiosk: true,            // true => kiosk/fullscreen mode
      frame: false,
      alwaysOnTop: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      }
    });

    console.log(`Creating window for display ${idx} at ${bounds.x},${bounds.y} => ${url}`);
    win.loadURL(url);

    // Add keyboard shortcuts to exit (Ctrl+Q or Escape)
    // Method 1: before-input-event (works when window has focus)
    win.webContents.on('before-input-event', (event, input) => {
      // Ctrl+Q or Escape to exit
      if ((input.control && input.key.toLowerCase() === 'q') || input.key === 'Escape') {
        event.preventDefault();
        console.log('Exit shortcut pressed — closing all windows');
        BrowserWindow.getAllWindows().forEach(w => w.close());
        app.quit();
      }
    });

    // Method 2: Global shortcuts (works system-wide, more reliable in kiosk mode)
    // Register global shortcuts for exit
    if (i === 0) { // Only register once for the first window
      globalShortcut.register('CommandOrControl+Q', () => {
        console.log('Ctrl+Q global shortcut pressed — closing all windows');
        BrowserWindow.getAllWindows().forEach(w => w.close());
        app.quit();
      });
      
      globalShortcut.register('Escape', () => {
        console.log('Escape global shortcut pressed — closing all windows');
        BrowserWindow.getAllWindows().forEach(w => w.close());
        app.quit();
      });
    }

    // Optional: watch for crashes and reload
    win.webContents.on('crashed', () => {
      console.error('WebContents crashed for', url, '— reloading');
      try { win.reload(); } catch (e) { console.error(e); }
    });

    // Optional: periodic reload to handle memory leaks / auth expiry
    if (cfg.reloadIntervalSec && cfg.reloadIntervalSec > 0) {
      setInterval(() => {
        try { win.webContents.reloadIgnoringCache(); } catch(e) { console.error(e); }
      }, cfg.reloadIntervalSec * 1000);
    }
  });
}

app.on('ready', () => {
  // Check if we just restarted (from our own restart cycle)
  if (shouldDelayStartup()) {
    console.log('App just restarted. Opening windows immediately...');
    removeRestartMarker();
    
    // After restart - open windows immediately, no delay, no more auto-restarts for this boot
    createWindows();
    setupDisplayHotplug();
    console.log('App restart completed for this boot session. Running normally.');
  } else {
    // Check if this is a fresh system boot and we haven't done restart cycle yet
    const isFreshBoot = isFreshSystemBoot();
    const restartDone = hasRestartCompletedForThisBoot();
    
    console.log(`System uptime: ${os.uptime().toFixed(1)} seconds`);
    console.log(`Fresh boot detected: ${isFreshBoot}, Restart done: ${restartDone}`);
    
    // Open windows immediately
    createWindows();
    setupDisplayHotplug();
    
    // Set up auto-close timer if:
    // 1. System just booted (fresh boot) AND
    // 2. We haven't done the restart cycle for this boot yet
    if (isFreshBoot && !restartDone) {
      console.log('Fresh system boot detected. Will auto-restart after 5 seconds.');
      setupAutoCloseTimer();
    } else {
      if (!isFreshBoot) {
        console.log('System has been running. No auto-restart needed.');
      } else {
        console.log('Restart cycle already completed for this boot session.');
      }
    }
  }
});

// Setup display hotplug handlers
function setupDisplayHotplug() {
  screen.on('display-added', () => {
    console.log('Display added — restarting windows');
    BrowserWindow.getAllWindows().forEach(w => w.destroy());
    createWindows();
  });
  
  screen.on('display-removed', () => {
    console.log('Display removed — restarting windows');
    BrowserWindow.getAllWindows().forEach(w => w.destroy());
    createWindows();
  });
}

// Setup auto-close timer that triggers app restart
function setupAutoCloseTimer() {
  const closeDelay = AUTO_CLOSE_SECONDS * 1000; // Convert seconds to milliseconds
  console.log(`Auto-close timer set: App will close and restart in ${AUTO_CLOSE_SECONDS} second(s)`);
  
  setTimeout(() => {
    console.log(`${AUTO_CLOSE_SECONDS} second(s) elapsed. Closing app and restarting...`);
    restartApplication();
  }, closeDelay);
}

app.on('window-all-closed', () => {
  // Don't quit if we're doing an automatic restart
  if (isAutoRestarting) {
    console.log('All windows closed — auto-restart in progress, not quitting');
    return;
  }
  
  // Allow the app to quit when all windows are closed (manual closure)
  console.log('All windows closed — quitting application');
  // Unregister all global shortcuts
  globalShortcut.unregisterAll();
  app.quit();
});

// Clean up global shortcuts when app is about to quit
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
