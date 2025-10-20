/**
 * Application SmartQueue Mobile
 */

import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAuthStore } from './src/stores/authStore';
import { Colors } from './src/constants/Colors';

export default function App() {
  const { isLoading, loadUser } = useAuthStore();

  useEffect(() => {
    // Charger l'utilisateur au démarrage
    loadUser();
  }, []);

  // Écran de chargement
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  // Afficher la navigation
  return (
    <>
      <StatusBar style="auto" />
      <RootNavigator />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.text.secondary,
  },
});
