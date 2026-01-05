import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { AuthGuard } from '@/components/auth/auth-guard';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard requiredRoles={['super-admin']}>
      <DashboardLayout>{children}</DashboardLayout>
    </AuthGuard>
  );
}
