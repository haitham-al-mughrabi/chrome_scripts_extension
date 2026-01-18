// Background service worker for JS Script Manager

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('JS Script Manager installed successfully');
  } else if (details.reason === 'update') {
    console.log('JS Script Manager updated');
  }
});

// Listen for messages from popup or content scripts (for future extensibility)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'executeScript') {
    // Handle script execution request
    executeScriptInTab(request.tabId, request.code)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'executeAutoRunScripts') {
    // Handle auto-run scripts execution from content script
    executeAutoRunScripts(sender.tab.id)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
});

// Execute script in a specific tab
async function executeScriptInTab(tabId, code) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      world: 'MAIN',
      func: (scriptCode) => {
        // Execute in main world context to bypass CSP
        const fn = new Function(scriptCode);
        fn();
      },
      args: [code]
    });
  } catch (error) {
    console.error('Error executing script:', error);
    throw error;
  }
}

// Execute auto-run scripts in a specific tab
async function executeAutoRunScripts(tabId) {
  try {
    // Rate limiting: max 10 scripts per page load
    const MAX_SCRIPTS_PER_PAGE = 10;
    
    // Get current tab URL
    const tab = await chrome.tabs.get(tabId);
    const currentUrl = tab.url;
    
    // Skip chrome:// and extension pages for security
    if (currentUrl.startsWith('chrome://') || currentUrl.startsWith('chrome-extension://')) {
      return;
    }
    
    const data = await chrome.storage.local.get('js_scripts');
    const scripts = data.js_scripts || [];
    const autoRunScripts = scripts.filter(script => {
      if (!script.autoRun) return false;
      return shouldRunOnUrl(script, currentUrl);
    }).slice(0, MAX_SCRIPTS_PER_PAGE); // Limit number of scripts
    
    for (const script of autoRunScripts) {
      try {
        // Additional validation before execution
        if (!script.code || typeof script.code !== 'string') continue;
        if (script.code.length > 50000) continue; // 50KB limit
        
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          world: 'MAIN',
          func: (scriptCode) => {
            // Execute in main world context to bypass CSP
            const fn = new Function(scriptCode);
            fn();
          },
          args: [script.code]
        });
      } catch (error) {
        console.error(`Error running auto-run script "${script.name}":`, error);
      }
    }
  } catch (error) {
    console.error('Error executing auto-run scripts:', error);
    throw error;
  }
}

// Check if script should run on given URL
function shouldRunOnUrl(script, url) {
  const matchType = script.urlMatchType || 'all';
  const matchValue = script.urlMatch || '';
  
  switch (matchType) {
    case 'all':
      return true;
    case 'exact':
      return url === matchValue;
    case 'domain':
      try {
        const urlObj = new URL(url);
        return urlObj.hostname === matchValue || urlObj.hostname.endsWith('.' + matchValue);
      } catch {
        return false;
      }
    case 'contains':
      return url.includes(matchValue);
    case 'pattern':
      // Convert simple pattern to regex (* becomes .*)
      const regexPattern = matchValue.replace(/\*/g, '.*');
      try {
        return new RegExp('^' + regexPattern + '$').test(url);
      } catch {
        return false;
      }
    default:
      return false;
  }
}
