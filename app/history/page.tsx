'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Leaf, ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react'
import { fetchJobHistory, checkJobStatus } from '@/lib/api'

interface JobHistoryItem {
  _id: string
  purchaserIdentifier: string
  jobId: string
  location: string
  requestText: string
  createdAt: string
}

export default function HistoryPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<JobHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      setLoading(true)
      const history = await fetchJobHistory()
      setJobs(history)
    } catch (err) {
      console.error('Error loading history:', err)
      setError('Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  const handleViewJob = async (jobId: string) => {
    try {
      // Check if job is completed
      const status = await checkJobStatus(jobId)
      if (status.status === 'completed') {
        // Navigate to a results view page (we can create this)
        router.push(`/results?job_id=${jobId}`)
      } else {
        alert(`Job status: ${status.status}\nPayment status: ${status.payment_status}`)
      }
    } catch (err) {
      console.error('Error checking job status:', err)
      alert('Failed to check job status')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Leaf className="h-8 w-8 text-green-600" />
              <div>
                <h1 className="text-xl font-bold">Monitoring History</h1>
                <p className="text-xs text-muted-foreground">View all past monitoring requests</p>
              </div>
            </div>
            <div className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={loadHistory}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Monitoring Requests</CardTitle>
              <CardDescription>
                Total requests: {jobs.length}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">Loading history...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-600">{error}</p>
                  <Button onClick={loadHistory} className="mt-4">
                    Retry
                  </Button>
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No monitoring requests yet</p>
                  <Button onClick={() => router.push('/')}>
                    Start Monitoring
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Identifier</TableHead>
                        <TableHead>Job ID</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs.map((job) => (
                        <TableRow key={job._id}>
                          <TableCell className="font-medium">
                            {formatDate(job.createdAt)}
                          </TableCell>
                          <TableCell>{job.location}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {job.purchaserIdentifier}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {job.jobId.slice(0, 8)}...
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewJob(job.jobId)}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
