# Mobile Developer Book - SmartQueue

## 📋 Table des matières

1. [Architecture Mobile](#architecture-mobile)
2. [Configuration de l'environnement](#configuration-de-lenvironnement)
3. [Structure du projet](#structure-du-projet)
4. [Navigation](#navigation)
5. [Composants UI](#composants-ui)
6. [Gestion d'état](#gestion-détat)
7. [API & WebSockets](#api--websockets)
8. [Authentification](#authentification)
9. [Notifications Push](#notifications-push)
10. [Géolocalisation](#géolocalisation)
11. [Caméra & QR Code](#caméra--qr-code)
12. [Stockage local](#stockage-local)
13. [Tests](#tests)
14. [Build & déploiement](#build--déploiement)

## 📱 Architecture Mobile

### Stack technique
- **Framework** : React Native avec Expo
- **Language** : TypeScript
- **Navigation** : React Navigation 6
- **State Management** : Zustand + TanStack Query
- **UI Library** : NativeBase ou Tamagui
- **Forms** : React Hook Form + Zod
- **Notifications** : Expo Notifications
- **Storage** : AsyncStorage + MMKV

### Applications cibles
```
smartqueue-mobile/
├── src/
│   ├── screens/           # Écrans de l'application
│   ├── components/        # Composants réutilisables
│   ├── navigation/        # Configuration navigation
│   ├── services/          # Services API
│   ├── stores/           # Stores Zustand
│   ├── hooks/            # Hooks personnalisés
│   ├── utils/            # Utilitaires
│   └── types/            # Types TypeScript
├── assets/               # Images, fonts, etc.
├── app.config.js        # Configuration Expo
└── package.json
```

## ⚙️ Configuration de l'environnement

### Installation Expo
```bash
# Installer Expo CLI
npm install -g @expo/cli

# Créer le projet
npx create-expo-app smartqueue-mobile --template

# Naviguer dans le projet
cd smartqueue-mobile

# Installer les dépendances
npm install
```

### Configuration app.config.js
```javascript
export default {
  expo: {
    name: "SmartQueue",
    slug: "smartqueue",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.smartqueue.app",
      infoPlist: {
        NSCameraUsageDescription: "Cette app utilise la caméra pour scanner les QR codes",
        NSLocationWhenInUseUsageDescription: "Cette app utilise la localisation pour trouver les agences proches"
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#FFFFFF"
      },
      package: "com.smartqueue.app",
      permissions: [
        "CAMERA",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "VIBRATE"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-camera",
      "expo-location",
      "expo-notifications",
      [
        "expo-barcode-scanner",
        {
          cameraPermission: "Autoriser SmartQueue à accéder à la caméra pour scanner les QR codes"
        }
      ]
    ],
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000/api/v1",
      wsUrl: process.env.EXPO_PUBLIC_WS_URL || "ws://localhost:8000/ws"
    }
  }
}
```

### Variables d'environnement
```bash
# .env
EXPO_PUBLIC_API_URL=https://api.smartqueue.app/api/v1
EXPO_PUBLIC_WS_URL=wss://api.smartqueue.app/ws
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-maps-key
```

## 📁 Structure du projet

### Organisation des écrans
```
src/screens/
├── auth/
│   ├── LoginScreen.tsx
│   ├── RegisterScreen.tsx
│   └── ForgotPasswordScreen.tsx
├── home/
│   ├── HomeScreen.tsx
│   ├── NearbyAgenciesScreen.tsx
│   └── AgencyDetailScreen.tsx
├── queue/
│   ├── JoinQueueScreen.tsx
│   ├── QueueStatusScreen.tsx
│   ├── TicketDetailScreen.tsx
│   └── QRScannerScreen.tsx
├── appointments/
│   ├── AppointmentsScreen.tsx
│   ├── BookAppointmentScreen.tsx
│   └── AppointmentDetailScreen.tsx
├── profile/
│   ├── ProfileScreen.tsx
│   ├── SettingsScreen.tsx
│   └── NotificationSettingsScreen.tsx
└── common/
    ├── SplashScreen.tsx
    └── OnboardingScreen.tsx
```

## 🧭 Navigation

### Configuration React Navigation
```tsx
// src/navigation/AppNavigator.tsx
import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'

import { useAuthStore } from '../stores/authStore'
import { AuthNavigator } from './AuthNavigator'
import { HomeScreen } from '../screens/home/HomeScreen'
import { QueueScreen } from '../screens/queue/QueueScreen'
import { AppointmentsScreen } from '../screens/appointments/AppointmentsScreen'
import { ProfileScreen } from '../screens/profile/ProfileScreen'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline'
          } else if (route.name === 'Queue') {
            iconName = focused ? 'list' : 'list-outline'
          } else if (route.name === 'Appointments') {
            iconName = focused ? 'calendar' : 'calendar-outline'
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline'
          }

          return <Ionicons name={iconName!} size={size} color={color} />
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ title: 'Accueil' }}
      />
      <Tab.Screen 
        name="Queue" 
        component={QueueScreen} 
        options={{ title: 'File d\'attente' }}
      />
      <Tab.Screen 
        name="Appointments" 
        component={AppointmentsScreen} 
        options={{ title: 'Rendez-vous' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: 'Profil' }}
      />
    </Tab.Navigator>
  )
}

export function AppNavigator() {
  const { isAuthenticated } = useAuthStore()

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={TabNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
```

### Types de navigation
```tsx
// src/types/navigation.ts
export type RootStackParamList = {
  Auth: undefined
  Main: undefined
}

export type AuthStackParamList = {
  Login: undefined
  Register: undefined
  ForgotPassword: undefined
}

export type MainTabParamList = {
  Home: undefined
  Queue: undefined
  Appointments: undefined
  Profile: undefined
}

export type QueueStackParamList = {
  QueueList: undefined
  QueueDetail: { queueId: string }
  TicketDetail: { ticketId: string }
  QRScanner: undefined
}
```

## 🎨 Composants UI

### Composant Card personnalisé
```tsx
// src/components/ui/Card.tsx
import React from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'

interface CardProps {
  children: React.ReactNode
  style?: ViewStyle
  padding?: number
}

export function Card({ children, style, padding = 16 }: CardProps) {
  return (
    <View style={[styles.card, { padding }, style]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    marginVertical: 8,
  },
})
```

### Composant Queue Card
```tsx
// src/components/queue/QueueCard.tsx
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../ui/Card'

interface QueueCardProps {
  queue: {
    id: string
    name: string
    waitingCount: number
    averageWaitTime: number
    status: 'active' | 'paused' | 'closed'
  }
  onPress: () => void
}

export function QueueCard({ queue, onPress }: QueueCardProps) {
  const getStatusColor = () => {
    switch (queue.status) {
      case 'active': return '#10B981'
      case 'paused': return '#F59E0B'
      case 'closed': return '#EF4444'
      default: return '#6B7280'
    }
  }

  const getStatusText = () => {
    switch (queue.status) {
      case 'active': return 'Actif'
      case 'paused': return 'En pause'
      case 'closed': return 'Fermé'
      default: return 'Inconnu'
    }
  }

  return (
    <TouchableOpacity onPress={onPress}>
      <Card>
        <View style={styles.header}>
          <Text style={styles.title}>{queue.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>
        </View>
        
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Ionicons name="people-outline" size={16} color="#6B7280" />
            <Text style={styles.statText}>{queue.waitingCount} en attente</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text style={styles.statText}>
              ~{Math.round(queue.averageWaitTime / 60)} min
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    color: '#6B7280',
  },
})
```

## 🔄 Gestion d'état

### Store d'authentification
```tsx
// src/stores/authStore.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api } from '../services/api'

interface User {
  id: string
  email: string
  name: string
  phone?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  register: (data: RegisterData) => Promise<void>
}

interface RegisterData {
  name: string
  email: string
  password: string
  phone?: string
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true })
        try {
          const response = await api.post('/auth/login', { email, password })
          const { user, token } = response.data
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        })
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true })
        try {
          const response = await api.post('/auth/register', data)
          const { user, token } = response.data
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
```

### Hook pour les files d'attente
```tsx
// src/hooks/useQueues.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

export function useQueues() {
  return useQuery({
    queryKey: ['queues'],
    queryFn: async () => {
      const response = await api.get('/queues')
      return response.data
    },
  })
}

export function useJoinQueue() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: { queueId: string; serviceId: string }) => {
      const response = await api.post('/tickets', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues'] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}
```

## 🌐 API & WebSockets

### Configuration API
```tsx
// src/services/api.ts
import axios from 'axios'
import Constants from 'expo-constants'
import { useAuthStore } from '../stores/authStore'

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:8000/api/v1'

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
})

// Intercepteur pour ajouter le token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  return config
})

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  }
)
```

### Service WebSocket
```tsx
// src/services/websocket.ts
import Constants from 'expo-constants'
import { useAuthStore } from '../stores/authStore'

const WS_URL = Constants.expoConfig?.extra?.wsUrl || 'ws://localhost:8000/ws'

export class WebSocketService {
  private ws: WebSocket | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private listeners: Map<string, Function[]> = new Map()

  connect(path: string) {
    const token = useAuthStore.getState().token
    if (!token) return

    const url = `${WS_URL}${path}?token=${token}`
    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      console.log('WebSocket connected')
      this.clearReconnectTimer()
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.emit(data.type, data)
      } catch (error) {
        console.error('WebSocket message parse error:', error)
      }
    }

    this.ws.onclose = () => {
      console.log('WebSocket disconnected')
      this.scheduleReconnect(path)
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }

  disconnect() {
    this.clearReconnectTimer()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(callback => callback(data))
    }
  }

  private scheduleReconnect(path: string) {
    this.clearReconnectTimer()
    this.reconnectTimer = setTimeout(() => {
      this.connect(path)
    }, 3000)
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
}

export const wsService = new WebSocketService()
```

## 🔔 Notifications Push

### Configuration des notifications
```tsx
// src/services/notifications.ts
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { api } from './api'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export async function registerForPushNotificationsAsync() {
  let token

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    })
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    
    if (finalStatus !== 'granted') {
      alert('Échec de l\'obtention du token de notification push!')
      return
    }
    
    token = (await Notifications.getExpoPushTokenAsync()).data
    console.log(token)
  } else {
    alert('Doit utiliser un appareil physique pour les notifications push')
  }

  return token
}

export async function sendPushTokenToServer(token: string) {
  try {
    await api.post('/users/push-token', { token })
  } catch (error) {
    console.error('Erreur lors de l\'envoi du token push:', error)
  }
}
```

### Hook pour les notifications
```tsx
// src/hooks/useNotifications.ts
import { useEffect, useRef } from 'react'
import * as Notifications from 'expo-notifications'
import { registerForPushNotificationsAsync, sendPushTokenToServer } from '../services/notifications'

export function useNotifications() {
  const notificationListener = useRef<Notifications.Subscription>()
  const responseListener = useRef<Notifications.Subscription>()

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        sendPushTokenToServer(token)
      }
    })

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification reçue:', notification)
    })

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Réponse à la notification:', response)
    })

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current)
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current)
      }
    }
  }, [])
}
```

## 📍 Géolocalisation

### Service de géolocalisation
```tsx
// src/services/location.ts
import * as Location from 'expo-location'

export async function getCurrentLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync()
  
  if (status !== 'granted') {
    throw new Error('Permission de localisation refusée')
  }

  const location = await Location.getCurrentPositionAsync({})
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  }
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}
```

## 📷 Caméra & QR Code

### Composant Scanner QR
```tsx
// src/components/qr/QRScanner.tsx
import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Alert } from 'react-native'
import { BarCodeScanner } from 'expo-barcode-scanner'
import { Camera } from 'expo-camera'

interface QRScannerProps {
  onScan: (data: string) => void
  onClose: () => void
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [scanned, setScanned] = useState(false)

  useEffect(() => {
    const getBarCodeScannerPermissions = async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync()
      setHasPermission(status === 'granted')
    }

    getBarCodeScannerPermissions()
  }, [])

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true)
    onScan(data)
  }

  if (hasPermission === null) {
    return <Text>Demande de permission pour la caméra...</Text>
  }
  
  if (hasPermission === false) {
    return <Text>Pas d'accès à la caméra</Text>
  }

  return (
    <View style={styles.container}>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.overlay}>
        <View style={styles.scanArea} />
        <Text style={styles.instruction}>
          Pointez la caméra vers le QR code
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  instruction: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
})
```

## 💾 Stockage local

### Service de stockage
```tsx
// src/services/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage'

export const storage = {
  async setItem(key: string, value: any): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value)
      await AsyncStorage.setItem(key, jsonValue)
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
    }
  },

  async getItem<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key)
      return jsonValue != null ? JSON.parse(jsonValue) : null
    } catch (error) {
      console.error('Erreur lors de la lecture:', error)
      return null
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key)
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear()
    } catch (error) {
      console.error('Erreur lors du nettoyage:', error)
    }
  }
}
```

## 🧪 Tests

### Configuration Jest
```javascript
// jest.config.js
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
}
```

### Tests de composants
```tsx
// src/components/__tests__/QueueCard.test.tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { QueueCard } from '../queue/QueueCard'

const mockQueue = {
  id: '1',
  name: 'Accueil général',
  waitingCount: 5,
  averageWaitTime: 300,
  status: 'active' as const,
}

describe('QueueCard', () => {
  it('renders queue information correctly', () => {
    const onPress = jest.fn()
    const { getByText } = render(
      <QueueCard queue={mockQueue} onPress={onPress} />
    )
    
    expect(getByText('Accueil général')).toBeTruthy()
    expect(getByText('5 en attente')).toBeTruthy()
    expect(getByText('~5 min')).toBeTruthy()
  })

  it('calls onPress when tapped', () => {
    const onPress = jest.fn()
    const { getByText } = render(
      <QueueCard queue={mockQueue} onPress={onPress} />
    )
    
    fireEvent.press(getByText('Accueil général'))
    expect(onPress).toHaveBeenCalled()
  })
})
```

## 🚀 Build & déploiement

### Build de développement
```bash
# Lancer en mode développement
npx expo start

# Lancer sur iOS Simulator
npx expo start --ios

# Lancer sur Android Emulator
npx expo start --android

# Lancer sur le web
npx expo start --web
```

### Build de production
```bash
# Build pour iOS
eas build --platform ios

# Build pour Android
eas build --platform android

# Build pour les deux plateformes
eas build --platform all
```

### Configuration EAS
```json
// eas.json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "resourceClass": "m1-medium"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "resourceClass": "m1-medium"
      }
    },
    "production": {
      "ios": {
        "resourceClass": "m1-medium"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Déploiement sur les stores
```bash
# Soumettre à l'App Store
eas submit --platform ios

# Soumettre au Google Play Store
eas submit --platform android
```

## 🔧 Commandes utiles

```bash
# Développement
npx expo start                    # Lancer le serveur de développement
npx expo start --clear            # Lancer avec cache vidé
npx expo install                  # Installer les dépendances compatibles
npx expo doctor                   # Diagnostiquer les problèmes

# Build
eas build --platform ios          # Build iOS
eas build --platform android      # Build Android
eas build --local                 # Build local

# Tests
npm test                          # Lancer les tests
npm run test:watch               # Tests en mode watch

# Outils
npx expo customize               # Personnaliser la configuration
npx expo eject                   # Éjecter vers React Native CLI
```

---

Ce guide couvre tous les aspects essentiels du développement mobile pour SmartQueue avec React Native et Expo. Il fournit une base solide pour créer une application mobile moderne et performante.