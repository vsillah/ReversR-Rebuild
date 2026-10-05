import { defineConfig } from 'vite';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..');
export default defineConfig({ root: path.join(root, 'qa/commercial'), envDir: false,
  define: { 'process.env': JSON.stringify({ EXPO_PUBLIC_COMMERCIAL_BACKEND: 'convex' }), __DEV__: 'true' },
  plugins: [{ name: 'local-commercial-mocks', enforce: 'pre', resolveId(id) {
    if (id.endsWith('/useCommercialAuth')) return path.join(root, 'qa/commercial/mockAuth.tsx');
    if (id.endsWith('/apiBase')) return path.join(root, 'qa/commercial/mockApiBase.ts');
    if (id === 'expo-iap' || id === 'expo-constants' || id === 'expo-modules-core') return path.join(root, 'qa/commercial/mockNative.ts');
    if (id === '@expo/vector-icons') return path.join(root, 'qa/commercial/mockIcons.tsx');
  } }],
  resolve: { alias: { 'react-native': 'react-native-web' } },
  server: { host: '127.0.0.1', port: 5179, strictPort: true, fs: { allow: [root] } },
});
