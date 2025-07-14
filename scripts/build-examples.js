#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

console.log('🔧 Building TypeScript examples...');

// Create examples/js directory if it doesn't exist
const jsDir = join(projectRoot, 'examples', 'js');
if (!existsSync(jsDir)) {
  mkdirSync(jsDir, { recursive: true });
}

// Create a temporary tsconfig for examples compilation
const examplesConfig = {
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "moduleResolution": "node",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "outDir": "./examples/js",
    "declaration": false,
    "declarationMap": false,
    "sourceMap": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "allowJs": true,
    "checkJs": false
  },
  "include": [
    "examples/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "examples/js"
  ]
};

// Write temporary tsconfig
const tempConfigPath = join(projectRoot, 'tsconfig.examples.json');
writeFileSync(tempConfigPath, JSON.stringify(examplesConfig, null, 2));

try {
  // Compile TypeScript examples
  console.log('📦 Compiling TypeScript examples...');
  const { stdout, stderr } = await execAsync(`npx tsc --project ${tempConfigPath}`, {
    cwd: projectRoot
  });
  
  if (stderr) {
    console.warn('⚠️  TypeScript warnings:', stderr);
  }
  
  console.log('✅ TypeScript examples compiled successfully!');
  console.log('📁 Output directory: examples/js/');
  
  // List compiled files
  const { stdout: lsOutput } = await execAsync('find examples/js -name "*.js" -type f', {
    cwd: projectRoot
  });
  
  if (lsOutput.trim()) {
    console.log('📄 Compiled files:');
    lsOutput.trim().split('\n').forEach(file => {
      console.log(`   ${file}`);
    });
  }
  
} catch (error) {
  console.error('❌ Failed to compile examples:', error.message);
  process.exit(1);
} finally {
  // Clean up temporary config
  try {
    const { unlink } = await import('fs/promises');
    await unlink(tempConfigPath);
  } catch (e) {
    // Ignore cleanup errors
  }
}

console.log('🎉 Examples build complete!');