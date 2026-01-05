'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  BarChart3,
  Building,
  Briefcase,
  Bell,
  MessageSquare,
  CreditCard,
  Package,
  LogOut,
  UserCircle,
  ListOrdered,
  Ticket,
  Brain,
  Monitor,
  Tablet,
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[]; // Rôles autorisés
}

const navItems: NavItem[] = [
  // Super-admin
  {
    title: 'Tenants',
    href: '/tenants',
    icon: Building,
    roles: ['super-admin'],
  },
  {
    title: 'Facturation',
    href: '/billing',
    icon: CreditCard,
    roles: ['super-admin'],
  },
  {
    title: 'Plans & Quotas',
    href: '/quotas',
    icon: Package,
    roles: ['super-admin'],
  },

  // Admin - Gestion principale
  {
    title: 'Sites',
    href: '/sites',
    icon: Building2,
    roles: ['admin', 'super-admin'],
  },
  {
    title: 'Services',
    href: '/services',
    icon: Briefcase,
    roles: ['admin', 'super-admin'],
  },
  {
    title: 'Files d\'attente',
    href: '/queues',
    icon: ListOrdered,
    roles: ['admin', 'manager', 'super-admin'],
  },
  {
    title: 'Tickets',
    href: '/tickets',
    icon: Ticket,
    roles: ['admin', 'manager', 'agent', 'super-admin'],
  },
  {
    title: 'Agents',
    href: '/agents',
    icon: Users,
    roles: ['admin', 'super-admin'],
  },
  {
    title: 'Intégrations',
    href: '/integrations',
    icon: Settings,
    roles: ['admin', 'super-admin'],
  },
  {
    title: 'Templates',
    href: '/templates',
    icon: MessageSquare,
    roles: ['admin', 'super-admin'],
  },
  {
    title: 'Écrans',
    href: '/displays',
    icon: Monitor,
    roles: ['admin', 'super-admin'],
  },
  {
    title: 'Bornes',
    href: '/kiosks',
    icon: Tablet,
    roles: ['admin', 'super-admin'],
  },

  // Manager & Analytics
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['manager', 'admin', 'super-admin'],
  },
  {
    title: 'Intelligence',
    href: '/intelligence',
    icon: Brain,
    roles: ['admin', 'manager', 'super-admin'],
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    roles: ['admin', 'manager', 'super-admin'],
  },
  {
    title: 'Rapports',
    href: '/reports',
    icon: BarChart3,
    roles: ['manager', 'admin', 'super-admin'],
  },
  {
    title: 'Équipe',
    href: '/team',
    icon: Users,
    roles: ['manager', 'admin', 'super-admin'],
  },

  // Profil (tous)
  {
    title: 'Mon profil',
    href: '/profile',
    icon: UserCircle,
    roles: ['manager', 'admin', 'super-admin'],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { currentTenant, user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  // Filtrer les items selon le rôle
  const visibleItems = navItems.filter((item) =>
    item.roles.includes(currentTenant?.role || '')
  );

  return (
    <div className="flex h-screen w-64 flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="flex h-16 items-center justify-center border-b border-gray-800 px-4">
        <h1 className="text-xl font-bold">SmartQueue</h1>
      </div>

      {/* User info */}
      <div className="border-b border-gray-800 p-4">
        <div className="text-sm">
          <p className="font-medium">{user?.first_name} {user?.last_name}</p>
          <p className="text-xs text-gray-400">{user?.email}</p>
        </div>
        {currentTenant && (
          <div className="mt-2 rounded-md bg-gray-800 px-2 py-1">
            <p className="text-xs text-gray-300">{currentTenant.name}</p>
            <p className="text-xs capitalize text-gray-500">{currentTenant.role}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      <Separator className="bg-gray-800" />

      {/* Footer */}
      <div className="p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-400 hover:bg-gray-800 hover:text-white"
          onClick={handleLogout}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Déconnexion
        </Button>
      </div>
    </div>
  );
}
