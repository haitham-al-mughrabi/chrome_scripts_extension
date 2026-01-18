// Storage key
const STORAGE_KEY = 'js_scripts';

// DOM Elements
const newScriptBtn = document.getElementById('newScriptBtn');
const manageScriptsBtn = document.getElementById('manageScriptsBtn');
const scriptsList = document.getElementById('scriptsList');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const scriptCount = document.getElementById('scriptCount');

// Editor Panel Elements
const editorPanel = document.getElementById('editorPanel');
const closePanelBtn = document.getElementById('closePanelBtn');
const cancelPanelBtn = document.getElementById('cancelPanelBtn');
const savePanelBtn = document.getElementById('savePanelBtn');
const panelScriptName = document.getElementById('panelScriptName');
const panelScriptCode = document.getElementById('panelScriptCode');
const panelTitle = document.getElementById('panelTitle');

// Panel state
let editingScriptId = null;
let isViewMode = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadScripts();
  setupEventListeners();

  // Set current year in footer
  document.getElementById('currentYear').textContent = new Date().getFullYear();
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

  // Panel event listeners
  closePanelBtn.addEventListener('click', closePanel);
  cancelPanelBtn.addEventListener('click', closePanel);
  savePanelBtn.addEventListener('click', saveScriptFromPanel);

  // Close panel when clicking overlay
  editorPanel.querySelector('.panel-overlay').addEventListener('click', closePanel);
}

// Load scripts from storage
async function loadScripts() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const scripts = data[STORAGE_KEY] || [];
  displayScripts(scripts);
  updateScriptCount(scripts.length);
}

// Display scripts in the list
function displayScripts(scripts) {
  scriptsList.innerHTML = '';

  if (scripts.length === 0) {
    emptyState.style.display = 'block';
    scriptsList.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  scriptsList.style.display = 'block';

  scripts.forEach(script => {
    const scriptItem = createScriptItem(script);
    scriptsList.appendChild(scriptItem);
  });
}

// Create script item element
function createScriptItem(script) {
  const div = document.createElement('div');
  div.className = 'script-item';
  div.dataset.id = script.id;

  const updatedDate = new Date(script.updatedAt).toLocaleDateString();

  div.innerHTML = `
    <div class="script-info">
      <div class="script-name">${escapeHtml(script.name)}</div>
      <div class="script-meta">Updated: ${updatedDate}</div>
    </div>
    <div class="script-actions">
      <button class="btn btn-run" data-id="${script.id}">Run</button>
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
  panelScriptName.readOnly = false;
  panelScriptCode.readOnly = false;
  savePanelBtn.style.display = 'flex';
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
  panelScriptName.readOnly = false;
  panelScriptCode.readOnly = false;
  savePanelBtn.style.display = 'flex';
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
    panelScriptName.readOnly = false;
    panelScriptCode.readOnly = false;
    savePanelBtn.style.display = 'flex';
  }, 300); // Wait for animation to complete
}

// Save script from panel
async function saveScriptFromPanel() {
  const name = panelScriptName.value.trim();
  const code = panelScriptCode.value.trim();

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

  const data = await chrome.storage.local.get(STORAGE_KEY);
  const scripts = data[STORAGE_KEY] || [];

  if (editingScriptId) {
    // Update existing script
    const index = scripts.findIndex(s => s.id === editingScriptId);
    if (index !== -1) {
      scripts[index] = {
        ...scripts[index],
        name,
        code,
        updatedAt: new Date().toISOString()
      };
    }
  } else {
    // Create new script
    const newScript = {
      id: Date.now().toString(),
      name,
      code,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    scripts.push(newScript);
  }

  await chrome.storage.local.set({ [STORAGE_KEY]: scripts });

  showStatus(editingScriptId ? 'Script updated' : 'Script saved', 'success');
  closePanel();
  loadScripts();
}

// Delete script
async function deleteScript(id) {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const scripts = data[STORAGE_KEY] || [];
  const filteredScripts = scripts.filter(s => s.id !== id);

  await chrome.storage.local.set({ [STORAGE_KEY]: filteredScripts });

  loadScripts();
  showStatus('Script deleted', 'success');
}

// Run script
async function runScript(script) {
  try {
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
  }
}

// Search scripts
async function handleSearch() {
  const query = searchInput.value.toLowerCase().trim();
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const scripts = data[STORAGE_KEY] || [];

  if (!query) {
    displayScripts(scripts);
    return;
  }

  const filteredScripts = scripts.filter(script =>
    script.name.toLowerCase().includes(query)
  );

  displayScripts(filteredScripts);
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
