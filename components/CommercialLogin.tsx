import React, { useId, useState } from 'react';
import { Platform, PointerEvent as NativePointerEvent, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCommercialAuth } from '../hooks/useCommercialAuth';
import { useAppTheme } from '../hooks/useAppTheme';
import { canSubmitCommercialLogin, commercialPasswordFeedback } from '../utils/commercialPasswordFeedback';
import { useMomentaryPasswordReveal } from '../hooks/useMomentaryPasswordReveal';
import { commercialAuthFailureMessage } from '../utils/commercialAuthRejection';

// RN-web filters title from Pressable. A native HTML ancestor supplies the
// inherited browser tooltip without adding a layout box or a focus target.
function PasswordEyeTooltip({ children }: { children: React.ReactNode }) {
  return Platform.OS === 'web'
    ? <span title="Hold to show password" style={{ display: 'contents' }}>{children}</span>
    : <>{children}</>;
}

export function CommercialLogin() {
  const auth = useCommercialAuth();
  const { colors } = useAppTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const passwordHelpId = useId();
  const passwordFeedback = commercialPasswordFeedback(password.length);
  const canSubmit = canSubmitCommercialLogin(email, password.length, busy);
  const reveal = useMomentaryPasswordReveal(password.length === 0, busy, auth.status);
  const run = async (create: boolean) => {
    reveal.mask();
    setBusy(true); setError('');
    try { await auth.signIn(email.trim(), password, create); setPassword(''); }
    catch (failure) { setError(commercialAuthFailureMessage(failure)); }
    finally { setBusy(false); }
  };
  const styles = StyleSheet.create({ panel: { padding: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.gray[800], backgroundColor: colors.panel, gap: 12 },
    title: { color: colors.text, fontSize: 20, fontWeight: '700' }, text: { color: colors.text, fontSize: 15, lineHeight: 22 },
    input: { borderWidth: 1, borderColor: colors.gray[700], backgroundColor: colors.gray[800], borderRadius: 8, padding: 12, color: colors.text, fontSize: 16 },
    passwordInput: { paddingRight: 56, minHeight: 48 },
    eye: { position: 'absolute', right: 2, top: 2, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    button: { borderWidth: 1, borderColor: colors.accent, borderRadius: 8, padding: 12, minHeight: 46 },
    primary: { backgroundColor: colors.primary, borderColor: colors.primary },
    primaryText: { color: '#ffffff', fontWeight: '700' },
    disabled: { opacity: 0.5 },
    passwordHelp: { color: passwordFeedback.state === 'met' ? colors.success : passwordFeedback.state === 'unmet' ? colors.danger : colors.mutedText, fontSize: 13, lineHeight: 18 },
    error: { color: colors.danger, fontSize: 15, lineHeight: 22 } });
  return <View style={styles.panel}>
    <Text style={styles.title}>Account login</Text>
    {auth.status === 'unavailable' ? <Text style={styles.text}>Account service is unavailable in this build. Your plan and credits cannot be loaded.</Text>
      : auth.status === 'loading' ? <Text style={styles.text}>Checking your session…</Text>
      : auth.status === 'signed-in' ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Sign out" style={styles.button} onPress={async () => {
        setError(''); try { await auth.signOut(); setPassword(''); } catch { setError('Local account data cleared. Server sign-out could not be confirmed; retry when connected.'); }
      }}><Text style={styles.text}>Sign out</Text></TouchableOpacity>
      : <>
        <Text style={styles.text}>Sign in to load your shop, subscription and credits. Your login email is separate from display profile details.</Text>
        <TextInput accessibilityLabel="Login email" placeholder="Login email" placeholderTextColor={colors.gray[500]} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} style={styles.input} />
        <View style={{ gap: 6 }}>
          <View>
            <TextInput accessibilityLabel="Account password" accessibilityHint={passwordFeedback.text} {...(Platform.OS === 'web' ? { 'aria-describedby': passwordHelpId } : {})} placeholder="Password" placeholderTextColor={colors.gray[500]} secureTextEntry={!reveal.revealed} value={password} onChangeText={value => { if (!value) reveal.mask(); setPassword(value); }} style={[styles.input, styles.passwordInput]} />
            <PasswordEyeTooltip><Pressable accessibilityRole="button" accessibilityLabel="Hold to show password" accessibilityHint="Hold to reveal. Release to hide." disabled={reveal.disabled}
              onPressIn={Platform.OS === 'web' ? undefined : reveal.start} onPressOut={reveal.mask} onPress={reveal.mask}
              onBlur={reveal.mask} onHoverOut={reveal.mask} onTouchCancel={reveal.mask}
              {...(Platform.OS === 'web' ? {
                onPointerDown: (event: NativePointerEvent) => { if (event.nativeEvent.button === 0 && event.nativeEvent.isPrimary !== false) reveal.start(); },
                onPointerMove: (event: NativePointerEvent) => {
                  const bounds = (event.currentTarget as unknown as HTMLElement).getBoundingClientRect();
                  const { clientX, clientY } = event.nativeEvent;
                  if (clientX < bounds.left || clientX > bounds.right || clientY < bounds.top || clientY > bounds.bottom) reveal.mask();
                },
                onPointerUp: reveal.mask, onPointerCancel: reveal.mask, onPointerLeave: reveal.mask,
                onKeyDown: (event: React.KeyboardEvent) => { if (!event.repeat && (event.key === ' ' || event.key === 'Enter')) reveal.start(); },
                onKeyUp: reveal.mask,
              } : {})}
              style={[styles.eye, reveal.disabled && styles.disabled]}>
              <Ionicons name={reveal.revealed ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.accent} />
            </Pressable></PasswordEyeTooltip>
          </View>
          <Text nativeID={passwordHelpId} role="status" accessibilityLiveRegion="polite" style={styles.passwordHelp}>{passwordFeedback.text}</Text>
        </View>
        <View style={styles.row}>{[false, true].map(create => <TouchableOpacity key={String(create)} accessibilityRole="button" accessibilityLabel={create ? 'Create account' : 'Sign in'} disabled={!canSubmit} style={[styles.button, !create && styles.primary, !canSubmit && styles.disabled]} onPress={() => run(create)}>
          <Text style={[styles.text, !create && styles.primaryText]}>{busy ? 'Please wait…' : create ? 'Create account' : 'Sign in'}</Text>
        </TouchableOpacity>)}</View>
        <Text style={styles.text}>Password reset is currently unavailable.</Text>
      </>}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
  </View>;
}
