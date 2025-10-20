/**
 * Onglets de navigation principale
 */

import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/home/HomeScreen';
import { MyTicketsScreen } from '../screens/tickets/MyTicketsScreen';
import { HistoryScreen } from '../screens/history/HistoryScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import type { MainTabsParamList } from './types';
import { Colors } from '../constants/Colors';

const Tab = createBottomTabNavigator<MainTabsParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.text.secondary,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Accueil',
          tabBarIcon: ({ color }) => <TabIcon icon="🏠" color={color} />,
        }}
      />
      <Tab.Screen
        name="MyTickets"
        component={MyTicketsScreen}
        options={{
          tabBarLabel: 'Mes tickets',
          tabBarIcon: ({ color }) => <TabIcon icon="🎫" color={color} />,
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'Historique',
          tabBarIcon: ({ color }) => <TabIcon icon="📋" color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color }) => <TabIcon icon="👤" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

// Composant simple pour les icônes (en attendant react-native-vector-icons)
function TabIcon({ icon, color }: { icon: string; color: string }) {
  return (
    <Text style={{ fontSize: 24, color, opacity: color === Colors.text.secondary ? 0.5 : 1 }}>
      {icon}
    </Text>
  );
}
