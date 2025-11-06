import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useNotificationToken } from './notification.ts';

const nativeLogs = `
(() => {
  const types = ['log', 'debug', 'info', 'warn', 'error'];

  for (const type of types) {
    console[type] = function (...value) {
      window.DigikalaLiteAPI.emit('LOG',{
        value: value.map(item => JSON.stringify(item, null, 2)).join(' '),
        level: type,
      })
    };
  }

  window.addEventListener('error', function ({error}) {
    console.error('CRASH', error.toString());
  });
})();
`;

const nativeWebOTP = `
(() => {
  if (typeof navigator === 'undefined') {
    return;
  }
  if (typeof navigator.credentials === 'undefined') {
    navigator.credentials = {};
  }
  navigator.credentials.get = function ({signal}) {
    return new Promise((resolve, reject) => {
      const autoFillOtpHandler = event => {
        try {
          const eventData = JSON.parse(event.data);

          if (eventData.type === 'AUTO_FILL_OTP') {
            cleanUp();
            resolve({code: eventData.value});
          }
          throw new Error('invalid_message');
        } catch (err) {
          cleanUp();
          reject(err);
        }
      };

      const cleanUp = () => {
        window.removeEventListener('message', autoFillOtpHandler, true);
        signal.removeEventListener('abort', handleAbort);
      };

      const handleAbort = () => {
        cleanUp();
        reject(new Error('aborted'));
      };

      window.addEventListener('message', autoFillOtpHandler, true);
      signal.addEventListener('abort', handleAbort);
    });
  };
})();
`;

function createNativeAPI({
  otpHash,
  notificationToken,
}: {
  otpHash: string;
  notificationToken: string;
}) {
  return `      
    (function () {
      const listeners = {};
      window.addEventListener(
        'message',
        e => {
          try {
            const data = JSON.parse(e.data);
            if (data.source !== 'DKLITE') {
              return;
            }
    
            for (const listener of listeners[data.type] || []) {
              listener(data);
            }
          } catch (e) {}
        },
        {capture: true},
      );
    
      window.DigikalaLiteAPI = {
        otpHash: '${otpHash}',
        notificationToken: '${notificationToken}',
        emit(type, payload){
          window.ReactNativeWebView.postMessage(JSON.stringify({ type, payload }));
        },
        watch(type, listener) {
          if (!listeners[type]) {
            listeners[type] = new Set();
          }
          listeners[type].add(listener);
    
          return () => {
            listeners[type].delete(listener);
          };
        },
      };
    })();
     
    ${nativeLogs};
    
    true; // note: this is required, or you'll sometimes get silent failures
  `;
}

export function useGetNativeAPI() {
  const [otpHash, setOtpHash] = useState<string>('');

  useEffect(() => {
    if (Platform.OS === 'android') {
      import('react-native-otp-verify')
        .then(({ getHash }) => getHash())
        .then(([hash]) => setOtpHash(hash));
    }
  }, []);

  const notificationToken = useNotificationToken();

  const isLoading = (!otpHash && Platform.OS === 'android') || notificationToken.loading;
  if (isLoading) {
    return null;
  }

  return createNativeAPI({ otpHash, notificationToken: notificationToken.value });
}
