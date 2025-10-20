/**
 * Écran de détails d'une file d'attente
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  FlatList,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Colors } from '../../constants/Colors';
import { formatTicketNumber, translateTicketStatus } from '../../utils/formatters';
import type { MainStackParamList } from '../../navigation/types';

type QueueDetailsScreenRouteProp = RouteProp<MainStackParamList, 'QueueDetails'>;
type QueueDetailsScreenNavigationProp = NativeStackNavigationProp<MainStackParamList>;

export function QueueDetailsScreen() {
  const route = useRoute<QueueDetailsScreenRouteProp>();
  const navigation = useNavigation<QueueDetailsScreenNavigationProp>();
  const { queueId } = route.params;

  const [isRefreshing, setIsRefreshing] = useState(false);

  // TODO: Récupérer les détails de la queue depuis l'API
  const queue = {
    id: queueId,
    name: 'Queue Consultation Générale',
    service: 'Consultation générale',
    status: 'active',
    waitingCount: 8,
    avgWaitTime: 15,
    currentTicket: 'A023',
    tickets: [
      { id: '1', number: 'A024', status: 'called', position: 1 },
      { id: '2', number: 'A025', status: 'waiting', position: 2 },
      { id: '3', number: 'A026', status: 'waiting', position: 3 },
      { id: '4', number: 'A027', status: 'waiting', position: 4 },
      { id: '5', number: 'A028', status: 'waiting', position: 5 },
    ],
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // TODO: Recharger les données depuis l'API
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getStatusBadgeVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' => {
    switch (status) {
      case 'called':
        return 'success';
      case 'serving':
        return 'info';
      case 'waiting':
      default:
        return 'info';
    }
  };

  const getQueueStatusBadgeVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'paused':
        return 'warning';
      case 'closed':
        return 'danger';
      default:
        return 'info';
    }
  };

  const renderTicketItem = ({ item }: { item: typeof queue.tickets[0] }) => (
    <Card
      style={styles.ticketItem}
      onPress={() => navigation.navigate('TicketDetails', { ticketId: item.id })}
    >
      <View style={styles.ticketItemContent}>
        <View>
          <Text style={styles.ticketItemNumber}>{formatTicketNumber(item.number)}</Text>
          <Text style={styles.ticketItemPosition}>Position: {item.position}</Text>
        </View>
        <Badge variant={getStatusBadgeVariant(item.status)}>
          {translateTicketStatus(item.status)}
        </Badge>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <Button
          variant="outline"
          size="small"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          ← Retour
        </Button>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>{queue.name}</Text>
          <Badge variant={getQueueStatusBadgeVariant(queue.status)}>
            {queue.status === 'active' ? 'Active' : queue.status === 'paused' ? 'En pause' : 'Fermée'}
          </Badge>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Statistiques */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard} elevated>
            <Text style={styles.statValue}>{queue.waitingCount}</Text>
            <Text style={styles.statLabel}>En attente</Text>
          </Card>
          <Card style={styles.statCard} elevated>
            <Text style={styles.statValue}>{queue.avgWaitTime} min</Text>
            <Text style={styles.statLabel}>Temps moyen</Text>
          </Card>
        </View>

        {/* Ticket en cours */}
        <Card style={styles.currentTicketCard} elevated>
          <Text style={styles.cardTitle}>Ticket en cours</Text>
          <Text style={styles.currentTicketNumber}>
            {formatTicketNumber(queue.currentTicket)}
          </Text>
        </Card>

        {/* Liste des tickets */}
        <View style={styles.ticketsSection}>
          <Text style={styles.sectionTitle}>Tickets en attente</Text>
          {queue.tickets.map((ticket) => (
            <View key={ticket.id}>
              {renderTicketItem({ item: ticket })}
            </View>
          ))}
        </View>
      </ScrollView>
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
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  headerTitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
    flex: 1,
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  statCard: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  currentTicketCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 12,
  },
  currentTicketNumber: {
    fontSize: 40,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  ticketsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  ticketItem: {
    marginBottom: 12,
    padding: 16,
  },
  ticketItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketItemNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  ticketItemPosition: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
});
