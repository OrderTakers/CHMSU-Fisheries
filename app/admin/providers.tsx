// app/admin/providers.tsx
"use client";

import { NotificationProvider } from "@/components/providers/notification-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <NotificationProvider>
        {children}
      </NotificationProvider>
    </TooltipProvider>
  );
}