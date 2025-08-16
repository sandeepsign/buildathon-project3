import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon } from '@heroicons/react/24/outline'

interface ChannelSentiment {
  channelId: string
  channelName: string
  avgSentiment: number
  messageCount: number
  trend: 'IMPROVING' | 'DECLINING' | 'STABLE'
  lastUpdated: string
}

interface ChannelBreakdownProps {
  channels: ChannelSentiment[]
}

export function ChannelBreakdown({ channels }: ChannelBreakdownProps) {
  const getSentimentColor = (score: number) => {
    if (score > 0.3) return 'bg-sentiment-positive'
    if (score < -0.3) return 'bg-sentiment-negative'
    return 'bg-sentiment-neutral'
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'IMPROVING':
        return <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
      case 'DECLINING':
        return <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />
      default:
        return <MinusIcon className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Channel Breakdown</h3>
      
      <div className="space-y-4">
        {channels.map((channel) => {
          const sentimentPercentage = Math.round((channel.avgSentiment + 1) * 50)
          
          return (
            <div key={channel.channelId} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">
                    #{channel.channelName}
                  </span>
                  {getTrendIcon(channel.trend)}
                </div>
                <span className="text-sm text-gray-500">
                  {channel.messageCount} messages
                </span>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getSentimentColor(channel.avgSentiment)}`}
                    style={{ width: `${sentimentPercentage}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {sentimentPercentage}%
                </span>
              </div>
            </div>
          )
        })}
        
        {channels.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No channels being monitored</p>
            <p className="text-sm mt-1">Add channels to start tracking sentiment</p>
          </div>
        )}
      </div>
    </div>
  )
}