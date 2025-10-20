/**
 * Écran Profil - Profil utilisateur et paramètres
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../constants/Colors';

export function ProfileScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Erreur', 'Erreur lors de la déconnexion');
            }
          },
        },
      ]
    );
  };

  const menuItems = [
    {
      id: 'notifications',
      title: 'Notifications',
      subtitle: 'Gérer les notifications',
      icon: '🔔',
    },
    {
      id: 'language',
      title: 'Langue',
      subtitle: 'Français',
      icon: '🌐',
    },
    {
      id: 'about',
      title: 'À propos',
      subtitle: 'Version 1.0.0',
      icon: 'ℹ️',
    },
    {
      id: 'help',
      title: 'Aide',
      subtitle: 'FAQ et support',
      icon: '❓',
    },
  ];

  const handleMenuItemPress = (itemId: string) => {
    // TODO: Implémenter la navigation vers les écrans de paramètres
    Alert.alert('En développement', `La section ${itemId} sera bientôt disponible`);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.first_name?.[0] || user?.email?.[0] || '?'}
            </Text>
          </View>
        </View>
        <Text style={styles.userName}>
          {user?.first_name} {user?.last_name}
        </Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        {user?.phone_number && (
          <Text style={styles.userPhone}>{user.phone_number}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Paramètres</Text>
        {menuItems.map((item) => (
          <Card
            key={item.id}
            style={styles.menuCard}
            onPress={() => handleMenuItemPress(item.id)}
          >
            <View style={styles.menuItem}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </View>
          </Card>
        ))}
      </View>

      <View style={styles.section}>
        <Button
          variant="danger"
          onPress={handleLogout}
        >
          Déconnexion
        </Button>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>SmartQueue Mobile v1.0.0</Text>
        <Text style={styles.footerText}>© 2025 SmartQueue</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.white,
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.white,
    textTransform: 'uppercase',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
    marginLeft: 4,
  },
  menuCard: {
    marginBottom: 12,
    padding: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  menuArrow: {
    fontSize: 24,
    color: Colors.text.secondary,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
});
