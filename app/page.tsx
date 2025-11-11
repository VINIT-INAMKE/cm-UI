'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Leaf, Wind, Droplets, Thermometer, AlertCircle } from 'lucide-react'
import { generateIdentifier } from '@/lib/api'

export default function HomePage() {
  const router = useRouter()
  const [location, setLocation] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [error, setError] = useState('')

  const handleGenerateIdentifier = () => {
    const newId = generateIdentifier()
    setIdentifier(newId)
  }

  const handleStartMonitoring = () => {
    setError('')

    if (!location.trim()) {
      setError('Please enter a location')
      return
    }

    if (!identifier || identifier.length !== 16) {
      setError('Please generate a valid 16-digit identifier')
      return
    }

    // Navigate to monitoring page with params
    router.push(`/monitor?location=${encodeURIComponent(location)}&identifier=${identifier}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Leaf className="h-8 w-8 text-green-600" />
              <div>
                <h1 className="text-2xl font-bold">Climate Monitor</h1>
                <p className="text-sm text-muted-foreground">
                  AI-powered environmental intelligence on Cardano
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/history')}
            >
              View History
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              Real-time Air Quality Monitoring
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get verified climate data with AI-powered analysis, health recommendations,
              and trend predictions - all secured on the Cardano blockchain.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-4 gap-4 mb-12">
            <Card>
              <CardContent className="pt-6 text-center">
                <Wind className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <h3 className="font-semibold mb-1">Air Quality</h3>
                <p className="text-sm text-muted-foreground">PM2.5, CO, AQI</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Thermometer className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                <h3 className="font-semibold mb-1">Weather</h3>
                <p className="text-sm text-muted-foreground">Temperature, Humidity</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Droplets className="h-8 w-8 mx-auto mb-2 text-cyan-600" />
                <h3 className="font-semibold mb-1">Trends</h3>
                <p className="text-sm text-muted-foreground">7-day analysis</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-600" />
                <h3 className="font-semibold mb-1">Health Alerts</h3>
                <p className="text-sm text-muted-foreground">Risk assessment</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Form */}
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Start Monitoring</CardTitle>
              <CardDescription>
                Enter your location to get real-time climate intelligence
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Location Input */}
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g., Pune, Mumbai, New York"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStartMonitoring()}
                />
              </div>

              {/* Identifier Input */}
              <div className="space-y-2">
                <Label htmlFor="identifier">
                  Identifier <span className="text-muted-foreground">(16 digits)</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="identifier"
                    placeholder="Click Generate ID"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    maxLength={16}
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateIdentifier}
                  >
                    Generate ID
                  </Button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-md text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <Button
                className="w-full"
                size="lg"
                onClick={handleStartMonitoring}
              >
                Start Monitoring
              </Button>

              {/* Info Text */}
              <p className="text-xs text-center text-muted-foreground">
                This will create a monitoring job and simulate payment on Cardano testnet
              </p>
            </CardContent>
          </Card>

          {/* How it Works */}
          <div className="mt-12 max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold mb-4 text-center">How it Works</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg">
                  1
                </div>
                <h4 className="font-semibold mb-2">Submit Location</h4>
                <p className="text-sm text-muted-foreground">
                  Enter the city you want to monitor
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg">
                  2
                </div>
                <h4 className="font-semibold mb-2">AI Analysis</h4>
                <p className="text-sm text-muted-foreground">
                  5 specialized AI agents analyze the data
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg">
                  3
                </div>
                <h4 className="font-semibold mb-2">Get Results</h4>
                <p className="text-sm text-muted-foreground">
                  Receive verified data and recommendations
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Powered by CrewAI × Masumi × Cardano</p>
        </div>
      </footer>
    </div>
  )
}
