/**
 * Écran de connexion
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { Colors } from '../../constants/Colors';

// Schéma de validation
const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuthStore();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
      // La navigation est gérée automatiquement par RootNavigator
    } catch (error: any) {
      Alert.alert(
        'Erreur de connexion',
        error.message || 'Email ou mot de passe incorrect'
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo & Titre */}
        <View style={styles.header}>
          <Text style={styles.logo}>SmartQueue</Text>
          <Text style={styles.subtitle}>Bienvenue !</Text>
          <Text style={styles.description}>
            Connectez-vous pour accéder à vos files d'attente
          </Text>
        </View>

        {/* Formulaire */}
        <View style={styles.form}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email"
                placeholder="votre@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Mot de passe"
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                rightIcon={
                  <Text style={styles.showPasswordText}>
                    {showPassword ? 'Masquer' : 'Afficher'}
                  </Text>
                }
                onRightIconPress={() => setShowPassword(!showPassword)}
              />
            )}
          />

          <Button
            title="Se connecter"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            fullWidth
            style={styles.loginButton}
          />

          <Button
            title="Mot de passe oublié ?"
            onPress={() => Alert.alert('Réinitialisation', 'Fonctionnalité à venir')}
            variant="outline"
            size="small"
            style={styles.forgotButton}
          />
        </View>

        {/* Inscription */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Vous n'avez pas de compte ?</Text>
          <Button
            title="S'inscrire"
            onPress={() => Alert.alert('Inscription', 'Fonctionnalité à venir')}
            variant="outline"
            size="small"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  showPasswordText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  loginButton: {
    marginTop: 8,
  },
  forgotButton: {
    marginTop: 16,
    alignSelf: 'center',
  },
  footer: {
    alignItems: 'center',
    gap: 12,
  },
  footerText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
});
