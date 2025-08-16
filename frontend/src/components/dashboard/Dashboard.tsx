import { useQuery, useMutation } from '@apollo/client'
import { gql } from '@apollo/client'
import { SentimentOverview } from './SentimentOverview'
import { ChannelBreakdown } from './ChannelBreakdown'
import { TrendChart } from './TrendChart'
import { BurnoutAlerts } from './BurnoutAlerts'
import { useState } from 'react'

const GET_DASHBOARD_DATA = gql`
  query GetDashboardData($timeRange: TimeRange) {
    getDashboardData(timeRange: $timeRange) {
      overallSentiment {
        avgScore
        trend
        messageCount
        distribution {
          positive
          negative
          neutral
        }
      }
      channelBreakdown {
        channelId
        channelName
        avgSentiment
        messageCount
        trend
        lastUpdated
      }
      weeklyTrends {
        date
        avgSentiment
        messageCount
      }
      burnoutWarnings {
        id
        channelId
        channelName
        severity
        indicators
        recommendation
        detectedAt
      }
      insights {
        id
        type
        title
        description
        impact
        createdAt
      }
    }
  }
`

const SYNC_ALL_CHANNELS = gql`
  mutation SyncAllChannels {
    syncAllChannels {
      success
      channelCount
      totalMessageCount
      newMessageCount
      errors
    }
  }
`

export function Dashboard() {
  const [syncNotification, setSyncNotification] = useState<{
    show: boolean;
    success: boolean;
    newMessageCount: number;
    channelCount: number;
    errors: string[];
  } | null>(null);

  const { data, loading, error, refetch } = useQuery(GET_DASHBOARD_DATA, {
    pollInterval: 30000 // Poll every 30 seconds
  })

  const [syncChannels, { loading: syncing }] = useMutation(SYNC_ALL_CHANNELS, {
    onCompleted: (data) => {
      const result = data.syncAllChannels;
      setSyncNotification({
        show: true,
        success: result.success,
        newMessageCount: result.newMessageCount,
        channelCount: result.channelCount,
        errors: result.errors
      });
      
      // Auto-hide notification after 5 seconds
      setTimeout(() => setSyncNotification(null), 5000);
      
      // Refetch dashboard data immediately, then again after sentiment analysis completes
      setTimeout(() => refetch(), 1000);
      setTimeout(() => refetch(), 5000); // Allow time for sentiment analysis jobs
      setTimeout(() => refetch(), 10000); // Final refetch to ensure all data is updated
    },
    onError: (error) => {
      console.error('Sync failed:', error);
      setSyncNotification({
        show: true,
        success: false,
        newMessageCount: 0,
        channelCount: 0,
        errors: [error.message]
      });
      setTimeout(() => setSyncNotification(null), 5000);
    }
  })

  const handleSync = () => {
    syncChannels()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <h3 className="text-red-800 font-medium">Error loading dashboard</h3>
        <p className="text-red-600 text-sm mt-1">{error.message}</p>
      </div>
    )
  }

  const dashboardData = data?.getDashboardData

  return (
    <div className="w-full max-w-none space-y-6">
      {/* Sync Notification */}
      {syncNotification?.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border max-w-sm ${
          syncNotification.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                syncNotification.success ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {syncNotification.success ? (
                  <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div>
                <h4 className={`text-sm font-medium ${
                  syncNotification.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {syncNotification.success ? 'Sync Completed' : 'Sync Failed'}
                </h4>
                <p className={`text-xs mt-1 ${
                  syncNotification.success ? 'text-green-600' : 'text-red-600'
                }`}>
                  {syncNotification.success ? (
                    `${syncNotification.newMessageCount} new messages from ${syncNotification.channelCount} channels`
                  ) : (
                    syncNotification.errors[0] || 'Unknown error occurred'
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSyncNotification(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Team Sentiment Dashboard</h1>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md font-medium flex items-center space-x-2"
        >
          {syncing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Syncing...</span>
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Sync Messages</span>
            </>
          )}
        </button>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-grow lg:flex-[3]">
          <SentimentOverview data={dashboardData?.overallSentiment} />
        </div>
        <div className="lg:flex-[1] lg:min-w-[300px]">
          <BurnoutAlerts warnings={dashboardData?.burnoutWarnings || []} />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <TrendChart data={dashboardData?.weeklyTrends || []} />
        </div>
        <div className="flex-1">
          <ChannelBreakdown channels={dashboardData?.channelBreakdown || []} />
        </div>
      </div>

      {dashboardData?.insights && dashboardData.insights.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Key Insights</h3>
          <div className="space-y-3">
            {dashboardData.insights.map((insight: any) => (
              <div key={insight.id} className="border-l-4 border-primary-500 pl-4">
                <h4 className="font-medium text-gray-900">{insight.title}</h4>
                <p className="text-gray-600 text-sm">{insight.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}