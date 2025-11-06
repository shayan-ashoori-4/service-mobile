// import {
//   StyleSheet,
//   Text,
//   Animated,
//   ActivityIndicator,
//   View,
//   TouchableOpacity,
//   Easing,
//   StatusBar,
//   Linking,
// } from 'react-native';
// import React, {
//   forwardRef,
//   useEffect,
//   useImperativeHandle,
//   useRef,
//   useState,
// } from 'react';
// import { manifest } from '../manifest';
// import { Font } from '../utils/font.ts';

// interface Props {
//   onRetry(): void;
// }

// interface RefType {
//   hide(): void;

//   failed(): void;

//   forceUpdate(): void;
// }

// const SplashScreen = forwardRef<RefType, Props>(({ onRetry }, ref) => {
//   const startAnimation = useRef(new Animated.Value(0)).current;
//   useEffect(() => {
//     Animated.timing(startAnimation, {
//       toValue: 1,
//       duration: 1000,
//       useNativeDriver: true,
//       easing: Easing.out(Easing.ease),
//     }).start();
//   }, [startAnimation]);

//   const [status, setStatus] = useState<'' | 'loading' | 'failed' | 'forceUpdate'>(
//     'loading',
//   );
//   const endAnimation = useRef(new Animated.Value(1)).current;
//   const [endAnimationTiming] = useState(() =>
//     Animated.timing(endAnimation, {
//       toValue: 0,
//       duration: 300,
//       useNativeDriver: true,
//     }),
//   );
//   useImperativeHandle(
//     ref,
//     () => ({
//       failed() {
//         if (status === 'loading') {
//           setStatus('failed');
//         }
//       },
//       forceUpdate() {
//         setStatus('forceUpdate');
//       },
//       hide() {
//         if (status !== 'forceUpdate') {
//           endAnimationTiming.start(() => {
//             setStatus('');
//           });
//         }
//       },
//     }),
//     [status, endAnimationTiming],
//   );

//   useEffect(() => {
//     if (status !== 'loading') {
//       return;
//     }
//     endAnimationTiming.stop();

//     const timeout = setTimeout(() => {
//       setStatus('failed');
//     }, 40000);

//     return () => {
//       clearTimeout(timeout);
//     };
//   }, [status]);

//   if (!status) {
//     return <StatusBar backgroundColor={manifest.get().webview.statusBarColor} />;
//   }

//   return (
//     <>
//       <StatusBar backgroundColor={manifest.get().splash.statusBarColor} />
//       <Animated.View style={[styles.container, { opacity: endAnimation }]}>
//         <Animated.View
//           style={{
//             ...styles.texts,
//             opacity: startAnimation,
//             transform: [
//               {
//                 translateY: startAnimation.interpolate({
//                   inputRange: [0, 1],
//                   outputRange: [-70, 100],
//                 }),
//               },
//             ],
//           }}
//         >
//           <Text style={styles.title}>{manifest.get().splash.title}</Text>
//           <Text style={styles.description}>{manifest.get().splash.description}</Text>
//           {(() => {
//             switch (status) {
//               case 'loading':
//                 return (
//                   <View style={styles.loading}>
//                     <Text style={styles.loadingText}>درحال بارگذاری</Text>
//                     <ActivityIndicator color='white' />
//                   </View>
//                 );

//               case 'forceUpdate':
//                 return (
//                   <View style={styles.failed}>
//                     <Text style={styles.failedHint}>
//                       {manifest.get().forceUpdate.description}
//                     </Text>
//                     <TouchableOpacity
//                       onPress={() => {
//                         Linking.openURL(manifest.get().forceUpdate.link).catch((e) => {
//                           console.log('OPEN_URL_ERROR', e);
//                         });
//                       }}
//                     >
//                       <Text style={styles.failedAction}>
//                         {manifest.get().forceUpdate.button}
//                       </Text>
//                     </TouchableOpacity>
//                   </View>
//                 );

//               case 'failed':
//                 return (
//                   <View style={styles.failed}>
//                     <Text style={styles.failedHint}>
//                       لطفا وضعیت اتصال اینترنت خود را بررسی کنید
//                     </Text>
//                     <TouchableOpacity
//                       onPress={() => {
//                         setStatus('loading');
//                         onRetry();
//                       }}
//                     >
//                       <Text style={styles.failedAction}>تلاش مجدد</Text>
//                     </TouchableOpacity>
//                   </View>
//                 );
//             }
//           })()}
//         </Animated.View>
//         <Animated.Image
//           source={{ uri: manifest.get().splash.image }}
//           style={{
//             ...styles.image,
//             opacity: startAnimation,
//             transform: [
//               {
//                 translateY: startAnimation.interpolate({
//                   inputRange: [0, 1],
//                   outputRange: [500, 160],
//                 }),
//               },
//               ...styles.image.transform,
//             ],
//           }}
//         />
//       </Animated.View>
//     </>
//   );
// });
// const styles = StyleSheet.create({
//   loading: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     marginTop: 50,
//   },
//   loadingText: {
//     color: 'white',
//     marginRight: 8,
//     ...Font.regular,
//   },

//   failed: {
//     alignItems: 'center',
//     marginTop: 50,
//   },
//   failedHint: {
//     color: 'white',
//     fontSize: 12,
//     marginBottom: 8,
//     ...Font.regular,
//   },
//   failedAction: {
//     color: 'white',
//     ...Font.regular,
//   },

//   texts: {
//     position: 'absolute',
//     top: 0,
//     width: '100%',
//     paddingRight: 10,
//     paddingLeft: 10,
//   },
//   title: {
//     ...Font.extraBold,
//     color: 'white',
//     fontSize: 28,
//     marginBottom: 10,
//     textAlign: 'center',
//   },
//   description: {
//     color: 'white',
//     textAlign: 'center',
//     ...Font.regular,
//     fontSize: 14,
//   },

//   image: {
//     position: 'absolute',
//     bottom: 0,
//     width: 360,
//     height: 649,
//     transform: [
//       { translateX: 40 },
//       { perspective: 1000 },
//       { rotateX: '40deg' },
//       { rotateY: '10deg' },
//       { rotateZ: '-50deg' },
//     ],
//   },

//   container: {
//     flex: 1,
//     position: 'absolute',
//     zIndex: 10,
//     width: '100%',
//     height: '100%',
//     backgroundColor: '#11494B',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
// });

// export { SplashScreen };
