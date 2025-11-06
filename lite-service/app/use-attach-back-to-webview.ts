import { RefObject, useCallback, useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import type { WebViewNavigation } from 'react-native-webview';
import type WebView from 'react-native-webview';

interface Props {
  webViewRef: RefObject<WebView | null>;
}

export const useAttachBackToWebView = ({ webViewRef }: Props) => {
  const canGoBack = useRef(false);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack.current) {
        webViewRef.current?.goBack();
        return true;
      }
    });

    return () => {
      backHandler.remove();
    };
  }, []);

  return useCallback((navState: WebViewNavigation) => {
    canGoBack.current = navState.canGoBack;
  }, []);
};
