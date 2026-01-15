// Storage key
const STORAGE_KEY = 'js_scripts';

// DOM Elements
const newScriptBtn = document.getElementById('newScriptBtn');
const manageScriptsBtn = document.getElementById('manageScriptsBtn');
const scriptsList = document.getElementById('scriptsList');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const scriptCount = document.getElementById('scriptCount');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadScripts();
  setupEventListeners();
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

// Open new script in editor page
function openNewScript() {
  chrome.tabs.create({ url: 'editor.html' });
}

// Open manage scripts page
function openManagePage() {
  chrome.tabs.create({ url: 'manage.html' });
}

// Open edit script in editor page
function editScript(script) {
  chrome.tabs.create({ url: `editor.html?id=${script.id}` });
}

// Delete script
async function deleteScript(id) {
  if (!confirm('Are you sure you want to delete this script?')) {
    return;
  }

  const data = await chrome.storage.local.get(STORAGE_KEY);
  const scripts = data[STORAGE_KEY] || [];
  const filteredScripts = scripts.filter(s => s.id !== id);

  await chrome.storage.local.set({ [STORAGE_KEY]: filteredScripts });

  loadScripts();
  showStatus('Script deleted successfully', 'success');
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

    showStatus('Script executed successfully', 'success');
  } catch (error) {
    console.error('Error running script:', error);
    showStatus('Error running script: ' + error.message, 'error');
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
