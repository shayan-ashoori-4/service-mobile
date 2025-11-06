import { Platform } from 'react-native';

const Font =
  Platform.OS === 'android'
    ? ({
        regular: { fontFamily: 'iranyekanwebregular' },
        extraBold: { fontFamily: 'iranyekanwebextrabold' },
      } as const)
    : ({
        regular: {
          fontFamily: 'IranYekanWeb',
        },
        extraBold: {
          fontFamily: 'IranYekanWeb',
          fontWeight: 800,
        },
      } as const);

export { Font };
