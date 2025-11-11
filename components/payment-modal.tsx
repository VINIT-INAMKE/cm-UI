'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, CreditCard, Clock, Hash, Network, User } from 'lucide-react'
import type { StartJobResponse } from '@/lib/api'

interface PaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobData: StartJobResponse
  onConfirmPayment: () => Promise<void>
}

export function PaymentModal({ open, onOpenChange, jobData, onConfirmPayment }: PaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handlePayment = async () => {
    if (isProcessing) return // Prevent double-click

    setIsProcessing(true)
    try {
      await onConfirmPayment()
      // Modal will be closed by parent component
    } catch (error) {
      console.error('Payment failed:', error)
      setIsProcessing(false)
      alert('Payment failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  // Reset processing state when modal closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setIsProcessing(false)
    }
    onOpenChange(newOpen)
  }

  // Convert lovelace to ADA (1 ADA = 1,000,000 lovelace)
  const getAmountInADA = () => {
    if (!jobData.amounts || jobData.amounts.length === 0) return '0'
    const lovelace = parseInt(jobData.amounts[0].amount)
    return (lovelace / 1_000_000).toFixed(2)
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(parseInt(timestamp) * 1000)
    return date.toLocaleString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const truncateId = (id: string, start = 8, end = 6) => {
    if (id.length <= start + end) return id
    return `${id.slice(0, start)}...${id.slice(-end)}`
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CreditCard className="h-6 w-6 text-blue-600" />
            Confirm Payment
          </DialogTitle>
          <DialogDescription className="text-base">
            Review payment details and confirm to start climate monitoring
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Payment Amount - Prominent Display */}
          <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <CardContent className="pt-6 pb-6">
              <div className="text-center">
                <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                  Payment Amount
                </div>
                <div className="text-5xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {getAmountInADA()} <span className="text-3xl">ADA</span>
                </div>
                <div className="text-sm text-blue-600/70 dark:text-blue-400/70">
                  {jobData.amounts && jobData.amounts[0] && `${parseInt(jobData.amounts[0].amount).toLocaleString()} lovelace`}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Details Grid */}
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Network className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-muted-foreground mb-1">Network</div>
                <div className="font-mono text-sm font-semibold">Cardano Preprod</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Hash className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-muted-foreground mb-1">Job ID</div>
                <div className="font-mono text-xs break-all">{truncateId(jobData.job_id, 12, 8)}</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Hash className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-muted-foreground mb-1">Blockchain ID</div>
                <div className="font-mono text-xs break-all">{truncateId(jobData.blockchainIdentifier, 12, 8)}</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <User className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-muted-foreground mb-1">Agent ID</div>
                <div className="font-mono text-xs break-all">{truncateId(jobData.agentIdentifier, 16, 8)}</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-muted-foreground mb-1">Payment Deadline</div>
                <div className="text-sm font-medium">{formatTime(jobData.payByTime)}</div>
              </div>
            </div>
          </div>

          {/* Info Banner */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-medium mb-1">Secure Payment via Masumi Protocol</p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  This payment will be processed on Cardano Preprod testnet. Your climate monitoring will begin immediately after confirmation.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isProcessing}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            onClick={handlePayment}
            disabled={isProcessing}
            className="flex-1 sm:flex-none sm:min-w-[140px]"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Pay {getAmountInADA()} ADA
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
