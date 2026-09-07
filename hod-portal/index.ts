import 'react-native-gesture-handler'; // must be the very first import
import { registerRootComponent } from 'expo';
import App from './src/App';

// registerRootComponent mounts the App inside an Expo-managed environment
// and ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately.
registerRootComponent(App);
