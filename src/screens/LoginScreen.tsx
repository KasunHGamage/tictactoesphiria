import React, { useState } from 'react';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  StyleSheet, Text, TextInput, View, Pressable,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import NeonButton from '../components/NeonButton';
import { useAppTheme } from '../context/ThemeContext';
import { Spacing } from '../../constants/themes';
import { login } from '../services/authService';

export default function LoginScreen({ navigation }: any) {
  const t = useAppTheme();
  const isCalm = t.mode === 'calm';

  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [loading,      setLoading]      = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    try { await login(email, password); }
    catch (e: any) { Alert.alert('Login Failed', e.message); }
    finally { setLoading(false); }
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
            SPHERIA
          </Text>
          <Text style={[s.title, { color: t.textPrimary, ...(t.textGlow(t.primary) as any) }]}>
            Welcome Back
          </Text>
          <Text style={[s.subtitle, { color: t.textSecondary }]}>Login to play with friends</Text>
        </View>

        <View style={s.content}>
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
          </View>

          <View style={s.footer}>
            {loading ? (
              <View style={[s.loadingWrap, { borderColor: t.border }]}>
                <ActivityIndicator color={t.primary} />
              </View>
            ) : (
              <NeonButton title="LOGIN" onPress={handleLogin} />
            )}

            <Pressable onPress={() => navigation.navigate('Signup')} style={s.link}>
              <Text style={[s.linkText, { color: t.textSecondary }]}>
                Don't have an account?{'  '}
                <Text style={[s.linkHighlight, { color: t.primary, ...(t.textGlow(t.primary) as any) }]}>
                  Sign Up
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
});
