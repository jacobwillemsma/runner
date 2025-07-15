const { app, Menu, Tray } = require('electron');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const FunctionLoader = require('./function-loader');
const HistoryManager = require('./history');
const NotificationManager = require('./notifications');
const Scheduler = require('./scheduler');

class Runner {
  constructor() {
    this.tray = null;
    this.functionLoader = new FunctionLoader();
    this.historyManager = new HistoryManager();
    this.notificationManager = new NotificationManager();
    this.scheduler = null;
    this.functions = [];
    this.init();
  }

  init() {
    // Wait for app to be ready
    app.whenReady().then(() => {
      this.createTray();
      console.log('Runner is ready');
      this.loadFunctions();
      this.initializeScheduler();
      this.buildMenu();
    });
  }

  createTray() {
    // Create tray icon from assets/icon.png
    const { nativeImage } = require('electron');
    const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
    const icon = nativeImage.createFromPath(iconPath);
    icon.setTemplateImage(true); // Makes it adapt to light/dark mode
    this.tray = new Tray(icon);
    
    // Set tooltip
    this.tray.setToolTip('Runner');
    
    // Handle tray clicks to rebuild menu (refresh data)
    this.tray.on('click', () => {
      this.buildMenu();
    });
  }

  async loadFunctions() {
    try {
      this.functions = await this.functionLoader.loadFunctions();
      console.log(`Loaded ${this.functions.length} functions`);
    } catch (error) {
      console.error('Error loading functions:', error.message);
      this.notificationManager.showWarning('Function Loading Error', error.message);
    }
  }

  initializeScheduler() {
    this.scheduler = new Scheduler(
      this.functionLoader,
      this.historyManager,
      this.notificationManager
    );
    this.scheduler.start();
  }

  buildMenu() {
    const template = [
      {
        label: 'Runner',
        enabled: false
      },
      {
        type: 'separator'
      }
    ];

    // Add functions to menu
    if (this.functions.length === 0) {
      template.push({
        label: 'No functions found',
        enabled: false
      });
    } else {
      this.functions.forEach(func => {
        const lastRunText = this.historyManager.getLastRunText(func.id);
        const isRunning = this.scheduler && this.scheduler.isFunctionRunning(func.id);
        const label = isRunning 
          ? `${func.name} - Running...`
          : `${func.name} - ${lastRunText}`;
        
        template.push({
          label,
          enabled: !isRunning,
          click: () => this.executeFunction(func)
        });
      });
    }

    // Add separator and menu items
    template.push(
      {
        type: 'separator'
      },
      {
        label: 'Reload Functions',
        click: () => this.reloadFunctions()
      },
      {
        label: 'Quit',
        click: () => {
          this.shutdown();
        }
      }
    );

    const menu = Menu.buildFromTemplate(template);
    this.tray.setContextMenu(menu);
  }

  async executeFunction(func) {
    try {
      await this.scheduler.executeFunction(func, false);
      // Menu will be rebuilt when tray is shown next time
    } catch (error) {
      console.error(`Error executing function ${func.name}:`, error.message);
    }
  }

  async reloadFunctions() {
    try {
      this.functions = await this.functionLoader.reloadFunctions();
      this.scheduler.reschedule();
      this.buildMenu();
      this.notificationManager.showInfo('Functions Reloaded', `Reloaded ${this.functions.length} functions`);
    } catch (error) {
      console.error('Error reloading functions:', error.message);
      this.notificationManager.showWarning('Reload Error', error.message);
    }
  }


  shutdown() {
    console.log('Shutting down Runner...');
    if (this.scheduler) {
      this.scheduler.stop();
    }
    app.quit();
  }
}

// Initialize app
new Runner();

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, keep the app running even when all windows are closed
});