'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/stores/auth-store';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Users,
  BarChart3,
  Activity,
  Settings,
  Shield,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Zap,
  Database,
  FileText,
  TrendingUp,
  AlertCircle,
  DollarSign,
  Tag,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/superadmin/dashboard', icon: LayoutDashboard },
  { name: 'Organizations', href: '/superadmin/organizations', icon: Building2 },
  { name: 'Subscriptions', href: '/superadmin/subscriptions', icon: CreditCard },
  {
    name: 'Facturation',
    href: '/superadmin/billing',
    icon: FileText,
    children: [
      { name: 'Transactions', href: '/superadmin/billing', icon: DollarSign },
      { name: 'Analytics MRR/ARR', href: '/superadmin/billing/analytics', icon: TrendingUp },
      { name: 'Impayés', href: '/superadmin/billing/overdue', icon: AlertCircle },
      { name: 'Codes Promo', href: '/superadmin/billing/coupons', icon: Tag },
    ]
  },
  { name: 'Users', href: '/superadmin/users', icon: Users },
  { name: 'Analytics', href: '/superadmin/analytics', icon: BarChart3 },
  { name: 'Monitoring', href: '/superadmin/monitoring', icon: Activity },
  { name: 'System', href: '/superadmin/system', icon: Settings },
  { name: 'Security', href: '/superadmin/security', icon: Shield },
  { name: 'Support', href: '/superadmin/support', icon: MessageSquare },
];

export function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openMenus, setOpenMenus] = useState<string[]>(['Facturation']); // Facturation ouvert par défaut
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const toggleMenu = (menuName: string) => {
    setOpenMenus(prev =>
      prev.includes(menuName)
        ? prev.filter(name => name !== menuName)
        : [...prev, menuName]
    );
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={cn(
          'bg-gray-900 text-white transition-all duration-300 flex flex-col',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          {sidebarOpen && (
            <div>
              <h1 className="text-xl font-bold text-blue-400">SmartQueue</h1>
              <p className="text-xs text-gray-400">Super Admin</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-white hover:bg-gray-800"
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            const isMenuOpen = openMenus.includes(item.name);
            const hasChildren = item.children && item.children.length > 0;

            return (
              <div key={item.name}>
                {/* Parent item */}
                {hasChildren ? (
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    )}
                    title={!sidebarOpen ? item.name : undefined}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {sidebarOpen && (
                      <>
                        <span className="text-sm font-medium flex-1 text-left">{item.name}</span>
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 transition-transform',
                            isMenuOpen ? 'rotate-180' : ''
                          )}
                        />
                      </>
                    )}
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    )}
                    title={!sidebarOpen ? item.name : undefined}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {sidebarOpen && (
                      <div className="flex items-center justify-between flex-1">
                        <span className="text-sm font-medium">{item.name}</span>
                        {item.badge && (
                          <span className="px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                )}

                {/* Children items */}
                {hasChildren && isMenuOpen && sidebarOpen && (
                  <div className="mt-1 ml-6 space-y-1">
                    {item.children!.map((child) => {
                      const isChildActive = pathname === child.href;
                      return (
                        <Link
                          key={child.name}
                          href={child.href}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm',
                            isChildActive
                              ? 'bg-blue-500 text-white'
                              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                          )}
                        >
                          <child.icon className="h-4 w-4 flex-shrink-0" />
                          <span>{child.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-gray-800 p-4">
          {sidebarOpen ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                  {user?.first_name?.[0] || 'S'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full text-gray-300 hover:text-white hover:bg-gray-800"
              title="Déconnexion"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
