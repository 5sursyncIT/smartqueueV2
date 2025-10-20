/**
 * Écran Mes Tickets - Tickets actifs de l'utilisateur
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Colors } from '../../constants/Colors';
import { formatTicketNumber, translateTicketStatus } from '../../utils/formatters';
import type { MainStackParamList } from '../../navigation/types';

type MyTicketsScreenNavigationProp = NativeStackNavigationProp<MainStackParamList>;

export function MyTicketsScreen() {
  const navigation = useNavigation<MyTicketsScreenNavigationProp>();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // TODO: Récupérer les tickets depuis l'API
  const tickets = [
    {
      id: '1',
      number: 'A025',
      service: 'Consultation générale',
      queue: 'Queue 1',
      status: 'waiting',
      position: 3,
      estimatedWait: 15,
      createdAt: new Date().toISOString(),
    },
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // TODO: Recharger les tickets depuis l'API
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleTicketPress = (ticketId: string) => {
    navigation.navigate('TicketDetails', { ticketId });
  };

  const getStatusBadgeVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' => {
    switch (status) {
      case 'called':
        return 'success';
      case 'serving':
        return 'info';
      case 'paused':
        return 'warning';
      case 'waiting':
      default:
        return 'info';
    }
  };

  const renderTicketCard = ({ item }: { item: typeof tickets[0] }) => (
    <Card
      style={styles.ticketCard}
      onPress={() => handleTicketPress(item.id)}
      elevated
    >
      <View style={styles.ticketHeader}>
        <View>
          <Text style={styles.ticketNumber}>{formatTicketNumber(item.number)}</Text>
          <Text style={styles.serviceName}>{item.service}</Text>
        </View>
        <Badge variant={getStatusBadgeVariant(item.status)}>
          {translateTicketStatus(item.status)}
        </Badge>
      </View>

      <View style={styles.ticketInfo}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>File d'attente:</Text>
          <Text style={styles.infoValue}>{item.queue}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Position:</Text>
          <Text style={styles.infoValue}>{item.position}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Temps d'attente estimé:</Text>
          <Text style={styles.infoValue}>{item.estimatedWait} min</Text>
        </View>
      </View>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🎫</Text>
      <Text style={styles.emptyTitle}>Aucun ticket actif</Text>
      <Text style={styles.emptyText}>
        Vous n'avez pas de ticket en cours.{'\n'}
        Prenez un ticket depuis l'écran d'accueil.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes tickets</Text>
        <Text style={styles.subtitle}>Vos tickets actifs</Text>
      </View>

      <FlatList
        data={tickets}
        renderItem={renderTicketCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          tickets.length === 0 && styles.emptyListContent,
        ]}
        ListEmptyComponent={renderEmptyState}
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
  emptyListContent: {
    flexGrow: 1,
  },
  ticketCard: {
    marginBottom: 16,
    padding: 16,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  ticketNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  ticketInfo: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
