const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Simple logger for Runner application
 */
class Logger {
  constructor() {
    this.logDir = path.join(os.homedir(), '.runner', 'logs');
    this.logFile = path.join(this.logDir, 'runner.log');
    this.maxLogSize = 10 * 1024 * 1024; // 10MB
    this.maxLogFiles = 5;
    this.ensureLogDir();
  }

  /**
   * Ensure log directory exists
   */
  ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Rotate log file if it's too large
   */
  rotateLogFile() {
    if (!fs.existsSync(this.logFile)) {
      return;
    }

    const stats = fs.statSync(this.logFile);
    if (stats.size < this.maxLogSize) {
      return;
    }

    // Rotate existing log files
    for (let i = this.maxLogFiles - 1; i >= 1; i--) {
      const oldFile = `${this.logFile}.${i}`;
      const newFile = `${this.logFile}.${i + 1}`;
      
      if (fs.existsSync(oldFile)) {
        if (i === this.maxLogFiles - 1) {
          fs.unlinkSync(oldFile); // Delete oldest
        } else {
          fs.renameSync(oldFile, newFile);
        }
      }
    }

    // Move current log to .1
    fs.renameSync(this.logFile, `${this.logFile}.1`);
  }

  /**
   * Write log entry
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  writeLog(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...meta
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    
    // Write to console
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
    
    // Write to file
    try {
      this.rotateLogFile();
      fs.appendFileSync(this.logFile, logLine);
    } catch (error) {
      console.error('Error writing to log file:', error.message);
    }
  }

  /**
   * Log info message
   * @param {string} message - Message to log
   * @param {Object} meta - Additional metadata
   */
  info(message, meta = {}) {
    this.writeLog('info', message, meta);
  }

  /**
   * Log warning message
   * @param {string} message - Message to log
   * @param {Object} meta - Additional metadata
   */
  warn(message, meta = {}) {
    this.writeLog('warn', message, meta);
  }

  /**
   * Log error message
   * @param {string} message - Message to log
   * @param {Object} meta - Additional metadata
   */
  error(message, meta = {}) {
    this.writeLog('error', message, meta);
  }

  /**
   * Log debug message
   * @param {string} message - Message to log
   * @param {Object} meta - Additional metadata
   */
  debug(message, meta = {}) {
    this.writeLog('debug', message, meta);
  }

  /**
   * Log function execution
   * @param {string} functionName - Function name
   * @param {string} status - Execution status
   * @param {number} duration - Execution duration in ms
   * @param {string} error - Error message if failed
   */
  logFunctionExecution(functionName, status, duration = null, error = null) {
    const meta = {
      functionName,
      status,
      duration,
      error
    };

    if (status === 'success') {
      this.info(`Function ${functionName} completed successfully`, meta);
    } else if (status === 'failed') {
      this.error(`Function ${functionName} failed`, meta);
    } else {
      this.info(`Function ${functionName} ${status}`, meta);
    }
  }

  /**
   * Get log file path
   * @returns {string} Log file path
   */
  getLogPath() {
    return this.logFile;
  }

  /**
   * Get recent log entries
   * @param {number} lines - Number of lines to retrieve
   * @returns {Array} Array of log entries
   */
  getRecentLogs(lines = 100) {
    if (!fs.existsSync(this.logFile)) {
      return [];
    }

    try {
      const content = fs.readFileSync(this.logFile, 'utf8');
      const logLines = content.trim().split('\n');
      
      return logLines
        .slice(-lines)
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return { message: line, timestamp: new Date().toISOString(), level: 'unknown' };
          }
        })
        .reverse(); // Most recent first
    } catch (error) {
      console.error('Error reading log file:', error.message);
      return [];
    }
  }
}

// Export singleton instance
module.exports = new Logger();