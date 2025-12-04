# EXE Build Fix

## Problem
The packaged .exe wasn't working because it couldn't find `config.json`. In packaged Electron apps, files are bundled in an `app.asar` archive, and `__dirname` points inside that archive, not to the actual file system.

## Solution
Updated the code to look for `config.json` in multiple locations:

1. **Next to the executable** (primary location - easiest to edit)
2. **In resources directory** (for portable builds)
3. **In __dirname** (development mode fallback)

## Changes Made

### main.js
- Added `getConfigPath()` function that checks multiple locations
- Enhanced error logging to show exactly where it's looking for config.json
- Added detailed console output for debugging

### package.json
- Updated `extraFiles` to place `config.json` next to the executable
- This ensures the config file is accessible and editable after installation

## How to Rebuild

1. **Rebuild the application:**
   ```bash
   npm run build
   ```

2. **For NSIS installer:**
   - After installation, `config.json` will be in the same directory as `signage-windows.exe`
   - Example: `C:\Program Files\Signage Windows\config.json`

3. **For portable build:**
   - `config.json` will be in the same folder as the `.exe` file
   - Example: `C:\signage-electron\dist\win-unpacked\config.json`

## Testing the Fix

1. Build the app: `npm run build`
2. Run the built executable
3. Check the console output - it will show:
   - Where it's reading config from
   - Executable path
   - Resources path
   - All paths it tried

4. If config.json is missing, the console will show exactly where to place it

## Important Notes

- **After installation/portable extraction:** Make sure `config.json` exists next to the `.exe` file
- **Editing config:** You can edit `config.json` after installation without rebuilding
- **Console output:** The app now logs detailed path information to help debug any issues

## If It Still Doesn't Work

1. Run the .exe and check the console output
2. Look for the "Reading config from:" message
3. Verify `config.json` exists at that location
4. If not, copy `config.json` to the directory shown in the console output


