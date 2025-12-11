// app/admin/layout.tsx
import { Providers } from './providers';
import RootLayoutClient from './layout-client';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <RootLayoutClient>
        {children}
      </RootLayoutClient>
    </Providers>
  );
}