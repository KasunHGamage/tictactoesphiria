// ─────────────────────────────────────────────
//  SignupScreen.tsx — User Registration
// ─────────────────────────────────────────────

import React, { useState } from 'react';
import ScreenWrapper from '../components/ScreenWrapper';
import { 
  StyleSheet, Text, TextInput, Pressable, View, 
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform 
} from 'react-native';
import { signUp } from '../services/authService';

const C = {
  bg: '#0D0D1A', card: '#1C1C3A', border: '#2A2A5A',
  accent: '#7C5CFC', textPrimary: '#F0F0FF', textSecondary: '#8888AA',
};

export default function SignupScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <View style={s.header}>
          <Text style={s.title}>Join the Game</Text>
          <Text style={s.subtitle}>Create an account to start playing</Text>
        </View>

        <View style={s.content}>
          <View style={s.inputGroup}>
            <Text style={s.label}>FULL NAME</Text>
            <TextInput 
              style={s.input} 
              placeholder="Enter your name" 
              placeholderTextColor={C.textSecondary}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>EMAIL</Text>
            <TextInput 
              style={s.input} 
              placeholder="Enter your email" 
              placeholderTextColor={C.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>PASSWORD</Text>
            <TextInput 
              style={s.input} 
              placeholder="••••••••" 
              placeholderTextColor={C.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View style={s.footer}>
            <Pressable 
              style={[s.btn, loading && s.btnDisabled]} 
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Create Account</Text>}
            </Pressable>

            <Pressable onPress={() => navigation.navigate('Login')} style={s.link}>
              <Text style={s.linkText}>Already have an account? <Text style={s.linkHighlight}>Login</Text></Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  header: { marginTop: 40, marginBottom: 20 },
  content: { marginTop: 20, gap: 20 },
  footer: { marginTop: 20 },
  title: { fontSize: 32, fontWeight: '900', color: C.accent, marginBottom: 8, letterSpacing: 1 },
  subtitle: { fontSize: 16, color: C.textSecondary, marginBottom: 20 },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '800', color: C.textSecondary, marginBottom: 8, letterSpacing: 2 },
  input: { 
    backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, 
    padding: 16, color: C.textPrimary, fontSize: 16 
  },
  btn: { 
    backgroundColor: C.accent, borderRadius: 14, padding: 18, alignItems: 'center', 
    shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 10 
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { color: C.textSecondary, fontSize: 14 },
  linkHighlight: { color: C.accent, fontWeight: '800' },
});
