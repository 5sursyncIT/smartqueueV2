/**
 * Écran Historique - Historique des tickets de l'utilisateur
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Colors } from '../../constants/Colors';
import {
  formatTicketNumber,
  translateTicketStatus,
  formatDate,
  formatTime,
} from '../../utils/formatters';
import type { MainStackParamList } from '../../navigation/types';

type HistoryScreenNavigationProp = NativeStackNavigationProp<MainStackParamList>;

export function HistoryScreen() {
  const navigation = useNavigation<HistoryScreenNavigationProp>();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // TODO: Récupérer l'historique depuis l'API
  const historyItems = [
    {
      id: '1',
      number: 'A024',
      service: 'Consultation générale',
      status: 'closed',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      endedAt: new Date().toISOString(),
    },
    {
      id: '2',
      number: 'B015',
      service: 'Analyses',
      status: 'closed',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      endedAt: new Date(Date.now() - 86400000 + 1800000).toISOString(),
    },
    {
      id: '3',
      number: 'A020',
      service: 'Consultation générale',
      status: 'no_show',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      endedAt: new Date(Date.now() - 172800000 + 3600000).toISOString(),
    },
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // TODO: Recharger l'historique depuis l'API
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleTicketPress = (ticketId: string) => {
    navigation.navigate('TicketDetails', { ticketId });
  };

  const getStatusBadgeVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' => {
    switch (status) {
      case 'closed':
        return 'success';
      case 'cancelled':
      case 'no_show':
        return 'danger';
      default:
        return 'info';
    }
  };

  const renderHistoryCard = ({ item }: { item: typeof historyItems[0] }) => (
    <Card
      style={styles.historyCard}
      onPress={() => handleTicketPress(item.id)}
      elevated
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.ticketNumber}>{formatTicketNumber(item.number)}</Text>
          <Text style={styles.serviceName}>{item.service}</Text>
        </View>
        <Badge variant={getStatusBadgeVariant(item.status)}>
          {translateTicketStatus(item.status)}
        </Badge>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.dateInfo}>
          <Text style={styles.dateLabel}>Date:</Text>
          <Text style={styles.dateValue}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={styles.dateInfo}>
          <Text style={styles.dateLabel}>Heure:</Text>
          <Text style={styles.dateValue}>{formatTime(item.createdAt)}</Text>
        </View>
      </View>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={styles.emptyTitle}>Aucun historique</Text>
      <Text style={styles.emptyText}>
        Votre historique de tickets apparaîtra ici.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Historique</Text>
        <Text style={styles.subtitle}>Vos tickets passés</Text>
      </View>

      <FlatList
        data={historyItems}
        renderItem={renderHistoryCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          historyItems.length === 0 && styles.emptyListContent,
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
  historyCard: {
    marginBottom: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  ticketNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginRight: 8,
  },
  dateValue: {
    fontSize: 12,
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
  },
});
