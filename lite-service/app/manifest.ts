import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { Image, Platform } from 'react-native';
import { CONFIG } from './config';
import { useEffect, useState } from 'react';

async function downloadSplashImage(imageUrl: string) {
  const fileName = 'splash.' + imageUrl.split('.').slice(-1)[0];
  const localFilePath = `${RNFS.CachesDirectoryPath}/${fileName}`; // Using CachesDirectoryPath

  const response = await RNFS.downloadFile({
    fromUrl: imageUrl,
    toFile: localFilePath,
  }).promise;

  if (response.statusCode === 200) {
    return Platform.OS === 'android' ? `file://${localFilePath}` : localFilePath;
  }
  throw new Error('Failed to download image');
}

interface Manifest {
  splash: {
    title: string;
    description: string;
    image: string;
    statusBarColor: `#${string}`;
  };
  webview: {
    statusBarColor: `#${string}`;
    linkPatterns: { pattern: string; action: 'webview' | 'browser' }[];
  };
  minBuildNumber: number;
  forceUpdate: {
    link: `https://${string}`;
    description: string;
    button: string;
  };
}

function merge(
  baseObj: Record<string, any>,
  newObj: Record<string, any>,
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const key in baseObj) {
    if (String(baseObj[key]) === '[object Object]') {
      result[key] = merge(baseObj[key], newObj[key]);
      continue;
    }

    result[key] = newObj[key] !== undefined ? newObj[key] : baseObj[key];
  }

  return result;
}

const defaultManifest: Manifest = {
  splash: {
    title: 'طلای دیجیتال دیجی‌کالا',
    description: 'خرید و فروش طلای دیجیتال در بستر آنلاین با پشتوانه فیزیکی',
    image: Image.resolveAssetSource(require('./splash-screen/default.jpg')).uri,
    statusBarColor: '#11494B',
  },
  webview: {
    statusBarColor: '#FFD08F',
    linkPatterns: [
      {
        pattern: '^https:\/\/www\.sahab\.ir\/',
        action: 'webview',
      },
      {
        pattern: '^https:\/\/digikala\.com',
        action: 'webview',
      },
      {
        pattern: '^https:\/\/digikala\.com',
        action: 'webview',
      },
      {
        pattern: '^https:\/\/digikala\.com',
        action: 'webview',
      },
      {
        pattern: '^https:\/\/digikala\.com',
        action: 'webview',
      },
      {
        pattern: '^https:\/\/www\.digikala\.com',
        action: 'webview',
      },
      {
        pattern: '^https:\/\/digikala\.com',
        action: 'webview',
      },
      {
        pattern: '^https:\/\/www\.digikala\.com\/fresh',
        action: 'webview',
      },
      {
        pattern: '^https:\\/\\/www\\.digikala\\.com\\/users\\/login',
        action: 'webview',
      },
      {
        pattern: '^[\\w\\W]+$',
        action: 'browser',
      },
    ],
  },
  minBuildNumber: 1,
  forceUpdate: {
    link: 'https://cafebazaar.ir/app/com.digi.examp',
    description: 'نسخه‌ی جدیدی در دسترس است. لطفا بروزرسانی کنید',
    button: 'بروزرسانی',
  },
};

let currentManifest = defaultManifest;
const subscribers = new Set<() => void>();
let isReady = false;

(async () => {
  try {
    const newManifest = JSON.parse((await AsyncStorage.getItem('manifest')) || '');
    currentManifest = merge(currentManifest, newManifest) as Manifest;
  } catch (err) {
    console.log('FAILED_TO_LOAD_MANIFEST', err);
  }
  isReady = true;
  subscribers.forEach((subscriber) => subscriber());
})();

function useIsManifestReady() {
  const [ready, setReady] = useState(isReady);

  useEffect(() => {
    const subscriber = () => setReady(true);
    subscribers.add(subscriber);
    return () => void subscribers.delete(subscriber);
  }, []);

  return ready;
}

const manifest = {
  async update(newManifest: Manifest) {
    try {
      if (newManifest.splash.image) {
        try {
          newManifest.splash.image = await downloadSplashImage(
            CONFIG.BASE_URL.replace(/\/+$/, '') +
              '/' +
              newManifest.splash.image.replace(/^\/+/, ''),
          );
        } catch (e) {
          newManifest.splash.image = defaultManifest.splash.image;
          console.log('FAILED_TO_LOAD_SPLASH_IMAGE', e);
        }
      }

      currentManifest = merge(currentManifest, newManifest) as Manifest;
      await AsyncStorage.setItem('manifest', JSON.stringify(newManifest));
    } catch (e) {
      console.log('FAILED_TO_UPDATE_MANIFEST', e);
    }
  },
  get() {
    return currentManifest;
  },
};

export { manifest, useIsManifestReady };
