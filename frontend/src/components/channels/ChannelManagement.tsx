import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { gql } from '@apollo/client'
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'

const GET_CHANNELS = gql`
  query GetChannels {
    getMonitoredChannels {
      id
      slackChannelId
      channelName
      isActive
      createdAt
    }
    getAvailableChannels {
      id
      name
      isMember
      isPrivate
    }
  }
`

const ADD_MONITORED_CHANNEL = gql`
  mutation AddMonitoredChannel($channelId: String!) {
    addMonitoredChannel(channelId: $channelId) {
      id
      slackChannelId
      channelName
      isActive
    }
  }
`

const REMOVE_MONITORED_CHANNEL = gql`
  mutation RemoveMonitoredChannel($channelId: ID!) {
    removeMonitoredChannel(channelId: $channelId)
  }
`

export function ChannelManagement() {
  const [showAddChannel, setShowAddChannel] = useState(false)
  
  const { data, loading, refetch } = useQuery(GET_CHANNELS)
  const [addChannel] = useMutation(ADD_MONITORED_CHANNEL, {
    onCompleted: () => {
      setShowAddChannel(false)
      refetch()
    }
  })
  const [removeChannel] = useMutation(REMOVE_MONITORED_CHANNEL, {
    onCompleted: () => refetch()
  })

  const handleAddChannel = async (channelId: string) => {
    await addChannel({ variables: { channelId } })
  }

  const handleRemoveChannel = async (channelId: string) => {
    await removeChannel({ variables: { channelId } })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  const monitoredChannels = data?.getMonitoredChannels || []
  const availableChannels = data?.getAvailableChannels || []
  const unmonitoredChannels = availableChannels.filter(
    (available: any) => !monitoredChannels.find((monitored: any) => 
      monitored.slackChannelId === available.id
    )
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Channel Management</h1>
        <button
          onClick={() => setShowAddChannel(!showAddChannel)}
          className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Add Channel</span>
        </button>
      </div>

      {showAddChannel && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add Channel to Monitor</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unmonitoredChannels.map((channel: any) => (
              <div
                key={channel.id}
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleAddChannel(channel.id)}
              >
                <div className="flex items-center space-x-2">
                  <span className="font-medium">#{channel.name}</span>
                  {channel.isPrivate && (
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded">Private</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {channel.isMember ? 'You are a member' : 'Not a member'}
                </p>
              </div>
            ))}
          </div>
          {unmonitoredChannels.length === 0 && (
            <p className="text-gray-500 text-center py-4">
              All available channels are already being monitored
            </p>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Monitored Channels</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {monitoredChannels.map((channel: any) => (
            <div key={channel.id} className="px-6 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">#{channel.channelName}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    channel.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {channel.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Added {format(new Date(channel.createdAt), 'MMM dd, yyyy')}
                </p>
              </div>
              
              <button
                onClick={() => handleRemoveChannel(channel.id)}
                className="text-red-600 hover:text-red-800 p-1"
                title="Remove channel"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          ))}
          
          {monitoredChannels.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500">
              <p>No channels are currently being monitored</p>
              <p className="text-sm mt-1">Add channels to start tracking team sentiment</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}