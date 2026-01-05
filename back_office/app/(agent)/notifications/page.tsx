'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle, Info, AlertCircle } from 'lucide-react';

export default function AgentNotificationsPage() {
  // TODO: Fetch real notifications from API
  const notifications = [
    {
      id: '1',
      type: 'info',
      title: 'Nouveau ticket assigné',
      message: 'Le ticket #T001234 vous a été assigné',
      timestamp: new Date(Date.now() - 5 * 60000),
      read: false,
    },
    {
      id: '2',
      type: 'success',
      title: 'Ticket complété',
      message: 'Le ticket #T001233 a été marqué comme terminé',
      timestamp: new Date(Date.now() - 30 * 60000),
      read: false,
    },
    {
      id: '3',
      type: 'warning',
      title: 'Pause trop longue',
      message: 'Vous êtes en pause depuis plus de 30 minutes',
      timestamp: new Date(Date.now() - 60 * 60000),
      read: true,
    },
  ];

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-gray-600 mt-2">
            {unreadCount > 0
              ? `Vous avez ${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}`
              : 'Toutes les notifications sont lues'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline">
            <CheckCircle className="h-4 w-4 mr-2" />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Toutes les notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Aucune notification</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border rounded-lg p-4 ${
                    !notification.read ? 'bg-blue-50 border-blue-200' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-medium">{notification.title}</p>
                        {!notification.read && (
                          <Badge className="bg-blue-600">Nouveau</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500">
                        Il y a{' '}
                        {Math.floor(
                          (Date.now() - notification.timestamp.getTime()) / 60000
                        )}{' '}
                        minutes
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
