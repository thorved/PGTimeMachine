'use client';

import { useState, useEffect } from 'react';
import ProgressTracker from './ProgressTracker';

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

interface Snapshot {
  id: string;
  database_id: string;
  name: string;
  description: string;
  file_path: string;
  file_size: number;
  status: string;
  error_message: string;
  created_at: string;
  completed_at?: string;
}

interface RestoreOperation {
  id: string;
  snapshot_id: string;
  database_id: string;
  target_db_name: string;
  status: string;
  error_message: string;
  created_at: string;
  completed_at?: string;
}

interface SnapshotManagerProps {
  database: DatabaseConfig;
}

export default function SnapshotManager({ database }: SnapshotManagerProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [restoreOperations, setRestoreOperations] = useState<RestoreOperation[]>([]);
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | null>(null);
  const [showProgress, setShowProgress] = useState(false);

  // Create snapshot form state
  const [createForm, setCreateForm] = useState({
    name: '',
    description: ''
  });

  // Restore form state
  const [restoreForm, setRestoreForm] = useState({
    target_db_name: ''
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadSnapshots();
  }, [database]);

  const loadSnapshots = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:8080/api/v1/snapshots/?database_id=${database.id}`);
      const result = await response.json();
      
      if (result.success) {
        setSnapshots(result.data || []);
      } else {
        setError(result.error || 'Failed to load snapshots');
      }
    } catch (error) {
      setError('Network error: Could not connect to backend server');
    } finally {
      setIsLoading(false);
    }
  };

  const createSnapshot = async () => {
    if (!createForm.name.trim()) {
      setError('Snapshot name is required');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('http://localhost:8080/api/v1/snapshots/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          database_config: database,
          snapshot_request: {
            database_id: database.id,
            name: createForm.name,
            description: createForm.description
          }
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('Snapshot creation started successfully');
        setShowCreateModal(false);
        setCreateForm({ name: '', description: '' });
        
        // Start progress tracking
        if (result.data && result.data.id) {
          setActiveSnapshotId(result.data.id);
          setShowProgress(true);
        }
        
        loadSnapshots();
      } else {
        setError(result.error || 'Failed to create snapshot');
      }
    } catch (error) {
      setError('Network error: Could not connect to backend server');
    } finally {
      setIsLoading(false);
    }
  };

  const restoreSnapshot = async () => {
    if (!selectedSnapshot) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('http://localhost:8080/api/v1/snapshots/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          database_config: database,
          restore_request: {
            snapshot_id: selectedSnapshot.id,
            database_id: database.id,
            target_db_name: restoreForm.target_db_name
          }
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('Restore operation started successfully');
        setShowRestoreModal(false);
        setRestoreForm({ target_db_name: '' });
        setRestoreOperations([...restoreOperations, result.data]);
      } else {
        setError(result.error || 'Failed to start restore operation');
      }
    } catch (error) {
      setError('Network error: Could not connect to backend server');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSnapshot = async (snapshotId: string) => {
    if (!confirm('Are you sure you want to delete this snapshot? This action cannot be undone.')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`http://localhost:8080/api/v1/snapshots/${snapshotId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('Snapshot deleted successfully');
        loadSnapshots();
      } else {
        setError(result.error || 'Failed to delete snapshot');
      }
    } catch (error) {
      setError('Network error: Could not connect to backend server');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'creating': case 'in_progress': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'failed': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Snapshot Management
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Create Snapshot
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-800 dark:text-green-200">{success}</p>
        </div>
      )}

      {/* Progress Tracker */}
      {showProgress && activeSnapshotId && (
        <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="text-lg font-medium text-blue-800 dark:text-blue-200 mb-3">Creating Snapshot</h3>
          <ProgressTracker 
            snapshotId={activeSnapshotId}
            onComplete={() => {
              setShowProgress(false);
              setActiveSnapshotId(null);
              setSuccess('Snapshot created successfully!');
              loadSnapshots();
            }}
            onError={(error) => {
              setShowProgress(false);
              setActiveSnapshotId(null);
              setError(`Snapshot creation failed: ${error}`);
              loadSnapshots();
            }}
          />
        </div>
      )}

      {/* Snapshots List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Snapshots</h3>
        </div>
        
        {isLoading ? (
          <div className="p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading snapshots...</p>
          </div>
        ) : snapshots.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            No snapshots found. Create your first snapshot to get started.
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {snapshots.map((snapshot) => (
              <div key={snapshot.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                        {snapshot.name}
                      </h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(snapshot.status)}`}>
                        {snapshot.status}
                      </span>
                    </div>
                    {snapshot.description && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {snapshot.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>Created: {formatDate(snapshot.created_at)}</span>
                      {snapshot.file_size > 0 && (
                        <span>Size: {formatFileSize(snapshot.file_size)}</span>
                      )}
                      {snapshot.completed_at && (
                        <span>Completed: {formatDate(snapshot.completed_at)}</span>
                      )}
                    </div>
                    {snapshot.error_message && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                        Error: {snapshot.error_message}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    {snapshot.status === 'completed' && (
                      <button
                        onClick={() => {
                          setSelectedSnapshot(snapshot);
                          setShowRestoreModal(true);
                        }}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        Restore
                      </button>
                    )}
                    <button
                      onClick={() => deleteSnapshot(snapshot.id)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Restore Operations */}
      {restoreOperations.length > 0 && (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Recent Restore Operations</h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {restoreOperations.map((operation) => (
              <div key={operation.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-3">
                      <h4 className="text-md font-medium text-gray-900 dark:text-white">
                        {operation.target_db_name}
                      </h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(operation.status)}`}>
                        {operation.status}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Started: {formatDate(operation.created_at)}
                      {operation.completed_at && ` • Completed: ${formatDate(operation.completed_at)}`}
                    </div>
                    {operation.error_message && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                        Error: {operation.error_message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Snapshot Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Create New Snapshot
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Snapshot Name *
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter snapshot name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Optional description"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateForm({ name: '', description: '' });
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={createSnapshot}
                disabled={!createForm.name.trim() || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Snapshot'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Modal */}
      {showRestoreModal && selectedSnapshot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Restore Snapshot: {selectedSnapshot.name}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target Database Name
                </label>
                <input
                  type="text"
                  value={restoreForm.target_db_name}
                  onChange={(e) => setRestoreForm({ ...restoreForm, target_db_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Leave empty for auto-generated name"
                />
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Warning:</strong> This will create a new database and restore the snapshot data into it.
                  If no name is provided, an auto-generated name will be used.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRestoreModal(false);
                  setSelectedSnapshot(null);
                  setRestoreForm({ target_db_name: '' });
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={restoreSnapshot}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
              >
                {isLoading ? 'Restoring...' : 'Start Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
