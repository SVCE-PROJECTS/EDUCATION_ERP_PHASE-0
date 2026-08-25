// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Resolve react-native-svg to its web-compatible build on the web platform.
// Without this, Metro bundles the native C++ module which crashes on web.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-svg') {
    return context.resolveRequest(context, 'react-native-svg/src/ReactNativeSVG.web.ts', platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
