// File Manager for Local Script Storage
// Handles reading/writing scripts to local file system using chrome.downloads

const FILE_MANAGER = {
  SETTINGS_KEY: 'file_manager_settings',
  STORAGE_KEY: 'js_scripts',
  directoryHandle: null, // Store the directory handle for File System Access API
  fileWatcher: null,

  // Initialize file manager
  async init() {
    const settings = await this.loadSettings();
    // Try to restore directory handle from IndexedDB
    try {
      const stored = await this.getStoredDirectoryHandle();
      if (stored) {
        this.directoryHandle = stored;
      }
    } catch (error) {
      console.warn('Could not restore directory handle:', error);
    }
  },

  // Load saved settings
  async loadSettings() {
    try {
      const data = await chrome.storage.local.get(this.SETTINGS_KEY);
      const settings = data[this.SETTINGS_KEY] || {
        saveLocation: '',
        autoSave: true
      };
      
      return settings;
    } catch (error) {
      console.error('Error loading settings:', error);
      return { saveLocation: '', autoSave: true };
    }
  },

  // Save settings
  async saveSettings(settings) {
    try {
      // Don't store the directory handle in chrome storage
      const settingsToStore = {
        saveLocation: settings.saveLocation,
        autoSave: settings.autoSave
      };
      await chrome.storage.local.set({ [this.SETTINGS_KEY]: settingsToStore });
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  },

  // Update save location preference
  async updateSaveLocation(path, dirHandle = null) {
    const settings = await this.loadSettings();
    settings.saveLocation = path;
    await this.saveSettings(settings);

    this.directoryHandle = dirHandle;
    
    // Store directory handle in IndexedDB
    if (dirHandle) {
      await this.storeDirectoryHandle(dirHandle);
    }
  },

  // Save a script to the selected directory
  async saveScript(script) {
    try {
      if (!this.directoryHandle) {
        throw new Error('No directory selected. Please select a directory first.');
      }

      const filename = this.sanitizeFilename(script.name) + '.json';
      const jsonContent = JSON.stringify(script, null, 2);

      // Request permission if needed
      const permission = await this.directoryHandle.queryPermission({ mode: 'readwrite' });
      if (permission !== 'granted') {
        const newPermission = await this.directoryHandle.requestPermission({ mode: 'readwrite' });
        if (newPermission !== 'granted') {
          throw new Error('Permission denied to write to directory');
        }
      }

      // Create/update the file in the selected directory
      const fileHandle = await this.directoryHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(jsonContent);
      await writable.close();

      // Also save to chrome storage for quick access
      await this.saveToStorage(script);

      return true;
    } catch (error) {
      console.error('Error saving script:', error);
      throw error;
    }
  },

  // Save script to chrome storage
  async saveToStorage(script) {
    const data = await chrome.storage.local.get(this.STORAGE_KEY);
    const scripts = data[this.STORAGE_KEY] || [];

    // Check if script exists
    const index = scripts.findIndex(s => s.id === script.id);

    if (index !== -1) {
      // Update existing
      scripts[index] = script;
    } else {
      // Add new
      scripts.push(script);
    }

    await chrome.storage.local.set({ [this.STORAGE_KEY]: scripts });
  },

  // Download script as individual JSON file
  async downloadScriptFile(script) {
    const filename = this.sanitizeFilename(script.name) + '.json';
    const jsonContent = JSON.stringify(script, null, 2);

    const settings = await this.loadSettings();

    // If we have a directory handle, use File System Access API
    if (this.directoryHandle) {
      try {
        // Request permission if needed
        const permission = await this.directoryHandle.queryPermission({ mode: 'readwrite' });
        if (permission !== 'granted') {
          const newPermission = await this.directoryHandle.requestPermission({ mode: 'readwrite' });
          if (newPermission !== 'granted') {
            throw new Error('Permission denied');
          }
        }

        // Create the file in the selected directory
        const fileHandle = await this.directoryHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(jsonContent);
        await writable.close();

        return true;
      } catch (error) {
        console.error('Error writing to directory:', error);
        // Fall back to chrome.downloads
        this.directoryHandle = null;
      }
    }

    // Fallback: Use chrome.downloads API
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Determine filename path
    let downloadFilename = filename;
    if (settings.saveLocation && settings.saveLocation.trim()) {
      downloadFilename = `${settings.saveLocation}/${filename}`;
    }

    // Try chrome.downloads API first (works in background pages)
    if (typeof chrome !== 'undefined' && chrome.downloads) {
      return new Promise((resolve, reject) => {
        chrome.downloads.download({
          url: url,
          filename: downloadFilename,
          saveAs: !settings.saveLocation || !settings.saveLocation.trim() // Show dialog if no location set
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            // Fallback to blob download
            this.fallbackDownload(url, filename);
            resolve(true);
          } else {
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            resolve(downloadId);
          }
        });
      });
    } else {
      // Fallback for contexts where chrome.downloads isn't available
      this.fallbackDownload(url, filename);
      return true;
    }
  },

  // Fallback download method using blob URL
  fallbackDownload(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  },

  // Load all scripts from the selected directory
  async loadAllScripts() {
    try {
      if (!this.directoryHandle) {
        // Fallback to chrome storage if no directory selected
        const data = await chrome.storage.local.get(this.STORAGE_KEY);
        return data[this.STORAGE_KEY] || [];
      }

      const scripts = [];
      const existingScripts = new Map();
      
      // First, get existing scripts from chrome storage
      const data = await chrome.storage.local.get(this.STORAGE_KEY);
      const storageScripts = data[this.STORAGE_KEY] || [];
      
      // Index existing scripts by name for deduplication
      storageScripts.forEach(script => {
        existingScripts.set(script.name, script);
      });

      // Request permission if needed
      const permission = await this.directoryHandle.queryPermission({ mode: 'read' });
      if (permission !== 'granted') {
        const newPermission = await this.directoryHandle.requestPermission({ mode: 'read' });
        if (newPermission !== 'granted') {
          throw new Error('Permission denied to read directory');
        }
      }

      // Read all JSON files from the directory
      for await (const [name, handle] of this.directoryHandle.entries()) {
        if (handle.kind === 'file' && name.endsWith('.json')) {
          try {
            const file = await handle.getFile();
            const content = await file.text();
            const script = JSON.parse(content);
            
            // Validate script structure
            if (script.name && script.code && script.id) {
              // Only add if not already in storage or if file is newer
              const existing = existingScripts.get(script.name);
              if (!existing || new Date(script.updatedAt) > new Date(existing.updatedAt)) {
                scripts.push(script);
                existingScripts.set(script.name, script);
              } else {
                scripts.push(existing);
              }
            }
          } catch (error) {
            console.warn(`Error reading script file ${name}:`, error);
          }
        }
      }

      // Add any storage scripts that weren't found in directory
      storageScripts.forEach(script => {
        if (!scripts.find(s => s.name === script.name)) {
          scripts.push(script);
        }
      });

      // Sync merged results back to chrome storage
      await chrome.storage.local.set({ [this.STORAGE_KEY]: scripts });
      
      return scripts;
    } catch (error) {
      console.error('Error loading scripts:', error);
      // Fallback to chrome storage
      const data = await chrome.storage.local.get(this.STORAGE_KEY);
      return data[this.STORAGE_KEY] || [];
    }
  },

  // Import scripts from uploaded files
  async importScriptsFromFiles(files) {
    const imported = [];
    const errors = [];

    for (const file of files) {
      try {
        const content = await file.text();
        const script = JSON.parse(content);

        // Validate script structure
        if (script.name && script.code) {
          // Ensure it has required fields
          if (!script.id) script.id = Date.now().toString() + Math.random();
          if (!script.createdAt) script.createdAt = new Date().toISOString();
          if (!script.updatedAt) script.updatedAt = new Date().toISOString();

          await this.saveToStorage(script);
          imported.push(script);
        } else {
          errors.push(`Invalid script format in file: ${file.name}`);
        }
      } catch (error) {
        errors.push(`Error importing ${file.name}: ${error.message}`);
      }
    }

    return { imported, errors };
  },

  // Delete a script from both directory and storage
  async deleteScript(scriptId) {
    try {
      // First get the script to find its filename
      const scripts = await this.loadAllScripts();
      const script = scripts.find(s => s.id === scriptId);
      
      if (!script) {
        throw new Error('Script not found');
      }

      // Delete from directory if available
      if (this.directoryHandle) {
        try {
          const filename = this.sanitizeFilename(script.name) + '.json';
          await this.directoryHandle.removeEntry(filename);
        } catch (error) {
          console.warn('Could not delete file from directory:', error);
        }
      }

      // Delete from chrome storage
      const filteredScripts = scripts.filter(s => s.id !== scriptId);
      await chrome.storage.local.set({ [this.STORAGE_KEY]: filteredScripts });
      
      return true;
    } catch (error) {
      console.error('Error deleting script:', error);
      throw error;
    }
  },

  // Export all scripts as a single JSON file
  async exportAllScripts() {
    const scripts = await this.loadAllScripts();
    const filename = `all-scripts-${new Date().toISOString().split('T')[0]}.json`;
    const jsonContent = JSON.stringify(scripts, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Try chrome.downloads API first
    if (typeof chrome !== 'undefined' && chrome.downloads) {
      return new Promise((resolve, reject) => {
        chrome.downloads.download({
          url: url,
          filename: filename,
          saveAs: true // Always show dialog for export
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            // Fallback to blob download
            this.fallbackDownload(url, filename);
            resolve(true);
          } else {
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            resolve(downloadId);
          }
        });
      });
    } else {
      // Fallback for contexts where chrome.downloads isn't available
      this.fallbackDownload(url, filename);
      return true;
    }
  },

  // Check if directory is selected
  hasDirectorySelected() {
    return this.directoryHandle !== null;
  },

  // Start watching for file changes (periodic check)
  startWatching(callback) {
    if (this.fileWatcher) {
      clearInterval(this.fileWatcher);
    }
    
    this.fileWatcher = setInterval(async () => {
      if (callback && this.directoryHandle) {
        try {
          await callback();
        } catch (error) {
          console.warn('Error in file watcher callback:', error);
        }
      }
    }, 2000); // Check every 2 seconds
  },

  // Stop watching for file changes
  stopWatching() {
    if (this.fileWatcher) {
      clearInterval(this.fileWatcher);
      this.fileWatcher = null;
    }
  },

  // Store directory handle in IndexedDB
  async storeDirectoryHandle(dirHandle) {
    try {
      const request = indexedDB.open('ScriptManagerDB', 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('handles')) {
          db.createObjectStore('handles');
        }
      };
      
      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const db = event.target.result;
          const transaction = db.transaction(['handles'], 'readwrite');
          const store = transaction.objectStore('handles');
          store.put(dirHandle, 'directory');
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('Could not store directory handle:', error);
    }
  },

  // Get stored directory handle from IndexedDB
  async getStoredDirectoryHandle() {
    try {
      const request = indexedDB.open('ScriptManagerDB', 1);
      
      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('handles')) {
            resolve(null);
            return;
          }
          
          const transaction = db.transaction(['handles'], 'readonly');
          const store = transaction.objectStore('handles');
          const getRequest = store.get('directory');
          
          getRequest.onsuccess = () => resolve(getRequest.result || null);
          getRequest.onerror = () => resolve(null);
        };
        request.onerror = () => resolve(null);
      });
    } catch (error) {
      console.warn('Could not get stored directory handle:', error);
      return null;
    }
  },

  // Sanitize filename to be safe for file system
  sanitizeFilename(name) {
    return name
      .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid characters
      .replace(/\s+/g, '_')           // Replace spaces with underscores
      .substring(0, 200);             // Limit length
  }
};

// Initialize on load
FILE_MANAGER.init();
