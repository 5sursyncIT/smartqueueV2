/**
 * Utilitaires pour AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  /**
   * Sauvegarder une valeur
   */
  async set<T>(key: string, value: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error(`Erreur lors de la sauvegarde de ${key}:`, error);
      throw error;
    }
  },

  /**
   * Récupérer une valeur
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error(`Erreur lors de la récupération de ${key}:`, error);
      return null;
    }
  },

  /**
   * Supprimer une valeur
   */
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Erreur lors de la suppression de ${key}:`, error);
      throw error;
    }
  },

  /**
   * Supprimer plusieurs valeurs
   */
  async removeMultiple(keys: string[]): Promise<void> {
    try {
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Erreur lors de la suppression multiple:', error);
      throw error;
    }
  },

  /**
   * Effacer tout le stockage
   */
  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Erreur lors du nettoyage du stockage:', error);
      throw error;
    }
  },

  /**
   * Récupérer toutes les clés
   */
  async getAllKeys(): Promise<string[]> {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('Erreur lors de la récupération des clés:', error);
      return [];
    }
  },
};
