import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import type { Colors } from '../context/ThemeContext';

type RootStackParamList = {
  Welcome: undefined;
  Onboarding: undefined;
  Login: undefined;
  MainTabs: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  function handleSignIn() {
  navigation.replace('MainTabs');
}

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back arrow */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to continue tracking your meals</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.placeholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  placeholderTextColor={colors.placeholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!passwordVisible}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setPasswordVisible(!passwordVisible)}
                  activeOpacity={0.7}
                  style={styles.eyeBtn}
                >
                  <Text style={styles.eyeText}>{passwordVisible ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.forgotWrapper} activeOpacity={0.7}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* Sign In button */}
            <TouchableOpacity
  style={styles.signInBtn}
  activeOpacity={0.85}
  onPress={handleSignIn}
>
  <Text style={styles.signInBtnText}>Sign In</Text>
</TouchableOpacity>
            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Apple Sign In */}
            <TouchableOpacity style={styles.socialBtn} activeOpacity={0.85}>
              <Text style={styles.appleLogo}></Text>
              <Text style={styles.socialBtnText}>Continue with Apple</Text>
            </TouchableOpacity>

            {/* Google Sign In */}
            <TouchableOpacity style={[styles.socialBtn, styles.googleBtn]} activeOpacity={0.85}>
              <Text style={styles.googleLogo}>G</Text>
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom sign up link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Don't have an account?{' '}
              <Text style={styles.footerLink} onPress={() => navigation.navigate('Onboarding')}>
                Sign Up
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingBottom: 32,
    },

    backBtn: {
      marginTop: 8,
      width: 40,
      height: 40,
      borderRadius: 999,
      backgroundColor: colors.backBtnBg,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.07,
      shadowRadius: 4,
      elevation: 2,
    },
    backArrow: {
      fontSize: 18,
      color: colors.text,
      lineHeight: 22,
    },

    header: {
      marginTop: 32,
      marginBottom: 36,
      gap: 8,
    },
    title: {
      fontSize: 32,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textMuted,
      fontWeight: '400',
      lineHeight: 22,
    },

    form: {
      gap: 20,
    },
    inputGroup: {
      gap: 8,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      letterSpacing: 0.2,
    },
    input: {
      backgroundColor: colors.inputBg,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 15,
      fontSize: 15,
      color: colors.text,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    passwordWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      borderRadius: 14,
      paddingHorizontal: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    passwordInput: {
      flex: 1,
      paddingVertical: 15,
      fontSize: 15,
      color: colors.text,
    },
    eyeBtn: {
      paddingLeft: 12,
    },
    eyeText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
    },
    forgotWrapper: {
      alignSelf: 'flex-end',
    },
    forgotText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },

    signInBtn: {
      backgroundColor: colors.btnPrimary,
      paddingVertical: 17,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 6,
    },
    signInBtnText: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.btnPrimaryText,
      letterSpacing: 0.2,
    },

    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginVertical: 4,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    dividerText: {
      fontSize: 13,
      color: colors.textDisabled,
      fontWeight: '500',
    },

    socialBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: colors.appleBtn,
      paddingVertical: 15,
      borderRadius: 999,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 3,
    },
    appleLogo: {
      fontSize: 18,
      color: colors.appleBtnText,
      lineHeight: 22,
    },
    socialBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.appleBtnText,
      letterSpacing: 0.1,
    },
    googleBtn: {
      backgroundColor: colors.googleBtn,
      shadowOpacity: 0.07,
    },
    googleLogo: {
      fontSize: 16,
      fontWeight: '700',
      color: '#4285F4',
    },
    googleBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.googleBtnText,
      letterSpacing: 0.1,
    },

    footer: {
      marginTop: 'auto',
      paddingTop: 32,
      alignItems: 'center',
    },
    footerText: {
      fontSize: 14,
      color: colors.textMuted,
      fontWeight: '400',
    },
    footerLink: {
      color: colors.text,
      fontWeight: '700',
    },
  });
}
