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
    executeAutoRunScripts(sender.tab.id, request.url)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'executePersistentScripts') {
    // Handle persistent scripts execution on navigation
    executePersistentScripts(sender.tab.id, request.url)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'clearRunningState') {
    // Clear running state for tab on page reload
    clearRunningStateForTab(sender.tab.id)
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
async function executeAutoRunScripts(tabId, url) {
  try {
    // Get current tab URL
    const tab = await chrome.tabs.get(tabId);
    const currentUrl = url || tab.url;
    
    
    const data = await chrome.storage.local.get('js_scripts');
    const scripts = data.js_scripts || [];
    
    // Check if any script has bypass enabled
    const hasBypass = scripts.some(script => script.bypassSecurity);
    
    // Rate limiting: max 10 scripts per page load (unless bypassed)
    const MAX_SCRIPTS_PER_PAGE = hasBypass ? 1000 : 10;
    
    // Get auto-run scripts (run once on page load)
    const autoRunScripts = scripts.filter(script => {
      if (!script.autoRun) return false;
      return shouldRunOnUrl(script, currentUrl);
    });
    
    // Get persistent scripts (always run on page load, regardless of running state)
    const persistentScripts = scripts.filter(script => {
      if (!script.persistent) return false;
      return shouldRunOnUrl(script, currentUrl);
    });
    
    // Combine and limit
    const allScriptsToRun = [...autoRunScripts, ...persistentScripts]
      .slice(0, MAX_SCRIPTS_PER_PAGE);
    
    for (const script of allScriptsToRun) {
      try {
        // Additional validation before execution
        if (!script.code || typeof script.code !== 'string') continue;
        if (script.code.length > 50000 && !script.bypassSecurity) continue; // 50KB limit unless bypassed
        
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
        console.error(`Error running script "${script.name}":`, error);
      }
    }
  } catch (error) {
    console.error('Error executing auto-run scripts:', error);
    throw error;
  }
}

// Execute persistent scripts in a specific tab (only if not currently running)
async function executePersistentScripts(tabId, url) {
  try {
    // Get current tab URL
    const tab = await chrome.tabs.get(tabId);
    const currentUrl = url || tab.url;
    
    const data = await chrome.storage.local.get('js_scripts');
    const scripts = data.js_scripts || [];
    
    // Check if any script has bypass enabled
    const hasBypass = scripts.some(script => script.bypassSecurity);
    
    // Rate limiting: max 10 scripts per navigation (unless bypassed)
    const MAX_SCRIPTS_PER_PAGE = hasBypass ? 1000 : 10;
    
    // Skip chrome:// and extension pages for security (unless bypassed)
    if (!hasBypass && (currentUrl.startsWith('chrome://') || currentUrl.startsWith('chrome-extension://'))) {
      return;
    }
    
    // Get running scripts for this tab
    const runningData = await chrome.storage.local.get('running_scripts_by_tab');
    const runningByTab = runningData.running_scripts_by_tab || {};
    const runningScripts = new Set(runningByTab[tabId] || []);
    
    const persistentScripts = scripts.filter(script => {
      if (!script.persistent) return false;
      if (runningScripts.has(script.id)) return false; // Don't re-run if already running
      return shouldRunOnUrl(script, currentUrl);
    }).slice(0, MAX_SCRIPTS_PER_PAGE); // Limit number of scripts
    
    for (const script of persistentScripts) {
      try {
        // Additional validation before execution
        if (!script.code || typeof script.code !== 'string') continue;
        if (script.code.length > 50000 && !script.bypassSecurity) continue; // 50KB limit unless bypassed
        
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
        console.error(`Error running persistent script "${script.name}":`, error);
      }
    }
  } catch (error) {
    console.error('Error executing persistent scripts:', error);
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

// Clear running state for a specific tab
async function clearRunningStateForTab(tabId) {
  try {
    const data = await chrome.storage.local.get('running_scripts_by_tab');
    const runningByTab = data.running_scripts_by_tab || {};
    
    // Remove this tab's running scripts
    delete runningByTab[tabId];
    
    await chrome.storage.local.set({ 
      running_scripts_by_tab: runningByTab 
    });
  } catch (error) {
    console.error('Error clearing running state for tab:', error);
  }
}
