#!/usr/bin/env node
/**
 * Tauri Setup Verification Script
 *
 * Checks if all prerequisites for Tauri development are installed.
 * Run this before attempting to build the desktop app.
 *
 * Usage:
 *   node verify-tauri-setup.js
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { platform } from 'os';

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';

function check(name) {
  return `${BLUE}[CHECK]${RESET} ${name}`;
}

function pass(message) {
  return `${GREEN}✓${RESET} ${message}`;
}

function fail(message) {
  return `${RED}✗${RESET} ${message}`;
}

function warn(message) {
  return `${YELLOW}⚠${RESET} ${message}`;
}

function run(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch {
    return null;
  }
}

console.log(`\n${BLUE}========================================${RESET}`);
console.log(`${BLUE}  MeatyCapture - Tauri Setup Checker${RESET}`);
console.log(`${BLUE}========================================${RESET}\n`);

let hasErrors = false;
let hasWarnings = false;

// Check Node.js
console.log(check('Node.js'));
const nodeVersion = run('node --version');
if (nodeVersion) {
  const version = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (version >= 18) {
    console.log(pass(`Node.js ${nodeVersion} (OK)`));
  } else {
    console.log(fail(`Node.js ${nodeVersion} (require >=18.0.0)`));
    hasErrors = true;
  }
} else {
  console.log(fail('Node.js not found'));
  hasErrors = true;
}

// Check pnpm
console.log(check('pnpm'));
const pnpmVersion = run('pnpm --version');
if (pnpmVersion) {
  console.log(pass(`pnpm ${pnpmVersion}`));
} else {
  console.log(fail('pnpm not found'));
  console.log(`      Install: ${YELLOW}npm install -g pnpm${RESET}`);
  hasErrors = true;
}

// Check Rust
console.log(check('Rust'));
const rustVersion = run('rustc --version');
if (rustVersion) {
  console.log(pass(rustVersion));
} else {
  console.log(fail('Rust not found'));
  console.log(`      Install: ${YELLOW}curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh${RESET}`);
  hasErrors = true;
}

// Check Cargo
console.log(check('Cargo'));
const cargoVersion = run('cargo --version');
if (cargoVersion) {
  console.log(pass(cargoVersion));
} else {
  console.log(fail('Cargo not found'));
  hasErrors = true;
}

// Platform-specific checks
const os = platform();
console.log(check(`Platform: ${os}`));

if (os === 'darwin') {
  // macOS
  const xcodeSelect = run('xcode-select -p');
  if (xcodeSelect) {
    console.log(pass('Xcode Command Line Tools installed'));
  } else {
    console.log(warn('Xcode Command Line Tools not found'));
    console.log(`      Install: ${YELLOW}xcode-select --install${RESET}`);
    hasWarnings = true;
  }
} else if (os === 'linux') {
  // Linux - check for WebKit
  const pkg = run('which pkg-config');
  if (pkg) {
    console.log(pass('pkg-config installed'));
  } else {
    console.log(warn('pkg-config not found'));
    console.log(`      Install: ${YELLOW}sudo apt install pkg-config${RESET}`);
    hasWarnings = true;
  }
} else if (os === 'win32') {
  // Windows
  console.log(warn('Windows detected - ensure Visual Studio C++ Build Tools are installed'));
  hasWarnings = true;
}

// Check Tauri config files
console.log(check('Tauri Configuration'));
if (existsSync('./src-tauri/tauri.conf.json')) {
  console.log(pass('tauri.conf.json exists'));
} else {
  console.log(fail('tauri.conf.json not found'));
  hasErrors = true;
}

if (existsSync('./src-tauri/Cargo.toml')) {
  console.log(pass('Cargo.toml exists'));
} else {
  console.log(fail('Cargo.toml not found'));
  hasErrors = true;
}

if (existsSync('./src-tauri/src/main.rs')) {
  console.log(pass('main.rs exists'));
} else {
  console.log(fail('main.rs not found'));
  hasErrors = true;
}

// Check package.json scripts
console.log(check('package.json scripts'));
try {
  const pkg = JSON.parse(
    run('cat package.json')
  );

  if (pkg.scripts?.['tauri:dev'] && pkg.scripts?.['tauri:build']) {
    console.log(pass('Tauri scripts configured'));
  } else {
    console.log(warn('Tauri scripts missing in package.json'));
    hasWarnings = true;
  }

  if (pkg.dependencies?.['@tauri-apps/api']) {
    console.log(pass('@tauri-apps/api dependency found'));
  } else {
    console.log(fail('@tauri-apps/api not found'));
    hasErrors = true;
  }

  if (pkg.devDependencies?.['@tauri-apps/cli']) {
    console.log(pass('@tauri-apps/cli dev dependency found'));
  } else {
    console.log(fail('@tauri-apps/cli not found'));
    hasErrors = true;
  }
} catch (error) {
  console.log(fail('Failed to read package.json'));
  hasErrors = true;
}

// Summary
console.log(`\n${BLUE}========================================${RESET}`);
if (hasErrors) {
  console.log(`${RED}❌ SETUP INCOMPLETE${RESET}`);
  console.log(`\nPlease fix the errors above before running:`);
  console.log(`  ${YELLOW}pnpm tauri:dev${RESET}`);
  console.log(`\nSee ${BLUE}src-tauri/README.md${RESET} for detailed setup instructions.\n`);
  process.exit(1);
} else if (hasWarnings) {
  console.log(`${YELLOW}⚠ SETUP COMPLETE (with warnings)${RESET}`);
  console.log(`\nYou can start development with:`);
  console.log(`  ${GREEN}pnpm tauri:dev${RESET}`);
  console.log(`\nConsider addressing the warnings above for best results.\n`);
  process.exit(0);
} else {
  console.log(`${GREEN}✅ SETUP COMPLETE${RESET}`);
  console.log(`\nYou can start development with:`);
  console.log(`  ${GREEN}pnpm tauri:dev${RESET}`);
  console.log(`\nOr build for production with:`);
  console.log(`  ${GREEN}pnpm tauri:build${RESET}\n`);
  process.exit(0);
}
