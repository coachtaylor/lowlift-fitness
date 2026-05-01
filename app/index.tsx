import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import App from './App';
import { ErrorBoundary } from './src/components/ErrorBoundary';

function Root() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

registerRootComponent(Root);
