# Release Notes - JS Script Manager v1.0.0

## 🎉 Initial Release

We're excited to announce the first release of **JS Script Manager** - a powerful Chrome extension for managing and executing JavaScript scripts on any webpage!

## ✨ Key Features

### 📝 Script Management
- Create, edit, and delete JavaScript scripts with a professional code editor
- VS Code-like dark theme with syntax highlighting and line numbers
- Built-in code formatter and fullscreen editing mode
- Search and filter scripts by name or content

### ⚡ Execution Modes
- **Manual Execution** - Run scripts on-demand with visual feedback
- **Auto-Run Scripts** (🚀) - Execute automatically on page load
- **Persistent Scripts** (🔄) - Re-run on page navigation and reload
- **Tab-Specific State** - Track execution per browser tab

### 🌐 Advanced URL Matching
- **All Pages** - Run on every website
- **Exact URL** - Target specific pages
- **Domain Matching** - Run on specific domains (including subdomains)
- **Pattern Matching** - Use wildcards for flexible URL patterns
- **Contains Matching** - Match URLs containing specific text

### 🛡️ Security & Safety
- Input validation and sanitization
- Dangerous JavaScript pattern detection
- Content Security Policy compliance
- Rate limiting (max 10 scripts per page)
- Size limits (50KB per script)

### 💾 Data Management
- Local storage with Chrome's storage API
- Import/export functionality
- Directory synchronization for file backup
- Persistent settings across browser sessions

### 🎨 User Experience
- Compact card-based interface with status indicators
- Dynamic border colors based on script status
- Toast notifications for user feedback
- Right-click to reset script states
- Keyboard shortcuts for common actions

## 🔧 Technical Details

- **Manifest Version**: 3 (latest Chrome extension standard)
- **Permissions**: `storage`, `activeTab`, `scripting`, `downloads`
- **Security**: Strict CSP, input validation, dangerous pattern blocking
- **Compatibility**: Chrome browsers with Manifest V3 support

## 📦 Installation

### Manual Installation (Developer Mode)
1. Download the latest release ZIP file
2. Extract to a folder on your computer
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode" (toggle in top right)
5. Click "Load unpacked" and select the extracted folder
6. Pin the extension to your toolbar

### Chrome Web Store
*Coming soon - extension will be published to Chrome Web Store*

## 🚀 Quick Start

1. **Create a script**: Click the extension icon → "➕ New Script"
2. **Write JavaScript**: Use the built-in code editor
3. **Set execution mode**: Choose manual, auto-run (🚀), or persistent (🔄)
4. **Configure URL matching**: Control where your script runs
5. **Save and run**: Click "💾 Save Script" then "▶️ Run"

## 📋 Example Scripts

```javascript
// Hello World
alert('Hello from JS Script Manager!');

// Random Background Color
document.body.style.backgroundColor = '#' + Math.floor(Math.random()*16777215).toString(16);

// Smooth Scroll to Top
window.scrollTo({ top: 0, behavior: 'smooth' });

// Count Page Elements
const images = document.querySelectorAll('img');
console.log(`Found ${images.length} images on this page`);
```

## 🛡️ Security Notice

⚠️ **Important**: This extension executes user-provided JavaScript code. Only run scripts from trusted sources and always review code before execution.

## 🐛 Known Issues

- Scripts cannot be stopped once running (page refresh required)
- Some websites may block script execution due to their own security policies
- File system integration requires manual directory selection

## 🔄 What's Next

- Chrome Web Store publication
- Additional script templates
- Enhanced code editor features
- Script sharing capabilities
- Performance optimizations

## 🤝 Contributing

We welcome contributions! Please see our [README.md](README.md) for development setup instructions.

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

---

**Made with ❤️ by Haitham Al Mughrabi**

**Download**: [js-script-manager-v1.0.0.zip](../../releases/download/v1.0.0/js-script-manager-v1.0.0.zip)
