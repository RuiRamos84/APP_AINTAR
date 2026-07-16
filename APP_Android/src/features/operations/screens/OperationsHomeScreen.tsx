import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OperationsStackParamList } from '@/core/navigation/types';
import useAuthStore from '@/features/auth/store/authStore';
import { COLORS, RADIUS, SPACING } from '@/shared/theme/colors';

type Nav = NativeStackNavigationProp<OperationsStackParamList>;

interface MenuItemProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description: string;
  iconBg: string;
  iconColor: string;
  onPress: () => void;
}

const MenuItem = ({ icon, title, description, iconBg, iconColor, onPress }: MenuItemProps) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
    <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
      <MaterialIcons name={icon} size={24} color={iconColor} />
    </View>
    <View style={styles.cardText}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDesc}>{description}</Text>
    </View>
    <MaterialIcons name="chevron-right" size={20} color={COLORS.textDisabled} />
  </TouchableOpacity>
);

const OperationsHomeScreen = () => {
  const navigation = useNavigation<Nav>();
  const { user } = useAuthStore();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeLabel}>Operação</Text>
          {user?.name && (
            <Text style={styles.welcomeName}>Olá, {user.name.split(' ')[0]}</Text>
          )}
        </View>

        <MenuItem
          icon="task-alt"
          title="As Minhas Tarefas"
          description="Criar, atribuir e acompanhar tarefas"
          iconBg={COLORS.primarySurface}
          iconColor={COLORS.primary}
          onPress={() => navigation.navigate('TasksManagement')}
        />
        <MenuItem
          icon="dashboard"
          title="Controlo Operacional"
          description="Pesquisar e validar operações"
          iconBg={COLORS.successSurface}
          iconColor={COLORS.success}
          onPress={() => navigation.navigate('OperationControl')}
        />
        <MenuItem
          icon="route"
          title="Gestão de Voltas"
          description="Programação de tarefas operacionais recorrentes"
          iconBg="#EDE7F6"
          iconColor="#5E35B1"
          onPress={() => navigation.navigate('Voltas')}
        />
        <MenuItem
          icon="supervised-user-circle"
          title="Supervisão de Operações"
          description="Dashboard, equipa e analytics operacionais"
          iconBg="#E3F2FD"
          iconColor="#1565c0"
          onPress={() => navigation.navigate('Supervisor')}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  welcomeSection: {
    marginBottom: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  welcomeLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  welcomeName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  cardDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});

export default OperationsHomeScreen;
