const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// react-native-vector-icons needs a web-compatible resolver alias
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform === 'web' &&
    moduleName === 'react-native-vector-icons/MaterialCommunityIcons'
  ) {
    return {
      filePath: require.resolve(
        '@expo/vector-icons/MaterialCommunityIcons',
      ),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
