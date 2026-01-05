import { SuperAdminLayout } from '@/components/superadmin/superadmin-layout';
import { AuthGuard } from '@/components/auth/auth-guard';

export default function SuperAdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard requiredRoles={['super-admin']}>
      <SuperAdminLayout>{children}</SuperAdminLayout>
    </AuthGuard>
  );
}
