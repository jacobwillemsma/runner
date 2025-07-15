# Runner Deployment Guide

## Building for Distribution

### Prerequisites
- Node.js (v16 or higher)
- macOS (required for building Mac apps)
- Xcode Command Line Tools (for code signing)

### Build Process

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the application:**
   ```bash
   npm run build
   ```

3. **Find the built app:**
   - The `.dmg` file will be in the `dist/` directory
   - Example: `dist/Runner-1.0.0.dmg`

### Manual Build Steps

If you prefer to build manually:

```bash
# Build the application
npx electron-builder

# Or build without packaging
npx electron-builder --dir
```

## Installation

1. **Install the DMG:**
   - Double-click the `.dmg` file
   - Drag Runner to Applications folder
   - Launch Runner from Applications

2. **First Launch:**
   - Runner will appear in your menu bar
   - Click the menu bar icon to see available functions
   - Grant any requested permissions (microphone, camera, etc.)

## Code Signing (Optional)

For distribution outside of personal use:

1. **Get Apple Developer Certificate:**
   - Sign up for Apple Developer Program
   - Download Developer ID certificate

2. **Configure signing:**
   ```bash
   # Set environment variables
   export CSC_IDENTITY_AUTO_DISCOVERY=false
   export CSC_IDENTITY="Developer ID Application: Your Name"
   
   # Build with signing
   npm run build
   ```

## Notarization (Optional)

For public distribution:

1. **Configure notarization:**
   ```bash
   export APPLE_ID="your-apple-id@example.com"
   export APPLE_ID_PASSWORD="app-specific-password"
   export APPLE_TEAM_ID="your-team-id"
   ```

2. **Build with notarization:**
   ```bash
   npm run build
   ```

## Distribution

### Personal Use
- Build and install the `.dmg` file
- Copy to other Macs as needed

### Public Distribution
- Use Mac App Store (requires additional configuration)
- Distribute signed and notarized `.dmg` files
- Use GitHub Releases for version management

## Updating

### Manual Updates
1. Build new version
2. Install new `.dmg` file
3. Replace existing Runner application

### Automatic Updates (Future Enhancement)
- Consider using `electron-updater` for automatic updates
- Requires signed builds and update server

## Troubleshooting

### Build Issues
- **Permission errors:** Ensure proper file permissions
- **Missing dependencies:** Run `npm install` again
- **Signing errors:** Check certificate configuration

### Runtime Issues
- **Menu bar not showing:** Check system preferences
- **Functions not loading:** Verify `functions/` directory structure
- **Permissions denied:** Grant required system permissions

### Debug Mode
```bash
# Run in development mode for debugging
npm run dev
```

## File Structure After Build

```
Runner.app/
├── Contents/
│   ├── MacOS/
│   │   └── Runner                 # Main executable
│   ├── Resources/
│   │   ├── app.asar              # Application code
│   │   └── ...
│   └── Info.plist                # App metadata
```

## Configuration

### User Configuration
- Config stored in `~/.runner/config.json`
- Logs stored in `~/.runner/logs/`

### Build Configuration
- Main config in `package.json` under `build` section
- Customize icons, entitlements, and signing options

## Next Steps

1. **Create proper icon:** Replace placeholder icon in `assets/`
2. **Add app signing:** Configure Developer ID certificate
3. **Set up CI/CD:** Automate builds with GitHub Actions
4. **Add auto-updater:** Implement automatic update system