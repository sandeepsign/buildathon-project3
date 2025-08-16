import { useState } from 'react'
import { useQuery } from '@apollo/client'
import { gql } from '@apollo/client'
import { format, startOfWeek, subWeeks } from 'date-fns'
import { WeeklyReport } from './WeeklyReport'

const GET_WEEKLY_REPORT = gql`
  query GetWeeklyReport($weekStart: Date!) {
    getWeeklyReport(weekStart: $weekStart) {
      id
      weekStart
      weekEnd
      channelsData
      burnoutWarnings {
        id
        channelName
        severity
        indicators
        recommendation
      }
      insights {
        id
        type
        title
        description
        impact
      }
      recommendations {
        type
        title
        description
        priority
        actionItems
      }
      createdAt
    }
  }
`

export function Reports() {
  const [selectedWeek, setSelectedWeek] = useState(() => {
    return startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday start
  })

  const { data, loading, error, refetch } = useQuery(GET_WEEKLY_REPORT, {
    variables: { weekStart: selectedWeek }
  })


  const weekOptions = Array.from({ length: 8 }, (_, i) => {
    const week = subWeeks(new Date(), i)
    const weekStart = startOfWeek(week, { weekStartsOn: 1 })
    return weekStart
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Weekly Reports</h1>
        
        <div className="flex items-center space-x-4">
          <select
            value={selectedWeek.toISOString()}
            onChange={(e) => setSelectedWeek(new Date(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            {weekOptions.map((week) => (
              <option key={week.toISOString()} value={week.toISOString()}>
                Week of {format(week, 'MMM dd, yyyy')}
              </option>
            ))}
          </select>
          
          <button
            onClick={() => refetch()}
            className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-red-800 font-medium">Error loading report</h3>
          <p className="text-red-600 text-sm mt-1">{error.message}</p>
        </div>
      )}

      {data?.getWeeklyReport && (
        <WeeklyReport report={data.getWeeklyReport} />
      )}

      {!loading && !error && !data?.getWeeklyReport && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Report Available
          </h3>
          <p className="text-gray-600">
            No report has been generated for the week of {format(selectedWeek, 'MMM dd, yyyy')} yet.
          </p>
        </div>
      )}
    </div>
  )
}