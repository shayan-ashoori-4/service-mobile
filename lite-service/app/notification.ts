import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';
import { useSyncExternalStore } from 'react';
import RemoteMessage = FirebaseMessagingTypes.RemoteMessage;
import { logSentry } from './utils/log-sentry';

const log = (...args: any[]) => console.log('NOTIFICATION:', ...args);

class NotificationService {
  private static instance: NotificationService | null = null;
  public static getInstance() {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private token = { loading: false, value: '', error: null };
  private tokenSubscribers: Set<() => void> = new Set();
  public subscribeToken(subscriber: () => void) {
    this.tokenSubscribers.add(subscriber);
    return () => this.tokenSubscribers.delete(subscriber);
  }
  public getToken() {
    return this.token;
  }

  private navigationSubscribers: Set<(url: string) => void> = new Set();
  public subscribeNavigate(subscriber: (url: string) => void) {
    this.navigationSubscribers.add(subscriber);
    return () => {
      this.navigationSubscribers.delete(subscriber);
    };
  }

  private async onNotificationReceived(remoteMessage: RemoteMessage) {
    log('new notification', remoteMessage);
    try {
      const navigationUrl =
        remoteMessage.data?.navigation_url ||
        'https://www.digikala.com/gold/profile/info/';
      if (typeof navigationUrl === 'string' && navigationUrl) {
        this.navigationSubscribers.forEach((subscriber) => subscriber(navigationUrl));
      }
    } catch (e) {
      // logSentry('PARSING_NOTIFICATION_TOKEN', e);
      log('error while processing notification', e);
    }
  }

  private constructor() {
    this.subscribeToken = this.subscribeToken.bind(this);
    this.getToken = this.getToken.bind(this);
    this.onNotificationReceived = this.onNotificationReceived.bind(this);

    messaging()
      .getAPNSToken()
      .then((token) => {
        log('APNs token', token);

        if (!token) {
          return;
        }
        return messaging().setAPNSToken(token);
      });

    this.token = { loading: true, value: '', error: null };
    messaging()
      .getToken()
      .then((token) => {
        log('token', token);
        this.token = { loading: false, value: __DEV__ ? '' : token, error: null };
      })
      .catch((e) => {
        this.token = { loading: false, value: '', error: e };
        // logSentry('GET_NOTIFICATION_TOKEN', e);
        log('failed to getToken', e);
      })
      .finally(() => {
        this.tokenSubscribers.forEach((subscriber) => subscriber());
      });

    messaging().onMessage(this.onNotificationReceived);
    messaging().setBackgroundMessageHandler(this.onNotificationReceived);
    messaging().onNotificationOpenedApp(this.onNotificationReceived);
  }

  public async requestPermission(): Promise<boolean> {
    try {
      const authStatus = await messaging().requestPermission();
      log('Firebase permission status:', authStatus);

      const isAuthorized = [
        messaging.AuthorizationStatus.AUTHORIZED,
        messaging.AuthorizationStatus.PROVISIONAL,
      ].includes(authStatus);

      if (Platform.OS === 'ios' && isAuthorized) {
        await messaging().registerDeviceForRemoteMessages();
      }

      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const androidPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );

        log('Android notification permission:', androidPermission);

        return isAuthorized && androidPermission === PermissionsAndroid.RESULTS.GRANTED;
      }

      return isAuthorized;
    } catch (e) {
      // logSentry('REQUESTING_NOTIFICATION_PERMISSION', e);
      log('Error while requesting permission:', e);
      return false;
    }
  }
}

function useNotificationToken() {
  const notificationService = NotificationService.getInstance();

  return useSyncExternalStore(
    notificationService.subscribeToken,
    notificationService.getToken,
  );
}

export { NotificationService, useNotificationToken };
