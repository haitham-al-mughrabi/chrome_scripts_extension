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
