const { build } = require('electron-builder');
const path = require('path');

async function buildApp() {
  console.log('Building Runner application...');
  
  try {
    await build({
      projectDir: path.join(__dirname, '..'),
      publish: 'never'
    });
    
    console.log('✅ Build completed successfully!');
    console.log('📦 Distribution files can be found in the dist/ directory');
    console.log('🚀 Install the .dmg file to use Runner');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildApp();