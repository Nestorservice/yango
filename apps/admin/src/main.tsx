import React from 'react';
import { createRoot } from 'react-dom/client';
import DashboardPage from './pages/DashboardPage';

// Injection de NativeModules pour empêcher le crash de react-native-vector-icons
// @ts-ignore
window.NativeModules = window.NativeModules || {};
// @ts-ignore
window.NativeModules.RNVectorIcons = { getFontFamily: () => 'Ionicons' };

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<DashboardPage />);
}
