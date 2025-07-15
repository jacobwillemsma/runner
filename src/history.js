const fs = require('fs');
const path = require('path');

class HistoryManager {
  constructor() {
    this.historyPath = path.join(__dirname, '..', 'data', 'history.json');
    this.history = {};
    this.loadHistory();
  }

  /**
   * Load history from file
   */
  loadHistory() {
    try {
      if (fs.existsSync(this.historyPath)) {
        const data = fs.readFileSync(this.historyPath, 'utf8');
        this.history = JSON.parse(data);
      } else {
        this.history = { functions: {} };
        this.saveHistory();
      }
    } catch (error) {
      console.error('Error loading history:', error.message);
      this.history = { functions: {} };
    }
  }

  /**
   * Save history to file
   */
  saveHistory() {
    try {
      const dir = path.dirname(this.historyPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.historyPath, JSON.stringify(this.history, null, 2));
    } catch (error) {
      console.error('Error saving history:', error.message);
    }
  }

  /**
   * Record function execution start
   * @param {string} functionId - The function ID
   * @param {string} functionName - The function name
   */
  recordExecutionStart(functionId, functionName) {
    if (!this.history.functions[functionId]) {
      this.history.functions[functionId] = {
        name: functionName,
        executions: []
      };
    }

    const execution = {
      id: Date.now().toString(),
      startTime: new Date().toISOString(),
      endTime: null,
      status: 'running',
      error: null,
      duration: null
    };

    this.history.functions[functionId].executions.push(execution);
    this.saveHistory();
    
    return execution.id;
  }

  /**
   * Record function execution completion
   * @param {string} functionId - The function ID
   * @param {string} executionId - The execution ID
   * @param {boolean} success - Whether the execution was successful
   * @param {string|null} error - Error message if failed
   */
  recordExecutionEnd(functionId, executionId, success, error = null) {
    const functionHistory = this.history.functions[functionId];
    if (!functionHistory) return;

    const execution = functionHistory.executions.find(e => e.id === executionId);
    if (!execution) return;

    const endTime = new Date();
    const startTime = new Date(execution.startTime);
    
    execution.endTime = endTime.toISOString();
    execution.status = success ? 'success' : 'failed';
    execution.error = error;
    execution.duration = endTime.getTime() - startTime.getTime();

    this.saveHistory();
  }

  /**
   * Get the last execution for a function
   * @param {string} functionId - The function ID
   * @returns {Object|null} The last execution or null if none found
   */
  getLastExecution(functionId) {
    const functionHistory = this.history.functions[functionId];
    if (!functionHistory || !functionHistory.executions.length) {
      return null;
    }

    return functionHistory.executions[functionHistory.executions.length - 1];
  }

  /**
   * Get human-readable last run text
   * @param {string} functionId - The function ID
   * @returns {string} Human-readable text like "2 hours ago" or "Never"
   */
  getLastRunText(functionId) {
    const lastExecution = this.getLastExecution(functionId);
    if (!lastExecution) {
      return 'Never';
    }

    const now = new Date();
    const executionTime = new Date(lastExecution.endTime || lastExecution.startTime);
    const diffMs = now.getTime() - executionTime.getTime();
    
    // Convert to human-readable format
    if (diffMs < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (diffMs < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diffMs / 60000);
      return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    } else if (diffMs < 86400000) { // Less than 1 day
      const hours = Math.floor(diffMs / 3600000);
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else if (diffMs < 2592000000) { // Less than 30 days
      const days = Math.floor(diffMs / 86400000);
      return `${days} day${days === 1 ? '' : 's'} ago`;
    } else {
      // More than 30 days, show date
      return executionTime.toLocaleDateString();
    }
  }

  /**
   * Get execution history for a function
   * @param {string} functionId - The function ID
   * @param {number} limit - Maximum number of executions to return
   * @returns {Array} Array of executions
   */
  getExecutionHistory(functionId, limit = 10) {
    const functionHistory = this.history.functions[functionId];
    if (!functionHistory) {
      return [];
    }

    return functionHistory.executions
      .slice(-limit)
      .reverse(); // Most recent first
  }

  /**
   * Get summary statistics for a function
   * @param {string} functionId - The function ID
   * @returns {Object} Statistics object
   */
  getFunctionStats(functionId) {
    const functionHistory = this.history.functions[functionId];
    if (!functionHistory) {
      return {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageDuration: 0,
        successRate: 0
      };
    }

    const executions = functionHistory.executions;
    const successful = executions.filter(e => e.status === 'success');
    const failed = executions.filter(e => e.status === 'failed');
    const durationsMs = executions
      .filter(e => e.duration)
      .map(e => e.duration);
    
    const averageDuration = durationsMs.length > 0 
      ? durationsMs.reduce((sum, d) => sum + d, 0) / durationsMs.length
      : 0;

    return {
      totalExecutions: executions.length,
      successfulExecutions: successful.length,
      failedExecutions: failed.length,
      averageDuration,
      successRate: executions.length > 0 ? successful.length / executions.length : 0
    };
  }

  /**
   * Clean up old execution history
   * @param {number} maxAge - Maximum age in days
   */
  cleanupOldHistory(maxAge = 30) {
    const cutoffTime = new Date();
    cutoffTime.setDate(cutoffTime.getDate() - maxAge);

    Object.keys(this.history.functions).forEach(functionId => {
      const functionHistory = this.history.functions[functionId];
      functionHistory.executions = functionHistory.executions.filter(
        execution => new Date(execution.startTime) > cutoffTime
      );
    });

    this.saveHistory();
  }
}

module.exports = HistoryManager;