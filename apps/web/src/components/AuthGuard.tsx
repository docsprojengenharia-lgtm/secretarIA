'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/auth';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading, setAuth, setLoading, logout } = useAuthStore();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    if (!user) {
      setLoading(true);
      api.get<{ user: any; clinic: any }>('/auth/me').then((res) => {
        if (res.success && res.data) {
          setAuth(res.data.user, res.data.clinic);
        } else {
          logout();
          router.replace('/login');
        }
      });
    }
  }, [user, router, setAuth, setLoading, logout]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return <>{children}</>;
}
