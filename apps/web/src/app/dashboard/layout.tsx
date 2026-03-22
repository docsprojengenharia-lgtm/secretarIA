'use client';

import AuthGuard from '@/components/AuthGuard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 ml-16 p-6 overflow-auto">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </AuthGuard>
  );
}
