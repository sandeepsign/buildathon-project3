import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'

interface WeeklyTrend {
  date: string
  avgSentiment: number
  messageCount: number
}

interface TrendChartProps {
  data: WeeklyTrend[]
}

export function TrendChart({ data }: TrendChartProps) {
  const chartData = data.map(item => ({
    ...item,
    date: format(new Date(item.date), 'HH:mm'),
    sentimentPercentage: Math.round((item.avgSentiment + 1) * 50)
  }))

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Sentiment Trends</h3>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              label={{ value: 'Sentiment %', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === 'sentimentPercentage') {
                  return [`${value}%`, 'Sentiment']
                }
                return [value, name]
              }}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="sentimentPercentage"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        Showing sentiment trends over the past 2 hours (10-minute intervals)
      </div>
    </div>
  )
}