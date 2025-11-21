'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UserFilterProps {
  onFilterChange: (userId: string | null) => void;
}

export default function UserFilter({ onFilterChange }: UserFilterProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetch('/api/users/list')
        .then((res) => res.json())
        .then(setUsers)
        .catch((error) => console.error('Error fetching users:', error));
    }
  }, [session]);

  const handleChange = (value: string) => {
    setSelectedUserId(value);
    onFilterChange(value || null);
  };

  if (session?.user?.role !== 'ADMIN') return null;

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Filter by User:
      </label>
      <select
        value={selectedUserId}
        onChange={(e) => handleChange(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
      >
        <option value="">All Users</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name} ({user.email})
          </option>
        ))}
      </select>
    </div>
  );
}
