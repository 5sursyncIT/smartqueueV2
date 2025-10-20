/**
 * Stack de navigation principale (après authentification)
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabs } from './MainTabs';
import { QueueDetailsScreen } from '../screens/queues/QueueDetailsScreen';
import { TicketDetailsScreen } from '../screens/tickets/TicketDetailsScreen';
import { TakeTicketScreen } from '../screens/tickets/TakeTicketScreen';
import type { MainStackParamList } from './types';
import { Colors } from '../constants/Colors';

const Stack = createNativeStackNavigator<MainStackParamList>();

export function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="QueueDetails" component={QueueDetailsScreen} />
      <Stack.Screen name="TicketDetails" component={TicketDetailsScreen} />
      <Stack.Screen name="TakeTicket" component={TakeTicketScreen} />
      {/* TODO: Ajouter ServiceSelection et Notifications screens */}
    </Stack.Navigator>
  );
}
