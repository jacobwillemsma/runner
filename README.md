# Runner

A Mac menu bar application for running custom functions and scheduled tasks.

## Features

- **Menu Bar Integration**: Easy access from the Mac menu bar
- **Plugin System**: Extensible function architecture with shared utilities
- **Scheduled Tasks**: Cron-based scheduling for automated execution
- **macOS Notifications**: Success/failure feedback via native notifications
- **Execution History**: Track when functions last ran

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- macOS (this app is Mac-only)

### Installation

1. Clone/download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Run in development mode:
```bash
npm run dev
```

Build for distribution:
```bash
npm run build
```

## Creating Functions

Functions are organized as plugins in the `functions/` directory. Each function should be in its own folder with an `index.js` file.

### Function Structure

```javascript
// functions/my-function/index.js
module.exports = {
  name: "My Function",
  description: "Description of what this function does",
  schedule: "0 9 * * *", // Optional cron schedule (9 AM daily)
  execute: async () => {
    // Your function logic here
    console.log("Function executed!");
  }
};
```

### Example Function

```javascript
// functions/meeting-sync/index.js
const notionClient = require('./clients/notion');
const slackClient = require('./clients/slack');

module.exports = {
  name: "Sync Meeting Notes",
  description: "Syncs meeting notes from Notion to Slack",
  schedule: "0 9 * * *", // Daily at 9 AM
  execute: async () => {
    const notes = await notionClient.getMeetingNotes();
    await slackClient.postToChannel(notes);
  }
};
```

## Shared Utilities

Common utilities and clients can be placed in the `shared/` directory and imported by multiple functions.

## Project Structure

```
runner/
├── src/                 # Core application code
├── functions/           # Plugin functions
├── shared/             # Shared utilities
├── data/               # History and configuration
├── assets/             # Icons and resources
└── package.json
```

## Building for Distribution

1. Build the app:
   ```bash
   npm run build
   ```

2. The `.dmg` file will be created in the `dist/` directory

## License

MIT