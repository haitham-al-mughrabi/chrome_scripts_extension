// TEST: Check if JavaScript is loading
console.log('🚀 popup.js loaded successfully!');


// Storage key
const STORAGE_KEY = 'js_scripts';

// Pagination settings
const ITEMS_PER_PAGE = 5;

// DOM Elements
const newScriptBtn = document.getElementById('newScriptBtn');
const manageScriptsBtn = document.getElementById('manageScriptsBtn');
const scriptsList = document.getElementById('scriptsList');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const scriptCount = document.getElementById('scriptCount');

// Pagination elements
const pagination = document.getElementById('pagination');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const currentPageSpan = document.getElementById('currentPage');
const totalPagesSpan = document.getElementById('totalPages');

// Editor Panel Elements
const editorPanel = document.getElementById('editorPanel');
const closePanelBtn = document.getElementById('closePanelBtn');
const cancelPanelBtn = document.getElementById('cancelPanelBtn');
const savePanelBtn = document.getElementById('savePanelBtn');
const panelScriptName = document.getElementById('panelScriptName');
const panelScriptCode = document.getElementById('panelScriptCode');
const panelAutoRun = document.getElementById('panelAutoRun');
const panelPersistent = document.getElementById('panelPersistent');
const panelBypassSecurity = document.getElementById('panelBypassSecurity');
const panelUrlMatchType = document.getElementById('panelUrlMatchType');
const panelUrlMatch = document.getElementById('panelUrlMatch');
const urlMatchSection = document.getElementById('urlMatchSection');
const lineNumbers = document.getElementById('lineNumbers');
const formatCodeBtn = document.getElementById('formatCodeBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const panelTitle = document.getElementById('panelTitle');

// Debug: Check if elements exist
console.log('Element check:', {
  panelBypassSecurity: !!panelBypassSecurity,
  panelAutoRun: !!panelAutoRun,
  panelPersistent: !!panelPersistent
});

// Panel state
let editingScriptId = null;
let isViewMode = false;

// Pagination state
let allScripts = [];
let filteredScripts = [];
let currentPage = 1;
let totalPages = 1;

// Running scripts tracking - per tab
let runningScripts = new Map(); // Map of tabId -> Set of script IDs
let currentTabId = null;

// Load running scripts from storage on startup
async function loadRunningScripts() {
  try {
    const data = await chrome.storage.local.get('running_scripts_by_tab');
    const runningByTab = data.running_scripts_by_tab || {};
    runningScripts = new Map();
    
    // Convert stored object back to Map of Sets
    for (const [tabId, scriptIds] of Object.entries(runningByTab)) {
      runningScripts.set(parseInt(tabId), new Set(scriptIds));
    }
  } catch (error) {
    console.error('Error loading running scripts:', error);
  }
}

// Save running scripts to storage
async function saveRunningScripts() {
  try {
    const runningByTab = {};
    // Convert Map of Sets to plain object for storage
    for (const [tabId, scriptSet] of runningScripts.entries()) {
      runningByTab[tabId] = Array.from(scriptSet);
    }
    
    await chrome.storage.local.set({ 
      running_scripts_by_tab: runningByTab 
    });
  } catch (error) {
    console.error('Error saving running scripts:', error);
  }
}

// Get current tab's running scripts
function getCurrentTabRunningScripts() {
  if (!currentTabId) return new Set();
  return runningScripts.get(currentTabId) || new Set();
}

// Add script to current tab's running list
function addRunningScript(scriptId) {
  if (!currentTabId) return;
  if (!runningScripts.has(currentTabId)) {
    runningScripts.set(currentTabId, new Set());
  }
  runningScripts.get(currentTabId).add(scriptId);
}

// Remove script from current tab's running list
function removeRunningScript(scriptId) {
  if (!currentTabId) return;
  const tabScripts = runningScripts.get(currentTabId);
  if (tabScripts) {
    tabScripts.delete(scriptId);
    if (tabScripts.size === 0) {
      runningScripts.delete(currentTabId);
    }
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Get current tab ID first
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTabId = tab?.id;
  } catch (error) {
    console.error('Error getting current tab:', error);
  }
  
  await loadRunningScripts(); // Load persistent running state
  loadScripts();
  setupEventListeners();

  // Set current year in footer
  document.getElementById('currentYear').textContent = new Date().getFullYear();

  // Start watching for file changes
  FILE_MANAGER.startWatching(loadScripts);
  
  // Listen for storage changes to refresh running state
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.running_scripts_by_tab) {
      loadRunningScripts().then(() => {
        displayScripts(); // Refresh UI
      });
    }
  });
  
  // Force add bypass security checkbox if missing
  setTimeout(() => {
    const bypassCheckbox = document.getElementById('panelBypassSecurity');
    if (!bypassCheckbox) {
      const persistentGroup = document.querySelector('#panelPersistent').closest('.form-group');
      const newGroup = document.createElement('div');
      newGroup.className = 'form-group';
      newGroup.innerHTML = `
        <label class="checkbox-label security-warning">
          <input type="checkbox" id="panelBypassSecurity" class="checkbox-input">
          <span class="checkbox-custom"></span>
          <span class="label-text">
            <span class="label-icon">⚠️</span>
            Bypass security validation (use at your own risk)
          </span>
        </label>
      `;
      persistentGroup.parentNode.insertBefore(newGroup, persistentGroup.nextSibling);
    }
  }, 100);
});

// Cleanup when popup closes
window.addEventListener('beforeunload', () => {
  FILE_MANAGER.stopWatching();
});

// Reload scripts when popup becomes visible (in case scripts were edited)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    loadScripts();
  }
});

// Setup event listeners
function setupEventListeners() {
  newScriptBtn.addEventListener('click', openNewScript);
  manageScriptsBtn.addEventListener('click', openManagePage);
  searchInput.addEventListener('input', handleSearch);

  // Pagination event listeners
  prevPageBtn.addEventListener('click', () => changePage(currentPage - 1));
  nextPageBtn.addEventListener('click', () => changePage(currentPage + 1));

  // Panel event listeners
  closePanelBtn.addEventListener('click', closePanel);
  cancelPanelBtn.addEventListener('click', closePanel);
  savePanelBtn.addEventListener('click', saveScriptFromPanel);

  // Auto-run and URL match listeners
  panelAutoRun.addEventListener('change', toggleUrlMatchSection);
  panelUrlMatchType.addEventListener('change', toggleUrlMatchInput);

  // Code editor listeners
  panelScriptCode.addEventListener('input', updateLineNumbers);
  panelScriptCode.addEventListener('scroll', syncLineNumbersScroll);
  formatCodeBtn.addEventListener('click', formatCode);
  fullscreenBtn.addEventListener('click', toggleFullscreen);

  // Close panel when clicking overlay
  editorPanel.querySelector('.panel-overlay').addEventListener('click', closePanel);
}

// Load scripts from storage
async function loadScripts() {
  allScripts = await FILE_MANAGER.loadAllScripts();
  filteredScripts = [...allScripts];
  currentPage = 1;
  displayScripts();
  updateScriptCount(allScripts.length);
}

// Display scripts in the list with pagination
function displayScripts() {
  scriptsList.innerHTML = ''; // Safe: clearing container

  if (filteredScripts.length === 0) {
    emptyState.style.display = 'block';
    scriptsList.style.display = 'none';
    pagination.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  scriptsList.style.display = 'block';

  // Calculate pagination
  totalPages = Math.ceil(filteredScripts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  // Sort by updated date (newest first)
  const sortedScripts = [...filteredScripts].sort((a, b) => {
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  // Get scripts for current page
  const pageScripts = sortedScripts.slice(startIndex, endIndex);

  pageScripts.forEach(script => {
    const scriptItem = createScriptItem(script); // createScriptItem uses escapeHtml for safety
    scriptsList.appendChild(scriptItem);
  });

  // Update pagination UI
  updatePaginationUI();
}

// Create script item element
function createScriptItem(script) {
  const div = document.createElement('div');
  div.className = 'script-item';
  div.dataset.id = script.id;

  const updatedDate = new Date(script.updatedAt).toLocaleDateString();
  const isRunning = getCurrentTabRunningScripts().has(script.id);
  const autoRunIcon = script.autoRun ? '<span class="auto-run-indicator" title="Auto-runs on page load">🚀</span>' : '';
  const persistentIcon = script.persistent ? '<span class="persistent-indicator" title="Re-runs on navigation/reload">🔄</span>' : '';

  // Add status classes for border colors
  if (isRunning) {
    div.classList.add('running');
  } else if (script.autoRun && script.persistent) {
    div.classList.add('auto-run', 'persistent');
  } else if (script.autoRun) {
    div.classList.add('auto-run');
  } else if (script.persistent) {
    div.classList.add('persistent');
  }

  div.innerHTML = `
    <div class="script-info">
      <div class="script-header">
        <div class="script-name">
          ${isRunning ? '<span class="running-indicator">⚡</span>' : ''}
          ${autoRunIcon}
          ${persistentIcon}
          ${escapeHtml(script.name)}
        </div>
        <div class="script-actions">
          <span class="action-icon run-icon ${isRunning ? 'disabled' : ''}" data-id="${script.id}" title="${isRunning ? 'Script Executed on this tab - Right-click to reset' : 'Run Script'}">
            ${isRunning ? '⚡' : '▶️'}
          </span>
          <span class="action-icon persistent-toggle ${script.persistent ? 'active' : ''}" data-id="${script.id}" title="${script.persistent ? 'Persistent: ON - Click to disable' : 'Persistent: OFF - Click to enable'}">
            🔄
          </span>
          <span class="action-icon edit-icon" data-id="${script.id}" title="Edit Script">✏️</span>
          <span class="action-icon delete-icon" data-id="${script.id}" title="Delete Script">🗑️</span>
        </div>
      </div>
      <div class="script-meta">${updatedDate}</div>
    </div>
  `;

  // Add event listeners with live state checking
  const runIcon = div.querySelector('.run-icon');
  runIcon.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Check running state at click time, not creation time
    if (!runningScripts.has(script.id)) {
      runScript(script);
    }
  });
  
  // Add right-click to reset running state
  runIcon.addEventListener('contextmenu', async (e) => {
    e.preventDefault();
    if (runningScripts.has(script.id)) {
      runningScripts.delete(script.id);
      await saveRunningScripts();
      runIcon.classList.remove('disabled');
      runIcon.innerHTML = '▶️';
      runIcon.title = 'Run Script';
      showStatus('Script reset for this tab', 'success');
    }
  });
  
  // Add persistent toggle functionality
  const persistentToggle = div.querySelector('.persistent-toggle');
  persistentToggle.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Toggle persistent state
    script.persistent = !script.persistent;
    
    // Update visual state
    if (script.persistent) {
      persistentToggle.classList.add('active');
      persistentToggle.title = 'Persistent: ON - Click to disable';
    } else {
      persistentToggle.classList.remove('active');
      persistentToggle.title = 'Persistent: OFF - Click to enable';
    }
    
    // Save to storage
    try {
      await FILE_MANAGER.saveScript(script);
      showStatus(`Persistent ${script.persistent ? 'enabled' : 'disabled'} for "${script.name}"`, 'success');
    } catch (error) {
      showStatus('Failed to update script', 'error');
      console.error(error);
    }
  });
  
  div.querySelector('.edit-icon').addEventListener('click', () => editScript(script));
  div.querySelector('.delete-icon').addEventListener('click', () => deleteScript(script.id));

  return div;
}

// Open new script in side panel
function openNewScript() {
  editingScriptId = null;
  isViewMode = false;
  panelTitle.textContent = 'New Script';
  panelScriptName.value = '';
  panelScriptCode.value = '';
  panelAutoRun.checked = false;
  panelPersistent.checked = false;
  
  // FORCE ADD BYPASS SECURITY CHECKBOX
  let bypassCheckbox = document.getElementById('panelBypassSecurity');
  if (!bypassCheckbox) {
    
    // Find the persistent checkbox container
    const persistentContainer = document.querySelector('#panelPersistent').closest('.form-group');
    
    // Create new container with same structure as other checkboxes
    const newContainer = document.createElement('div');
    newContainer.className = 'form-group';
    
    newContainer.innerHTML = `
      <label class="checkbox-label">
        <input type="checkbox" id="panelBypassSecurity" class="checkbox-input">
        <span class="checkbox-custom"></span>
        <span class="checkbox-text">⚠️ Bypass Security Validation</span>
      </label>
    `;
    
    // Insert after persistent checkbox
    persistentContainer.parentNode.insertBefore(newContainer, persistentContainer.nextSibling);
  }
  
  panelUrlMatchType.value = 'all';
  panelUrlMatch.value = '';
  panelScriptName.readOnly = false;
  panelScriptCode.readOnly = false;
  savePanelBtn.style.display = 'flex';
  editorPanel.classList.add('active');
  
  setTimeout(() => {
    toggleUrlMatchSection();
    updateLineNumbers();
  }, 50);
  
  panelScriptName.focus();
}

// Open manage scripts page
function openManagePage() {
  chrome.tabs.create({ url: 'manage.html' });
}

// Open edit script in side panel
function editScript(script) {
  editingScriptId = script.id;
  isViewMode = false;
  panelTitle.textContent = 'Edit Script';
  panelScriptName.value = script.name;
  panelScriptCode.value = script.code;
  panelAutoRun.checked = script.autoRun || false;
  panelPersistent.checked = script.persistent || false;
  panelBypassSecurity.checked = script.bypassSecurity || false;
  panelUrlMatchType.value = script.urlMatchType || 'all';
  panelUrlMatch.value = script.urlMatch || '';
  panelScriptName.readOnly = false;
  panelScriptCode.readOnly = false;
  savePanelBtn.style.display = 'flex';
  editorPanel.classList.add('active');
  
  // Ensure DOM is ready before toggling sections
  setTimeout(() => {
    toggleUrlMatchSection();
    updateLineNumbers();
  }, 50);
  
  panelScriptName.focus();
}

// Close the side panel
function closePanel() {
  editorPanel.classList.remove('active');
  setTimeout(() => {
    editingScriptId = null;
    isViewMode = false;
    panelScriptName.value = '';
    panelScriptCode.value = '';
    panelAutoRun.checked = false;
    panelUrlMatchType.value = 'all';
    panelUrlMatch.value = '';
    panelScriptName.readOnly = false;
    panelScriptCode.readOnly = false;
    savePanelBtn.style.display = 'flex';
    toggleUrlMatchSection();
  }, 300); // Wait for animation to complete
}

// Save script from panel
async function saveScriptFromPanel() {
  const name = panelScriptName.value.trim();
  const code = panelScriptCode.value.trim();
  const autoRun = panelAutoRun.checked;
  const persistent = panelPersistent.checked;
  const urlMatchType = panelUrlMatchType.value;
  const urlMatch = panelUrlMatch.value.trim();

  // Validate script name
  if (!validateScriptName(name)) {
    showStatus('Invalid script name. Use only safe characters and keep under 100 chars.', 'error');
    panelScriptName.focus();
    return;
  }

  // Validate JavaScript code
  const codeValidation = validateJavaScript(code);
  if (!codeValidation.valid) {
    showStatus(`${codeValidation.reason}. Add a bypass checkbox if needed.`, 'error');
    panelScriptCode.focus();
    return;
  }
  
  if (codeValidation.bypassed) {
    showStatus('⚠️ Security validation bypassed - use at your own risk!', 'warning');
  }

  // Validate URL matching if auto-run is enabled
  if (autoRun && urlMatchType !== 'all') {
    if (!urlMatch) {
      showStatus('Please enter URL match criteria', 'error');
      panelUrlMatch.focus();
      return;
    }
    if (!validateUrl(urlMatch, urlMatchType)) {
      showStatus('Invalid URL format for selected match type', 'error');
      panelUrlMatch.focus();
      return;
    }
  }

  try {
    let script;
    const allScripts = await FILE_MANAGER.loadAllScripts();

    if (editingScriptId) {
      const existing = allScripts.find(s => s.id === editingScriptId);
      script = {
        ...existing,
        name: name,
        code: code,
        autoRun,
        persistent,
        urlMatchType: autoRun ? urlMatchType : undefined,
        urlMatch: autoRun && urlMatchType !== 'all' ? urlMatch : undefined,
        updatedAt: new Date().toISOString()
      };
    } else {
      script = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: name,
        code: code,
        autoRun,
        persistent,
        urlMatchType: autoRun ? urlMatchType : undefined,
        urlMatch: autoRun && urlMatchType !== 'all' ? urlMatch : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    await FILE_MANAGER.saveScript(script);
    showStatus(editingScriptId ? 'Script updated' : 'Script saved', 'success');

    setTimeout(() => {
      closePanel();
      loadScripts();
    }, 500);
  } catch (error) {
    showStatus('Failed to save script: ' + error.message, 'error');
    console.error(error);
  }
}

// Delete script
async function deleteScript(id) {
  try {
    await FILE_MANAGER.deleteScript(id);
    loadScripts();
    showStatus('Script deleted', 'success');
  } catch (error) {
    showStatus('Failed to delete script', 'error');
    console.error(error);
  }
}

// Run script
async function runScript(script) {
  if (getCurrentTabRunningScripts().has(script.id)) {
    return; // Already running on this tab
  }

  try {
    // Mark script as running on current tab
    addRunningScript(script.id);
    await saveRunningScripts(); // Persist to storage
    
    // Immediately disable the button permanently
    const runButton = document.querySelector(`[data-id="${script.id}"].run-icon`);
    if (runButton) {
      runButton.classList.add('disabled');
      runButton.innerHTML = '⚡';
      runButton.title = 'Script Executed on this tab - Right-click to reset';
    }

    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      // Only clear on error
      removeRunningScript(script.id);
      await saveRunningScripts();
      if (runButton) {
        runButton.classList.remove('disabled');
        runButton.innerHTML = '▶️';
        runButton.title = 'Run Script';
      }
      showStatus('No active tab found', 'error');
      return;
    }

    // Execute script in the current tab in the main world (bypasses CSP)
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: (code) => {
        // Create and execute function in main world context
        const fn = new Function(code);
        fn();
      },
      args: [script.code]
    });

    showStatus('Script executed on this tab', 'success');
    
  } catch (error) {
    console.error('Error running script:', error);
    showStatus('Failed to execute script', 'error');
    
    // Only clear on error
    removeRunningScript(script.id);
    await saveRunningScripts();
    const runButton = document.querySelector(`[data-id="${script.id}"].run-icon`);
    if (runButton) {
      runButton.classList.remove('disabled');
      runButton.innerHTML = '▶️';
      runButton.title = 'Run Script';
    }
  }
  
  // No timeout - script stays "running" on this tab until manually cleared
}

// Search scripts
async function handleSearch() {
  const query = searchInput.value.toLowerCase().trim();

  if (!query) {
    filteredScripts = [...allScripts];
  } else {
    filteredScripts = allScripts.filter(script =>
      script.name.toLowerCase().includes(query) ||
      script.code.toLowerCase().includes(query)
    );
  }

  currentPage = 1;
  displayScripts();
  updateScriptCount(filteredScripts.length);
}

// Update script count badge
function updateScriptCount(count) {
  scriptCount.textContent = count;
}

// Show status message
function showStatus(message, type = 'success') {
  const statusMessage = document.getElementById('statusMessage');
  statusMessage.textContent = message;
  statusMessage.className = `status-toast ${type}`;
  statusMessage.style.display = 'block';
  
  // Trigger slide-in animation
  setTimeout(() => {
    statusMessage.classList.add('show');
  }, 10);

  // Auto-hide after delay
  setTimeout(() => {
    statusMessage.classList.remove('show');
    setTimeout(() => {
      statusMessage.style.display = 'none';
    }, 300);
  }, type === 'error' ? 4000 : 3000); // Show errors longer
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Validate script name
function validateScriptName(name) {
  if (!name || typeof name !== 'string') return false;
  if (name.length > 100) return false;
  if (name.trim() !== name) return false;
  // Prevent path traversal and special characters
  if (/[<>:"/\\|?*\x00-\x1f]/.test(name)) return false;
  return true;
}

// Validate URL for auto-run matching
function validateUrl(url, type) {
  if (!url || typeof url !== 'string') return false;
  if (url.length > 500) return false;
  
  switch (type) {
    case 'exact':
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    case 'domain':
      // Basic domain validation
      return /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(url);
    case 'contains':
    case 'pattern':
      // Prevent dangerous patterns
      if (/[<>"]/.test(url)) return false;
      return true;
    default:
      return false;
  }
}

// Validate JavaScript code (basic checks)
function validateJavaScript(code) {
  if (!code || typeof code !== 'string') return { valid: false, reason: 'Code is required' };
  if (code.length > 50000) return { valid: false, reason: 'Code too large (50KB limit)' };
  
  // Check if bypass security checkbox exists and is checked
  const bypassCheckbox = document.getElementById('panelBypassSecurity');
  const shouldBypass = bypassCheckbox ? bypassCheckbox.checked : false;
  
  if (shouldBypass) {
    return { valid: true, bypassed: true };
  }
  
  // Check for potentially dangerous patterns only if not bypassed
  const dangerousPatterns = [
    /eval\s*\(/,
    /Function\s*\(/,
    /setTimeout\s*\(\s*["'`]/,
    /setInterval\s*\(\s*["'`]/,
    /document\.write/,
    /innerHTML\s*=/,
    /outerHTML\s*=/,
    /insertAdjacentHTML/,
    /execScript/,
    /javascript:/,
    /vbscript:/,
    /data:text\/html/,
    /srcdoc\s*=/
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      return { valid: false, reason: 'Code contains potentially dangerous patterns' };
    }
  }
  
  return { valid: true };
}

// ===== Pagination Functions =====

function updatePaginationUI() {
  if (totalPages <= 1) {
    pagination.style.display = 'none';
    return;
  }

  pagination.style.display = 'flex';
  currentPageSpan.textContent = currentPage;
  totalPagesSpan.textContent = totalPages;

  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = currentPage === totalPages;
}

function changePage(page) {
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  displayScripts();
}

// Toggle URL match section visibility
function toggleUrlMatchSection() {
  if (!urlMatchSection || !panelAutoRun) return;
  
  if (panelAutoRun.checked) {
    urlMatchSection.style.display = 'block';
    toggleUrlMatchInput();
  } else {
    urlMatchSection.style.display = 'none';
  }
}

// Toggle URL match input visibility
function toggleUrlMatchInput() {
  if (!panelUrlMatchType || !panelUrlMatch) return;
  
  const type = panelUrlMatchType.value;
  if (type === 'all') {
    panelUrlMatch.style.display = 'none';
    panelUrlMatch.required = false;
  } else {
    panelUrlMatch.style.display = 'block';
    panelUrlMatch.required = true;
    
    // Update placeholder based on type
    const placeholders = {
      exact: 'https://example.com/page',
      domain: 'example.com',
      contains: 'admin',
      pattern: '*/admin/*'
    };
    panelUrlMatch.placeholder = placeholders[type] || '';
  }
}

// Update line numbers
function updateLineNumbers() {
  const lines = panelScriptCode.value.split('\n').length;
  const numbers = Array.from({length: lines}, (_, i) => i + 1).join('\n');
  lineNumbers.textContent = numbers;
}

// Sync line numbers scroll with code editor
function syncLineNumbersScroll() {
  lineNumbers.scrollTop = panelScriptCode.scrollTop;
}

// Format code (basic indentation)
function formatCode() {
  const code = panelScriptCode.value;
  try {
    // Basic formatting - add proper indentation
    const formatted = code
      .split('\n')
      .map(line => line.trim())
      .reduce((acc, line, i, arr) => {
        let indent = 0;
        
        // Count opening braces before this line
        for (let j = 0; j < i; j++) {
          const prevLine = arr[j];
          indent += (prevLine.match(/{/g) || []).length;
          indent -= (prevLine.match(/}/g) || []).length;
        }
        
        // Adjust for closing brace on current line
        if (line.startsWith('}')) indent--;
        
        acc.push('  '.repeat(Math.max(0, indent)) + line);
        return acc;
      }, [])
      .join('\n');
    
    panelScriptCode.value = formatted;
    updateLineNumbers();
    showStatus('Code formatted', 'success');
  } catch (error) {
    showStatus('Failed to format code', 'error');
  }
}

// Toggle fullscreen mode
function toggleFullscreen() {
  const container = document.querySelector('.code-editor-container');
  container.classList.toggle('fullscreen');
  fullscreenBtn.textContent = container.classList.contains('fullscreen') ? '⛶' : '⛶';
}
