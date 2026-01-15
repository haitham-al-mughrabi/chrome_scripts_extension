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
    editorMode.textContent = 'New Script';
  }
}

// Load existing script for editing
async function loadExistingScript(scriptId, viewMode = false) {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    const scripts = data[STORAGE_KEY] || [];
    const script = scripts.find(s => s.id === scriptId);

    if (script) {
      currentScriptId = scriptId;
      scriptName.value = script.name;
      scriptCode.value = script.code;

      if (viewMode) {
        // Enable read-only mode
        editorMode.textContent = 'View Script (Read-Only)';
        document.title = `View: ${script.name} - JS Script Manager`;
        scriptName.readOnly = true;
        scriptCode.readOnly = true;
        saveBtn.style.display = 'none';
        cancelBtn.textContent = 'Close';
      } else {
        editorMode.textContent = 'Edit Script';
        document.title = `Edit: ${script.name} - JS Script Manager`;
      }
    } else {
      showError('Script not found');
    }
  } catch (error) {
    showError('Error loading script: ' + error.message);
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
    const data = await chrome.storage.local.get(STORAGE_KEY);
    const scripts = data[STORAGE_KEY] || [];

    if (currentScriptId) {
      // Update existing script
      const index = scripts.findIndex(s => s.id === currentScriptId);
      if (index !== -1) {
        scripts[index] = {
          ...scripts[index],
          name,
          code,
          updatedAt: Date.now()
        };
      }
    } else {
      // Create new script
      const newScript = {
        id: Date.now().toString(),
        name,
        code,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      scripts.push(newScript);
      currentScriptId = newScript.id;
    }

    // Save to storage
    await chrome.storage.local.set({ [STORAGE_KEY]: scripts });

    showSuccess('Script saved successfully!');

    // Close the tab after a short delay
    setTimeout(() => {
      window.close();
    }, 1000);

  } catch (error) {
    showError('Error saving script: ' + error.message);
  }
}

// Close editor
function closeEditor() {
  // Check if there are unsaved changes
  if (scriptName.value.trim() || scriptCode.value.trim()) {
    if (confirm('You have unsaved changes. Are you sure you want to close?')) {
      window.close();
    }
  } else {
    window.close();
  }
}

// Show error message
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
  successMessage.style.display = 'none';

  // Auto-hide after 5 seconds
  setTimeout(() => {
    errorMessage.style.display = 'none';
  }, 5000);
}

// Show success message
function showSuccess(message) {
  successMessage.textContent = message;
  successMessage.style.display = 'block';
  errorMessage.style.display = 'none';

  // Auto-hide after 3 seconds
  setTimeout(() => {
    successMessage.style.display = 'none';
  }, 3000);
}

// Handle beforeunload to warn about unsaved changes
window.addEventListener('beforeunload', (e) => {
  if (scriptName.value.trim() || scriptCode.value.trim()) {
    // Check if we just saved
    const justSaved = successMessage.style.display === 'block';
    if (!justSaved) {
      e.preventDefault();
      e.returnValue = '';
    }
  }
});
