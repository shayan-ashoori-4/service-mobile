import { withScope, captureMessage } from '@sentry/react-native';

const logSentry = (message: string, extraData: any) => {
  withScope((scope) => {
    scope.setExtra('data', JSON.stringify(extraData || {}));
    captureMessage(message);
  });
};

export { logSentry };
