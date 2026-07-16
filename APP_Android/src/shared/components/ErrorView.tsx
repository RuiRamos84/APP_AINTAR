import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';

interface Props {
  message?: string;
  onRetry?: () => void;
}

const ErrorView = ({ message = 'Ocorreu um erro inesperado.', onRetry }: Props) => (
  <View style={styles.container}>
    <MaterialIcons name="error-outline" size={48} color="#D32F2F" />
    <Text style={styles.message}>{message}</Text>
    {onRetry && (
      <Button mode="outlined" onPress={onRetry} style={styles.button}>
        Tentar novamente
      </Button>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  message: { color: '#D32F2F', textAlign: 'center', marginTop: 12 },
  button: { marginTop: 16 },
});

export default ErrorView;
