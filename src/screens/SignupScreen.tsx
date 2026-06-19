import React, { useState, useEffect } from 'react';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  StyleSheet, Text, TextInput, View, Pressable,
  ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import NeonButton from '../components/NeonButton';
import { useAppTheme } from '../context/ThemeContext';
import { Spacing, Typography } from '../../constants/themes';
import { signUp, loginWithApple } from '../services/authService';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { updateProfile, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { auth } from '../services/firebase';

WebBrowser.maybeCompleteAuthSession();

export default function SignupScreen({ navigation }: any) {
  const t = useAppTheme();
  const isCalm = t.mode === 'calm';

  const [name,          setName]          = useState('');
  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading,  setAppleLoading]  = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [focusedField,  setFocusedField]  = useState<string | null>(null);
  const [error,         setError]         = useState<string | null>(null);

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
    googleConfig.androidClientId =
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ??
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  }

  // Show the Google button only when a platform-appropriate client ID is configured.
  const googleEnabled =
    Platform.OS === 'ios'
      ? !!process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
      : !!process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

  const [request, response, promptAsync] = Google.useAuthRequest(googleConfig);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync()
        .then(setAppleAvailable)
        .catch(() => setAppleAvailable(false));
    }
  }, []);

  // Handle Google OAuth response
  useEffect(() => {
    if (response?.type === 'success') {
      const params = response.params as any;
      const accessToken = params?.access_token;
      const idToken     = params?.id_token;

      if (accessToken || idToken) {
        setGoogleLoading(true);
        setError(null);
        const credential = idToken
          ? GoogleAuthProvider.credential(idToken, accessToken)
          : GoogleAuthProvider.credential(null, accessToken);

        signInWithCredential(auth, credential)
          .catch((err) => {
            let msg = err.message || 'An unexpected error occurred during Google sign-up.';
            if (msg.includes('auth/account-exists-with-different-credential')) {
              msg = 'An account already exists with this email. Try signing in instead.';
            }
            setError(msg);
          })
          .finally(() => setGoogleLoading(false));
      } else {
        setError('Google sign-up failed: no token received. Please try again.');
      }
    } else if (response?.type === 'error') {
      setError('Google sign-up error: ' + (response.error?.message || 'unknown error'));
    }
  }, [response]);

  const handleSignup = async () => {
    if (!name || !email || !password) return;
    setLoading(true);
    setError(null);
    try { await signUp(email, password, name); }
    catch (e: any) {
      let msg = e.message || 'An unexpected error occurred.';
      if (msg.includes('auth/email-already-in-use')) {
        msg = 'This email address is already registered.';
      } else if (msg.includes('auth/invalid-email')) {
        msg = 'Please enter a valid email address.';
      } else if (msg.includes('auth/weak-password')) {
        msg = 'Password should be at least 6 characters.';
      }
      setError(msg);
    }
    finally { setLoading(false); }
  };

  const handleGoogleSignup = async () => {
    setError(null);
    try { await promptAsync(); }
    catch (e: any) {
      setError(e.message || 'An unexpected error occurred during Google sign-up.');
    }
  };

  const handleAppleSignup = async () => {
    setAppleLoading(true);
    setError(null);
    try {
      const rawNonce = Math.random().toString(36).substring(2, 15)
                     + Math.random().toString(36).substring(2, 15);

      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

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

      const user = await loginWithApple(appleCredential.identityToken, rawNonce);

      // Set display name from Apple if available
      const fullName = appleCredential.fullName;
      if (fullName && user) {
        const displayName = [fullName.givenName, fullName.familyName]
          .filter(Boolean).join(' ');
        if (displayName) await updateProfile(user, { displayName });
      }
    } catch (e: any) {
      if (e.message?.includes('Sign-In cancelled') || e.code === 'ERR_REQUEST_CANCELED') return;
      setError(e.message || 'An unexpected error occurred during Apple sign-up.');
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
        <View style={s.header}>
          <Text style={[s.brand, { color: t.accent, ...(t.textGlow(t.accent) as any) }]}>
            MoveTac
          </Text>
          <Text style={[s.title, { color: t.textPrimary, ...(t.textGlow(t.primary) as any) }]}>
            Join the Game
          </Text>
          <Text style={[s.subtitle, { color: t.textSecondary }]}>Create an account to start playing</Text>
        </View>

        <View style={s.content}>
          {error && (
            <View style={[s.errorContainer, { backgroundColor: t.card, borderColor: t.lose }]}>
              <Text style={[s.errorText, { color: t.lose, fontWeight: '700' }]}>{error}</Text>
            </View>
          )}

          {[
            { field: 'name',     label: 'FULL NAME', value: name,     setter: setName,     extra: {} },
            { field: 'email',    label: 'EMAIL',     value: email,    setter: setEmail,    extra: { autoCapitalize: 'none' as const, keyboardType: 'email-address' as const } },
            { field: 'password', label: 'PASSWORD',  value: password, setter: setPassword, extra: { secureTextEntry: true } },
          ].map(({ field, label, value, setter, extra }) => (
            <View key={field} style={s.inputGroup}>
              <Text style={[s.label, { color: t.textSecondary }]}>{label}</Text>
              <TextInput
                style={inputStyle(field)}
                placeholder={field === 'password' ? '••••••••' : `Enter your ${field}`}
                placeholderTextColor={t.textSecondary}
                value={value}
                onChangeText={setter}
                onFocus={() => setFocusedField(field)}
                onBlur={() => setFocusedField(null)}
                {...extra}
              />
            </View>
          ))}

          <View style={s.footer}>
            {/* Email/password sign up */}
            {loading ? (
              <View style={[s.loadingWrap, { borderColor: t.border }]}>
                <ActivityIndicator color={t.accent} />
              </View>
            ) : (
              <NeonButton title="CREATE ACCOUNT" onPress={handleSignup} />
            )}

            {/* Divider */}
            <View style={s.dividerRow}>
              <View style={[s.dividerLine, { backgroundColor: t.border }]} />
              <Text style={[s.dividerText, { color: t.textSecondary }]}>or</Text>
              <View style={[s.dividerLine, { backgroundColor: t.border }]} />
            </View>

            {/* Google sign up */}
            {googleEnabled && (
              googleLoading ? (
                <View style={[s.loadingWrap, { borderColor: t.border }]}>
                  <ActivityIndicator color={t.primary} />
                </View>
              ) : (
                <Pressable
                  onPress={handleGoogleSignup}
                  style={({ pressed }) => [
                    s.socialBtn,
                    { backgroundColor: t.card, borderColor: t.border, borderWidth: isCalm ? 0.8 : 1.5 },
                    isCalm ? (t.shadowElevation('sm') as any) : (t.glow(t.border, 8) as any),
                    pressed && s.socialBtnPressed,
                  ]}
                >
                  <View style={s.socialBtnContent}>
                    <Ionicons name="logo-google" size={18} color={t.textPrimary} style={s.socialIcon} />
                    <Text style={[s.socialBtnText, { color: t.textPrimary, fontWeight: '600' }]}>
                      Continue with Google
                    </Text>
                  </View>
                </Pressable>
              )
            )}

            {/* Apple sign up — iOS only */}
            {Platform.OS === 'ios' && appleAvailable && (
              appleLoading ? (
                <View style={[s.loadingWrap, { borderColor: t.border }]}>
                  <ActivityIndicator color={t.primary} />
                </View>
              ) : (
                <Pressable
                  onPress={handleAppleSignup}
                  style={({ pressed }) => [
                    s.socialBtn,
                    { backgroundColor: t.card, borderColor: t.border, borderWidth: isCalm ? 0.8 : 1.5 },
                    isCalm ? (t.shadowElevation('sm') as any) : (t.glow(t.border, 8) as any),
                    pressed && s.socialBtnPressed,
                  ]}
                >
                  <View style={s.socialBtnContent}>
                    <Ionicons name="logo-apple" size={18} color={t.textPrimary} style={s.socialIcon} />
                    <Text style={[s.socialBtnText, { color: t.textPrimary, fontWeight: '600' }]}>
                      Continue with Apple
                    </Text>
                  </View>
                </Pressable>
              )
            )}

            <Pressable onPress={() => navigation.navigate('Login')} style={s.link}>
              <Text style={[s.linkText, { color: t.textSecondary }]}>
                Already have an account?{'  '}
                <Text style={[s.linkHighlight, { color: t.primary, ...(t.textGlow(t.primary) as any) }]}>
                  Login
                </Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  flex:    { flex: 1 },
  header:  { marginTop: Spacing.xl, marginBottom: Spacing.lg },
  content: { gap: Spacing.sm },
  footer:  { marginTop: Spacing.lg, gap: Spacing.md },

  brand:    { fontSize: 11, fontWeight: '900', letterSpacing: 6, marginBottom: 16 },
  title:    { fontSize: 34, fontWeight: '900', marginBottom: 6, letterSpacing: 0.5 },
  subtitle: { fontSize: 14 },

  inputGroup: { gap: 8 },
  label:  { fontSize: 10, fontWeight: '900', letterSpacing: 3 },
  input:  { borderRadius: 14, borderWidth: 1, padding: Spacing.md, fontSize: 15 },

  loadingWrap: { height: 52, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderRadius: 14 },
  link:        { alignItems: 'center', paddingVertical: 4 },
  linkText:    { fontSize: 14 },
  linkHighlight: { fontWeight: '900' },
  errorContainer: { padding: Spacing.md, borderRadius: 14, borderWidth: 1, marginBottom: Spacing.xs },
  errorText:      { fontSize: 13, lineHeight: 18 },

  dividerRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontWeight: '600' },

  socialBtn: {
    borderRadius: 12,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialBtnPressed: { transform: [{ scale: 0.97 }], opacity: 0.85 },
  socialBtnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  socialIcon:    { marginRight: 10 },
  socialBtnText: { fontSize: 15, fontFamily: Typography.fontFamily, letterSpacing: 0.3 },
});
