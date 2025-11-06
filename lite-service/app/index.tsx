import { WebView } from './webview';
import React, {
  useRef,
  ComponentRef,
  useCallback,
  useEffect,
  ComponentProps,
} from 'react';
import { Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAttachBackToWebView } from './use-attach-back-to-webview';
import { useOTP } from './use-otp';
import DeviceInfo from 'react-native-device-info';
import { manifest, useIsManifestReady } from './manifest.ts';
import { CONFIG } from './config';
import { NotificationService } from './notification.ts';
// import { logSentry } from './utils/log-sentry.ts';

// Sentry.init({
//   dsn: '',
//   tracesSampleRate: 1.0,
// });

const App = () => {
  const webViewRef = useRef<ComponentRef<typeof WebView>>(null);
  const attachBackToWebView = useAttachBackToWebView({ webViewRef });
  // const splashScreenRef = useRef<ComponentRef<typeof SplashScreen>>(null);
  const isWebViewReady = useRef(false);
  const pendingInitialUrl = useRef<string | null>(null);

  const navigateToUrlIfAllowed = useCallback((url: string) => {
    console.log('Checking if navigation is allowed for URL:', url);
    webViewRef.current?.injectJavaScript(`
      (function() {
        const currentUrl = window.location.href;
        if (currentUrl && currentUrl.includes('digikala.com/wealth/welcome')) {
          console.log('Currently on welcome page, skipping navigation');
          return;
        }
        console.log('Navigation allowed, navigating to:', '${url}');
        window.location.href = '${url}';
      })();
    `);
  }, []);

  const handleWebViewReady = useCallback(() => {
    console.log('WebView ready');
    isWebViewReady.current = true;
    
    if (pendingInitialUrl.current) {
      console.log('WebView ready, checking pending URL:', pendingInitialUrl.current);
      navigateToUrlIfAllowed(pendingInitialUrl.current);
      pendingInitialUrl.current = null;
    }
  }, [navigateToUrlIfAllowed]);

  // useEffect(() => {
  //   const buildNumber = DeviceInfo.getBuildNumber();
  //   fetch(`${CONFIG.BASE_URL}/_lite/${buildNumber}.json`)
  //     .then((res) => res.json())
  //     .then((serverManifest) => {
  //       if (buildNumber < serverManifest.minBuildNumber) {
  //         // splashScreenRef.current?.forceUpdate();
  //       }
  //       manifest.update(serverManifest);
  //     })
  //     .catch((e) => {
  //       // logSentry('FAILED_TO_GET_MANIFEST', e);
  //       console.log('FAILED_TO_GET_MANIFEST', e);
  //     });
  // }, []);

  useEffect(()=>{
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('App launched with URL:', url);
        if (isWebViewReady.current) {
          navigateToUrlIfAllowed(url);
        } else {
          pendingInitialUrl.current = url;
        }
      } else {
        console.log('No initial URL detected');
      }
    });

    const deepLinkHandler = Linking.addEventListener('url', ({ url }) => {
      console.log('URL opened while app is running:', url);
      if (isWebViewReady.current) {
        navigateToUrlIfAllowed(url);
      } else {
        console.log('WebView not ready, storing URL for later');
        pendingInitialUrl.current = url;
      }
    });

    return () => {
      deepLinkHandler.remove();
    };
  },[navigateToUrlIfAllowed])

  useOTP();

  const onLoadEnd: ComponentProps<typeof WebView>['onLoadEnd'] = useCallback(
    (status) => {
      if (status === 'loaded') {
        NotificationService.getInstance().requestPermission();
        // splashScreenRef.current?.hide();
        handleWebViewReady();
      } else {
        // splashScreenRef.current?.failed();
      }
    },
    [handleWebViewReady],
  );

  // const isManifestReady = useIsManifestReady();
  // if (!isManifestReady) {
  //   return null;
  // }

  return (
    <>
      <SafeAreaProvider>
        <WebView
          ref={webViewRef}
          url={CONFIG.BASE_URL}
          onNavigationStateChange={(navState) => {
            attachBackToWebView(navState);
          }}
          onLoadEnd={onLoadEnd}
        />
      </SafeAreaProvider>
    </>
  );
};

export { App };
