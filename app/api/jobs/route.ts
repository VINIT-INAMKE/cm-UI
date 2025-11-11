import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import MonitoringJob from '@/lib/models/MonitoringJob'

// POST - Save a new monitoring job
export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const body = await request.json()
    const {
      purchaserIdentifier,
      jobId,
      location,
      requestText,
      amountPaid = false,
      status,
      blockchainIdentifier,
      agentIdentifier,
      amounts,
      payByTime,
      submitResultTime,
      unlockTime,
      externalDisputeUnlockTime,
      sellerVKey,
      input_hash
    } = body

    if (!purchaserIdentifier || !jobId || !location || !requestText) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const job = await MonitoringJob.create({
      purchaserIdentifier,
      jobId,
      location,
      requestText,
      amountPaid,
      status,
      blockchainIdentifier,
      agentIdentifier,
      amounts,
      payByTime,
      submitResultTime,
      unlockTime,
      externalDisputeUnlockTime,
      sellerVKey,
      input_hash,
      createdAt: new Date()
    })

    return NextResponse.json({ success: true, job }, { status: 201 })
  } catch (error) {
    console.error('Error saving job:', error)
    return NextResponse.json(
      { error: 'Failed to save job' },
      { status: 500 }
    )
  }
}

// GET - Fetch all monitoring jobs (sorted by most recent)
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const jobs = await MonitoringJob.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()

    return NextResponse.json({ success: true, jobs }, { status: 200 })
  } catch (error) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}
