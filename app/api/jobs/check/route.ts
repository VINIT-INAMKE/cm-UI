import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import MonitoringJob from '@/lib/models/MonitoringJob'

// GET - Check if identifier exists
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const identifier = searchParams.get('identifier')

    if (!identifier) {
      return NextResponse.json(
        { error: 'Identifier is required' },
        { status: 400 }
      )
    }

    // Find most recent job with this identifier
    const existingJob = await MonitoringJob.findOne({
      purchaserIdentifier: identifier
    })
      .sort({ createdAt: -1 })
      .lean()

    if (existingJob) {
      return NextResponse.json({
        exists: true,
        job: existingJob
      })
    } else {
      return NextResponse.json({
        exists: false
      })
    }
  } catch (error) {
    console.error('Error checking identifier:', error)
    return NextResponse.json(
      { error: 'Failed to check identifier' },
      { status: 500 }
    )
  }
}
