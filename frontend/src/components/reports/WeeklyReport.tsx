import { format } from 'date-fns'

interface WeeklyReportData {
  id: string
  weekStart: string
  weekEnd: string
  channelsData: any
  burnoutWarnings: any[]
  insights: any[]
  recommendations: any[]
  createdAt: string
}

interface WeeklyReportProps {
  report: WeeklyReportData
}

export function WeeklyReport({ report }: WeeklyReportProps) {
  const weekRange = `${format(new Date(report.weekStart), 'MMM dd')} - ${format(new Date(report.weekEnd), 'MMM dd, yyyy')}`

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Weekly Team Pulse Report
          </h2>
          <span className="text-sm text-gray-600">{weekRange}</span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-primary-600">
              {report.channelsData?.totalChannels || 0}
            </div>
            <div className="text-sm text-gray-600">Channels Monitored</div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {report.channelsData?.avgSentiment 
                ? Math.round((report.channelsData.avgSentiment + 1) * 50)
                : 0}%
            </div>
            <div className="text-sm text-gray-600">Avg Sentiment</div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {report.burnoutWarnings?.length || 0}
            </div>
            <div className="text-sm text-gray-600">Burnout Alerts</div>
          </div>
        </div>

        {/* Insights */}
        {report.insights && report.insights.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Key Insights</h3>
            <div className="space-y-3">
              {report.insights.map((insight: any) => (
                <div key={insight.id} className="border-l-4 border-primary-500 bg-primary-50 p-4 rounded-r-lg">
                  <h4 className="font-medium text-gray-900">{insight.title}</h4>
                  <p className="text-gray-700 mt-1">{insight.description}</p>
                  <span className={`inline-block mt-2 text-xs px-2 py-1 rounded ${
                    insight.impact === 'HIGH' ? 'bg-red-100 text-red-800' :
                    insight.impact === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {insight.impact} Impact
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {report.recommendations && report.recommendations.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Recommendations</h3>
            <div className="space-y-3">
              {report.recommendations.map((rec: any, index: number) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">{rec.title}</h4>
                    <span className={`text-xs px-2 py-1 rounded ${
                      rec.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                      rec.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {rec.priority}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-3">{rec.description}</p>
                  {rec.actionItems && rec.actionItems.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-1">Action Items:</h5>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        {rec.actionItems.map((item: string, itemIndex: number) => (
                          <li key={itemIndex}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Burnout Warnings */}
        {report.burnoutWarnings && report.burnoutWarnings.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Burnout Warnings</h3>
            <div className="space-y-3">
              {report.burnoutWarnings.map((warning: any) => (
                <div key={warning.id} className="border-l-4 border-red-500 bg-red-50 p-4 rounded-r-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">#{warning.channelName}</h4>
                    <span className={`text-xs px-2 py-1 rounded ${
                      warning.severity === 'HIGH' ? 'bg-red-200 text-red-800' :
                      warning.severity === 'MEDIUM' ? 'bg-yellow-200 text-yellow-800' :
                      'bg-blue-200 text-blue-800'
                    }`}>
                      {warning.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Indicators:</strong> {warning.indicators.join(', ')}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Recommendation:</strong> {warning.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Report Footer */}
        <div className="border-t border-gray-200 pt-4 text-sm text-gray-500">
          Generated on {format(new Date(report.createdAt), 'MMM dd, yyyy \'at\' HH:mm')}
        </div>
      </div>
    </div>
  )
}