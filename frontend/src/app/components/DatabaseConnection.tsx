'use client';

import { useState, useEffect } from 'react';

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

interface DatabaseInfo {
  name: string;
  size: string;
  tables: number;
  schemas: string[];
}

interface DatabaseConnectionProps {
  onDatabaseConnected: (database: DatabaseConfig) => void;
  onSwitchToSnapshots: () => void;
}

export default function DatabaseConnection({ onDatabaseConnected, onSwitchToSnapshots }: DatabaseConnectionProps) {
  const [config, setConfig] = useState<DatabaseConfig>({
    name: '',
    host: 'localhost',
    port: 5432,
    database: '',
    username: '',
    password: '',
    ssl_mode: 'disable'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [databaseInfo, setDatabaseInfo] = useState<DatabaseInfo | null>(null);

  // Load saved connection on component mount
  useEffect(() => {
    const savedConnection = localStorage.getItem('pgTimeMachine_lastConnection');
    if (savedConnection) {
      try {
        const parsed = JSON.parse(savedConnection);
        setConfig(parsed);
        // Auto-connect to saved connection
        setTimeout(() => {
          testConnection(parsed);
        }, 500);
      } catch (error) {
        console.error('Failed to load saved connection:', error);
      }
    }
  }, []);

  const handleInputChange = (field: keyof DatabaseConfig, value: string | number) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
    setConnectionStatus('idle');
    setDatabaseInfo(null);
  };

  const testConnection = async (connectionConfig?: DatabaseConfig) => {
    const configToUse = connectionConfig || config;
    setIsLoading(true);
    setConnectionStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch('http://localhost:8080/api/v1/database/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configToUse),
      });

      const result = await response.json();

      if (result.success) {
        setConnectionStatus('success');
        
        // Get database info
        const infoResponse = await fetch('http://localhost:8080/api/v1/database/info', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(configToUse),
        });

        const infoResult = await infoResponse.json();
        if (infoResult.success) {
          setDatabaseInfo(infoResult.data);
        }

        // Save connection
        const saveResponse = await fetch('http://localhost:8080/api/v1/database/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(configToUse),
        });

        const saveResult = await saveResponse.json();
        if (saveResult.success) {
          // Save to localStorage for persistence
          localStorage.setItem('pgTimeMachine_lastConnection', JSON.stringify(configToUse));
          onDatabaseConnected(saveResult.data);
        }
      } else {
        setConnectionStatus('error');
        setErrorMessage(result.error || 'Connection failed');
      }
    } catch (error) {
      setConnectionStatus('error');
      setErrorMessage('Network error: Could not connect to backend server');
    } finally {
      setIsLoading(false);
    }
  };

  const clearSavedConnection = () => {
    localStorage.removeItem('pgTimeMachine_lastConnection');
    setConfig({
      name: '',
      host: 'localhost',
      port: 5432,
      database: '',
      username: '',
      password: '',
      ssl_mode: 'disable'
    });
    setConnectionStatus('idle');
    setDatabaseInfo(null);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Database Connection</h2>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Connection Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Connection Name
            </label>
            <input
              type="text"
              value={config.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="My Database"
            />
          </div>

          {/* Host */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Host
            </label>
            <input
              type="text"
              value={config.host}
              onChange={(e) => handleInputChange('host', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="localhost"
            />
          </div>

          {/* Port */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Port
            </label>
            <input
              type="number"
              value={config.port}
              onChange={(e) => handleInputChange('port', parseInt(e.target.value) || 5432)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="5432"
            />
          </div>

          {/* Database */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Database
            </label>
            <input
              type="text"
              value={config.database}
              onChange={(e) => handleInputChange('database', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="database_name"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Username
            </label>
            <input
              type="text"
              value={config.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="postgres"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              value={config.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="••••••••"
            />
          </div>

          {/* SSL Mode */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              SSL Mode
            </label>
            <select
              value={config.ssl_mode}
              onChange={(e) => handleInputChange('ssl_mode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="disable">Disable</option>
              <option value="require">Require</option>
              <option value="prefer">Prefer</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => testConnection()}
            disabled={isLoading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Testing Connection...
              </>
            ) : (
              'Test Connection'
            )}
          </button>

          <button
            onClick={clearSavedConnection}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md transition-colors duration-200"
          >
            Clear Saved
          </button>
        </div>

        {/* Connection Status */}
        {connectionStatus === 'success' && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-200">Connection Successful!</h3>
                <div className="mt-2">
                  <button
                    onClick={onSwitchToSnapshots}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-1 px-3 rounded text-sm transition-colors duration-200"
                  >
                    Go to Snapshot Management
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {connectionStatus === 'error' && errorMessage && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Connection Failed</h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Database Info */}
        {databaseInfo && connectionStatus === 'success' && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Database Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-600 dark:text-blue-300 font-medium">Size:</span>
                <p className="text-blue-800 dark:text-blue-200">{databaseInfo.size}</p>
              </div>
              <div>
                <span className="text-blue-600 dark:text-blue-300 font-medium">Tables:</span>
                <p className="text-blue-800 dark:text-blue-200">{databaseInfo.tables}</p>
              </div>
              <div>
                <span className="text-blue-600 dark:text-blue-300 font-medium">Schemas:</span>
                <p className="text-blue-800 dark:text-blue-200">{databaseInfo.schemas.length}</p>
              </div>
            </div>
            {databaseInfo.schemas.length > 0 && (
              <div className="mt-3">
                <span className="text-blue-600 dark:text-blue-300 font-medium">Schema List:</span>
                <p className="text-blue-800 dark:text-blue-200 text-sm">{databaseInfo.schemas.join(', ')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
