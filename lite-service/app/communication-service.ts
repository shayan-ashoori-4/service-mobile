import WebView from 'react-native-webview';
import { RefObject } from 'react';

export const COMMUNICATION_RECEIVE_MESSAGE_TYPES = {
  LOG: 'LOG',
} as const;
type CommunicationReceiveMessage = {
  type: typeof COMMUNICATION_RECEIVE_MESSAGE_TYPES.LOG;
  payload: {
    level: 'log' | 'debug' | 'info' | 'warn' | 'error';
    value: string;
  };
};

export const COMMUNICATION_SEND_MESSAGE_TYPES = {
  OTP: 'AUTO_FILL_OTP',
} as const;
type CommunicationSendMessage = {
  type: typeof COMMUNICATION_SEND_MESSAGE_TYPES.OTP;
  payload: string;
};

export const communicationService = new (class {
  private webViewRef: RefObject<WebView | null> = { current: null };

  setWebViewRef(webViewRef: RefObject<WebView>) {
    this.webViewRef = webViewRef;
  }

  emit(message: CommunicationSendMessage) {
    if (!this.webViewRef.current) {
      return;
    }

    this.webViewRef.current.postMessage(
      JSON.stringify({
        source: 'DKLITE',
        ...message,
      }),
    );
  }

  handleMessage({ nativeEvent }: { nativeEvent: any }) {
    try {
      const data = JSON.parse(nativeEvent.data) as CommunicationReceiveMessage;

      switch (data.type) {
        case COMMUNICATION_RECEIVE_MESSAGE_TYPES.LOG:
          return console.log(`WEB_CONSOLE(${data.payload.level}):`, data.payload.value);
      }
    } catch (e) {
      console.error('INVALID_POST_MESSAGE_FROM_WEB:', nativeEvent.data);
    }
  }
})();
