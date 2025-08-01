'use client';

import { useState } from 'react';
import DatabaseConnection from './components/DatabaseConnection';
import SnapshotManager from './components/SnapshotManager';
import SystemStatus from './components/SystemStatus';

interface DatabaseConfig {
  id?: string;
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl_mode: string;
}

export default function Home() {
  const [currentDatabase, setCurrentDatabase] = useState<DatabaseConfig | null>(null);
  const [activeTab, setActiveTab] = useState('connection');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            PostgreSQL Time Machine
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create snapshots and restore your PostgreSQL databases with ease
          </p>
        </div>

        {/* System Status */}
        <div className="mb-6">
          <SystemStatus />
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('connection')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'connection'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'
                }`}
              >
                Database Connection
              </button>
              <button
                onClick={() => setActiveTab('snapshots')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'snapshots'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'
                }`}
                disabled={!currentDatabase}
              >
                Snapshot Management
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          {activeTab === 'connection' && (
            <DatabaseConnection
              onDatabaseConnected={setCurrentDatabase}
              onSwitchToSnapshots={() => setActiveTab('snapshots')}
            />
          )}
          {activeTab === 'snapshots' && currentDatabase && (
            <SnapshotManager database={currentDatabase} />
          )}
        </div>

        {/* Status Bar */}
        {currentDatabase && (
          <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Connected to: {currentDatabase.name} ({currentDatabase.host}:{currentDatabase.port})
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
