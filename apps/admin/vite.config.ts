import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  envDir: '../../',
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      // SOLUTION RADICALE : On remplace la lib d'icônes par notre mock pour le web
      'react-native-vector-icons/Ionicons': path.resolve(__dirname, 'src/icon-mock.tsx'),
      'react-native-vector-icons/dist/Ionicons': path.resolve(__dirname, 'src/icon-mock.tsx'),
    },
  },
  define: {
    global: 'window',
    'process.env': {},
  },
});
