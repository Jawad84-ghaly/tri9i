import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NavigationScreen from './screens/NavigationScreen';

export default function App() {
  return <SafeAreaProvider><NavigationScreen /></SafeAreaProvider>;
}
