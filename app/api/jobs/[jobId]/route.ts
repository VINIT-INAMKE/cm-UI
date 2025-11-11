import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import MonitoringJob from '@/lib/models/MonitoringJob'

// PATCH - Update payment status for a job
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    await connectDB()

    const { jobId } = await params
    const body = await request.json()
    const { amountPaid, paidAt } = body

    if (amountPaid === undefined) {
      return NextResponse.json(
        { error: 'amountPaid field is required' },
        { status: 400 }
      )
    }

    const updatedJob = await MonitoringJob.findOneAndUpdate(
      { jobId },
      {
        $set: {
          amountPaid,
          ...(paidAt && { paidAt: new Date(paidAt) })
        }
      },
      { new: true }
    )

    if (!updatedJob) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, job: updatedJob }, { status: 200 })
  } catch (error) {
    console.error('Error updating job:', error)
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    )
  }
}
