// Storage key
const STORAGE_KEY = 'js_scripts';

// DOM Elements
const scriptName = document.getElementById('scriptName');
const scriptCode = document.getElementById('scriptCode');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const editorMode = document.getElementById('editorMode');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');

// Current script being edited (if any)
let currentScriptId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadScriptFromUrl();
  setupEventListeners();

  // Set current year in footer
  document.getElementById('currentYear').textContent = new Date().getFullYear();
});

// Setup event listeners
function setupEventListeners() {
  saveBtn.addEventListener('click', saveScript);
  cancelBtn.addEventListener('click', closeEditor);

  // Save with Ctrl+S / Cmd+S
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveScript();
    }
  });
}

// Load script data from URL parameters (for editing existing scripts)
function loadScriptFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const scriptId = params.get('id');
  const viewMode = params.get('view') === 'true';

  if (scriptId) {
    loadExistingScript(scriptId, viewMode);
  } else {
    editorMode.textContent = 'New';
  }
}

// Load existing script for editing
async function loadExistingScript(scriptId, viewMode = false) {
  try {
    const scripts = await FILE_MANAGER.loadAllScripts();
    const script = scripts.find(s => s.id === scriptId);

    if (script) {
      currentScriptId = scriptId;
      scriptName.value = script.name;
      scriptCode.value = script.code;

      if (viewMode) {
        // Enable read-only mode
        editorMode.textContent = 'View (Read-Only)';
        document.title = `View: ${script.name} - JS Script Manager`;
        scriptName.readOnly = true;
        scriptCode.readOnly = true;
        saveBtn.style.display = 'none';
        const cancelBtnSpans = cancelBtn.querySelectorAll('span');
        if (cancelBtnSpans.length > 1) {
          cancelBtnSpans[1].textContent = 'Close';
        }
      } else {
        editorMode.textContent = 'Edit';
        document.title = `Edit: ${script.name} - JS Script Manager`;
      }
    } else {
      showError('Script not found');
    }
  } catch (error) {
    showError('Failed to load script');
  }
}

// Save script
async function saveScript() {
  const name = scriptName.value.trim();
  const code = scriptCode.value.trim();

  // Validate
  if (!name) {
    showError('Please enter a script name');
    scriptName.focus();
    return;
  }

  if (!code) {
    showError('Please enter some JavaScript code');
    scriptCode.focus();
    return;
  }

  try {
    let script;
    const allScripts = await FILE_MANAGER.loadAllScripts();

    if (currentScriptId) {
      // Update existing script
      const existing = allScripts.find(s => s.id === currentScriptId);
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
      currentScriptId = script.id;
    }

    // Save using FILE_MANAGER
    await FILE_MANAGER.saveScript(script);

    showSuccess('Script saved and downloaded!');

    // Close the tab after a short delay
    setTimeout(() => {
      window.close();
    }, 800);

  } catch (error) {
    showError('Failed to save script');
    console.error(error);
  }
}

// Close editor
function closeEditor() {
  window.close();
}

// Show error message
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'flex';
  successMessage.style.display = 'none';

  // Auto-hide after 5 seconds
  setTimeout(() => {
    errorMessage.style.display = 'none';
  }, 5000);
}

// Show success message
function showSuccess(message) {
  successMessage.textContent = message;
  successMessage.style.display = 'flex';
  errorMessage.style.display = 'none';

  // Auto-hide after 3 seconds
  setTimeout(() => {
    successMessage.style.display = 'none';
  }, 3000);
}

// Handle beforeunload - removed to avoid annoying warnings
