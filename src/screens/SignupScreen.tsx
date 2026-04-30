import React, { useState } from 'react';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  StyleSheet, Text, TextInput, View, Pressable,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import NeonButton from '../components/NeonButton';
import { useAppTheme } from '../context/ThemeContext';
import { Spacing } from '../../constants/themes';
import { signUp } from '../services/authService';

export default function SignupScreen({ navigation }: any) {
  const t = useAppTheme();
  const isCalm = t.mode === 'calm';

  const [name,         setName]         = useState('');
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [loading,      setLoading]      = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSignup = async () => {
    if (!name || !email || !password) return;
    setLoading(true);
    try { await signUp(email, password, name); }
    catch (e: any) { Alert.alert('Signup Failed', e.message); }
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
        <View style={s.header}>
          <Text style={[s.brand, { color: t.accent, ...(t.textGlow(t.accent) as any) }]}>
            SPHERIA
          </Text>
          <Text style={[s.title, { color: t.textPrimary, ...(t.textGlow(t.primary) as any) }]}>
            Join the Game
          </Text>
          <Text style={[s.subtitle, { color: t.textSecondary }]}>Create an account to start playing</Text>
        </View>

        <View style={s.content}>
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
            {loading ? (
              <View style={[s.loadingWrap, { borderColor: t.border }]}>
                <ActivityIndicator color={t.accent} />
              </View>
            ) : (
              <NeonButton title="CREATE ACCOUNT" onPress={handleSignup} />
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

  loadingWrap:  { height: 52, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderRadius: 14 },
  link:         { alignItems: 'center', paddingVertical: 4 },
  linkText:     { fontSize: 14 },
  linkHighlight: { fontWeight: '900' },
});
