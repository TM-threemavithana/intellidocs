'use client';

import { useEffect, useState } from 'react';
import { documentApi, OCRJobStatus } from '@/lib/api';

interface JobStatusProps {
  documentId: string;
  onComplete?: () => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function JobStatus({
  documentId,
  onComplete,
  autoRefresh = true,
  refreshInterval = 2000,
}: JobStatusProps) {
  const [jobStatus, setJobStatus] = useState<OCRJobStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const fetchJobStatus = async () => {
      try {
        setError(null);
        const response = await documentApi.getOCRJobStatus(documentId);
        
        if (response.success) {
          setJobStatus(response.jobStatus);

          // If job is completed, call onComplete callback
          if (response.jobStatus.status === 'completed' && onComplete) {
            onComplete();
            if (intervalId) clearInterval(intervalId);
          }

          // If job failed, stop polling
          if (response.jobStatus.status === 'failed') {
            if (intervalId) clearInterval(intervalId);
          }
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch job status');
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchJobStatus();

    // Setup auto-refresh if enabled
    if (autoRefresh) {
      intervalId = setInterval(fetchJobStatus, refreshInterval);
    }

    // Cleanup
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [documentId, autoRefresh, refreshInterval, onComplete]);

  if (loading && !jobStatus) {
    return (
      <div className="flex items-center gap-2 text-gray-600">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
        <span className="text-sm">Checking status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded">
        <p className="text-sm text-red-800">❌ {error}</p>
      </div>
    );
  }

  if (!jobStatus) {
    return (
      <div className="p-3 bg-gray-50 border border-gray-200 rounded">
        <p className="text-sm text-gray-600">No job status available</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'active':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'waiting':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'failed':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'active':
        return '⏳';
      case 'waiting':
        return '⏸';
      case 'failed':
        return '❌';
      default:
        return '❓';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'OCR Complete';
      case 'active':
        return 'Processing OCR';
      case 'waiting':
        return 'Waiting in Queue';
      case 'failed':
        return 'OCR Failed';
      case 'not_found':
        return 'No Job Found';
      default:
        return status;
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getStatusColor(jobStatus.status)}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getStatusIcon(jobStatus.status)}</span>
          <div>
            <p className="font-semibold">{getStatusText(jobStatus.status)}</p>
            {jobStatus.message && (
              <p className="text-sm opacity-75 mt-1">{jobStatus.message}</p>
            )}
          </div>
        </div>

        {jobStatus.status === 'active' && (
          <div className="text-right">
            <p className="text-sm font-semibold">
              {jobStatus.progress || 0}%
            </p>
            {jobStatus.attempts && jobStatus.attempts > 1 && (
              <p className="text-xs opacity-75">
                Attempt {jobStatus.attempts}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Progress Bar for Active Jobs */}
      {jobStatus.status === 'active' && jobStatus.progress !== undefined && (
        <div className="mt-3">
          <div className="w-full bg-white bg-opacity-50 rounded-full h-2">
            <div
              className="bg-current h-2 rounded-full transition-all duration-300"
              style={{ width: `${jobStatus.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Job Details */}
      {jobStatus.jobId && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
          <p className="text-xs opacity-75">
            Job ID: <span className="font-mono">{jobStatus.jobId}</span>
          </p>
        </div>
      )}
    </div>
  );
}
