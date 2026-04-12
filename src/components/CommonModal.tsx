import React, { useEffect, useRef } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { colors } from "../styles/colors";

export type CommonModalVariant = 'info' | 'success' | 'warning' | 'error';

export type CommonModalProps = {
  visible: boolean;
  title: string;
  message: string;
  variant?: CommonModalVariant;
  onClose: () => void;
};

const CommonAlertModal: React.FC<CommonModalProps> = ({
  visible,
  title,
  message,
  variant = 'info',
  onClose,
}) => {
  const scaleValue = useRef(new Animated.Value(0.9)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(scaleValue, {
          toValue: 1,
          friction: 6,
          tension: 60,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.timing(opacityValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        scaleValue.setValue(0.9);
      });
    }
  }, [visible]);

  const getVariantStyles = () => {
    switch (variant) {
      case 'error': return { icon: 'close-circle', color: colors.error };
      case 'warning': return { icon: 'warning', color: colors.warning };
      case 'success': return { icon: 'checkmark-circle', color: colors.success };
      case 'info':
      default: return { icon: 'information-circle', color: colors.btnPrimary };
    }
  };

  const { icon, color } = getVariantStyles();

  return (
    <Modal
      transparent={true}
      animationType="none"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: opacityValue }]} />
        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: opacityValue,
              transform: [{ scale: scaleValue }]
            }
          ]}
        >
          <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon as any} size={36} color={color} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: color }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Got it</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  modalContainer: {
    width: '85%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: 24,
    alignItems: "center",
    padding: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text || '#1C1C1E',
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  message: {
    fontSize: 15,
    color: colors.textMuted || '#8E8E93',
    marginBottom: 32,
    textAlign: "center",
    lineHeight: 22,
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.btnPrimaryText || '#FFFFFF',
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});

export default CommonAlertModal;
