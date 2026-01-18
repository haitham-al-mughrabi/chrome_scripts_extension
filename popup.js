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
const panelUrlMatchType = document.getElementById('panelUrlMatchType');
const panelUrlMatch = document.getElementById('panelUrlMatch');
const urlMatchSection = document.getElementById('urlMatchSection');
const panelTitle = document.getElementById('panelTitle');

// Panel state
let editingScriptId = null;
let isViewMode = false;

// Pagination state
let allScripts = [];
let filteredScripts = [];
let currentPage = 1;
let totalPages = 1;

// Running scripts tracking
let runningScripts = new Set();

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadScripts();
  setupEventListeners();

  // Set current year in footer
  document.getElementById('currentYear').textContent = new Date().getFullYear();

  // Start watching for file changes
  FILE_MANAGER.startWatching(loadScripts);
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
  const isRunning = runningScripts.has(script.id);
  const autoRunIcon = script.autoRun ? '<span class="auto-run-indicator" title="Auto-runs on page load">🚀</span>' : '';

  div.innerHTML = `
    <div class="script-info">
      <div class="script-name">
        ${isRunning ? '<span class="running-indicator">⚡</span>' : ''}
        ${autoRunIcon}
        ${escapeHtml(script.name)}
      </div>
      <div class="script-meta">Updated: ${updatedDate}</div>
    </div>
    <div class="script-actions">
      <button class="btn btn-run" data-id="${script.id}" ${isRunning ? 'disabled' : ''}>
        ${isRunning ? 'Running...' : 'Run'}
      </button>
      <button class="btn btn-edit" data-id="${script.id}">Edit</button>
      <button class="btn btn-delete" data-id="${script.id}">Delete</button>
    </div>
  `;

  // Add event listeners
  div.querySelector('.btn-run').addEventListener('click', () => runScript(script));
  div.querySelector('.btn-edit').addEventListener('click', () => editScript(script));
  div.querySelector('.btn-delete').addEventListener('click', () => deleteScript(script.id));

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
  panelUrlMatchType.value = 'all';
  panelUrlMatch.value = '';
  panelScriptName.readOnly = false;
  panelScriptCode.readOnly = false;
  savePanelBtn.style.display = 'flex';
  toggleUrlMatchSection();
  editorPanel.classList.add('active');
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
  panelUrlMatchType.value = script.urlMatchType || 'all';
  panelUrlMatch.value = script.urlMatch || '';
  panelScriptName.readOnly = false;
  panelScriptCode.readOnly = false;
  savePanelBtn.style.display = 'flex';
  toggleUrlMatchSection();
  editorPanel.classList.add('active');
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
  const urlMatchType = panelUrlMatchType.value;
  const urlMatch = panelUrlMatch.value.trim();

  if (!name) {
    showStatus('Please enter a script name', 'error');
    panelScriptName.focus();
    return;
  }

  if (!code) {
    showStatus('Please enter some code', 'error');
    panelScriptCode.focus();
    return;
  }

  if (autoRun && urlMatchType !== 'all' && !urlMatch) {
    showStatus('Please enter URL match criteria', 'error');
    panelUrlMatch.focus();
    return;
  }

  // Directory selection is optional - scripts will be saved to chrome storage

  try {
    let script;
    const allScripts = await FILE_MANAGER.loadAllScripts();

    if (editingScriptId) {
      // Update existing script
      const existing = allScripts.find(s => s.id === editingScriptId);
      script = {
        ...existing,
        name,
        code,
        autoRun,
        urlMatchType: autoRun ? urlMatchType : undefined,
        urlMatch: autoRun && urlMatchType !== 'all' ? urlMatch : undefined,
        updatedAt: new Date().toISOString()
      };
    } else {
      // Create new script
      script = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name,
        code,
        autoRun,
        urlMatchType: autoRun ? urlMatchType : undefined,
        urlMatch: autoRun && urlMatchType !== 'all' ? urlMatch : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    await FILE_MANAGER.saveScript(script);

    showStatus(editingScriptId ? 'Script updated' : 'Script saved', 'success');

    // Close panel after a short delay to show the success message
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
  if (runningScripts.has(script.id)) {
    return; // Already running
  }

  try {
    // Mark script as running
    runningScripts.add(script.id);
    displayScripts(); // Refresh UI to show running state

    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
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

    showStatus('Script executed', 'success');
  } catch (error) {
    console.error('Error running script:', error);
    showStatus('Failed to execute script', 'error');
  } finally {
    // Remove from running scripts after a short delay
    setTimeout(() => {
      runningScripts.delete(script.id);
      displayScripts(); // Refresh UI to remove running state
    }, 1000);
  }
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

  setTimeout(() => {
    statusMessage.style.display = 'none';
  }, 3000);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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
  if (panelAutoRun.checked) {
    urlMatchSection.style.display = 'block';
    toggleUrlMatchInput();
  } else {
    urlMatchSection.style.display = 'none';
  }
}

// Toggle URL match input visibility
function toggleUrlMatchInput() {
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
