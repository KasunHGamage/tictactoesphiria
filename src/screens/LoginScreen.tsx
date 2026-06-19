import React, { useState, useEffect } from 'react';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  StyleSheet, Text, TextInput, View, Pressable,
  ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import ThemedAlert, { ThemedAlertButton } from '../components/ThemedAlert';
import NeonButton from '../components/NeonButton';
import { useAppTheme } from '../context/ThemeContext';
import { Spacing, Typography } from '../../constants/themes';
import { login, sendPasswordReset, loginWithApple } from '../services/authService';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { updateProfile } from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../services/firebase';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }: any) {
  const t = useAppTheme();
  const isCalm = t.mode === 'calm';

  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [loading,      setLoading]      = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading,  setAppleLoading]  = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  // expo-auth-session auto-selects the correct redirect URI per platform:
  // - iOS  → com.googleusercontent.apps.{iosClientId}:/oauth2redirect/google
  // - Android → reverse of androidClientId scheme
  // The hook throws a render error if the platform-specific ID is completely absent,
  // so we always provide androidClientId on Android (fallback to webClientId prevents
  // the crash; actual sign-in on Android also requires a real Android OAuth client).
  const googleConfig: Google.GoogleAuthRequestConfig = {
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    scopes: ['profile', 'email'],
  };
  if (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID) {
    googleConfig.iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  }
  if (Platform.OS === 'android') {
    // Must always be set on Android to avoid a render crash in the hook.
    googleConfig.androidClientId =
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ??
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  }

  // Show the Google button only when a platform-appropriate client ID is configured.
  // On Android, hide it until a real Android OAuth client is created.
  const googleEnabled =
    Platform.OS === 'ios'
      ? !!process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
      : !!process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

  // No second argument — use Google's default discovery document.
  const [request, response, promptAsync] = Google.useAuthRequest(googleConfig);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync()
        .then(setAppleAvailable)
        .catch(() => setAppleAvailable(false));
    }
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      const params = response.params as any;
      // useAuthRequest returns an access_token in params
      const accessToken = params?.access_token;
      const idToken     = params?.id_token;

      console.log('[Google OAuth] response params:', JSON.stringify(params));

      if (accessToken || idToken) {
        setGoogleLoading(true);
        setError(null);

        const credential = idToken
          ? GoogleAuthProvider.credential(idToken, accessToken)
          : GoogleAuthProvider.credential(null, accessToken);

        signInWithCredential(auth, credential)
          .catch((err) => {
            let msg = err.message || 'An unexpected error occurred during Google login.';
            if (msg.includes('auth/account-exists-with-different-credential')) {
              msg = 'An account already exists with the same email but different sign-in method.';
            }
            setError(msg);
          })
          .finally(() => setGoogleLoading(false));
      } else {
        console.warn('[Google OAuth] No access_token or id_token in response:', params);
        setError('Google sign-in failed: no token received. Please try again.');
      }
    } else if (response?.type === 'error') {
      console.error('[Google OAuth] Error response:', response.error);
      setError('Google sign-in error: ' + (response.error?.message || 'unknown error'));
    }
  }, [response]);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [error,        setError]        = useState<string | null>(null);

  // Themed alert state (replaces native Alert.alert)
  const [alertVisible,  setAlertVisible]  = useState(false);
  const [alertTitle,    setAlertTitle]    = useState('');
  const [alertMessage,  setAlertMessage]  = useState('');
  const [alertButtons,  setAlertButtons]  = useState<ThemedAlertButton[]>([]);

  const showAlert = (
    title: string,
    message: string,
    buttons: ThemedAlertButton[] = [{ text: 'OK', style: 'default' }],
  ) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertButtons(buttons);
    setAlertVisible(true);
  };

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try { await login(email, password); }
    catch (e: any) {
      let msg = e.message || 'An unexpected error occurred.';
      if (msg.includes('auth/invalid-credential')) {
        msg = 'Invalid email or password. Please try again.';
      } else if (msg.includes('auth/invalid-email')) {
        msg = 'Please enter a valid email address.';
      }
      setError(msg);
    }
    finally { setLoading(false); }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      showAlert('Forgot Password', 'Please enter your email first.');
      return;
    }
    try {
      await sendPasswordReset(trimmedEmail);
      showAlert('Forgot Password', 'Password reset email sent! Check your inbox.');
    } catch (e: any) {
      let msg = e.message || 'An unexpected error occurred.';
      if (msg.includes('auth/invalid-email')) {
        msg = 'Please enter a valid email address.';
      } else if (msg.includes('auth/user-not-found')) {
        msg = 'No account found with this email.';
      }
      showAlert('Error', msg);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    try {
      await promptAsync();
    } catch (e: any) {
      let msg = e.message || 'An unexpected error occurred during Google login.';
      setError(msg);
    }
  };

  const handleAppleLogin = async () => {
    setAppleLoading(true);
    setError(null);
    try {
      // 1. Generate a random string as the raw nonce
      const rawNonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // 2. Hash the nonce using SHA256
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      // 3. Request Apple credentials
      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!appleCredential.identityToken) {
        throw new Error('Apple Sign-In failed: No Identity Token returned.');
      }

      // 4. Authenticate with Firebase
      const user = await loginWithApple(appleCredential.identityToken, rawNonce);

      // 5. Update profile name if available
      const fullName = appleCredential.fullName;
      if (fullName && user) {
        const displayName = [fullName.givenName, fullName.familyName]
          .filter(Boolean)
          .join(' ');
        if (displayName) {
          await updateProfile(user, { displayName });
        }
      }
    } catch (e: any) {
      if (e.message?.includes('Sign-In cancelled') || e.code === 'ERR_REQUEST_CANCELED') {
        return;
      }
      let msg = e.message || 'An unexpected error occurred during Apple login.';
      setError(msg);
    } finally {
      setAppleLoading(false);
    }
  };

  const inputStyle = (field: string) => [
    s.input,
    { backgroundColor: t.card, borderColor: t.border, color: t.textPrimary },
    focusedField === field && { borderColor: t.primary, ...(t.glow(t.primary, 8) as any) },
  ];

  return (
    <ScreenWrapper>
      <StatusBar barStyle={isCalm ? 'dark-content' : 'light-content'} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        {/* Brand Header */}
        <View style={s.header}>
          <Text style={[s.brand, { color: t.primary, ...(t.textGlow(t.primary) as any) }]}>
            MoveTac
          </Text>
          <Text style={[s.title, { color: t.textPrimary, ...(t.textGlow(t.primary) as any) }]}>
            Welcome Back
          </Text>
          <Text style={[s.subtitle, { color: t.textSecondary }]}>Login to play with friends</Text>
        </View>

        <View style={s.content}>
          {error && (
            <View style={[
              s.errorContainer,
              {
                backgroundColor: t.card,
                borderColor: t.lose,
              }
            ]}>
              <Text style={[s.errorText, { color: t.lose, fontWeight: '700' }]}>
                {error}
              </Text>
            </View>
          )}
          <View style={s.inputGroup}>
            <Text style={[s.label, { color: t.textSecondary }]}>EMAIL</Text>
            <TextInput
              style={inputStyle('email')}
              placeholder="Enter your email"
              placeholderTextColor={t.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={[s.label, { color: t.textSecondary }]}>PASSWORD</Text>
            <TextInput
              style={inputStyle('password')}
              placeholder="••••••••"
              placeholderTextColor={t.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
            />
            <Pressable onPress={handleForgotPassword} style={s.forgotPasswordPressable}>
              <Text style={[s.forgotPasswordText, { color: t.primary, fontWeight: '600' }]}>
                Forgot Password?
              </Text>
            </Pressable>
          </View>

          <View style={s.footer}>
            {loading ? (
              <View style={[s.loadingWrap, { borderColor: t.border }]}>
                <ActivityIndicator color={t.primary} />
              </View>
            ) : (
              <>
                <NeonButton title="LOGIN" onPress={handleLogin} />
                
                {googleEnabled && (
                  googleLoading ? (
                    <View style={[s.loadingWrap, { borderColor: t.border }]}>
                      <ActivityIndicator color={t.primary} />
                    </View>
                  ) : (
                    <Pressable
                      onPress={handleGoogleLogin}
                      style={({ pressed }) => [
                        s.googleBtn,
                        {
                          backgroundColor: t.card,
                          borderColor: t.border,
                          borderWidth: isCalm ? 0.8 : 1.5,
                        },
                        isCalm ? (t.shadowElevation('sm') as any) : (t.glow(t.border, 8) as any),
                        pressed && s.googleBtnPressed,
                      ]}
                    >
                      <View style={s.googleBtnContent}>
                        <Ionicons name="logo-google" size={18} color={t.textPrimary} style={s.googleIcon} />
                        <Text style={[s.googleBtnText, { color: t.textPrimary, fontWeight: '600' }]}>
                          Continue with Google
                        </Text>
                      </View>
                    </Pressable>
                  )
                )}

                {Platform.OS === 'ios' && appleAvailable && (
                  appleLoading ? (
                    <View style={[s.loadingWrap, { borderColor: t.border }]}>
                      <ActivityIndicator color={t.primary} />
                    </View>
                  ) : (
                    <Pressable
                      onPress={handleAppleLogin}
                      style={({ pressed }) => [
                        s.appleBtn,
                        {
                          backgroundColor: t.card,
                          borderColor: t.border,
                          borderWidth: isCalm ? 0.8 : 1.5,
                        },
                        isCalm ? (t.shadowElevation('sm') as any) : (t.glow(t.border, 8) as any),
                        pressed && s.appleBtnPressed,
                      ]}
                    >
                      <View style={s.appleBtnContent}>
                        <Ionicons name="logo-apple" size={18} color={t.textPrimary} style={s.appleIcon} />
                        <Text style={[s.appleBtnText, { color: t.textPrimary, fontWeight: '600' }]}>
                          Continue with Apple
                        </Text>
                      </View>
                    </Pressable>
                  )
                )}
              </>
            )}

            <Pressable onPress={() => navigation.navigate('Signup')} style={s.link}>
              <Text style={[s.linkText, { color: t.textSecondary }]}>
                Do not have an account?{'  '}
                <Text style={[s.linkHighlight, { color: t.primary, ...(t.textGlow(t.primary) as any) }]}>
                  Sign Up
                </Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <ThemedAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        buttons={alertButtons}
        onDismiss={() => setAlertVisible(false)}
      />
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  flex:    { flex: 1 },
  header:  { marginTop: Spacing.xl, marginBottom: Spacing.lg, alignItems: 'flex-start' },
  content: { gap: Spacing.sm },
  footer:  { marginTop: Spacing.lg, gap: Spacing.md },

  brand:    { fontSize: 11, fontWeight: '900', letterSpacing: 6, marginBottom: 16 },
  title:    { fontSize: 34, fontWeight: '900', marginBottom: 6, letterSpacing: 0.5 },
  subtitle: { fontSize: 14 },

  inputGroup: { gap: 8 },
  label:  { fontSize: 10, fontWeight: '900', letterSpacing: 3 },
  input:  { borderRadius: 14, borderWidth: 1, padding: Spacing.md, fontSize: 15 },

  loadingWrap:  { height: 52, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderRadius: 14 },
  link:         { alignItems: 'center', paddingVertical: 4 },
  linkText:     { fontSize: 14 },
  linkHighlight: { fontWeight: '900' },
  errorContainer: {
    padding: Spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
  },
  forgotPasswordPressable: {
    alignSelf: 'flex-end',
    marginTop: 4,
    paddingVertical: 4,
  },
  forgotPasswordText: {
    fontSize: 12,
  },
  googleBtn: {
    borderRadius: 12,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  googleBtnPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.85,
  },
  googleBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    marginRight: 10,
  },
  googleBtnText: {
    fontSize: 15,
    fontFamily: Typography.fontFamily,
    letterSpacing: 0.3,
  },
  appleBtn: {
    borderRadius: 12,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  appleBtnPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.85,
  },
  appleBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleIcon: {
    marginRight: 10,
  },
  appleBtnText: {
    fontSize: 15,
    fontFamily: Typography.fontFamily,
    letterSpacing: 0.3,
  },
});
