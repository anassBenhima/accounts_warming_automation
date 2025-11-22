'use client';

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Key,
  FileText,
  Image as ImageIcon,
  Search,
  Palette,
  Play,
  LogOut,
  History,
  FileText as LogsIcon,
  Menu,
  X,
  Layers,
  Archive,
  Users,
  Zap,
  Code,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';
import NotificationToggle from '@/components/NotificationToggle';
import SessionErrorHandler from '@/components/SessionErrorHandler';

const navigationGroups = [
  {
    name: 'Generation',
    items: [
      { name: 'Quick Generation', href: '/dashboard/quick-generation', icon: Zap },
      { name: 'New Generation', href: '/dashboard/new-generation', icon: Play },
      { name: 'Bulk Generation', href: '/dashboard/bulk-generation', icon: Layers },
    ],
  },
  {
    name: 'History',
    items: [
      { name: 'History', href: '/dashboard/history', icon: History },
      { name: 'Bulk History', href: '/dashboard/bulk-history', icon: Archive },
    ],
  },
  {
    name: 'Prompts',
    items: [
      { name: 'Image to Prompt', href: '/dashboard/image-to-prompt', icon: FileText },
      { name: 'Image Generation', href: '/dashboard/image-generation', icon: ImageIcon },
      { name: 'Keyword Search', href: '/dashboard/keyword-search', icon: Search },
    ],
  },
  {
    name: 'Configuration',
    items: [
      { name: 'API Keys', href: '/dashboard/api-keys', icon: Key },
      { name: 'Templates', href: '/dashboard/templates', icon: Palette },
      { name: 'HTML Templates', href: '/dashboard/html-templates', icon: Code },
    ],
  },
  {
    name: 'System',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'System Logs', href: '/dashboard/logs', icon: LogsIcon },
    ],
  },
];

function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProfilePopover, setShowProfilePopover] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(['Generation']);

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev =>
      prev.includes(groupName)
        ? prev.filter(g => g !== groupName)
        : [groupName] // Close all other groups and open only this one
    );
  };

  const isGroupActive = (items: { href: string }[]) => {
    return items.some(item => pathname === item.href);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <SessionErrorHandler />

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Pinterest Auto
          </h1>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-700" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Desktop Navbar */}
      <div className="hidden lg:block fixed top-0 left-64 right-0 bg-white border-b border-gray-200 z-30">
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Dashboard
            </h2>
          </div>

          {/* Profile Section */}
          <div className="relative">
            <button
              onClick={() => setShowProfilePopover(!showProfilePopover)}
              className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-all"
            >
              <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {session?.user?.name?.charAt(0).toUpperCase() || session?.user?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <div className="font-medium text-sm text-gray-900">{session?.user?.name || 'User'}</div>
                <div className="text-xs text-gray-500">{session?.user?.email}</div>
              </div>
            </button>

            {/* Desktop Profile Popover */}
            {showProfilePopover && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowProfilePopover(false)}
                />
                <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-40 p-4">
                  <div className="mb-3 pb-3 border-b border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-shrink-0 h-12 w-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                        {session?.user?.name?.charAt(0).toUpperCase() || session?.user?.email?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="font-semibold text-gray-900 truncate">{session?.user?.name || 'User'}</div>
                        <div className="text-sm text-gray-500 truncate">{session?.user?.email}</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600">
                      Role: <span className="font-medium text-purple-600">{session?.user?.role}</span>
                    </div>
                  </div>
                  <Link
                    href="/dashboard/profile"
                    onClick={() => setShowProfilePopover(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors mb-2"
                  >
                    <Users className="w-4 h-4" />
                    Edit Profile
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-40 transform transition-transform duration-300 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 md:p-6 border-b border-gray-200 mt-16 lg:mt-0">
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Pinterest Auto
            </h1>
            <p className="text-xs md:text-sm text-gray-500 mt-1 truncate">{session?.user?.email}</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 md:p-4 space-y-2 overflow-y-auto">
            {navigationGroups.map((group) => {
              const isOpen = openGroups.includes(group.name);
              const hasActiveItem = isGroupActive(group.items);

              return (
                <div key={group.name} className="space-y-1">
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(group.name)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-sm font-semibold ${
                      hasActiveItem
                        ? 'bg-gradient-to-r from-blue-100 to-purple-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span>{group.name}</span>
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  {/* Group Items */}
                  {isOpen && (
                    <div className="ml-2 space-y-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-lg transition-all text-sm ${
                              isActive
                                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <Icon className="w-4 h-4 flex-shrink-0" />
                            <span className="font-medium">{item.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Admin-only Users Module */}
            {session?.user?.role === 'ADMIN' && (
              <div className="pt-2 border-t border-gray-200">
                <Link
                  href="/dashboard/users"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-lg transition-all text-sm ${
                    pathname === '/dashboard/users'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Users className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium">Users</span>
                </Link>
              </div>
            )}
          </nav>

          {/* Notification Toggle */}
          <NotificationToggle />

          {/* Profile Section */}
          <div className="p-3 md:p-4 border-t border-gray-200 relative">
            <button
              onClick={() => setShowProfilePopover(!showProfilePopover)}
              className="flex items-center gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-all w-full text-sm md:text-base"
            >
              <div className="flex-shrink-0 h-8 w-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                {session?.user?.name?.charAt(0).toUpperCase() || session?.user?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 text-left overflow-hidden">
                <div className="font-medium truncate text-sm">{session?.user?.name || 'User'}</div>
                <div className="text-xs text-gray-500 truncate">{session?.user?.email}</div>
              </div>
            </button>

            {/* Profile Popover */}
            {showProfilePopover && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowProfilePopover(false)}
                />
                <div className="absolute bottom-full left-3 mb-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-40 p-4">
                  <div className="mb-3 pb-3 border-b border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-shrink-0 h-12 w-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                        {session?.user?.name?.charAt(0).toUpperCase() || session?.user?.email?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="font-semibold text-gray-900 truncate">{session?.user?.name || 'User'}</div>
                        <div className="text-sm text-gray-500 truncate">{session?.user?.email}</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600">
                      Role: <span className="font-medium text-purple-600">{session?.user?.role}</span>
                    </div>
                  </div>
                  <Link
                    href="/dashboard/profile"
                    onClick={() => {
                      setShowProfilePopover(false);
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    Edit Profile
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Logout */}
          <div className="p-3 md:p-4 border-t border-gray-200">
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg text-red-600 hover:bg-red-50 transition-all w-full text-sm md:text-base"
            >
              <LogOut className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64 pt-16 lg:pt-20 p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">{children}</div>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <DashboardContent>{children}</DashboardContent>
    </SessionProvider>
  );
}
