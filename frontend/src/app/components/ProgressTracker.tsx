'use client';

import { useState, useEffect } from 'react';

interface SnapshotProgress {
  snapshot_id: string;
  status: string;
  progress: number;
  message: string;
  file_size?: number;
  started_at?: string;
}

interface ProgressTrackerProps {
  snapshotId: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export default function ProgressTracker({ snapshotId, onComplete, onError }: ProgressTrackerProps) {
  const [progress, setProgress] = useState<SnapshotProgress | null>(null);
  const [isTracking, setIsTracking] = useState(true);

  useEffect(() => {
    if (!isTracking || !snapshotId) return;

    const pollProgress = async () => {
      try {
        const response = await fetch(`http://localhost:8080/api/v1/snapshots/${snapshotId}/progress`);
        const result = await response.json();

        if (result.success) {
          const progressData = result.data;
          setProgress(progressData);

          if (progressData.status === 'completed') {
            setIsTracking(false);
            onComplete?.();
          } else if (progressData.status === 'failed') {
            setIsTracking(false);
            onError?.(progressData.message || 'Snapshot operation failed');
          }
        } else {
          onError?.(result.error || 'Failed to get progress');
          setIsTracking(false);
        }
      } catch (error) {
        onError?.('Network error while checking progress');
        setIsTracking(false);
      }
    };

    // Poll immediately, then every 2 seconds
    pollProgress();
    const interval = setInterval(pollProgress, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [isTracking, snapshotId, onComplete, onError]);

  if (!progress) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        <span className="text-sm text-gray-600 dark:text-gray-400">Starting...</span>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      case 'in_progress':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getProgressBarColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'in_progress':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${getStatusColor(progress.status)}`}>
          {progress.status === 'in_progress' ? 'Creating Backup...' : 
           progress.status === 'completed' ? 'Backup Complete!' :
           progress.status === 'failed' ? 'Backup Failed' : 
           'Processing...'}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {progress.progress}%
        </span>
      </div>
      
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div 
          className={`${getProgressBarColor(progress.status)} h-2 rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${progress.progress}%` }}
        ></div>
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{progress.message}</span>
        {progress.file_size && (
          <span>{formatFileSize(progress.file_size)}</span>
        )}
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
