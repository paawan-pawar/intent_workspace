import { useQuery } from '@tanstack/react-query'
import { apiService } from '@/lib/api'


export function StatusIndicator() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['health'],
    queryFn: apiService.getHealth,
    retry: false,
  })

  return (
    <div className="glass-card p-6 flex flex-col gap-4 w-full max-w-md mx-auto hover-lift">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-surface-50">System Status</h3>
        {isLoading ? (
          <span className="badge-info animate-pulse">Checking...</span>
        ) : isError ? (
          <span className="badge-danger">Offline</span>
        ) : (
          <span className="badge-success">Backend connected</span>
        )}
      </div>

      <div className="divider" />

      <div className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between text-surface-400">
          <span>API Status:</span>
          {isLoading ? (
            <span className="text-surface-500">...</span>
          ) : isError ? (
            <span className="text-danger font-medium">
              {error instanceof Error ? error.message : 'Connection failed'}
            </span>
          ) : (
            <span className="text-success font-medium">{data?.status}</span>
          )}
        </div>
        
        {data && (
          <div className="flex justify-between text-surface-400">
            <span>Last checked:</span>
            <span className="text-surface-300 font-mono text-xs">
              {new Date(data.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
