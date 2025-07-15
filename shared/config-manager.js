const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Configuration manager for storing and retrieving app configuration
 */
class ConfigManager {
  constructor() {
    this.configDir = path.join(os.homedir(), '.runner');
    this.configFile = path.join(this.configDir, 'config.json');
    this.config = {};
    this.loadConfig();
  }

  /**
   * Load configuration from file
   */
  loadConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        const data = fs.readFileSync(this.configFile, 'utf8');
        this.config = JSON.parse(data);
      } else {
        this.config = this.getDefaultConfig();
        this.saveConfig();
      }
    } catch (error) {
      console.error('Error loading config:', error.message);
      this.config = this.getDefaultConfig();
    }
  }

  /**
   * Save configuration to file
   */
  saveConfig() {
    try {
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }
      fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Error saving config:', error.message);
    }
  }

  /**
   * Get default configuration
   * @returns {Object} Default configuration object
   */
  getDefaultConfig() {
    return {
      notifications: {
        enabled: true,
        showSuccess: true,
        showFailure: true,
        showStarted: false
      },
      scheduler: {
        timezone: 'America/New_York',
        enabled: true
      },
      functions: {
        autoReload: false,
        maxHistoryDays: 30
      },
      ui: {
        theme: 'system',
        showLastRun: true
      }
    };
  }

  /**
   * Get configuration value
   * @param {string} key - Dot-notation key (e.g., 'notifications.enabled')
   * @param {*} defaultValue - Default value if key not found
   * @returns {*} Configuration value
   */
  get(key, defaultValue = null) {
    const keys = key.split('.');
    let value = this.config;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }

  /**
   * Set configuration value
   * @param {string} key - Dot-notation key (e.g., 'notifications.enabled')
   * @param {*} value - Value to set
   */
  set(key, value) {
    const keys = key.split('.');
    let current = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }
    
    current[keys[keys.length - 1]] = value;
    this.saveConfig();
  }

  /**
   * Get all configuration
   * @returns {Object} Full configuration object
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * Reset configuration to defaults
   */
  reset() {
    this.config = this.getDefaultConfig();
    this.saveConfig();
  }

  /**
   * Get configuration file path
   * @returns {string} Configuration file path
   */
  getConfigPath() {
    return this.configFile;
  }
}

// Export singleton instance
module.exports = new ConfigManager();