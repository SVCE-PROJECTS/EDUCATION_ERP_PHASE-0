module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // react-native-reanimated v4 delegates its babel plugin to
      // react-native-worklets/plugin. Reference it directly to avoid
      // the "Cannot find module 'react-native-worklets/plugin'" error.
      'react-native-worklets/plugin',
    ],
  };
};
