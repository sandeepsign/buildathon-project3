import { Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/common/Layout'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { ChannelManagement } from '@/components/channels/ChannelManagement'
import { Reports } from '@/components/reports/Reports'

function App() {
  return (
    <div className="w-full">
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/channels" element={<ChannelManagement />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </Layout>
    </div>
  )
}

export default App