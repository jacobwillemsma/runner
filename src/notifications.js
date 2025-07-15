const { Notification } = require('electron');

class NotificationManager {
  constructor() {
    this.isSupported = Notification.isSupported();
    if (!this.isSupported) {
      console.warn('Notifications are not supported on this system');
    }
  }

  /**
   * Show a notification
   * @param {string} title - The notification title
   * @param {string} body - The notification body
   * @param {Object} options - Additional options
   */
  show(title, body, options = {}) {
    if (!this.isSupported) {
      console.log(`Notification: ${title} - ${body}`);
      return;
    }

    const notification = new Notification({
      title,
      body,
      silent: options.silent || false,
      timeoutType: options.timeoutType || 'default',
      urgency: options.urgency || 'normal',
      ...options
    });

    notification.show();
    return notification;
  }

  /**
   * Show a success notification (disabled - silently succeed)
   * @param {string} functionName - The function name
   * @param {number} duration - Execution duration in milliseconds
   */
  showSuccess(functionName, duration = null) {
    // Silently succeed - no notification shown
    return;
  }

  /**
   * Show a failure notification
   * @param {string} functionName - The function name
   * @param {string} error - The error message
   */
  showFailure(functionName, error) {
    // Truncate very long error messages
    const truncatedError = error.length > 100 
      ? error.substring(0, 100) + '...'
      : error;

    this.show(
      `❌ ${functionName}`,
      `Function failed: ${truncatedError}`,
      { urgency: 'critical' }
    );
  }

  /**
   * Show a function started notification (disabled - silently succeed)
   * @param {string} functionName - The function name
   */
  showStarted(functionName) {
    // Silently succeed - no notification shown
    return;
  }

  /**
   * Show a scheduled function notification
   * @param {string} functionName - The function name
   * @param {string} schedule - The cron schedule
   */
  showScheduled(functionName, schedule) {
    this.show(
      `⏰ ${functionName}`,
      `Scheduled to run: ${this.formatSchedule(schedule)}`,
      { urgency: 'low', silent: true }
    );
  }

  /**
   * Show a general info notification
   * @param {string} title - The notification title
   * @param {string} message - The notification message
   */
  showInfo(title, message) {
    this.show(
      `ℹ️ ${title}`,
      message,
      { urgency: 'low' }
    );
  }

  /**
   * Show a warning notification
   * @param {string} title - The notification title
   * @param {string} message - The notification message
   */
  showWarning(title, message) {
    this.show(
      `⚠️ ${title}`,
      message,
      { urgency: 'normal' }
    );
  }

  /**
   * Format duration in milliseconds to human-readable text
   * @param {number} durationMs - Duration in milliseconds
   * @returns {string} Formatted duration
   */
  formatDuration(durationMs) {
    if (durationMs < 1000) {
      return `${durationMs}ms`;
    } else if (durationMs < 60000) {
      return `${(durationMs / 1000).toFixed(1)}s`;
    } else if (durationMs < 3600000) {
      const minutes = Math.floor(durationMs / 60000);
      const seconds = Math.floor((durationMs % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    } else {
      const hours = Math.floor(durationMs / 3600000);
      const minutes = Math.floor((durationMs % 3600000) / 60000);
      return `${hours}h ${minutes}m`;
    }
  }

  /**
   * Format cron schedule to human-readable text
   * @param {string} schedule - Cron schedule string
   * @returns {string} Human-readable schedule
   */
  formatSchedule(schedule) {
    // Basic cron schedule formatting
    // This is a simplified version - you could use a library like 'cronstrue' for more complex formatting
    const parts = schedule.split(' ');
    
    if (parts.length < 5) {
      return schedule; // Return as-is if not a valid cron format
    }

    const [minute, hour, day, month, dayOfWeek] = parts;

    // Handle some common patterns
    if (schedule === '0 9 * * *') return 'Daily at 9:00 AM';
    if (schedule === '0 */1 * * *') return 'Every hour';
    if (schedule === '*/5 * * * *') return 'Every 5 minutes';
    if (schedule === '0 9 * * 1') return 'Every Monday at 9:00 AM';
    if (schedule === '0 9 1 * *') return 'First day of every month at 9:00 AM';

    // Default to showing the raw cron expression
    return schedule;
  }
}

module.exports = NotificationManager;