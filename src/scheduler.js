const cron = require('node-cron');

class Scheduler {
  constructor(functionLoader, historyManager, notificationManager) {
    this.functionLoader = functionLoader;
    this.historyManager = historyManager;
    this.notificationManager = notificationManager;
    this.scheduledTasks = new Map();
    this.runningExecutions = new Map();
  }

  /**
   * Start the scheduler and schedule all functions
   */
  start() {
    console.log('Starting scheduler...');
    this.scheduleAllFunctions();
  }

  /**
   * Stop the scheduler and destroy all scheduled tasks
   */
  stop() {
    console.log('Stopping scheduler...');
    this.scheduledTasks.forEach(task => {
      task.destroy();
    });
    this.scheduledTasks.clear();
  }

  /**
   * Schedule all functions that have schedules
   */
  scheduleAllFunctions() {
    // Clear existing schedules
    this.stop();

    const functions = this.functionLoader.getScheduledFunctions();
    console.log(`Scheduling ${functions.length} functions`);

    functions.forEach(func => {
      this.scheduleFunction(func);
    });
  }

  /**
   * Schedule a single function
   * @param {Object} func - The function object
   */
  scheduleFunction(func) {
    if (!func.schedule) {
      return;
    }

    try {
      // Validate cron expression
      if (!cron.validate(func.schedule)) {
        console.error(`Invalid cron expression for function ${func.name}: ${func.schedule}`);
        return;
      }

      const task = cron.schedule(func.schedule, () => {
        console.log(`Scheduled execution of function: ${func.name}`);
        this.executeFunction(func, true);
      }, {
        scheduled: true,
        timezone: 'America/New_York' // You can make this configurable
      });

      this.scheduledTasks.set(func.id, task);
      console.log(`Scheduled function ${func.name} with schedule: ${func.schedule}`);
      
      // Silently schedule - no notification shown
    } catch (error) {
      console.error(`Error scheduling function ${func.name}:`, error.message);
    }
  }

  /**
   * Execute a function (either manually or scheduled)
   * @param {Object} func - The function object
   * @param {boolean} isScheduled - Whether this is a scheduled execution
   * @returns {Promise} Promise that resolves when execution completes
   */
  async executeFunction(func, isScheduled = false) {
    const executionId = this.historyManager.recordExecutionStart(func.id, func.name);
    
    // Check if function is already running
    if (this.runningExecutions.has(func.id)) {
      console.log(`Function ${func.name} is already running, skipping...`);
      this.historyManager.recordExecutionEnd(func.id, executionId, false, 'Already running');
      return;
    }

    this.runningExecutions.set(func.id, executionId);

    try {
      // Silently start - no notification shown

      console.log(`Executing function: ${func.name} (scheduled: ${isScheduled})`);
      
      // Execute the function
      const startTime = Date.now();
      await func.execute();
      const duration = Date.now() - startTime;

      // Record success
      this.historyManager.recordExecutionEnd(func.id, executionId, true);
      
      // Silently succeed - no notification shown
      
      console.log(`Function ${func.name} completed successfully in ${duration}ms`);
    } catch (error) {
      // Record failure
      this.historyManager.recordExecutionEnd(func.id, executionId, false, error.message);
      
      // Show failure notification
      this.notificationManager.showFailure(func.name, error.message);
      
      console.error(`Function ${func.name} failed:`, error.message);
      throw error; // Re-throw for caller to handle if needed
    } finally {
      // Remove from running executions
      this.runningExecutions.delete(func.id);
    }
  }

  /**
   * Get the next scheduled run time for a function
   * @param {string} functionId - The function ID
   * @returns {Date|null} Next run time or null if not scheduled
   */
  getNextRunTime(functionId) {
    const task = this.scheduledTasks.get(functionId);
    if (!task) {
      return null;
    }

    // This is a simplified implementation
    // node-cron doesn't expose next run time directly
    // You could use a library like 'cron-parser' for more accurate next run calculation
    return new Date(Date.now() + 60000); // Placeholder: next minute
  }

  /**
   * Check if a function is currently running
   * @param {string} functionId - The function ID
   * @returns {boolean} True if running, false otherwise
   */
  isFunctionRunning(functionId) {
    return this.runningExecutions.has(functionId);
  }

  /**
   * Get all running executions
   * @returns {Array} Array of running execution info
   */
  getRunningExecutions() {
    return Array.from(this.runningExecutions.entries()).map(([functionId, executionId]) => ({
      functionId,
      executionId,
      function: this.functionLoader.getFunction(functionId)
    }));
  }

  /**
   * Get scheduler status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      scheduledFunctions: this.scheduledTasks.size,
      runningExecutions: this.runningExecutions.size,
      scheduledTasks: Array.from(this.scheduledTasks.keys()),
      runningExecutions: Array.from(this.runningExecutions.keys())
    };
  }

  /**
   * Reschedule functions (useful when functions are reloaded)
   */
  reschedule() {
    console.log('Rescheduling all functions...');
    this.scheduleAllFunctions();
  }
}

module.exports = Scheduler;