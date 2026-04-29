// ─────────────────────────────────────────────
//  SignupScreen.tsx — Retro Neon Arcade Signup
// ─────────────────────────────────────────────

import React, { useState } from 'react';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  StyleSheet, Text, TextInput, View, Pressable,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import NeonButton from '../components/NeonButton';
import { Colors, Spacing, textGlow, glow } from '../../constants/theme';
import { signUp } from '../services/authService';

export default function SignupScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSignup = async () => {
    if (!name || !email || !password) return;
    setLoading(true);
    try {
      await signUp(email, password, name);
    } catch (e: any) {
      Alert.alert('Signup Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field: string) => [
    s.input,
    focusedField === field && s.inputFocused,
  ];

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <View style={s.header}>
          <Text style={s.brand}>SPHERIA</Text>
          <Text style={s.title}>Join the Game</Text>
          <Text style={s.subtitle}>Create an account to start playing</Text>
        </View>

        <View style={s.content}>
          <View style={s.inputGroup}>
            <Text style={s.label}>FULL NAME</Text>
            <TextInput
              style={inputStyle('name')}
              placeholder="Enter your name"
              placeholderTextColor={Colors.textSecondary}
              value={name}
              onChangeText={setName}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>EMAIL</Text>
            <TextInput
              style={inputStyle('email')}
              placeholder="Enter your email"
              placeholderTextColor={Colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>PASSWORD</Text>
            <TextInput
              style={inputStyle('password')}
              placeholder="••••••••"
              placeholderTextColor={Colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          <View style={s.footer}>
            {loading ? (
              <View style={s.loadingWrap}>
                <ActivityIndicator color={Colors.neonPink} />
              </View>
            ) : (
              <NeonButton title="CREATE ACCOUNT" onPress={handleSignup} />
            )}

            <Pressable onPress={() => navigation.navigate('Login')} style={s.link}>
              <Text style={s.linkText}>
                Already have an account?{'  '}
                <Text style={s.linkHighlight}>Login</Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  header: { marginTop: Spacing.xl, marginBottom: Spacing.lg },
  content: { gap: Spacing.sm },
  footer: { marginTop: Spacing.lg, gap: Spacing.md },

  brand: {
    fontSize: 11, fontWeight: '900', color: Colors.neonPink,
    letterSpacing: 6, marginBottom: 16,
    ...textGlow(Colors.neonPink),
  },
  title: {
    fontSize: 34, fontWeight: '900', color: Colors.textPrimary,
    marginBottom: 6, letterSpacing: 0.5,
    ...textGlow(Colors.neonPurple),
  },
  subtitle: { fontSize: 14, color: Colors.textSecondary },

  inputGroup: { gap: 8 },
  label: {
    fontSize: 10, fontWeight: '900', color: Colors.textSecondary,
    letterSpacing: 3,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, color: Colors.textPrimary, fontSize: 15,
  },
  inputFocused: {
    borderColor: Colors.neonPink,
    ...(glow(Colors.neonPink, 8) as any),
  },

  loadingWrap: {
    height: 52, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border, borderRadius: 14,
  },
  link: { alignItems: 'center', paddingVertical: 4 },
  linkText: { color: Colors.textSecondary, fontSize: 14 },
  linkHighlight: {
    color: Colors.neonPurple, fontWeight: '900',
    ...textGlow(Colors.neonPurple),
  },
});
