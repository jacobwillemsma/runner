const fs = require('fs');
const path = require('path');

class FunctionLoader {
  constructor() {
    this.functionsPath = path.join(__dirname, '..', 'functions');
    this.loadedFunctions = new Map();
  }

  /**
   * Discover and load all functions from the functions directory
   * @returns {Array} Array of loaded function objects
   */
  async loadFunctions() {
    const functions = [];
    
    if (!fs.existsSync(this.functionsPath)) {
      console.log('Functions directory not found, creating...');
      fs.mkdirSync(this.functionsPath, { recursive: true });
      return functions;
    }

    const functionDirs = fs.readdirSync(this.functionsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    console.log(`Found ${functionDirs.length} function directories`);

    for (const dirName of functionDirs) {
      try {
        const functionData = await this.loadFunction(dirName);
        if (functionData) {
          functions.push(functionData);
        }
      } catch (error) {
        console.error(`Error loading function ${dirName}:`, error.message);
      }
    }

    console.log(`Successfully loaded ${functions.length} functions`);
    return functions;
  }

  /**
   * Load a single function from its directory
   * @param {string} dirName - The directory name of the function
   * @returns {Object|null} The function object or null if failed
   */
  async loadFunction(dirName) {
    const functionPath = path.join(this.functionsPath, dirName);
    const indexPath = path.join(functionPath, 'index.js');

    // Check if index.js exists
    if (!fs.existsSync(indexPath)) {
      console.warn(`Function ${dirName} missing index.js file`);
      return null;
    }

    // Clear require cache to allow reloading
    delete require.cache[require.resolve(indexPath)];

    try {
      const functionModule = require(indexPath);
      
      // Validate function structure
      if (!this.validateFunction(functionModule, dirName)) {
        return null;
      }

      // Create function object with metadata
      const functionObj = {
        id: dirName,
        name: functionModule.name,
        description: functionModule.description || '',
        schedule: functionModule.schedule || null,
        execute: functionModule.execute,
        path: functionPath,
        loaded: new Date().toISOString()
      };

      this.loadedFunctions.set(dirName, functionObj);
      console.log(`Loaded function: ${functionObj.name} (${dirName})`);
      
      return functionObj;
    } catch (error) {
      console.error(`Error requiring function ${dirName}:`, error.message);
      return null;
    }
  }

  /**
   * Validate that a function has the required structure
   * @param {Object} functionModule - The required function module
   * @param {string} dirName - The directory name for error reporting
   * @returns {boolean} True if valid, false otherwise
   */
  validateFunction(functionModule, dirName) {
    // Check required fields
    if (!functionModule.name || typeof functionModule.name !== 'string') {
      console.error(`Function ${dirName} missing or invalid 'name' field`);
      return false;
    }

    if (!functionModule.execute || typeof functionModule.execute !== 'function') {
      console.error(`Function ${dirName} missing or invalid 'execute' field`);
      return false;
    }

    // Check optional fields
    if (functionModule.schedule && typeof functionModule.schedule !== 'string') {
      console.error(`Function ${dirName} has invalid 'schedule' field (must be string)`);
      return false;
    }

    if (functionModule.description && typeof functionModule.description !== 'string') {
      console.error(`Function ${dirName} has invalid 'description' field (must be string)`);
      return false;
    }

    return true;
  }

  /**
   * Get a function by its ID
   * @param {string} functionId - The function ID
   * @returns {Object|null} The function object or null if not found
   */
  getFunction(functionId) {
    return this.loadedFunctions.get(functionId) || null;
  }

  /**
   * Get all loaded functions
   * @returns {Array} Array of all loaded functions
   */
  getAllFunctions() {
    return Array.from(this.loadedFunctions.values());
  }

  /**
   * Get functions that have schedules
   * @returns {Array} Array of scheduled functions
   */
  getScheduledFunctions() {
    return this.getAllFunctions().filter(func => func.schedule);
  }

  /**
   * Reload all functions (useful for development)
   * @returns {Array} Array of reloaded functions
   */
  async reloadFunctions() {
    this.loadedFunctions.clear();
    return await this.loadFunctions();
  }

  /**
   * Watch for changes in function files (for development)
   */
  watchFunctions() {
    if (!fs.existsSync(this.functionsPath)) {
      return;
    }

    fs.watch(this.functionsPath, { recursive: true }, (eventType, filename) => {
      if (filename && filename.endsWith('.js')) {
        console.log(`Function file changed: ${filename}`);
        // Debounce reloading to avoid multiple rapid reloads
        clearTimeout(this.reloadTimeout);
        this.reloadTimeout = setTimeout(() => {
          this.reloadFunctions();
        }, 1000);
      }
    });
  }
}

module.exports = FunctionLoader;