import axios from 'axios'

// API Configuration
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || ''

// Type Definitions
export interface StartJobRequest {
  identifier_from_purchaser: string
  input_data: {
    text: string
  }
}

export interface StartJobResponse {
  status: string
  job_id: string
  blockchainIdentifier: string
  submitResultTime: string
  unlockTime: string
  externalDisputeUnlockTime: string
  agentIdentifier: string
  sellerVKey: string
  identifierFromPurchaser: string
  amounts: Array<{amount: string, unit: string}>
  input_hash: string
  payByTime: string
}

export interface PaymentRequest {
  identifierFromPurchaser: string
  network: string
  sellerVkey: string
  blockchainIdentifier: string
  payByTime: string
  submitResultTime: string
  unlockTime: string
  externalDisputeUnlockTime: string
  agentIdentifier: string
  inputHash: string
}

export interface JobStatusResponse {
  job_id: string
  status: 'awaiting_payment' | 'running' | 'completed' | 'failed'
  payment_status: 'pending' | 'completed' | 'unknown' | 'error'
  result?: string
}

export interface VerificationData {
  veracity_score?: number
  confidence?: number | string
  status: 'verified' | 'suspect' | 'rejected'
  contextual_analysis: string
  data_quality: 'excellent' | 'good' | 'fair' | 'poor'
  anomaly_detected: boolean
  anomalies: string[]
  sources: string[]
}

export interface TrendAnalysis {
  trend_direction: string | Record<string, string>
  trend_magnitude: string | Record<string, string>
  historical_average: string | Record<string, string>
  current_vs_average: string | Record<string, string>
  prediction_24h: string | Record<string, string>
  confidence: number | string
  analysis: string
}

export interface HealthAssessment {
  aqi_overall: number
  risk_level: 'good' | 'moderate' | 'unhealthy_sensitive' | 'unhealthy' | 'very_unhealthy' | 'hazardous'
  risk_category: string
  health_recommendations: string[]
  sensitive_groups_advice: string[]
  outdoor_activity_guidance: string[] | Record<string, string>
  protective_measures: string[]
}

export interface ClimateResult {
  agent_id: string
  measurement_type: string
  timestamp: number
  location: {
    lat: string
    lon: string
    name: string
    country: string
  }
  data_hash: string
  measurements: {
    temperature?: string | number
    humidity?: string | number
    pm25?: string | number
    co?: string | number
    [key: string]: string | number | undefined
  }
  verification: VerificationData
  protocol_version: string
  network: string
  signature: string
  trend_analysis: TrendAnalysis
  health_assessment: HealthAssessment
}

// API Functions

/**
 * Start a new climate monitoring job
 */
export async function startMonitoringJob(
  location: string,
  identifier: string
): Promise<StartJobResponse> {
  const response = await axios.post<StartJobResponse>(`${API_BASE}/start_job`, {
    identifier_from_purchaser: identifier,
    input_data: {
      text: `Monitor air quality in ${location}: PM2.5, CO, temperature, and humidity`
    }
  })
  return response.data
}

/**
 * Process payment using Masumi payment service via secure backend API
 */
export async function processPayment(
  jobResponse: StartJobResponse,
  network: string = 'Preprod'
): Promise<void> {
  const paymentRequest: PaymentRequest = {
    identifierFromPurchaser: jobResponse.identifierFromPurchaser,
    network: network,
    sellerVkey: jobResponse.sellerVKey,
    blockchainIdentifier: jobResponse.blockchainIdentifier,
    payByTime: jobResponse.payByTime,
    submitResultTime: jobResponse.submitResultTime,
    unlockTime: jobResponse.unlockTime,
    externalDisputeUnlockTime: jobResponse.externalDisputeUnlockTime,
    agentIdentifier: jobResponse.agentIdentifier,
    inputHash: jobResponse.input_hash
  }

  // Call our backend API route which securely handles the Masumi API key
  await axios.post('/api/payment', paymentRequest, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

/**
 * Check the status of a job
 */
export async function checkJobStatus(jobId: string): Promise<JobStatusResponse> {
  const response = await axios.get<JobStatusResponse>(`${API_BASE}/status`, {
    params: { job_id: jobId }
  })
  return response.data
}

/**
 * Parse climate result from the API response
 * The result comes wrapped in markdown code blocks: ```json\n{...}\n```
 * We need to extract and parse the "674" object
 */
export function parseClimateResult(resultString: string): ClimateResult {
  try {
    // Remove markdown code blocks if present
    let cleanedResult = resultString.trim()

    if (cleanedResult.startsWith('```json')) {
      cleanedResult = cleanedResult.replace(/^```json\n/, '').replace(/\n```$/, '')
    } else if (cleanedResult.startsWith('```')) {
      cleanedResult = cleanedResult.replace(/^```\n/, '').replace(/\n```$/, '')
    }

    // Parse JSON
    const parsed = JSON.parse(cleanedResult)

    // Extract the "674" object (CIP-20 Cardano metadata label)
    const climateData = parsed['674']

    if (!climateData) {
      throw new Error('Climate data not found in response (missing "674" key)')
    }

    return climateData
  } catch (error) {
    console.error('Failed to parse climate result:', error)
    throw new Error('Failed to parse climate data')
  }
}

/**
 * Generate a random 16-digit identifier
 */
export function generateIdentifier(): string {
  let identifier = ''
  for (let i = 0; i < 16; i++) {
    identifier += Math.floor(Math.random() * 10)
  }
  return identifier
}

/**
 * Poll job status until completion or timeout
 * Default: checks every 30 seconds, max 60 attempts (30 minutes total)
 */
export async function pollJobStatus(
  jobId: string,
  onStatusUpdate?: (status: JobStatusResponse) => void,
  maxAttempts = 60,
  intervalMs = 60000
): Promise<JobStatusResponse> {
  let attempts = 0

  while (attempts < maxAttempts) {
    const status = await checkJobStatus(jobId)

    if (onStatusUpdate) {
      onStatusUpdate(status)
    }

    // Check if job is complete
    if (status.status === 'completed' || status.status === 'failed') {
      return status
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, intervalMs))
    attempts++
  }

  throw new Error('Job polling timeout - job did not complete in time')
}

/**
 * Get AQI color based on EPA standards
 */
export function getAQIColor(aqi: number): string {
  if (aqi <= 50) return 'bg-green-500'
  if (aqi <= 100) return 'bg-yellow-500'
  if (aqi <= 150) return 'bg-orange-500'
  if (aqi <= 200) return 'bg-red-500'
  if (aqi <= 300) return 'bg-purple-500'
  return 'bg-rose-900'
}

/**
 * Get AQI text color based on EPA standards
 */
export function getAQITextColor(aqi: number): string {
  if (aqi <= 50) return 'text-green-500'
  if (aqi <= 100) return 'text-yellow-500'
  if (aqi <= 150) return 'text-orange-500'
  if (aqi <= 200) return 'text-red-500'
  if (aqi <= 300) return 'text-purple-500'
  return 'text-rose-900'
}

/**
 * Format timestamp to readable date
 */
export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString()
}

/**
 * Save monitoring job to database
 */
export async function saveJobToDatabase(
  purchaserIdentifier: string,
  jobId: string,
  location: string,
  requestText: string,
  jobData?: StartJobResponse
): Promise<void> {
  await axios.post('/api/jobs', {
    purchaserIdentifier,
    jobId,
    location,
    requestText,
    amountPaid: false,
    ...(jobData && {
      status: jobData.status,
      blockchainIdentifier: jobData.blockchainIdentifier,
      agentIdentifier: jobData.agentIdentifier,
      amounts: jobData.amounts,
      payByTime: jobData.payByTime,
      submitResultTime: jobData.submitResultTime,
      unlockTime: jobData.unlockTime,
      externalDisputeUnlockTime: jobData.externalDisputeUnlockTime,
      sellerVKey: jobData.sellerVKey,
      input_hash: jobData.input_hash
    })
  })
}

/**
 * Update payment status in database
 */
export async function updatePaymentStatus(jobId: string): Promise<void> {
  await axios.patch(`/api/jobs/${jobId}`, {
    amountPaid: true,
    paidAt: new Date().toISOString()
  })
}

/**
 * Fetch all monitoring jobs from database
 */
export async function fetchJobHistory() {
  const response = await axios.get('/api/jobs')
  return response.data.jobs
}

/**
 * Check if an identifier has been used before
 */
export async function checkIdentifierExists(identifier: string): Promise<{ exists: boolean, job?: any }> {
  const response = await axios.get('/api/jobs/check', {
    params: { identifier }
  })
  return response.data
}
