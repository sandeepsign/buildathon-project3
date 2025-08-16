import { Link, useLocation } from 'react-router-dom'
import { ChartBarIcon, Cog6ToothIcon, DocumentTextIcon } from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/', icon: ChartBarIcon },
  { name: 'Channels', href: '/channels', icon: Cog6ToothIcon },
  { name: 'Reports', href: '/reports', icon: DocumentTextIcon },
]

export function Navigation() {
  const location = useLocation()

  return (
    <nav className="bg-white shadow">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">
              Employee Engagement Pulse
            </h1>
          </div>
          
          <div className="flex space-x-8">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                    isActive
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="h-5 w-5 mr-2" />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}