/**
 * Écran de prise de ticket
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Colors } from '../../constants/Colors';
import type { MainStackParamList } from '../../navigation/types';

type TakeTicketScreenRouteProp = RouteProp<MainStackParamList, 'TakeTicket'>;
type TakeTicketScreenNavigationProp = NativeStackNavigationProp<MainStackParamList>;

// Schéma de validation pour les informations du client
const ticketSchema = z.object({
  firstName: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  lastName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  phoneNumber: z.string().regex(/^(\+221)?[0-9]{9}$/, 'Numéro de téléphone invalide'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
});

type TicketFormData = z.infer<typeof ticketSchema>;

export function TakeTicketScreen() {
  const route = useRoute<TakeTicketScreenRouteProp>();
  const navigation = useNavigation<TakeTicketScreenNavigationProp>();
  const { serviceId } = route.params;

  const [isSubmitting, setIsSubmitting] = useState(false);

  // TODO: Récupérer les détails du service depuis l'API
  const service = {
    id: serviceId,
    name: 'Consultation générale',
    description: 'Consultation médicale générale',
    icon: '🏥',
    estimatedWaitTime: 15,
  };

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phoneNumber: '',
      email: '',
    },
  });

  const onSubmit = async (data: TicketFormData) => {
    setIsSubmitting(true);
    try {
      // TODO: Appeler l'API pour créer le ticket
      console.log('Creating ticket:', { serviceId, ...data });

      // Simuler l'appel API
      await new Promise((resolve) => setTimeout(resolve, 1500));

      Alert.alert(
        'Ticket créé avec succès',
        'Votre ticket a été créé. Vous recevrez une notification lorsque votre tour approche.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('MainTabs', { screen: 'MyTickets' }),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Erreur',
        error.message || 'Une erreur est survenue lors de la création du ticket'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
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
        <Text style={styles.title}>Prendre un ticket</Text>
      </View>

      {/* Info service */}
      <Card style={styles.serviceCard} elevated>
        <View style={styles.serviceHeader}>
          <Text style={styles.serviceIcon}>{service.icon}</Text>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>{service.name}</Text>
            <Text style={styles.serviceDescription}>{service.description}</Text>
          </View>
        </View>
        <View style={styles.waitTimeContainer}>
          <Text style={styles.waitTimeLabel}>Temps d'attente estimé:</Text>
          <Text style={styles.waitTimeValue}>{service.estimatedWaitTime} min</Text>
        </View>
      </Card>

      {/* Formulaire */}
      <View style={styles.form}>
        <Text style={styles.formTitle}>Vos informations</Text>
        <Text style={styles.formDescription}>
          Ces informations nous permettront de vous notifier lorsque votre tour approche.
        </Text>

        <Controller
          control={control}
          name="firstName"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Prénom *"
              placeholder="Votre prénom"
              autoCapitalize="words"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.firstName?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="lastName"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Nom *"
              placeholder="Votre nom"
              autoCapitalize="words"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.lastName?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="phoneNumber"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Téléphone *"
              placeholder="+221 77 123 45 67"
              keyboardType="phone-pad"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.phoneNumber?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Email (optionnel)"
              placeholder="votre@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.email?.message}
            />
          )}
        />

        <Button
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
          fullWidth
          style={styles.submitButton}
        >
          Confirmer et prendre un ticket
        </Button>
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
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  serviceCard: {
    margin: 16,
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
  waitTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
  },
  waitTimeLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  waitTimeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  form: {
    padding: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  formDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  submitButton: {
    marginTop: 8,
  },
});
