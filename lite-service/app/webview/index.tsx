import WebViewCore, { WebViewProps } from 'react-native-webview';
import React, {
  useRef,
  forwardRef,
  useCallback,
  MutableRefObject,
  ComponentRef,
  useEffect,
  RefObject,
} from 'react';
import { Linking, View } from 'react-native';
import { useGetNativeAPI } from '../native-api';
import { communicationService } from '../communication-service';
import { debounce } from '../utils/debounce';
import { manifest } from '../manifest';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NotificationService } from '../notification.ts';
import { logSentry } from '../utils/log-sentry.ts';

type Status = 'loading' | 'error' | 'loaded';

interface Props {
  onNavigationStateChange: Exclude<WebViewProps['onNavigationStateChange'], undefined>;

  onLoadEnd(status: Status): void;

  url: string;
}

const WebView = forwardRef<ComponentRef<typeof WebViewCore>, Props>(
  ({ onNavigationStateChange, onLoadEnd, url }, ref) => {
    const webViewRef = ref as unknown as MutableRefObject<WebViewCore>;
    const status = useRef<Status>('loading');

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedOnLoadEnd = useCallback(
      debounce(() => {
        onLoadEnd(status.current);
      }, 1000),
      [onLoadEnd],
    );

    const nativeAPI = useGetNativeAPI();

    useEffect(() => {
      if (!nativeAPI) {
        return;
      }
    
      return NotificationService.getInstance().subscribeNavigate((url) => {
        webViewRef.current.injectJavaScript(`window.location.href = '${url}';`);
      });
    }, [nativeAPI]);

    if (!nativeAPI) {
      return null;
    }

    const handleNavigationStateChange: WebViewProps['onNavigationStateChange'] = async (
      navState,
    ) => {
      onNavigationStateChange(navState);

      for (const linkPattern of manifest.get().webview.linkPatterns) {
        const isMatched = new RegExp(linkPattern.pattern).test(navState.url);
        if (!isMatched) {
          continue;
        }

        switch (linkPattern.action) {
          case 'browser':
            Linking.openURL(navState.url).catch((e) => {
              // logSentry('OPEN_URL_ERROR', e);
              console.log('OPEN_URL_ERROR', e);
            });
            webViewRef.current!.goBack();
            return;

          case 'webview':
            return;
        }
      }
    };

    return (
      <View style={{ backgroundColor: manifest.get().webview.statusBarColor, flex: 1 }}>
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <WebViewCore
            containerStyle={{ flex: 1 }}
            style={{ flex: 1 }}
            overScrollMode='never'
            ref={(webView) => {
              // @ts-ignore
              webViewRef.current = webView;
              communicationService.setWebViewRef({
                current: webView,
              } as RefObject<WebViewCore>);
            }}
            onHttpError={() => {
              status.current = 'error';
            }}
            onError={() => {
              status.current = 'error';
            }}
            onLoad={() => {
              status.current = 'loaded';
            }}
            onLoadEnd={debouncedOnLoadEnd}
            source={{ uri: url }}
            originWhitelist={['*']}
            startInLoadingState
            domStorageEnabled
            useWebKit
            thirdPartyCookiesEnabled
            allowsProtectedMedia
            download
            javaScriptEnabled
            javaScriptCanOpenWindowsAutomatically
            onMessage={communicationService.handleMessage}
            pullToRefreshEnabled
            setSupportMultipleWindows={false}
            onShouldStartLoadWithRequest={(request) => {
              // list of schemas we will allow the webview to open natively
              if (/^(tel|mailto|maps|geo|sms):/.test(request?.url || '')) {
                Linking.openURL(request.url).catch((er) => {
                  // logSentry('OPEN_LINK_ERROR', er);
                  console.log('Failed to open Link:', er.message);
                });
                return false;
              }

              // let everything else to the webview
              return true;
            }}
            bounces
            mixedContentMode='always'
            allowFileAccess
            allowFileAccessFromFileURLs
            allowUniversalAccessFromFileURLs
            allowsLinkPreview
            allowsBackForwardNavigationGestures
            onNavigationStateChange={handleNavigationStateChange}
            injectedJavaScriptBeforeContentLoaded={nativeAPI}
          />
        </SafeAreaView>
      </View>
    );
  },
);

export { WebView };
