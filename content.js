// Content script to auto-run scripts on page load

(async function() {
  try {
    // Send message to background script to execute auto-run scripts
    await chrome.runtime.sendMessage({ action: 'executeAutoRunScripts' });
  } catch (error) {
    console.error('Error requesting auto-run scripts:', error);
  }
})();
