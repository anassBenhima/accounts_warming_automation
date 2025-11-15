'use client';

import Link from 'next/link';
import { Key, FileText, Image as ImageIcon, Search, Palette, Play } from 'lucide-react';

const quickLinks = [
  {
    title: 'API Keys',
    description: 'Manage your API keys for image generation and keyword search',
    href: '/dashboard/api-keys',
    icon: Key,
    color: 'from-blue-500 to-blue-600',
  },
  {
    title: 'Templates',
    description: 'Create and manage image templates with watermarks and overlays',
    href: '/dashboard/templates',
    icon: Palette,
    color: 'from-purple-500 to-purple-600',
  },
  {
    title: 'New Generation',
    description: 'Start a new Pinterest image generation process',
    href: '/dashboard/new-generation',
    icon: Play,
    color: 'from-green-500 to-green-600',
  },
  {
    title: 'Image to Prompt',
    description: 'Manage prompts for image description',
    href: '/dashboard/image-to-prompt',
    icon: FileText,
    color: 'from-yellow-500 to-yellow-600',
  },
  {
    title: 'Image Generation',
    description: 'Manage prompts for image generation',
    href: '/dashboard/image-generation',
    icon: ImageIcon,
    color: 'from-pink-500 to-pink-600',
  },
  {
    title: 'Keyword Search',
    description: 'Manage prompts for keyword search',
    href: '/dashboard/keyword-search',
    icon: Search,
    color: 'from-indigo-500 to-indigo-600',
  },
];

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Welcome Back!</h1>
        <p className="text-sm md:text-base text-gray-600">
          Manage your Pinterest image automation workflow
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="group relative overflow-hidden bg-white rounded-xl border border-gray-200 p-4 md:p-6 hover:shadow-xl transition-all duration-300"
            >
              <div
                className={`absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br ${link.color} opacity-10 rounded-full -mr-12 md:-mr-16 -mt-12 md:-mt-16 group-hover:scale-150 transition-transform duration-300`}
              />

              <div className="relative">
                <div
                  className={`w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br ${link.color} rounded-lg flex items-center justify-center mb-3 md:mb-4`}
                >
                  <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>

                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-1 md:mb-2">
                  {link.title}
                </h3>

                <p className="text-xs md:text-sm text-gray-600">{link.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
