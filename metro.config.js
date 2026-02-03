const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for TypeScript files in pastella-utils
config.resolver.sourceExts = [...config.resolver.sourceExts, 'ts', 'tsx'];

// Add support for SVG files
config.resolver.assetExts = [...config.resolver.assetExts, 'svg'];

module.exports = config;
