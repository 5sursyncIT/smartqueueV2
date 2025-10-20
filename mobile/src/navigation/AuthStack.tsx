/**
 * Stack de navigation pour l'authentification
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/auth/LoginScreen';
import type { AuthStackParamList } from './types';
import { Colors } from '../constants/Colors';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      {/* TODO: Ajouter les écrans Register et ForgotPassword */}
    </Stack.Navigator>
  );
}
