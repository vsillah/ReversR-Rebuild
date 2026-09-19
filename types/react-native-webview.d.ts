declare module 'react-native-webview' {
  import * as React from 'react';

  export type WebViewNavigationRequest = {
    url?: string;
  };

  export type WebViewProps = {
    testID?: string;
    source?: { uri: string };
    javaScriptEnabled?: boolean;
    domStorageEnabled?: boolean;
    allowFileAccess?: boolean;
    cacheEnabled?: boolean;
    cacheMode?: 'LOAD_DEFAULT' | 'LOAD_CACHE_ELSE_NETWORK' | 'LOAD_NO_CACHE' | 'LOAD_CACHE_ONLY';
    setSupportMultipleWindows?: boolean;
    allowsBackForwardNavigationGestures?: boolean;
    mixedContentMode?: 'never' | 'always' | 'compatibility';
    originWhitelist?: string[];
    startInLoadingState?: boolean;
    onError?: () => void;
    onShouldStartLoadWithRequest?: (request: WebViewNavigationRequest) => boolean;
  };

  export const WebView: React.ComponentType<WebViewProps>;
}
