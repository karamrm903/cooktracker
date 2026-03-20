import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Share,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import type { Colors } from '../context/ThemeContext';

type RootStackParamList = {
  Referral: undefined;
  SocialProof: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Referral'>;
};

const MY_REFERRAL_CODE = 'CCT7421';

export default function ReferralScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [copied, setCopied] = useState(false);
  const [referralInput, setReferralInput] = useState('');
  const [applied, setApplied] = useState(false);

  function handleCopy() {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    try {
      await Share.share({
        message: `Join CookTrack with my referral code ${MY_REFERRAL_CODE} and we both get 5% off! 🍳`,
      });
    } catch (_) {}
  }

  function handleApply() {
    if (referralInput.trim().length > 0) setApplied(true);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

      {/* Back */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Invite friends &{'\n'}unlock discounts</Text>
          <Text style={styles.subtitle}>
            For every friend who signs up with your code, you both receive 5% off — and discounts stack.
          </Text>
        </View>

        {/* Section 1: Your code */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>YOUR REFERRAL CODE</Text>
          <View style={styles.codeCard}>
            <View style={styles.codeBlock}>
              <Text style={styles.codeText}>{MY_REFERRAL_CODE}</Text>
            </View>
            <View style={styles.codeActions}>
              <TouchableOpacity
                style={[styles.codeBtn, copied && styles.codeBtnSuccess]}
                onPress={handleCopy}
                activeOpacity={0.8}
              >
                <Text style={[styles.codeBtnText, copied && styles.codeBtnTextSuccess]}>
                  {copied ? '✓ Copied!' : '⎘  Copy Code'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.codeBtn, styles.codeBtnDark]} onPress={handleShare} activeOpacity={0.85}>
                <Text style={styles.codeBtnTextDark}>↑  Share Code</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.rewardInfo}>
            <Text style={styles.rewardEmoji}>🎁</Text>
            <Text style={styles.rewardText}>
              Each successful referral gives you <Text style={styles.bold}>5% off</Text> your subscription. Discounts stack with no limit.
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Have a referral code?</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Section 2: Enter code */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ENTER REFERRAL CODE</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, applied && styles.inputSuccess]}
              placeholder="Enter referral code"
              placeholderTextColor={colors.placeholder}
              value={referralInput}
              onChangeText={(t) => { setReferralInput(t); setApplied(false); }}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.applyBtn, referralInput.trim().length === 0 && styles.applyBtnDisabled]}
              onPress={handleApply}
              disabled={referralInput.trim().length === 0}
              activeOpacity={0.85}
            >
              <Text style={styles.applyBtnText}>{applied ? '✓' : 'Apply'}</Text>
            </TouchableOpacity>
          </View>
          {applied && (
            <Text style={styles.appliedMsg}>🎉 Code applied! You'll both receive 5% off.</Text>
          )}
        </View>

      </ScrollView>

      {/* CTA */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={() => navigation.navigate('SocialProof')}
          activeOpacity={0.85}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },

    topBar: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
    backBtn: {
      width: 38,
      height: 38,
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
    backArrow: { fontSize: 17, color: colors.text, lineHeight: 21 },

    scroll: { paddingHorizontal: 24, paddingBottom: 16 },

    header: { paddingTop: 16, paddingBottom: 28, gap: 8 },
    title: {
      fontSize: 30,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.4,
      lineHeight: 38,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textMuted,
      lineHeight: 24,
      fontWeight: '400',
    },

    section: { gap: 12, marginBottom: 8 },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textDisabled,
      letterSpacing: 1,
    },

    codeCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      gap: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    codeBlock: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
    },
    codeText: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: 6,
    },
    codeActions: { flexDirection: 'row', gap: 10 },
    codeBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 999,
      alignItems: 'center',
      backgroundColor: colors.surfaceAlt,
    },
    codeBtnSuccess: { backgroundColor: colors.rolloverGreenBg },
    codeBtnDark: { backgroundColor: colors.btnPrimary },
    codeBtnText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    codeBtnTextSuccess: { color: colors.rolloverGreenText },
    codeBtnTextDark: { fontSize: 14, fontWeight: '600', color: colors.btnPrimaryText },

    rewardInfo: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
      backgroundColor: colors.tintYellow,
      borderRadius: 14,
      padding: 14,
    },
    rewardEmoji: { fontSize: 18, marginTop: 1 },
    rewardText: { flex: 1, fontSize: 13, color: colors.textMuted, lineHeight: 20 },
    bold: { fontWeight: '700', color: colors.text },

    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginVertical: 20,
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    dividerText: { fontSize: 13, color: colors.textDisabled, fontWeight: '500' },

    inputRow: { flexDirection: 'row', gap: 10 },
    input: {
      flex: 1,
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
    inputSuccess: { borderWidth: 1.5, borderColor: colors.secondary },
    applyBtn: {
      backgroundColor: colors.btnPrimary,
      paddingHorizontal: 20,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    applyBtnDisabled: { backgroundColor: colors.btnDisabled },
    applyBtnText: { fontSize: 15, fontWeight: '700', color: colors.btnPrimaryText },
    appliedMsg: { fontSize: 13, color: colors.rolloverGreenText, fontWeight: '500', marginTop: 4 },

    bottomBar: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8 },
    continueBtn: {
      backgroundColor: colors.btnPrimary,
      paddingVertical: 17,
      borderRadius: 999,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 6,
    },
    continueBtnText: { fontSize: 17, fontWeight: '700', color: colors.btnPrimaryText, letterSpacing: 0.2 },
  });
}
