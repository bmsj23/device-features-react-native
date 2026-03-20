import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppShell } from './src/AppShell';
import { AppProvider } from './src/state/AppProvider';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </SafeAreaProvider>
  );
}
