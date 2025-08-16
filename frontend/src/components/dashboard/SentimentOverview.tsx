import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon } from '@heroicons/react/24/outline'

interface SentimentSummary {
  avgScore: number
  trend: 'IMPROVING' | 'DECLINING' | 'STABLE'
  messageCount: number
  distribution: {
    positive: number
    negative: number
    neutral: number
  }
}

interface SentimentOverviewProps {
  data?: SentimentSummary
}

export function SentimentOverview({ data }: SentimentOverviewProps) {
  if (!data) return null

  const getSentimentColor = (score: number) => {
    if (score > 0.3) return 'text-sentiment-positive'
    if (score < -0.3) return 'text-sentiment-negative'
    return 'text-sentiment-neutral'
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'IMPROVING':
        return <ArrowTrendingUpIcon className="h-5 w-5 text-green-500" />
      case 'DECLINING':
        return <ArrowTrendingDownIcon className="h-5 w-5 text-red-500" />
      default:
        return <MinusIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const sentimentPercentage = Math.round((data.avgScore + 1) * 50) // Convert -1,1 to 0-100

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Overall Team Sentiment</h3>
        {getTrendIcon(data.trend)}
      </div>
      
      <div className="flex items-center space-x-6">
        <div className="text-center">
          <div className={`text-4xl font-bold ${getSentimentColor(data.avgScore)}`}>
            {sentimentPercentage}%
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Sentiment Score
          </div>
        </div>
        
        <div className="flex-1">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-semibold text-sentiment-positive">
                {data.distribution.positive}
              </div>
              <div className="text-xs text-gray-600">Positive</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-sentiment-neutral">
                {data.distribution.neutral}
              </div>
              <div className="text-xs text-gray-600">Neutral</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-sentiment-negative">
                {data.distribution.negative}
              </div>
              <div className="text-xs text-gray-600">Negative</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          Based on {data.messageCount.toLocaleString()} messages analyzed
        </p>
      </div>
    </div>
  )
}