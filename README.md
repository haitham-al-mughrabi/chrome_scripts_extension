# JS Script Manager - Chrome Extension

A Chrome extension that allows you to store, manage, and execute JavaScript scripts on any webpage.

## Features

- Store Scripts: Save your frequently used JavaScript snippets
- CRUD Operations: Create, Read, Update, and Delete scripts
- One-Click Execution: Run any script with a single click
- Search: Quickly find scripts by name
- Persistent Storage: All scripts are saved locally using Chrome's storage API

## Installation

### Step 1: Add Extension Icons

Before loading the extension, you need to add icon files. Create three PNG icon files:
- icon16.png (16x16 pixels)
- icon48.png (48x48 pixels)
- icon128.png (128x128 pixels)

You can use any icon or create simple colored squares. Alternatively, you can remove the icon references from manifest.json if you want to skip this step.

### Step 2: Load Extension in Chrome

1. Open Chrome and navigate to chrome://extensions/
2. Enable "Developer mode" using the toggle in the top right
3. Click "Load unpacked"
4. Select the chrome_scripts_extension folder
5. The extension should now appear in your extensions list

### Step 3: Pin the Extension

1. Click the puzzle piece icon in Chrome's toolbar
2. Find "JS Script Manager" and click the pin icon
3. The extension icon will now appear in your toolbar

## Usage

### Creating a Script

1. Click the extension icon to open the popup
2. Click "+ New Script"
3. Enter a name for your script
4. Write your JavaScript code in the textarea
5. Click "Save"

### Running a Script

1. Open the extension popup
2. Find the script you want to run
3. Click the "Run" button
4. The script will execute on the current webpage

### Editing a Script

1. Click the "Edit" button next to a script
2. Modify the name or code
3. Click "Save"

### Deleting a Script

1. Click the "Delete" button next to a script
2. Confirm the deletion

### Searching Scripts

Use the search box at the top of the popup to filter scripts by name.

## Example Scripts

Here are some example scripts you can try:

**Hello World**
```javascript
alert('Hello from JS Script Manager!');
```

**Change Background Color**
```javascript
document.body.style.backgroundColor = '#' + Math.floor(Math.random()*16777215).toString(16);
```

**Scroll to Top**
```javascript
window.scrollTo({ top: 0, behavior: 'smooth' });
```

**Show All Images**
```javascript
const images = document.querySelectorAll('img');
images.forEach(img => console.log(img.src));
alert('Found ' + images.length + ' images on this page');
```

## File Structure

```
chrome_scripts_extension/
├── manifest.json       # Extension configuration
├── popup.html          # Extension popup UI
├── popup.css           # Popup styling
├── popup.js            # UI logic and CRUD operations
├── background.js       # Background service worker
├── README.md           # This file
└── icon*.png          # Extension icons (need to be added)
```

## Security Note

This extension executes user-provided JavaScript code. Only run scripts that you trust and understand.

## Browser Compatibility

This extension is built using Manifest V3 and requires Chrome 88 or later.

## Troubleshooting

**Extension doesn't load**
- Make sure all files are in the same directory
- Check that Developer Mode is enabled in chrome://extensions/
- Look for errors in the Chrome Extensions page

**Scripts don't execute**
- Check the browser console for errors (F12)
- Ensure the script has valid JavaScript syntax
- Some websites may have Content Security Policies that block script execution

**Storage issues**
- Chrome local storage is virtually unlimited, but scripts are stored per-browser
- Clear extension storage from chrome://extensions/ if needed
