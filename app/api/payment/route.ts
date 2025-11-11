import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      identifierFromPurchaser,
      network,
      sellerVkey,
      blockchainIdentifier,
      payByTime,
      submitResultTime,
      unlockTime,
      externalDisputeUnlockTime,
      agentIdentifier,
      inputHash
    } = body

    // Validate required fields
    if (!identifierFromPurchaser || !blockchainIdentifier || !agentIdentifier) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const PAYMENT_API = process.env.MASUMI_PAYMENT_API ||""
    const MASUMI_API_KEY = process.env.MASUMI_API_KEY

    if (!MASUMI_API_KEY) {
      console.error('MASUMI_API_KEY is not configured')
      return NextResponse.json(
        { error: 'Payment service not configured' },
        { status: 500 }
      )
    }

    // Make payment request to Masumi
    const response = await axios.post(PAYMENT_API, {
      identifierFromPurchaser,
      network,
      sellerVkey,
      blockchainIdentifier,
      payByTime,
      submitResultTime,
      unlockTime,
      externalDisputeUnlockTime,
      agentIdentifier,
      inputHash
    }, {
      headers: {
        'accept': 'application/json',
        'token': MASUMI_API_KEY,
        'Content-Type': 'application/json'
      }
    })

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Payment API error:', error)
    
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        { error: error.response?.data || error.message },
        { status: error.response?.status || 500 }
      )
    }

    return NextResponse.json(
      { error: 'Payment processing failed' },
      { status: 500 }
    )
  }
}
