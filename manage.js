// Storage key
const STORAGE_KEY = 'js_scripts';

// Pagination settings
const ITEMS_PER_PAGE = 12;

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

// New elements
const importBtn = document.getElementById('importBtn');
const exportBtn = document.getElementById('exportBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const saveSaveLocationBtn = document.getElementById('saveSaveLocationBtn');
const saveLocationInput = document.getElementById('saveLocationInput');
const fileInput = document.getElementById('fileInput');
const folderInput = document.getElementById('folderInput');
const askEachTimeRadio = document.getElementById('askEachTime');
const autoSaveRadio = document.getElementById('autoSave');
const folderPickerSection = document.getElementById('folderPickerSection');
const pickFolderBtn = document.getElementById('pickFolderBtn');

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
const panelTitle = document.getElementById('panelTitle');

// State
let allScripts = [];
let filteredScripts = [];
let scriptToDelete = null;
let editingScriptId = null;
let isViewMode = false;
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

// Cleanup when page unloads
window.addEventListener('beforeunload', () => {
  FILE_MANAGER.stopWatching();
});

// Setup event listeners
function setupEventListeners() {
  newScriptBtn.addEventListener('click', openNewScript);
  emptyNewScriptBtn.addEventListener('click', openNewScript);
  searchInput.addEventListener('input', handleSearch);
  confirmDeleteBtn.addEventListener('click', confirmDelete);
  cancelDeleteBtn.addEventListener('click', closeDeleteModal);

  // Import/Export/Settings
  importBtn.addEventListener('click', () => fileInput.click());
  exportBtn.addEventListener('click', handleExport);
  settingsBtn.addEventListener('click', openSettings);
  closeSettingsBtn.addEventListener('click', closeSettings);
  saveSaveLocationBtn.addEventListener('click', saveSaveLocation);
  pickFolderBtn.addEventListener('click', pickFolder);
  fileInput.addEventListener('change', handleImport);
  folderInput.addEventListener('change', handleFolderSelection);

  // Radio button listeners
  askEachTimeRadio.addEventListener('change', updateSaveMode);
  autoSaveRadio.addEventListener('change', updateSaveMode);

  // Initialize save mode on page load
  loadSaveModeSettings();

  // Pagination
  prevPageBtn.addEventListener('click', () => changePage(currentPage - 1));
  nextPageBtn.addEventListener('click', () => changePage(currentPage + 1));

  // Panel event listeners
  closePanelBtn.addEventListener('click', closePanel);
  cancelPanelBtn.addEventListener('click', closePanel);
  savePanelBtn.addEventListener('click', saveScriptFromPanel);

  // Close panel when clicking overlay
  editorPanel.querySelector('.panel-overlay').addEventListener('click', closePanel);

  // Close modals when clicking outside
  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) {
      closeDeleteModal();
    }
  });

  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      closeSettings();
    }
  });
}

// Load scripts from storage
async function loadScripts() {
  try {
    allScripts = await FILE_MANAGER.loadAllScripts();
    filteredScripts = [...allScripts];
    currentPage = 1;
    displayScripts();
    updateScriptCount(allScripts.length);
  } catch (error) {
    showStatus('Failed to load scripts', 'error');
  }
}

// Display scripts with pagination
function displayScripts() {
  scriptsContainer.innerHTML = ''; // Safe: clearing container

  if (filteredScripts.length === 0) {
    emptyState.style.display = 'flex';
    scriptsContainer.style.display = 'none';
    pagination.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  scriptsContainer.style.display = 'grid';

  // Calculate pagination
  totalPages = Math.ceil(filteredScripts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  // Sort scripts by updated date (newest first)
  const sortedScripts = [...filteredScripts].sort((a, b) => {
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  // Get scripts for current page
  const pageScripts = sortedScripts.slice(startIndex, endIndex);

  pageScripts.forEach(script => {
    const card = createScriptCard(script); // createScriptCard uses escapeHtml for safety
    scriptsContainer.appendChild(card);
  });

  // Update pagination UI
  updatePaginationUI();
}

// Create script card (safe HTML construction using escapeHtml)
function createScriptCard(script) {
  const card = document.createElement('div');
  card.className = 'script-card';
  card.dataset.id = script.id;

  const createdDate = new Date(script.createdAt).toLocaleDateString();
  const updatedDate = new Date(script.updatedAt).toLocaleDateString();
  const codePreview = script.code.substring(0, 150);
  const isRunning = runningScripts.has(script.id);

  // Using escapeHtml to prevent XSS
  const safeTitle = escapeHtml(script.name);
  const safeCode = escapeHtml(codePreview);

  card.innerHTML = `
    <div class="script-card-header">
      <div>
        <div class="script-title">
          ${isRunning ? '<span class="running-indicator">⚡</span>' : ''}
          ${safeTitle}
        </div>
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
      <button class="btn btn-run" data-action="run" ${isRunning ? 'disabled' : ''}>
        ${isRunning ? '⚡ Running...' : '▶ Run'}
      </button>
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

  // Check if directory is selected
  if (!FILE_MANAGER.hasDirectorySelected()) {
    showStatus('Please select a directory first', 'error');
    return;
  }

  try {
    let script;

    if (editingScriptId) {
      // Update existing script
      const existing = allScripts.find(s => s.id === editingScriptId);
      script = {
        ...existing,
        name,
        code,
        updatedAt: new Date().toISOString()
      };
    } else {
      // Create new script
      script = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name,
        code,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    await FILE_MANAGER.saveScript(script);

    showStatus(editingScriptId ? 'Script updated' : 'Script saved', 'success');
    closePanel();
    loadScripts();
  } catch (error) {
    showStatus('Failed to save script: ' + error.message, 'error');
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
  } finally {
    // Remove from running scripts after a short delay
    setTimeout(() => {
      runningScripts.delete(script.id);
      displayScripts(); // Refresh UI to remove running state
    }, 1000);
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
    await FILE_MANAGER.deleteScript(scriptToDelete.id);

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
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== Settings Functions =====

async function openSettings() {
  const settings = await FILE_MANAGER.loadSettings();
  saveLocationInput.value = settings.saveLocation || '';

  // Set radio button state
  if (settings.saveLocation && settings.saveLocation.trim()) {
    autoSaveRadio.checked = true;
    folderPickerSection.style.display = 'block';
  } else {
    askEachTimeRadio.checked = true;
    folderPickerSection.style.display = 'none';
  }

  settingsModal.style.display = 'flex';
}

function closeSettings() {
  settingsModal.style.display = 'none';
}

async function saveSaveLocation() {
  let path = '';
  let dirHandle = null;

  if (autoSaveRadio.checked) {
    path = saveLocationInput.value.trim();
    if (!path) {
      showStatus('Please select a folder or switch to "Ask each time"', 'error');
      return;
    }

    // Pass the directory handle if we have one
    dirHandle = selectedDirectoryHandle;
  }

  await FILE_MANAGER.updateSaveLocation(path, dirHandle);
  showStatus('Settings saved successfully', 'success');
  closeSettings();
  
  // Auto-sync: reload scripts from the new directory (merges with existing)
  showStatus('Syncing with directory...', 'success');
  await loadScripts();
  showStatus('Directory synced successfully', 'success');
}

// Update save mode UI based on radio selection
function updateSaveMode() {
  if (autoSaveRadio.checked) {
    folderPickerSection.style.display = 'block';
    saveLocationInput.focus();
  } else {
    folderPickerSection.style.display = 'none';
  }
}

// Load save mode settings on page load
async function loadSaveModeSettings() {
  const settings = await FILE_MANAGER.loadSettings();
  if (settings.saveLocation && settings.saveLocation.trim()) {
    // Has a save location set - not needed in main page, only in settings modal
  }
}

// Store the selected directory handle globally
let selectedDirectoryHandle = null;

// Handle folder picker button click
async function pickFolder() {
  try {
    // Check if File System Access API is available
    if ('showDirectoryPicker' in window) {
      // Use modern File System Access API for native folder picker
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'downloads'
      });

      // Store the directory handle
      selectedDirectoryHandle = dirHandle;

      // Get the folder name from the directory handle
      const folderName = dirHandle.name;

      // Display the folder path in the input
      saveLocationInput.value = folderName;
      saveLocationInput.dataset.dirHandle = 'stored';

      showStatus(`Folder "${folderName}" selected`, 'success');
    } else {
      // Fallback: Allow manual entry
      saveLocationInput.readOnly = false;
      saveLocationInput.focus();
      saveLocationInput.placeholder = 'Enter folder name (e.g., my-scripts)';
      showStatus('Please enter a folder name manually', 'error');
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      // User didn't cancel, show error
      console.error('Folder picker error:', error);
      showStatus('Could not access folder picker. Please enter folder name manually.', 'error');
      saveLocationInput.readOnly = false;
      saveLocationInput.focus();
    }
  }
}

// Handle folder selection from native picker (legacy fallback)
function handleFolderSelection(event) {
  const files = event.target.files;

  if (files.length > 0) {
    // Extract the folder path from the first file
    // The webkitRelativePath gives us "foldername/filename"
    const relativePath = files[0].webkitRelativePath;
    const folderName = relativePath.split('/')[0];

    // Display the folder path in the input
    saveLocationInput.value = folderName;
    showStatus(`Folder "${folderName}" selected`, 'success');
  }

  // Reset the folder input
  folderInput.value = '';
}

// ===== Import/Export Functions =====

async function handleImport(event) {
  const files = Array.from(event.target.files);
  if (files.length === 0) return;

  try {
    const result = await FILE_MANAGER.importScriptsFromFiles(files);

    if (result.imported.length > 0) {
      showStatus(`Imported ${result.imported.length} script(s)`, 'success');
      loadScripts();
    }

    if (result.errors.length > 0) {
      console.error('Import errors:', result.errors);
      showStatus(`Import completed with ${result.errors.length} error(s)`, 'error');
    }
  } catch (error) {
    showStatus('Failed to import scripts', 'error');
    console.error(error);
  }

  // Reset file input
  fileInput.value = '';
}

async function handleExport() {
  try {
    await FILE_MANAGER.exportAllScripts();
    showStatus('Scripts exported successfully', 'success');
  } catch (error) {
    showStatus('Failed to export scripts', 'error');
    console.error(error);
  }
}

// Refresh scripts when storage changes (from other tabs)
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes[STORAGE_KEY]) {
    loadScripts();
  }
});
