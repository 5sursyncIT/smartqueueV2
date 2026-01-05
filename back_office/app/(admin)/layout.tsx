import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { AuthGuard } from '@/components/auth/auth-guard';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard requiredRoles={['admin', 'super-admin']}>
      <DashboardLayout>{children}</DashboardLayout>
    </AuthGuard>
  );
}
