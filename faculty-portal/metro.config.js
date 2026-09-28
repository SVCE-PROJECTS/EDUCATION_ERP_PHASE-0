const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Watch files in all 3 portal folders
config.watchFolders = [
  projectRoot,
  path.resolve(workspaceRoot, 'admin-frontend'),
  path.resolve(workspaceRoot, 'hod-portal'),
  path.resolve(workspaceRoot, 'faculty-portal'),
];

// Allow Metro to resolve modules from parent and sibling directories
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'admin-frontend/node_modules'),
  path.resolve(workspaceRoot, 'hod-portal/node_modules'),
  path.resolve(workspaceRoot, 'faculty-portal/node_modules'),
];

module.exports = config;
