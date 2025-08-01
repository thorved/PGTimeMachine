'use client';

import { useState, useEffect } from 'react';

interface SystemHealth {
  status: string;
  timestamp: string | null;
  services: {
    postgresql_tools?: {
      status: string;
      error?: string;
      versions?: {
        pg_dump: string;
        psql: string;
      };
    };
  };
}

interface SystemInfo {
  application: {
    name: string;
    version: string;
  };
  postgresql_tools: {
    available: boolean;
    error?: string;
    versions?: {
      pg_dump: string;
      psql: string;
    };
    paths: {
      pg_dump: string;
      psql: string;
    };
  };
}

interface SystemStatusProps {
  showDetails?: boolean;
}

export default function SystemStatus({ showDetails = false }: SystemStatusProps) {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    checkSystemHealth();
    if (showDetails) {
      getSystemInfo();
    }
  }, [showDetails]);

  const checkSystemHealth = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/v1/system/health');
      const result = await response.json();
      
      if (response.ok) {
        setHealth(result.data);
      } else {
        setError(result.error || 'Failed to check system health');
      }
    } catch (error) {
      setError('Network error: Could not connect to backend server');
    } finally {
      setIsLoading(false);
    }
  };

  const getSystemInfo = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/v1/system/info');
      const result = await response.json();
      
      if (result.success) {
        setSystemInfo(result.data);
      }
    } catch (error) {
      console.error('Failed to get system info:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm">Checking system status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-3">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">System Status Check Failed</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const isHealthy = health?.status === 'healthy';
  const toolsAvailable = health?.services?.postgresql_tools?.status === 'healthy';

  return (
    <div className="space-y-4">
      {/* System Health Summary */}
      <div className={`border rounded-md p-4 ${
        isHealthy 
          ? 'bg-green-50 border-green-200' 
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {isHealthy ? (
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <div className="ml-3">
            <h3 className={`text-sm font-medium ${
              isHealthy ? 'text-green-800' : 'text-yellow-800'
            }`}>
              System Status: {isHealthy ? 'Healthy' : 'Degraded'}
            </h3>
            
            {/* PostgreSQL Tools Status */}
            {health?.services?.postgresql_tools && (
              <div className="mt-2">
                <div className="flex items-center space-x-2">
                  <span className={`text-xs font-medium ${
                    toolsAvailable ? 'text-green-700' : 'text-red-700'
                  }`}>
                    PostgreSQL Tools: {toolsAvailable ? 'Available' : 'Not Available'}
                  </span>
                </div>
                
                {!toolsAvailable && health.services.postgresql_tools.error && (
                  <div className="mt-2 text-xs text-red-700 whitespace-pre-line">
                    {health.services.postgresql_tools.error}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed System Information */}
      {showDetails && systemInfo && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">System Information</h4>
          
          <div className="space-y-3 text-sm">
            {/* Application Info */}
            <div>
              <span className="font-medium text-gray-700">Application:</span>
              <span className="ml-2 text-gray-600">
                {systemInfo.application.name} v{systemInfo.application.version}
              </span>
            </div>

            {/* PostgreSQL Tools Info */}
            <div>
              <span className="font-medium text-gray-700">PostgreSQL Tools:</span>
              <div className="ml-4 mt-1 space-y-1">
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    systemInfo.postgresql_tools.available
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {systemInfo.postgresql_tools.available ? 'Available' : 'Not Available'}
                  </span>
                </div>
                
                {systemInfo.postgresql_tools.available && systemInfo.postgresql_tools.versions && (
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>pg_dump: {systemInfo.postgresql_tools.versions.pg_dump}</div>
                    <div>psql: {systemInfo.postgresql_tools.versions.psql}</div>
                  </div>
                )}
                
                {systemInfo.postgresql_tools.error && (
                  <div className="text-xs text-red-600 whitespace-pre-line">
                    {systemInfo.postgresql_tools.error}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
