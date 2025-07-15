# Runner - Claude Code Project

## Project Overview

**Runner** is a Mac menu bar application built with Electron that allows you to run custom JavaScript functions both on-demand and on scheduled intervals. It features a plugin-based architecture where functions are organized as individual modules with shared utilities.

## Architecture

### Core Components

1. **Main Application** (`src/main.js`)
   - Electron app initialization
   - System tray integration
   - Menu building and event handling

2. **Function Loader** (`src/function-loader.js`)
   - Plugin discovery system
   - Function validation and loading
   - Hot-reloading support

3. **History Manager** (`src/history.js`)
   - Execution history tracking
   - Human-readable timestamps
   - Statistics and cleanup

4. **Scheduler** (`src/scheduler.js`)
   - Cron-based scheduling using node-cron
   - Function execution management
   - Running state tracking

5. **Notifications** (`src/notifications.js`)
   - macOS notification system
   - Success/failure alerts
   - Duration formatting

### Plugin System

Functions are organized in the `functions/` directory as self-contained modules:

```
functions/
├── meeting-sync/
│   ├── index.js           # Main function definition
│   ├── clients/
│   │   ├── notion.js      # Notion API client
│   │   └── slack.js       # Slack API client
│   └── utils/             # Function-specific utilities
└── example-simple/
    └── index.js           # Simple example function
```

### Shared Utilities

Common utilities in the `shared/` directory:

- **HTTP Utils** (`shared/http-utils.js`) - HTTP request helpers
- **Config Manager** (`shared/config-manager.js`) - Configuration management
- **Logger** (`shared/logger.js`) - Application logging

## Key Features

### 1. **Menu Bar Integration**
- Native macOS system tray icon
- Right-click context menu
- Shows function names and last run times
- Real-time status updates

### 2. **Plugin Architecture**
- Auto-discovery of functions in `functions/` directory
- Standardized function interface
- Shared utilities for common operations
- Error isolation between functions

### 3. **Scheduling System**
- Cron-based scheduling (supports full cron syntax)
- Manual execution via menu
- Prevents duplicate executions
- Graceful error handling

### 4. **Execution History**
- Tracks all function executions
- Human-readable timestamps ("2 hours ago", "Never")
- Success/failure status
- Duration tracking

### 5. **macOS Notifications**
- Native notification system
- Success/failure alerts
- Function start notifications
- Error details in failures

## Function Development

### Function Structure

Each function must export an object with this structure:

```javascript
module.exports = {
  name: "Function Name",           // Required: Display name
  description: "What it does",     // Optional: Description
  schedule: "0 9 * * *",          // Optional: Cron schedule
  execute: async () => {          // Required: Function logic
    // Your code here
  }
};
```

### Example Function

```javascript
// functions/meeting-sync/index.js
const NotionClient = require('./clients/notion');
const SlackClient = require('./clients/slack');

module.exports = {
  name: "Sync Meeting Notes",
  description: "Syncs meeting notes from Notion to Slack",
  schedule: "0 9 * * *", // Daily at 9 AM
  execute: async () => {
    const notion = new NotionClient();
    const slack = new SlackClient();
    
    const notes = await notion.getMeetingNotes();
    const formatted = await slack.formatMeetingNote(notes);
    await slack.postToChannel('#general', formatted);
  }
};
```

## Development Workflow

### Development Mode
```bash
npm run dev
```

### Adding New Functions
1. Create new directory in `functions/`
2. Add `index.js` with required structure
3. Use "Reload Functions" menu item to refresh
4. Test execution via menu

### Shared Utilities
- Place common code in `shared/` directory
- Import in functions as needed
- Examples: HTTP clients, data parsers, API wrappers

### Configuration
- User config stored in `~/.runner/config.json`
- Environment variables for API keys
- Logging to `~/.runner/logs/`

## Technical Details

### Dependencies
- **Electron** - Desktop app framework
- **node-cron** - Cron job scheduling
- **Node.js built-ins** - fs, path, os, etc.

### File Structure
```
runner/
├── src/                 # Core application code
│   ├── main.js          # Main Electron process
│   ├── function-loader.js
│   ├── history.js
│   ├── scheduler.js
│   └── notifications.js
├── functions/           # Plugin functions
│   ├── meeting-sync/
│   └── example-simple/
├── shared/             # Shared utilities
│   ├── http-utils.js
│   ├── config-manager.js
│   └── logger.js
├── data/               # Runtime data
│   └── history.json
└── assets/             # Icons and resources
```

### Data Storage
- **History**: JSON file (`data/history.json`)
- **Config**: JSON file (`~/.runner/config.json`)
- **Logs**: Text files (`~/.runner/logs/`)

### Error Handling
- Function errors are isolated and logged
- Notifications show error details
- Scheduler continues on function failures
- History tracks failed executions

## Building and Distribution

### Development Build
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Distribution
- Creates `.dmg` file for macOS
- Self-contained application
- No external dependencies needed

## Future Enhancements

### Potential Features
1. **Settings UI** - Graphical configuration interface
2. **Function Templates** - Boilerplate for common function types
3. **Auto-updater** - Automatic version updates
4. **Export/Import** - Function sharing capabilities
5. **Performance Monitoring** - Execution time tracking
6. **Remote Functions** - Execute functions on remote servers

### Extension Points
- **Custom Clients** - Add new API integrations
- **Notification Channels** - Beyond macOS notifications
- **Storage Backends** - Database integration
- **Authentication** - OAuth flows for APIs

## Implementation Notes

This project was built with a focus on:
- **Simplicity** - Easy to understand and extend
- **Reliability** - Robust error handling and recovery
- **Mac Integration** - Native macOS experience
- **Extensibility** - Plugin architecture for growth
- **Personal Use** - Optimized for individual productivity

The architecture supports both simple automation tasks and complex multi-step workflows, making it suitable for a wide range of personal automation needs.