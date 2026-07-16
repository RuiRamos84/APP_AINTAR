import React, { useState, Suspense } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Menu, Divider } from 'react-native-paper';
import useAuthStore from '@/features/auth/store/authStore';
import authService from '@/services/auth/authService';

import RhHomeScreen from '@/features/rh/screens/RhHomeScreen';
import RhColaboradorScreen from '@/features/rh/screens/RhColaboradorScreen';
import PontoScreen from '@/features/rh/screens/PontoScreen';
import FeriasScreen from '@/features/rh/screens/FeriasScreen';
import ParticipacaoScreen from '@/features/rh/screens/ParticipacaoScreen';
import HorariosScreen from '@/features/rh/screens/HorariosScreen';
import PiqueteScreen from '@/features/rh/screens/PiqueteScreen';
import MapaFeriasScreen from '@/features/rh/screens/MapaFeriasScreen';
import AvalScreen from '@/features/aval/screens/AvalScreen';
import AvalAnalyticsScreen from '@/features/aval/screens/AvalAnalyticsScreen';
// Carregados só quando o utilizador entra mesmo nestes ecrãs — ambos puxam
// o @vladmandic/face-api + TensorFlow.js (biblioteca pesada, com efeitos
// secundários de registo de backend ao ser importada), que de outra forma
// arrancaria logo no boot da app por causa desta importação estática, ainda
// que o utilizador nunca chegue a usar reconhecimento facial nessa sessão.
const FaceEnrollScreen = React.lazy(() => import('@/features/rh/screens/FaceEnrollScreen'));
const FaceVerifyScreen = React.lazy(() => import('@/features/rh/screens/FaceVerifyScreen'));

const FaceScreenFallback = () => (
  <View style={styles.faceFallback}>
    <ActivityIndicator color="#fff" size="large" />
  </View>
);
const withFaceSuspense = <P extends object>(Comp: React.ComponentType<P>) => (props: P) => (
  <Suspense fallback={<FaceScreenFallback />}>
    <Comp {...props} />
  </Suspense>
);
const FaceEnrollScreenLazy = withFaceSuspense(FaceEnrollScreen);
const FaceVerifyScreenLazy = withFaceSuspense(FaceVerifyScreen);
import RhChefiaScreen from '@/features/rh/screens/RhChefiaScreen';
import GestaoCentralScreen from '@/features/rh/screens/GestaoCentralScreen';
import PontoMapaScreen from '@/features/rh/screens/PontoMapaScreen';
import OperationsHomeScreen from '@/features/operations/screens/OperationsHomeScreen';
import VoltasScreen from '@/features/operations/screens/VoltasScreen';
import OperationControlScreen from '@/features/operations/screens/OperationControlScreen';
import SupervisorScreen from '@/features/operations/screens/SupervisorScreen';
import TasksScreen from '@/features/operations/screens/TasksScreen';

import { COLORS, RADIUS } from '@/shared/theme/colors';

import type {
  RhStackParamList,
  OperationsStackParamList,
  MainTabParamList,
} from './types';

const RhStack = createNativeStackNavigator<RhStackParamList>();
const OperationsStack = createNativeStackNavigator<OperationsStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const Breadcrumb = ({
  parent,
  current,
  onParentPress,
}: {
  parent: string;
  current: string;
  onParentPress: () => void;
}) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
    <TouchableOpacity onPress={onParentPress}>
      <Text style={{ color: COLORS.primary, fontSize: 14 }}>{parent}</Text>
    </TouchableOpacity>
    <MaterialIcons name="chevron-right" size={16} color={COLORS.textDisabled} />
    <Text style={{ color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' }}>
      {current}
    </Text>
  </View>
);

// ─── Profile header button ────────────────────────────────────────────────────

const ProfileHeaderButton = () => {
  const { user, clearUser } = useAuthStore();
  const [visible, setVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const initials = user?.name
    ?.split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase() ?? '?';

  const handleLogout = async () => {
    setVisible(false);
    setLoggingOut(true);
    try { await authService.logout(); } finally { clearUser(); }
  };

  return (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      contentStyle={phb.menu}
      anchor={
        <TouchableOpacity onPress={() => setVisible(true)} style={phb.avatarBtn} activeOpacity={0.75}>
          <View style={phb.avatar}>
            <Text style={phb.avatarText}>{initials}</Text>
          </View>
        </TouchableOpacity>
      }
    >
      {/* user info header */}
      <View style={phb.menuHeader}>
        <View style={phb.menuAvatar}>
          <Text style={phb.menuAvatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={phb.menuName} numberOfLines={1}>{user?.name ?? 'Utilizador'}</Text>
          <Text style={phb.menuSub} numberOfLines={1}>@{user?.username ?? ''}</Text>
        </View>
      </View>
      <Divider />
      <Menu.Item
        onPress={handleLogout}
        title={loggingOut ? 'A sair...' : 'Terminar Sessão'}
        leadingIcon="logout"
        titleStyle={phb.logoutTitle}
        disabled={loggingOut}
      />
    </Menu>
  );
};

const phb = StyleSheet.create({
  avatarBtn: { marginRight: 12 },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  menu: { borderRadius: 12, minWidth: 220 },
  menuHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  menuAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  menuAvatarText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  menuName:  { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  menuSub:   { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  logoutTitle: { color: '#d32f2f', fontWeight: '600' },
});

// ─── Shared header options ────────────────────────────────────────────────────

const headerStyle = {
  backgroundColor: COLORS.surface,
  headerShadowVisible: false,
  headerStyle: {
    backgroundColor: COLORS.surface,
  },
  headerTitleStyle: {
    fontWeight: '700' as const,
    fontSize: 17,
    color: COLORS.textPrimary,
  },
  headerTintColor: COLORS.primary,
  headerRight: () => <ProfileHeaderButton />,
};

const RhNavigator = () => (
  <RhStack.Navigator screenOptions={headerStyle}>
    <RhStack.Screen
      name="RhHome"
      component={RhHomeScreen}
      options={{ title: 'Recursos Humanos' }}
    />
    <RhStack.Screen
      name="RhColaborador"
      component={RhColaboradorScreen}
      options={({ navigation }) => ({
        headerTitle: () => (
          <Breadcrumb
            parent="Recursos Humanos"
            current="Colaborador"
            onParentPress={() => navigation.navigate('RhHome')}
          />
        ),
      })}
    />
    <RhStack.Screen
      name="Ponto"
      component={PontoScreen}
      options={({ navigation }) => ({
        headerTitle: () => (
          <Breadcrumb
            parent="Recursos Humanos"
            current="Registo de Ponto"
            onParentPress={() => navigation.navigate('RhHome')}
          />
        ),
      })}
    />
    <RhStack.Screen
      name="Ferias"
      component={FeriasScreen}
      options={({ navigation }) => ({
        headerTitle: () => (
          <Breadcrumb
            parent="Recursos Humanos"
            current="Férias"
            onParentPress={() => navigation.navigate('RhHome')}
          />
        ),
      })}
    />
    <RhStack.Screen
      name="Participacao"
      component={ParticipacaoScreen}
      options={({ navigation }) => ({
        headerTitle: () => (
          <Breadcrumb
            parent="Recursos Humanos"
            current="Participação"
            onParentPress={() => navigation.navigate('RhHome')}
          />
        ),
      })}
    />
    <RhStack.Screen
      name="Horarios"
      component={HorariosScreen}
      options={({ navigation }) => ({
        headerTitle: () => (
          <Breadcrumb
            parent="Recursos Humanos"
            current="Horários"
            onParentPress={() => navigation.navigate('RhHome')}
          />
        ),
      })}
    />
    <RhStack.Screen
      name="Piquete"
      component={PiqueteScreen}
      options={({ navigation }) => ({
        headerTitle: () => (
          <Breadcrumb
            parent="Recursos Humanos"
            current="Piquete"
            onParentPress={() => navigation.navigate('RhHome')}
          />
        ),
      })}
    />
    <RhStack.Screen
      name="MapaFerias"
      component={MapaFeriasScreen}
      options={({ navigation }) => ({
        headerTitle: () => (
          <Breadcrumb
            parent="Recursos Humanos"
            current="Mapa de Férias"
            onParentPress={() => navigation.navigate('RhHome')}
          />
        ),
      })}
    />
    <RhStack.Screen
      name="Aval"
      component={AvalScreen}
      options={({ navigation }) => ({
        headerTitle: () => (
          <Breadcrumb
            parent="Recursos Humanos"
            current="Avaliação"
            onParentPress={() => navigation.navigate('RhHome')}
          />
        ),
      })}
    />
    <RhStack.Screen
      name="AvalAnalytics"
      component={AvalAnalyticsScreen}
      options={({ navigation }) => ({
        headerTitle: () => (
          <Breadcrumb
            parent="Recursos Humanos"
            current="Análise de Avaliações"
            onParentPress={() => navigation.navigate('RhHome')}
          />
        ),
      })}
    />
    <RhStack.Screen
      name="FaceEnroll"
      component={FaceEnrollScreenLazy}
      options={{ title: 'Registo Facial', headerStyle: { backgroundColor: COLORS.navy }, headerTintColor: '#fff' }}
    />
    <RhStack.Screen
      name="FaceVerify"
      component={FaceVerifyScreenLazy}
      options={{ title: 'Verificação Facial', headerStyle: { backgroundColor: COLORS.navy }, headerTintColor: '#fff' }}
    />
    <RhStack.Screen
      name="RhChefia"
      component={RhChefiaScreen}
      options={({ navigation }) => ({
        headerTitle: () => (
          <Breadcrumb
            parent="Recursos Humanos"
            current="Chefia / Supervisão"
            onParentPress={() => navigation.navigate('RhHome')}
          />
        ),
      })}
    />
    <RhStack.Screen
      name="GestaoCentral"
      component={GestaoCentralScreen}
      options={({ navigation }) => ({
        headerTitle: () => (
          <Breadcrumb
            parent="Chefia / Supervisão"
            current="Gestão Centralizada"
            onParentPress={() => navigation.navigate('RhChefia')}
          />
        ),
      })}
    />
    <RhStack.Screen
      name="PontoMapa"
      component={PontoMapaScreen}
      options={({ navigation }) => ({
        headerTitle: () => (
          <Breadcrumb
            parent="Chefia / Supervisão"
            current="Mapa de Ponto"
            onParentPress={() => navigation.navigate('RhChefia')}
          />
        ),
      })}
    />
  </RhStack.Navigator>
);

const OperationsNavigator = () => (
  <OperationsStack.Navigator screenOptions={headerStyle}>
    <OperationsStack.Screen
      name="OperationsHome"
      component={OperationsHomeScreen}
      options={{ title: 'Operação' }}
    />
    <OperationsStack.Screen
      name="TasksManagement"
      component={TasksScreen}
      options={({ navigation }) => ({
        headerTitle: () => (
          <Breadcrumb
            parent="Operação"
            current="As Minhas Tarefas"
            onParentPress={() => navigation.navigate('OperationsHome')}
          />
        ),
      })}
    />
    <OperationsStack.Screen
      name="Voltas"
      component={VoltasScreen}
      options={({ navigation }) => ({
        headerTitle: () => (
          <Breadcrumb
            parent="Operação"
            current="Gestão de Voltas"
            onParentPress={() => navigation.navigate('OperationsHome')}
          />
        ),
      })}
    />
    <OperationsStack.Screen
      name="OperationControl"
      component={OperationControlScreen}
      options={({ navigation }) => ({
        headerTitle: () => (
          <Breadcrumb
            parent="Operação"
            current="Controlo Operacional"
            onParentPress={() => navigation.navigate('OperationsHome')}
          />
        ),
      })}
    />
    <OperationsStack.Screen
      name="Supervisor"
      component={SupervisorScreen}
      options={({ navigation }) => ({
        headerTitle: () => (
          <Breadcrumb
            parent="Operação"
            current="Supervisão"
            onParentPress={() => navigation.navigate('OperationsHome')}
          />
        ),
      })}
    />
  </OperationsStack.Navigator>
);

interface TabIconProps {
  name: keyof typeof MaterialIcons.glyphMap;
  color: string;
  focused: boolean;
}

const TabIcon = ({ name, color, focused }: TabIconProps) => (
  <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
    <MaterialIcons name={name} size={22} color={color} />
  </View>
);

const MainNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.textDisabled,
      tabBarStyle: styles.tabBar,
      tabBarLabelStyle: styles.tabLabel,
    }}
  >
    <Tab.Screen
      name="RhTab"
      component={RhNavigator}
      options={{
        tabBarLabel: 'RH',
        tabBarIcon: ({ color, focused }) => (
          <TabIcon name="people" color={color} focused={focused} />
        ),
      }}
    />
    <Tab.Screen
      name="OperacaoTab"
      component={OperationsNavigator}
      options={{
        tabBarLabel: 'Operação',
        tabBarIcon: ({ color, focused }) => (
          <TabIcon name="engineering" color={color} focused={focused} />
        ),
      }}
    />
  </Tab.Navigator>
);

const styles = StyleSheet.create({
  faceFallback: { flex: 1, backgroundColor: COLORS.navy, alignItems: 'center', justifyContent: 'center' },
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: 6,
    paddingTop: 6,
    height: 60,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginTop: 2,
  },
  tabIconWrap: {
    width: 36,
    height: 28,
    borderRadius: RADIUS.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: {
    backgroundColor: COLORS.primarySurface,
  },
});

export default MainNavigator;
