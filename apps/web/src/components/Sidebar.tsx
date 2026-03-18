'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { removeToken } from '@/lib/auth';
import { useAuthStore } from '@/store/auth';
import {
  LayoutDashboard,
  Calendar,
  MessageSquare,
  Users,
  UserCog,
  Scissors,
  Settings,
  LogOut,
  Menu,
  X,
  ClipboardList,
  BookOpen,
  CalendarOff,
} from 'lucide-react';

const menuItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Agenda', icon: Calendar, href: '/dashboard/agenda' },
  { label: 'Bloqueios', icon: CalendarOff, href: '/dashboard/blocked-times' },
  { label: 'Solicitacoes', icon: ClipboardList, href: '/dashboard/requests' },
  { label: 'Conversas', icon: MessageSquare, href: '/dashboard/conversations' },
  { label: 'Contatos', icon: Users, href: '/dashboard/contacts' },
  { label: 'Profissionais', icon: UserCog, href: '/dashboard/professionals' },
  { label: 'Servicos', icon: Scissors, href: '/dashboard/services' },
  { label: 'Conhecimento', icon: BookOpen, href: '/dashboard/knowledge' },
  { label: 'Configuracoes', icon: Settings, href: '/dashboard/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { clinic, logout: clearAuth } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    removeToken();
    clearAuth();
    router.replace('/login');
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-md bg-white shadow-md md:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5 text-gray-700" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200 md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-gray-200">
          <span className="font-semibold text-sm text-gray-900 truncate">
            {clinic?.name || 'SecretarIA'}
          </span>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded-md hover:bg-gray-100"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'text-green-700 bg-green-50 border-r-2 border-green-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-2 py-2 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-30 w-16 hover:w-60 bg-white border-r border-gray-200 flex-col transition-all duration-200 group overflow-hidden">
        <div className="flex items-center h-16 border-b border-gray-200 px-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-semibold text-sm text-gray-900 truncate opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {clinic?.name || 'SecretarIA'}
            </span>
          </div>
        </div>

        <nav className="flex-1 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex items-center gap-3 mx-2 px-2.5 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? 'text-green-700 bg-green-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="truncate opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-2">
          <button
            onClick={handleLogout}
            title="Sair"
            className="flex items-center gap-3 w-full px-2.5 py-2.5 rounded-md text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span className="truncate opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              Sair
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
