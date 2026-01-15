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

// State
let allScripts = [];
let scriptToDelete = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadScripts();
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  newScriptBtn.addEventListener('click', openNewScript);
  emptyNewScriptBtn.addEventListener('click', openNewScript);
  searchInput.addEventListener('input', handleSearch);
  confirmDeleteBtn.addEventListener('click', confirmDelete);
  cancelDeleteBtn.addEventListener('click', closeDeleteModal);

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

// Open new script editor
function openNewScript() {
  window.open('editor.html', '_blank');
}

// View script in read-only mode
function viewScript(script) {
  window.open(`editor.html?id=${script.id}&view=true`, '_blank');
}

// Edit script
function editScript(script) {
  window.open(`editor.html?id=${script.id}`, '_blank');
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
