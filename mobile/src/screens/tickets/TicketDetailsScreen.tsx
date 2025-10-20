/**
 * Écran de détails d'un ticket
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Colors } from '../../constants/Colors';
import {
  formatTicketNumber,
  translateTicketStatus,
  formatDate,
  formatTime,
  formatDuration,
} from '../../utils/formatters';
import type { MainStackParamList } from '../../navigation/types';

type TicketDetailsScreenRouteProp = RouteProp<MainStackParamList, 'TicketDetails'>;
type TicketDetailsScreenNavigationProp = NativeStackNavigationProp<MainStackParamList>;

export function TicketDetailsScreen() {
  const route = useRoute<TicketDetailsScreenRouteProp>();
  const navigation = useNavigation<TicketDetailsScreenNavigationProp>();
  const { ticketId } = route.params;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // TODO: Récupérer le ticket depuis l'API
  const ticket = {
    id: ticketId,
    number: 'A025',
    service: 'Consultation générale',
    serviceName: 'Consultation médicale générale',
    queue: 'Queue 1',
    status: 'waiting',
    position: 3,
    estimatedWait: 15,
    createdAt: new Date().toISOString(),
    customer: {
      firstName: 'Amadou',
      lastName: 'Diallo',
      phoneNumber: '+221771234567',
    },
    agent: null,
    counter: null,
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // TODO: Recharger le ticket depuis l'API
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleCancelTicket = () => {
    Alert.alert(
      'Annuler le ticket',
      'Êtes-vous sûr de vouloir annuler ce ticket ? Cette action est irréversible.',
      [
        {
          text: 'Non',
          style: 'cancel',
        },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            setIsCancelling(true);
            try {
              // TODO: Appeler l'API pour annuler le ticket
              await new Promise((resolve) => setTimeout(resolve, 1000));
              Alert.alert('Ticket annulé', 'Votre ticket a été annulé avec succès.', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (error: any) {
              Alert.alert('Erreur', error.message || 'Impossible d\'annuler le ticket');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
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

  const canCancelTicket = ['waiting', 'called'].includes(ticket.status);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={[Colors.primary]}
        />
      }
    >
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
      </View>

      {/* Numéro de ticket */}
      <Card style={styles.ticketCard} elevated>
        <View style={styles.ticketHeader}>
          <View>
            <Text style={styles.label}>Votre numéro</Text>
            <Text style={styles.ticketNumber}>{formatTicketNumber(ticket.number)}</Text>
          </View>
          <Badge variant={getStatusBadgeVariant(ticket.status)}>
            {translateTicketStatus(ticket.status)}
          </Badge>
        </View>

        {ticket.status === 'called' && ticket.counter && (
          <View style={styles.calledInfo}>
            <Text style={styles.calledText}>Veuillez vous présenter au</Text>
            <Text style={styles.counterNumber}>Guichet {ticket.counter}</Text>
          </View>
        )}
      </Card>

      {/* Position dans la file */}
      {ticket.status === 'waiting' && (
        <Card style={styles.positionCard} elevated>
          <View style={styles.positionRow}>
            <View style={styles.positionItem}>
              <Text style={styles.positionValue}>{ticket.position}</Text>
              <Text style={styles.positionLabel}>Position</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.positionItem}>
              <Text style={styles.positionValue}>{ticket.estimatedWait} min</Text>
              <Text style={styles.positionLabel}>Temps d'attente</Text>
            </View>
          </View>
        </Card>
      )}

      {/* Détails du service */}
      <Card style={styles.detailsCard}>
        <Text style={styles.cardTitle}>Informations</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Service:</Text>
          <Text style={styles.detailValue}>{ticket.service}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>File d'attente:</Text>
          <Text style={styles.detailValue}>{ticket.queue}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date:</Text>
          <Text style={styles.detailValue}>{formatDate(ticket.createdAt)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Heure:</Text>
          <Text style={styles.detailValue}>{formatTime(ticket.createdAt)}</Text>
        </View>

        {ticket.agent && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Agent:</Text>
            <Text style={styles.detailValue}>{ticket.agent}</Text>
          </View>
        )}
      </Card>

      {/* Informations client */}
      <Card style={styles.detailsCard}>
        <Text style={styles.cardTitle}>Vos informations</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Nom:</Text>
          <Text style={styles.detailValue}>
            {ticket.customer.firstName} {ticket.customer.lastName}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Téléphone:</Text>
          <Text style={styles.detailValue}>{ticket.customer.phoneNumber}</Text>
        </View>
      </Card>

      {/* Actions */}
      {canCancelTicket && (
        <View style={styles.actions}>
          <Button
            variant="danger"
            onPress={handleCancelTicket}
            loading={isCancelling}
            fullWidth
          >
            Annuler le ticket
          </Button>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Vous recevrez une notification lorsque votre tour approchera.
        </Text>
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
    padding: 20,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  ticketCard: {
    margin: 16,
    padding: 20,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  ticketNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  calledInfo: {
    marginTop: 20,
    padding: 16,
    backgroundColor: Colors.success + '20',
    borderRadius: 8,
    alignItems: 'center',
  },
  calledText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  counterNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.success,
  },
  positionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
  },
  positionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  positionItem: {
    alignItems: 'center',
    flex: 1,
  },
  positionValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  positionLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  divider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  detailsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  actions: {
    padding: 16,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});
