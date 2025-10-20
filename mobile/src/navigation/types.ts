/**
 * Types pour React Navigation
 */

import type { NavigatorScreenParams } from '@react-navigation/native';

// Stack d'authentification
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

// Stack principale (après authentification)
export type MainStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabsParamList>;
  QueueDetails: { queueId: string };
  TicketDetails: { ticketId: string };
  ServiceSelection: undefined;
  TakeTicket: { serviceId: string };
  Notifications: undefined;
};

// Tabs principales
export type MainTabsParamList = {
  Home: undefined;
  MyTickets: undefined;
  History: undefined;
  Profile: undefined;
};

// Type global pour la navigation
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainStackParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
