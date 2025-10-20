/**
 * Écran d'accueil - Liste des services disponibles
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../../components/ui/Card';
import { Colors } from '../../constants/Colors';
import type { MainStackParamList } from '../../navigation/types';

type HomeScreenNavigationProp = NativeStackNavigationProp<MainStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // TODO: Récupérer les services depuis l'API
  const services = [
    {
      id: '1',
      name: 'Consultation générale',
      description: 'Consultation médicale générale',
      icon: '🏥',
      waitingTime: 15,
      waitingCount: 5,
    },
    {
      id: '2',
      name: 'Analyses',
      description: 'Prélèvements et analyses',
      icon: '🔬',
      waitingTime: 10,
      waitingCount: 3,
    },
    {
      id: '3',
      name: 'Radiologie',
      description: 'Examens radiologiques',
      icon: '📷',
      waitingTime: 25,
      waitingCount: 8,
    },
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // TODO: Recharger les services depuis l'API
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleServicePress = (serviceId: string) => {
    navigation.navigate('TakeTicket', { serviceId });
  };

  const renderServiceCard = ({ item }: { item: typeof services[0] }) => (
    <Card
      style={styles.serviceCard}
      onPress={() => handleServicePress(item.id)}
      elevated
    >
      <View style={styles.serviceHeader}>
        <Text style={styles.serviceIcon}>{item.icon}</Text>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{item.name}</Text>
          <Text style={styles.serviceDescription}>{item.description}</Text>
        </View>
      </View>
      <View style={styles.serviceFooter}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{item.waitingCount}</Text>
          <Text style={styles.statLabel}>En attente</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{item.waitingTime} min</Text>
          <Text style={styles.statLabel}>Temps d'attente</Text>
        </View>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Services disponibles</Text>
        <Text style={styles.subtitle}>
          Sélectionnez un service pour prendre un ticket
        </Text>
      </View>

      <FlatList
        data={services}
        renderItem={renderServiceCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 20,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  listContent: {
    padding: 16,
  },
  serviceCard: {
    marginBottom: 16,
    padding: 16,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
});
