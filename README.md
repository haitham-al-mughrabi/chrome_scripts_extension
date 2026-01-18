# JS Script Manager - Chrome Extension

A powerful Chrome extension that allows you to store, manage, and execute JavaScript scripts on any webpage with advanced automation features.

![Extension Icon](icon128.png)

## 🚀 Features

### Core Functionality
- **📝 Script Management** - Create, edit, delete, and organize JavaScript scripts
- **⚡ One-Click Execution** - Run scripts instantly on any webpage
- **💾 Persistent Storage** - Scripts saved locally with Chrome's storage API
- **🔍 Search & Filter** - Quickly find scripts by name or content
- **📁 File Management** - Import/export scripts, directory synchronization

### Advanced Automation
- **🚀 Auto-Run Scripts** - Execute scripts automatically on page load
- **🔄 Persistent Scripts** - Re-run scripts on page navigation/reload
- **🌐 URL Matching** - Control where scripts run with flexible URL patterns
- **📍 Tab-Specific State** - Track script execution per browser tab

### Professional Code Editor
- **🎨 Syntax Highlighting** - VS Code-like dark theme editor
- **📊 Line Numbers** - Auto-updating line numbers with scroll sync
- **🔧 Code Formatting** - Built-in JavaScript code formatter
- **⛶ Fullscreen Mode** - Expand editor for better coding experience

### Security & Validation
- **🛡️ Input Validation** - Comprehensive security checks for script names and code
- **🚫 Dangerous Pattern Detection** - Blocks potentially harmful JavaScript patterns
- **📏 Size Limits** - 50KB per script, 10 scripts per page load
- **🔒 CSP Compliance** - Content Security Policy headers for extension pages

## 📦 Installation

### From Chrome Web Store
*Coming soon - extension will be published to Chrome Web Store*

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked" and select the extension folder
5. Pin the extension to your toolbar for easy access

## 🎯 Quick Start

### Creating Your First Script
1. Click the extension icon in your toolbar
2. Click "➕ New Script"
3. Enter a descriptive name
4. Write your JavaScript code in the editor
5. Click "💾 Save Script"

### Running Scripts
- **Manual**: Click the ▶️ icon next to any script
- **Auto-run**: Enable 🚀 for scripts to run on page load
- **Persistent**: Enable 🔄 for scripts to re-run on navigation

### Example Scripts

**Hello World**
```javascript
alert('Hello from JS Script Manager!');
```

**Random Background Color**
```javascript
document.body.style.backgroundColor = '#' + Math.floor(Math.random()*16777215).toString(16);
```

**Smooth Scroll to Top**
```javascript
window.scrollTo({ top: 0, behavior: 'smooth' });
```

**Count Page Images**
```javascript
const images = document.querySelectorAll('img');
console.log(`Found ${images.length} images on this page`);
alert(`This page has ${images.length} images`);
```

## 🎛️ Advanced Features

### URL Matching Options
Control where your scripts run with flexible URL patterns:

- **All Pages** - Run on every website
- **Exact URL** - `https://example.com/specific-page`
- **Domain** - `github.com` (includes subdomains)
- **Contains** - Any URL containing `admin`
- **Pattern** - `*/dashboard/*` (wildcard matching)

### Script Types & Visual Indicators

| Icon | Type | Description |
|------|------|-------------|
| 🚀 | Auto-run | Executes automatically on page load |
| 🔄 | Persistent | Re-runs on page navigation/reload |
| ⚡ | Running | Currently executed (orange when active) |

### Card Border Colors
- **🟠 Orange** - Script currently running
- **🟢 Green** - Auto-run script
- **🔵 Blue** - Persistent script  
- **🟣 Purple** - Both auto-run and persistent
- **⚪ Gray** - Default/inactive script

## 🔧 Usage Tips

### Best Practices
- **Test scripts thoroughly** before enabling auto-run or persistent mode
- **Use descriptive names** to easily identify scripts later
- **Include timeouts** in long-running scripts to prevent infinite loops
- **Right-click ⚡ icons** to reset running state for individual scripts

### Keyboard Shortcuts
- **Ctrl/Cmd + S** - Save script (in editor)
- **Esc** - Close editor panel
- **F11** - Toggle fullscreen editor mode

### Managing Scripts
- **Search**: Use the search box to filter scripts by name or content
- **Bulk Operations**: Use "Manage All" for import/export and advanced management
- **File Sync**: Select a directory to automatically save scripts as JSON files

## 🛡️ Security

### Built-in Protections
- **Input Sanitization** - All user inputs are validated and sanitized
- **Dangerous Pattern Detection** - Blocks `eval()`, `innerHTML`, and other risky patterns
- **Size Limits** - Scripts limited to 50KB, names to 100 characters
- **Rate Limiting** - Maximum 10 scripts per page load
- **URL Validation** - Strict validation for URL matching patterns

### Security Best Practices
- **Only run trusted scripts** - Never execute code from unknown sources
- **Review before auto-run** - Carefully test scripts before enabling automation
- **Regular cleanup** - Remove unused scripts to minimize attack surface
- **Monitor execution** - Check browser console for script errors or warnings

## 🔧 Development

### File Structure
```
chrome_scripts_extension/
├── manifest.json          # Extension configuration
├── popup.html            # Main popup interface
├── popup.css             # Popup styling
├── popup.js              # Popup logic and script management
├── manage.html           # Full management interface
├── manage.css            # Management page styling
├── manage.js             # Advanced management features
├── background.js         # Service worker for script execution
├── content.js            # Content script for auto-run functionality
├── fileManager.js        # File system integration
├── icon16.png            # Extension icons
├── icon48.png
├── icon128.png
└── README.md             # This file
```

### Technical Details
- **Manifest Version**: 3 (latest Chrome extension standard)
- **Permissions**: `storage`, `activeTab`, `scripting`, `downloads`
- **Content Security Policy**: Strict CSP for enhanced security
- **Storage**: Chrome's local storage API for persistence
- **Execution Context**: Main world injection to bypass CSP restrictions

## 🐛 Troubleshooting

### Common Issues

**Scripts don't execute**
- Check browser console (F12) for JavaScript errors
- Verify script syntax is valid
- Ensure website allows script execution (some sites block it)

**Auto-run not working**
- Reload the extension in `chrome://extensions/`
- Check if URL matching pattern is correct
- Verify script is marked with 🚀 auto-run

**Extension not loading**
- Enable Developer Mode in Chrome extensions
- Check for errors in extension console
- Ensure all files are in the same directory

**Storage issues**
- Scripts are stored per-browser profile
- Clear extension data from `chrome://extensions/` if needed
- Check available storage space

### Getting Help
1. Check the browser console for error messages
2. Verify extension permissions are granted
3. Try reloading the extension
4. Test with a simple script first

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup
1. Clone the repository
2. Load the extension in Chrome Developer Mode
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

If you encounter any issues or have feature requests, please:
1. Check the troubleshooting section above
2. Search existing issues on GitHub
3. Create a new issue with detailed information

## 🔄 Changelog

### Version 1.0.0
- Initial release
- Core script management functionality
- Auto-run and persistent script features
- Professional code editor
- Security validation and input sanitization
- Tab-specific execution tracking
- URL matching patterns
- Import/export functionality

---

**⚠️ Security Notice**: This extension executes user-provided JavaScript code. Only run scripts from trusted sources and always review code before execution.

**Made with ❤️ by Haitham Al Mughrabi**
