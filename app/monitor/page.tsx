'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Leaf, ArrowLeft, CheckCircle2, Clock, AlertCircle, Loader2, CreditCard } from 'lucide-react'
import { PaymentModal } from '@/components/payment-modal'
import {
  startMonitoringJob,
  processPayment,
  pollJobStatus,
  parseClimateResult,
  saveJobToDatabase,
  checkIdentifierExists,
  updatePaymentStatus,
  getAQIColor,
  getAQITextColor,
  type ClimateResult,
  type StartJobResponse
} from '@/lib/api'

function MonitorContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const location = searchParams.get('location') || ''
  const identifier = searchParams.get('identifier') || ''

  const [status, setStatus] = useState<'initializing' | 'awaiting_payment' | 'processing' | 'completed' | 'error'>('initializing')
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [jobData, setJobData] = useState<StartJobResponse | null>(null)
  const [result, setResult] = useState<ClimateResult | null>(null)
  const [error, setError] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const hasInitialized = useRef(false)
  const initializingRef = useRef(false)

  useEffect(() => {
    if (!location || !identifier) {
      router.push('/')
      return
    }

    // Prevent running multiple times
    if (hasInitialized.current) {
      return
    }
    hasInitialized.current = true

    checkAndInitializeJob()
  }, [])

  const checkAndInitializeJob = async () => {
    try {
      // Check database for existing job with this identifier
      setCurrentStep('Checking for existing job...')
      setProgress(10)

      const { exists, job } = await checkIdentifierExists(identifier)

      if (exists && job) {
        // Restore existing job data from database
        console.log('Found existing job in database:', job.jobId)
        const restoredJobData = {
          status: job.status || 'awaiting_payment',
          job_id: job.jobId,
          blockchainIdentifier: job.blockchainIdentifier || '',
          agentIdentifier: job.agentIdentifier || '',
          amounts: job.amounts || [],
          payByTime: job.payByTime || '',
          submitResultTime: job.submitResultTime || '',
          unlockTime: job.unlockTime || '',
          externalDisputeUnlockTime: job.externalDisputeUnlockTime || '',
          sellerVKey: job.sellerVKey || '',
          identifierFromPurchaser: identifier,
          input_hash: job.input_hash || ''
        }
        setJobData(restoredJobData)

        // If already paid, skip to polling
        if (job.amountPaid) {
          console.log('Job already paid, starting polling...')
          setStatus('processing')
          setCurrentStep('AI agents analyzing climate data...')
          setProgress(40)
          startPolling(restoredJobData)
        } else {
          setStatus('awaiting_payment')
          setCurrentStep('Waiting for payment confirmation...')
          setProgress(30)
        }
        return
      }

      // No existing job, create new one
      initializeJob()
    } catch (err) {
      console.error('Error checking existing job:', err)
      // Continue with creating new job if check fails
      initializeJob()
    }
  }

  const initializeJob = async () => {
    // Prevent multiple simultaneous initializations
    if (initializingRef.current) {
      return
    }
    initializingRef.current = true

    try {
      // Step 1: Initialize job
      setStatus('initializing')
      setCurrentStep('Creating monitoring job...')
      setProgress(20)

      const job = await startMonitoringJob(location, identifier)
      setJobData(job)

      // Save to database with full job data
      await saveJobToDatabase(
        identifier,
        job.job_id,
        location,
        `Monitor air quality in ${location}: PM2.5, CO, temperature, and humidity`,
        job
      )

      // Step 2: Wait for payment
      setStatus('awaiting_payment')
      setCurrentStep('Waiting for payment confirmation...')
      setProgress(30)

    } catch (err) {
      console.error('Job initialization error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setStatus('error')
      initializingRef.current = false
    }
  }

  const startPolling = async (jobDataToUse: StartJobResponse) => {
    try {
      const finalStatus = await pollJobStatus(
        jobDataToUse.job_id,
        (statusUpdate) => {
          if (statusUpdate.status === 'running') {
            setProgress(50 + Math.random() * 40) // 50-90%
          }
        }
      )

      // Check if job failed
      if (finalStatus.status === 'failed') {
        setError('⚠️ LLM service limits reached. Please try again in a few minutes.')
        setStatus('error')
        return
      }

      // Step 4: Parse results
      setCurrentStep('Preparing results...')
      setProgress(95)

      if (finalStatus.result) {
        const climateData = parseClimateResult(finalStatus.result)
        setResult(climateData)
        setStatus('completed')
        setProgress(100)
      } else {
        throw new Error('No result data received')
      }
    } catch (err) {
      console.error('Monitoring error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setStatus('error')
    }
  }

  const handlePayment = async () => {
    if (!jobData) return

    try {
      setCurrentStep('Processing payment...')
      setShowPaymentModal(false) // Close modal immediately

      await processPayment(jobData, 'Preprod')

      // Update payment status in database
      await updatePaymentStatus(jobData.job_id)

      // Step 3: Wait for AI processing
      setStatus('processing')
      setCurrentStep('AI agents analyzing climate data...')
      setProgress(40)

      await startPolling(jobData)

    } catch (err) {
      console.error('Payment/Monitoring error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setStatus('error')
      setShowPaymentModal(false)
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'initializing':
      case 'processing':
        return <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      case 'awaiting_payment':
        return <CreditCard className="h-6 w-6 text-orange-600" />
      case 'completed':
        return <CheckCircle2 className="h-6 w-6 text-green-600" />
      case 'error':
        return <AlertCircle className="h-6 w-6 text-red-600" />
    }
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
                <h1 className="text-xl font-bold">Climate Monitor</h1>
                <p className="text-xs text-muted-foreground">Monitoring: {location}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Status Card */}
          {status !== 'completed' && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  {getStatusIcon()}
                  <div>
                    <CardTitle>{currentStep}</CardTitle>
                    <CardDescription>
                      Job ID: {jobData?.job_id || 'Initializing...'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Progress value={progress} className="mb-2" />
                <p className="text-sm text-muted-foreground">{progress}% complete</p>

                {status === 'awaiting_payment' && jobData && (
                  <div className="mt-4 space-y-3">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-md">
                      <p className="text-sm text-blue-900 dark:text-blue-100 mb-3">
                        Your monitoring job has been created. Please proceed with payment to start the analysis.
                      </p>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-blue-700 dark:text-blue-300">Payment Amount</div>
                          <div className="text-xl font-bold text-blue-900 dark:text-blue-100">
                            {jobData.amounts && jobData.amounts[0] && (parseInt(jobData.amounts[0].amount) / 1_000_000).toFixed(2)} ADA
                          </div>
                        </div>
                        <Button
                          size="lg"
                          onClick={() => setShowPaymentModal(true)}
                          className="gap-2"
                        >
                          <CreditCard className="h-4 w-4" />
                          Pay Now
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {status === 'processing' && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      5 AI agents are analyzing your request. This may take 3 - 5 minutes...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {status === 'error' && (
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                  <CardTitle className="text-red-600">Error</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">{error}</p>
                <Button onClick={() => router.push('/')}>
                  Return Home
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {status === 'completed' && result && (
            <>
              {/* Summary Card - Enhanced */}
              <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border-green-200 dark:border-green-800">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl">Analysis Complete</CardTitle>
                        <CardDescription className="text-base mt-1">
                          {result.location && (
                            <span className="flex items-center gap-2 mt-1">
                              <span>📍 {result.location.name}, {result.location.country}</span>
                            </span>
                          )}
                          {result.timestamp && (
                            <span className="flex items-center gap-2 mt-1">
                              <span>🕐 {new Date(Number(result.timestamp) * 1000).toLocaleString()}</span>
                            </span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Data Quality</div>
                      <div className={`text-sm font-semibold ${
                        result.verification?.data_quality === 'excellent' ? 'text-green-600' :
                        result.verification?.data_quality === 'good' ? 'text-blue-600' :
                        result.verification?.data_quality === 'fair' ? 'text-yellow-600' :
                        'text-orange-600'
                      }`}>
                        {result.verification?.data_quality?.toUpperCase() || 'N/A'}
                      </div>
                      {result.verification?.confidence && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {(parseFloat(String(result.verification.confidence)) * 100).toFixed(0)}% Confidence
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* AQI Card - Enhanced */}
              {result.health_assessment && (
                <Card className="border-2 overflow-hidden">
                  <div className={`h-2 ${getAQIColor(result.health_assessment.aqi_overall)}`} />
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Air Quality Index</span>
                      {result.verification?.anomaly_detected && (
                        <span className="text-xs font-normal px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded-full">
                          ⚠️ Anomaly Detected
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="relative">
                        <div className={`text-7xl font-bold ${getAQITextColor(result.health_assessment.aqi_overall)}`}>
                          {result.health_assessment.aqi_overall}
                        </div>
                        <div className="text-xs text-center text-muted-foreground mt-1">AQI Score</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-2xl font-semibold mb-2">
                          {result.health_assessment.risk_category}
                        </div>
                        <div className={`inline-block px-4 py-2 rounded-lg text-sm font-medium text-white ${getAQIColor(result.health_assessment.aqi_overall)} mb-3`}>
                          {result.health_assessment.risk_level.replace('_', ' ').toUpperCase()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {result.location && (
                            <div className="flex items-center gap-2">
                              <span>📍</span>
                              <span>{result.location.name}, {result.location.country}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* AQI Scale */}
                    <div className="mt-6">
                      <div className="h-3 rounded-full overflow-hidden flex">
                        <div className="bg-green-500 flex-1" title="Good (0-50)" />
                        <div className="bg-yellow-500 flex-1" title="Moderate (51-100)" />
                        <div className="bg-orange-500 flex-1" title="Unhealthy for Sensitive (101-150)" />
                        <div className="bg-red-500 flex-1" title="Unhealthy (151-200)" />
                        <div className="bg-purple-500 flex-1" title="Very Unhealthy (201-300)" />
                        <div className="bg-rose-900 flex-1" title="Hazardous (300+)" />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>0</span>
                        <span>50</span>
                        <span>100</span>
                        <span>150</span>
                        <span>200</span>
                        <span>300+</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Measurements Grid - Enhanced */}
              {result.measurements && (
                <div className="grid md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-red-200 dark:border-red-800">
                    <CardHeader className="pb-3">
                      <CardDescription className="flex items-center gap-2">
                        <span className="text-lg">🌫️</span>
                        <span>PM2.5</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                        {result.measurements.pm25 ? Number(result.measurements.pm25).toFixed(1) : 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">μg/m³ (Fine Particles)</div>
                      <div className="mt-2 text-xs">
                        <span className={`px-2 py-0.5 rounded ${
                          Number(result.measurements.pm25 || 0) > 35 ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                        }`}>
                          {Number(result.measurements.pm25 || 0) > 35 ? 'Above WHO Limit' : 'Within Limits'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800">
                    <CardHeader className="pb-3">
                      <CardDescription className="flex items-center gap-2">
                        <span className="text-lg">💨</span>
                        <span>CO</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {result.measurements.co ? Number(result.measurements.co).toFixed(1) : 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">μg/m³ (Carbon Monoxide)</div>
                      <div className="mt-2 text-xs">
                        <span className={`px-2 py-0.5 rounded ${
                          Number(result.measurements.co || 0) > 10000 ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                        }`}>
                          {Number(result.measurements.co || 0) > 10000 ? 'Elevated' : 'Normal Range'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200 dark:border-amber-800">
                    <CardHeader className="pb-3">
                      <CardDescription className="flex items-center gap-2">
                        <span className="text-lg">🌡️</span>
                        <span>Temperature</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                        {result.measurements.temperature ? Number(result.measurements.temperature).toFixed(1) : 'N/A'}°C
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Celsius</div>
                      <div className="mt-2 text-xs">
                        <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
                          {Number(result.measurements.temperature || 0) > 25 ? 'Warm' : Number(result.measurements.temperature || 0) > 15 ? 'Moderate' : 'Cool'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/20 dark:to-emerald-950/20 border-teal-200 dark:border-teal-800">
                    <CardHeader className="pb-3">
                      <CardDescription className="flex items-center gap-2">
                        <span className="text-lg">💧</span>
                        <span>Humidity</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-teal-600 dark:text-teal-400">
                        {result.measurements.humidity ? Number(result.measurements.humidity).toFixed(1) : 'N/A'}%
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Relative Humidity</div>
                      <div className="mt-2 text-xs">
                        <span className="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300">
                          {Number(result.measurements.humidity || 0) > 70 ? 'High' : Number(result.measurements.humidity || 0) > 40 ? 'Comfortable' : 'Low'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Health Recommendations - Enhanced */}
              {result.health_assessment && (
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader className="bg-blue-50/50 dark:bg-blue-950/20">
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-2xl">🏥</span>
                      Health Recommendations & Safety Guidance
                    </CardTitle>
                    <CardDescription>
                      Personalized advice based on current air quality conditions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    {result.health_assessment.health_recommendations && result.health_assessment.health_recommendations.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">General Public</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {result.health_assessment.health_recommendations.map((rec, i) => (
                            <li key={i}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.health_assessment.sensitive_groups_advice && result.health_assessment.sensitive_groups_advice.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Sensitive Groups</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-orange-700 dark:text-orange-400">
                          {result.health_assessment.sensitive_groups_advice.map((advice, i) => (
                            <li key={i}>{advice}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.health_assessment.outdoor_activity_guidance && (
                      <div>
                        <h4 className="font-semibold mb-2">Outdoor Activity Guidance</h4>
                        {Array.isArray(result.health_assessment.outdoor_activity_guidance) ? (
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {result.health_assessment.outdoor_activity_guidance.map((guidance, i) => (
                              <li key={i}>{guidance}</li>
                            ))}
                          </ul>
                        ) : (
                          <div className="grid md:grid-cols-2 gap-3">
                            {Object.entries(result.health_assessment.outdoor_activity_guidance).map(([group, guidance]) => (
                              <div key={group} className="bg-muted p-3 rounded-md">
                                <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                                  {group.replace(/_/g, ' ')}
                                </div>
                                <div className="text-sm">{guidance}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {result.health_assessment.protective_measures && result.health_assessment.protective_measures.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Protective Measures</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {result.health_assessment.protective_measures.map((measure, i) => (
                            <li key={i}>{measure}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Trend Analysis - Enhanced */}
              {result.trend_analysis && (
                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader className="bg-purple-50/50 dark:bg-purple-950/20">
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-2xl">📊</span>
                      Historical Trend Analysis
                    </CardTitle>
                    <CardDescription>
                      7-day trends and 24-hour predictions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Trend Direction:</span>
                          <div className="text-sm font-semibold text-right">
                            {typeof result.trend_analysis.trend_direction === 'string' ? (
                              <span className={
                                result.trend_analysis.trend_direction === 'improving' ? 'text-green-600' :
                                result.trend_analysis.trend_direction === 'worsening' ? 'text-red-600' :
                                'text-yellow-600'
                              }>
                                {result.trend_analysis.trend_direction.toUpperCase()}
                              </span>
                            ) : (
                              <div className="space-y-1">
                                {Object.entries(result.trend_analysis.trend_direction).map(([key, value]) => (
                                  <div key={key}>
                                    <span className="text-muted-foreground">{key.toUpperCase()}:</span>{' '}
                                    <span className={
                                      value === 'improving' ? 'text-green-600' :
                                      value === 'worsening' ? 'text-red-600' :
                                      'text-yellow-600'
                                    }>
                                      {String(value).toUpperCase()}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Change:</span>
                          <div className="text-sm text-right">
                            {typeof result.trend_analysis.trend_magnitude === 'string' ? (
                              result.trend_analysis.trend_magnitude
                            ) : (
                              <div className="space-y-1">
                                {Object.entries(result.trend_analysis.trend_magnitude).map(([key, value]) => (
                                  <div key={key}>
                                    <span className="text-muted-foreground">{key.toUpperCase()}:</span> {String(value)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Confidence:</span>
                          <span className="text-sm">
                            {result.trend_analysis.confidence ? 
                              (typeof result.trend_analysis.confidence === 'number' ? 
                                `${(result.trend_analysis.confidence * 100).toFixed(0)}%` : 
                                String(result.trend_analysis.confidence).toUpperCase()
                              ) : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {result.trend_analysis.historical_average && (
                        <div>
                          <h4 className="font-semibold mb-2 text-sm">Historical Averages (8-day)</h4>
                          {typeof result.trend_analysis.historical_average === 'string' ? (
                            <p className="text-sm text-muted-foreground">{result.trend_analysis.historical_average}</p>
                          ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                              {Object.entries(result.trend_analysis.historical_average).map(([key, value]) => (
                                <div key={key} className="bg-muted p-2 rounded">
                                  <div className="text-xs text-muted-foreground">{key.toUpperCase()}</div>
                                  <div className="font-medium">{String(value)}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {result.trend_analysis.current_vs_average && (
                        <div>
                          <h4 className="font-semibold mb-2 text-sm">Current vs Average</h4>
                          {typeof result.trend_analysis.current_vs_average === 'string' ? (
                            <p className="text-sm text-muted-foreground">{result.trend_analysis.current_vs_average}</p>
                          ) : (
                            <div className="text-sm text-muted-foreground space-y-1">
                              {Object.entries(result.trend_analysis.current_vs_average).map(([key, value]) => {
                                // Handle both string values and nested objects
                                if (typeof value === 'string') {
                                  return <p key={key}>{value}</p>
                                } else if (typeof value === 'object' && value !== null) {
                                  const v = value as any
                                  return (
                                    <p key={key}>
                                      <strong>{key.toUpperCase()}:</strong> Current ({v.current}) is {v.comparison} ({v.average} average)
                                    </p>
                                  )
                                }
                                return null
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {result.trend_analysis.prediction_24h && (
                        <div>
                          <h4 className="font-semibold mb-2 text-sm">24-Hour Forecast</h4>
                          {typeof result.trend_analysis.prediction_24h === 'string' ? (
                            <p className="text-sm text-muted-foreground">{result.trend_analysis.prediction_24h}</p>
                          ) : (
                            <>
                              {typeof result.trend_analysis.prediction_24h === 'object' && 'forecast' in result.trend_analysis.prediction_24h && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  {String(result.trend_analysis.prediction_24h.forecast)}
                                </p>
                              )}
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                {typeof result.trend_analysis.prediction_24h === 'object' && Object.entries(result.trend_analysis.prediction_24h)
                                  .filter(([key]) => key !== 'forecast')
                                  .map(([key, value]) => (
                                    <div key={key} className="bg-blue-50 dark:bg-blue-950 p-2 rounded">
                                      <div className="text-xs text-blue-700 dark:text-blue-300">
                                        {key.replace(/_/g, ' ').toUpperCase()}
                                      </div>
                                      <div className="font-medium text-blue-900 dark:text-blue-100">{String(value)}</div>
                                    </div>
                                  ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {result.trend_analysis.analysis && (
                        <div>
                          <h4 className="font-semibold mb-2 text-sm">Detailed Analysis</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-line">
                            {result.trend_analysis.analysis}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Data Verification - Enhanced */}
              {result.verification && (
                <Card className="border-l-4 border-l-green-500">
                  <CardHeader className="bg-green-50/50 dark:bg-green-950/20">
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-2xl">✓</span>
                      Data Verification & Quality
                    </CardTitle>
                    <CardDescription>
                      Source validation and contextual analysis
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="flex justify-between md:flex-col md:items-start">
                          <span className="text-sm font-medium">Status:</span>
                          <span className={`text-sm font-semibold ${
                            result.verification.status === 'verified' ? 'text-green-600' : 'text-yellow-600'
                          }`}>
                            {result.verification.status?.toUpperCase() || 'N/A'}
                          </span>
                        </div>
                        {result.verification.data_quality && (
                          <div className="flex justify-between md:flex-col md:items-start">
                            <span className="text-sm font-medium">Data Quality:</span>
                            <span className="text-sm font-semibold">{result.verification.data_quality.toUpperCase()}</span>
                          </div>
                        )}
                        {result.verification.confidence !== undefined && (
                          <div className="flex justify-between md:flex-col md:items-start">
                            <span className="text-sm font-medium">Confidence:</span>
                            <span className="text-sm font-semibold">
                              {typeof result.verification.confidence === 'number' 
                                ? (result.verification.confidence * 100).toFixed(0) 
                                : result.verification.confidence}%
                            </span>
                          </div>
                        )}
                      </div>

                      {result.verification.sources && result.verification.sources.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2 text-sm">Data Sources</h4>
                          <div className="flex flex-wrap gap-2">
                            {result.verification.sources.map((source, i) => (
                              <span key={i} className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 rounded-full text-xs font-medium">
                                {source}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {result.verification.anomaly_detected !== undefined && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium">Anomaly Detection:</span>
                            <span className={`text-sm font-semibold ${
                              result.verification.anomaly_detected ? 'text-orange-600' : 'text-green-600'
                            }`}>
                              {result.verification.anomaly_detected ? '⚠️ Anomalies Detected' : '✓ No Anomalies'}
                            </span>
                          </div>
                          {result.verification.anomalies && result.verification.anomalies.length > 0 && (
                            <ul className="list-disc list-inside space-y-1 text-sm text-orange-700 dark:text-orange-400">
                              {result.verification.anomalies.map((anomaly, i) => (
                                <li key={i}>{anomaly}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      {result.verification.contextual_analysis && (
                        <div>
                          <h4 className="font-semibold mb-2 text-sm">Contextual Analysis</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-line">
                            {result.verification.contextual_analysis}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex gap-4">
                <Button onClick={() => router.push('/')} className="flex-1">
                  Monitor Another Location
                </Button>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Payment Modal */}
      {jobData && (
        <PaymentModal
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          jobData={jobData}
          onConfirmPayment={handlePayment}
        />
      )}
    </div>
  )
}

export default function MonitorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <MonitorContent />
    </Suspense>
  )
}
