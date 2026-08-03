import React, { useState } from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let BannerAd: any = null;
let BannerAdSize: any = null;
let TestIds: any = null;

if (!isExpoGo) {
  try {
    const ads = require('react-native-google-mobile-ads');
    BannerAd = ads.BannerAd;
    BannerAdSize = ads.BannerAdSize;
    TestIds = ads.TestIds;
  } catch (e) {
    // Native module not loaded
  }
}

// Official IDs
const androidAdUnitId = __DEV__ ? TestIds?.BANNER : 'ca-app-pub-6992032589730818/7011678209';
const iosAdUnitId = __DEV__ ? TestIds?.BANNER : 'ca-app-pub-6992032589730818/8771060971';

const adUnitId = Platform.OS === 'ios' ? iosAdUnitId : androidAdUnitId;

export default function AdBanner() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);

  if (isExpoGo || !BannerAd || isError) return null;

  return (
    <View style={[styles.container, !isLoaded && styles.hidden]}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdLoaded={() => setIsLoaded(true)}
        onAdFailedToLoad={(error) => {
          console.error('Ad failed to load: ', error);
          setIsError(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 8, // 5-10px padding requested
  },
  hidden: {
    height: 0,
    opacity: 0,
    paddingVertical: 0,
  },
});
