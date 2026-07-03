# Quick Installation Guide

## Load the Extension in Chrome/Edge

1. Build the extension (if you haven't already):
   ```bash
   npm install
   npm run build
   ```

2. Open your browser:
   - **Chrome**: Navigate to `chrome://extensions`
   - **Edge**: Navigate to `edge://extensions`

3. Enable "Developer mode":
   - Look for the toggle in the top right corner
   - Turn it ON

4. Click "Load unpacked"

5. Select the `dist` folder from the VanishMe project directory

6. The extension should now appear in your extensions list

7. (Optional) Pin the extension:
   - Click the puzzle icon in your browser toolbar
   - Find "VanishMe"
   - Click the pin icon to keep it visible

## Verify Installation

1. Click the VanishMe icon in your toolbar
2. You should see the popup interface
3. Try clicking "Leak Test" to open the testing page
4. All features should be accessible

## Quick Start

1. In the popup, enable "Global Protection"
2. Select a profile (e.g., "Singapore")
3. Click "Apply Profile"
4. Click "Save"
5. Reload any open tabs to apply changes

## Troubleshooting

### Extension doesn't appear after loading
- Make sure you selected the `dist` folder, not the root folder
- Check for errors in the extensions page
- Try rebuilding: `npm run build`

### Changes not taking effect
- Make sure to click "Save" after making changes
- Reload the web page after saving
- Check that "Global Protection" is enabled

### Build fails
- Make sure Node.js is installed (v18+)
- Delete `node_modules` and run `npm install` again
- Check for TypeScript errors: `npx tsc --noEmit`

## Uninstalling

1. Go to `chrome://extensions` or `edge://extensions`
2. Find "VanishMe"
3. Click "Remove"
4. Confirm the removal

Your configuration data will be cleared when you remove the extension.
