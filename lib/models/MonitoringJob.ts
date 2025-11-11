import mongoose from 'mongoose'

export interface IMonitoringJob {
  purchaserIdentifier: string
  jobId: string
  location: string
  requestText: string
  amountPaid: boolean
  status?: string
  blockchainIdentifier?: string
  agentIdentifier?: string
  amounts?: Array<{amount: string, unit: string}>
  payByTime?: string
  submitResultTime?: string
  unlockTime?: string
  externalDisputeUnlockTime?: string
  sellerVKey?: string
  input_hash?: string
  createdAt: Date
  paidAt?: Date
}

const MonitoringJobSchema = new mongoose.Schema<IMonitoringJob>({
  purchaserIdentifier: {
    type: String,
    required: true,
    index: true
  },
  jobId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  location: {
    type: String,
    required: true
  },
  requestText: {
    type: String,
    required: true
  },
  amountPaid: {
    type: Boolean,
    required: true,
    default: false,
    index: true
  },
  status: String,
  blockchainIdentifier: String,
  agentIdentifier: String,
  amounts: [{
    amount: String,
    unit: String
  }],
  payByTime: String,
  submitResultTime: String,
  unlockTime: String,
  externalDisputeUnlockTime: String,
  sellerVKey: String,
  input_hash: String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  paidAt: Date
})

export default mongoose.models.MonitoringJob || mongoose.model<IMonitoringJob>('MonitoringJob', MonitoringJobSchema)
