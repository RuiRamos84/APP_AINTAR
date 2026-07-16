import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { COLORS } from '@/shared/theme/colors';

const LoadingScreen = () => (
  <View style={styles.container}>
    <Text style={styles.brand}>AINTAR</Text>
    <ActivityIndicator size="large" color={COLORS.primary} style={styles.spinner} />
    <Text style={styles.text}>A carregar...</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    gap: 8,
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 3,
    marginBottom: 16,
  },
  spinner: { marginBottom: 4 },
  text: { color: COLORS.textSecondary, fontSize: 14 },
});

export default LoadingScreen;
