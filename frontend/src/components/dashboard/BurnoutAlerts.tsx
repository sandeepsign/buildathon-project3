import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'

interface BurnoutWarning {
  id: string
  channelId: string
  channelName: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  indicators: string[]
  recommendation: string
  detectedAt: string
}

interface BurnoutAlertsProps {
  warnings: BurnoutWarning[]
}

export function BurnoutAlerts({ warnings }: BurnoutAlertsProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'MEDIUM':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'LOW':
        return 'bg-blue-50 border-blue-200 text-blue-800'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  const getSeverityIcon = (severity: string) => {
    if (severity === 'HIGH' || severity === 'MEDIUM') {
      return <ExclamationTriangleIcon className="h-5 w-5" />
    }
    return <InformationCircleIcon className="h-5 w-5" />
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Burnout Alerts</h3>
      
      <div className="space-y-3">
        {warnings.map((warning) => (
          <div
            key={warning.id}
            className={`border rounded-lg p-4 ${getSeverityColor(warning.severity)}`}
          >
            <div className="flex items-start space-x-3">
              {getSeverityIcon(warning.severity)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium">#{warning.channelName}</h4>
                  <span className="text-xs font-medium">
                    {warning.severity}
                  </span>
                </div>
                
                <div className="text-sm mb-2">
                  <strong>Indicators:</strong> {warning.indicators.join(', ')}
                </div>
                
                <div className="text-sm mb-2">
                  <strong>Recommendation:</strong> {warning.recommendation}
                </div>
                
                <div className="text-xs opacity-75">
                  Detected {format(new Date(warning.detectedAt), 'MMM dd, HH:mm')}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {warnings.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <InformationCircleIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p className="font-medium">No burnout alerts</p>
            <p className="text-sm">Your team sentiment looks healthy!</p>
          </div>
        )}
      </div>
    </div>
  )
}