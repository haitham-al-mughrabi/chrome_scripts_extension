// Content script to auto-run scripts on page load and handle persistent scripts

(async function() {
  try {
    // Clear running state for this tab on page load (since JS execution stops on reload)
    await chrome.runtime.sendMessage({ 
      action: 'clearRunningState',
      tabId: null // Will be set by background script
    });
    
    // Send message to background script to execute auto-run and persistent scripts
    await chrome.runtime.sendMessage({ 
      action: 'executeAutoRunScripts',
      url: window.location.href 
    });
  } catch (error) {
    if (error.message && error.message.includes('Extension context invalidated')) {
      console.log('Extension was reloaded, skipping script execution');
      return;
    }
    console.error('Error requesting auto-run scripts:', error);
  }
})();

// Listen for navigation changes to re-run persistent scripts
let lastUrl = window.location.href;
let observer = null;

// Cleanup function
function cleanup() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

// Check for URL changes (for SPAs)
observer = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    
    // Re-run persistent scripts on navigation
    setTimeout(async () => {
      try {
        await chrome.runtime.sendMessage({ 
          action: 'executePersistentScripts',
          url: window.location.href 
        });
      } catch (error) {
        if (error.message && error.message.includes('Extension context invalidated')) {
          console.log('Extension was reloaded, skipping persistent script execution');
          cleanup();
          return;
        }
        console.error('Error requesting persistent scripts:', error);
      }
    }, 100); // Small delay to let page settle
  }
});

observer.observe(document, { subtree: true, childList: true });

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);
window.addEventListener('unload', cleanup);
