'use client';

import { CreateRoomForm } from '@/components/room/CreateRoomForm';

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">tRetro</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            Real-time retrospective board for agile teams
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-8">
          <CreateRoomForm />
        </div>
      </div>
    </main>
  );
}
