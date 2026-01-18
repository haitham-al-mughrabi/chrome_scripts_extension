// Storage key
const STORAGE_KEY = 'js_scripts';

// DOM Elements
const newScriptBtn = document.getElementById('newScriptBtn');
const emptyNewScriptBtn = document.getElementById('emptyNewScriptBtn');
const scriptsContainer = document.getElementById('scriptsContainer');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const scriptCount = document.getElementById('scriptCount');
const deleteModal = document.getElementById('deleteModal');
const deleteScriptName = document.getElementById('deleteScriptName');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

// Editor Panel Elements
const editorPanel = document.getElementById('editorPanel');
const closePanelBtn = document.getElementById('closePanelBtn');
const cancelPanelBtn = document.getElementById('cancelPanelBtn');
const savePanelBtn = document.getElementById('savePanelBtn');
const panelScriptName = document.getElementById('panelScriptName');
const panelScriptCode = document.getElementById('panelScriptCode');
const panelTitle = document.getElementById('panelTitle');

// State
let allScripts = [];
let scriptToDelete = null;
let editingScriptId = null;
let isViewMode = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadScripts();
  setupEventListeners();

  // Set current year in footer
  document.getElementById('currentYear').textContent = new Date().getFullYear();
});

// Setup event listeners
function setupEventListeners() {
  newScriptBtn.addEventListener('click', openNewScript);
  emptyNewScriptBtn.addEventListener('click', openNewScript);
  searchInput.addEventListener('input', handleSearch);
  confirmDeleteBtn.addEventListener('click', confirmDelete);
  cancelDeleteBtn.addEventListener('click', closeDeleteModal);

  // Panel event listeners
  closePanelBtn.addEventListener('click', closePanel);
  cancelPanelBtn.addEventListener('click', closePanel);
  savePanelBtn.addEventListener('click', saveScriptFromPanel);

  // Close panel when clicking overlay
  editorPanel.querySelector('.panel-overlay').addEventListener('click', closePanel);

  // Close modal when clicking outside
  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) {
      closeDeleteModal();
    }
  });
}

// Load scripts from storage
async function loadScripts() {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    allScripts = data[STORAGE_KEY] || [];
    displayScripts(allScripts);
    updateScriptCount(allScripts.length);
  } catch (error) {
    showStatus('Failed to load scripts', 'error');
  }
}

// Display scripts
function displayScripts(scripts) {
  scriptsContainer.innerHTML = '';

  if (scripts.length === 0) {
    emptyState.style.display = 'flex';
    scriptsContainer.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  scriptsContainer.style.display = 'grid';

  // Sort scripts by updated date (newest first)
  const sortedScripts = [...scripts].sort((a, b) => b.updatedAt - a.updatedAt);

  sortedScripts.forEach(script => {
    const card = createScriptCard(script);
    scriptsContainer.appendChild(card);
  });
}

// Create script card (safe HTML construction using escapeHtml)
function createScriptCard(script) {
  const card = document.createElement('div');
  card.className = 'script-card';
  card.dataset.id = script.id;

  const createdDate = new Date(script.createdAt).toLocaleDateString();
  const updatedDate = new Date(script.updatedAt).toLocaleDateString();
  const codePreview = script.code.substring(0, 150);

  // Using escapeHtml to prevent XSS
  const safeTitle = escapeHtml(script.name);
  const safeCode = escapeHtml(codePreview);

  card.innerHTML = `
    <div class="script-card-header">
      <div>
        <div class="script-title">${safeTitle}</div>
        <div class="script-meta">
          <div class="meta-item">📅 Created: ${createdDate}</div>
          <div class="meta-item">🔄 Updated: ${updatedDate}</div>
        </div>
      </div>
    </div>
    <div class="script-preview">
      <code>${safeCode}${script.code.length > 150 ? '...' : ''}</code>
    </div>
    <div class="script-actions">
      <button class="btn btn-run" data-action="run">▶ Run</button>
      <button class="btn btn-view" data-action="view">👁 View</button>
      <button class="btn btn-edit" data-action="edit">✏ Edit</button>
      <button class="btn btn-delete" data-action="delete">🗑 Delete</button>
    </div>
  `;

  // Add event listeners to buttons
  card.querySelector('[data-action="run"]').addEventListener('click', (e) => {
    e.stopPropagation();
    runScript(script);
  });

  card.querySelector('[data-action="view"]').addEventListener('click', (e) => {
    e.stopPropagation();
    viewScript(script);
  });

  card.querySelector('[data-action="edit"]').addEventListener('click', (e) => {
    e.stopPropagation();
    editScript(script);
  });

  card.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
    e.stopPropagation();
    showDeleteConfirmation(script);
  });

  return card;
}

// Update script count
function updateScriptCount(count) {
  scriptCount.textContent = `${count} script${count !== 1 ? 's' : ''}`;
}

// Open new script editor in side panel
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

// View script in read-only mode in side panel
function viewScript(script) {
  editingScriptId = script.id;
  isViewMode = true;
  panelTitle.textContent = 'View Script';
  panelScriptName.value = script.name;
  panelScriptCode.value = script.code;
  panelScriptName.readOnly = true;
  panelScriptCode.readOnly = true;
  savePanelBtn.style.display = 'none';
  editorPanel.classList.add('active');
}

// Edit script in side panel
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

// Run script
async function runScript(script) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      showStatus('No active tab found. Please open a webpage first.', 'error');
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: (code) => {
        // Execute user code in main world context (bypasses CSP restrictions)
        const fn = new Function(code);
        fn();
      },
      args: [script.code]
    });

    showStatus('Script executed', 'success');
  } catch (error) {
    showStatus('Failed to execute script', 'error');
  }
}

// Show delete confirmation
function showDeleteConfirmation(script) {
  scriptToDelete = script;
  deleteScriptName.textContent = script.name;
  deleteModal.style.display = 'flex';
}

// Close delete modal
function closeDeleteModal() {
  deleteModal.style.display = 'none';
  scriptToDelete = null;
}

// Confirm delete
async function confirmDelete() {
  if (!scriptToDelete) return;

  try {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    const scripts = data[STORAGE_KEY] || [];
    const filteredScripts = scripts.filter(s => s.id !== scriptToDelete.id);

    await chrome.storage.local.set({ [STORAGE_KEY]: filteredScripts });

    showStatus('Script deleted', 'success');
    closeDeleteModal();
    loadScripts();
  } catch (error) {
    showStatus('Failed to delete script', 'error');
  }
}

// Search scripts
function handleSearch() {
  const query = searchInput.value.toLowerCase().trim();

  if (!query) {
    displayScripts(allScripts);
    return;
  }

  const filteredScripts = allScripts.filter(script =>
    script.name.toLowerCase().includes(query) ||
    script.code.toLowerCase().includes(query)
  );

  displayScripts(filteredScripts);
  updateScriptCount(filteredScripts.length);
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

// Refresh scripts when storage changes (from other tabs)
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes[STORAGE_KEY]) {
    loadScripts();
  }
});
