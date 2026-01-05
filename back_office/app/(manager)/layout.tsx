import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { AuthGuard } from '@/components/auth/auth-guard';

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard requiredRoles={['manager', 'admin', 'super-admin']}>
      <DashboardLayout>{children}</DashboardLayout>
    </AuthGuard>
  );
}
