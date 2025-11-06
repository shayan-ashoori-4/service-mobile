import { useEffect } from 'react';
import {
  COMMUNICATION_SEND_MESSAGE_TYPES,
  communicationService,
} from './communication-service';
import { Platform } from 'react-native';
import { logSentry } from './utils/log-sentry';

function useOTP() {
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    let onUnmount = () => {};

    import('react-native-otp-verify').then(
      ({ getHash, removeListener, startOtpListener }) => {
        onUnmount = () => removeListener();

        getHash()
          .then(([hash]) => console.log('HASH_FOR_SMS', hash))
          .catch((e) => {
            // logSentry('FAILED_GET_HASH_FOR_SMS', e);
            console.error.bind(null, 'FAILED_GET_HASH_FOR_SMS');
          });

        startOtpListener((message) => {
          if (message === 'Timeout Error.') {
            return;
          }
          console.log('SMS_RECEIVED', message);
          const code = message?.match?.(/([0-9]+)/)?.[1];
          if (code) {
            console.log('SENDING_OTP_TO_WEB', code);
            communicationService.emit({
              type: COMMUNICATION_SEND_MESSAGE_TYPES.OTP,
              payload: code,
            });
          }
        });
      },
    );

    return onUnmount;
  }, []);
}

export { useOTP };
