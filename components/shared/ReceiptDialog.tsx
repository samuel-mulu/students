'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCalendarSystem } from '@/lib/context/calendar-context';
import { Payment } from '@/lib/types';
import { formatCurrency, formatDate, formatMonthYear } from '@/lib/utils/format';
import { Image as ImageIcon, Printer } from 'lucide-react';
import { useRef, useState } from 'react';

interface ReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: Payment | null;
  payments?: Payment[]; // For bulk payments
  isLoading?: boolean;
}

export function ReceiptDialog({ open, onOpenChange, payment, payments, isLoading }: ReceiptDialogProps) {
  const { calendarSystem } = useCalendarSystem();
  const printRef = useRef<HTMLDivElement>(null);
  const [proofImageViewer, setProofImageViewer] = useState<{
    open: boolean;
    imageUrl: string | null;
    transactionNumber?: string;
  }>({ open: false, imageUrl: null });

  const handlePrint = () => {
    if (!printRef.current) return;

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = printRef.current.innerHTML;
    const receiptNumber = payments && payments.length > 0
      ? payments[0]?.receipt?.receiptNumber || 'Payment Receipt'
      : payment?.receipt?.receiptNumber || 'Payment Receipt';

    const printStyles = `
      <style>
        @media print {
          body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
          .no-print { display: none !important; }
          .receipt-container { max-width: 800px; margin: 0 auto; }
          .receipt-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; position: relative; }
          .receipt-header img { height: 80px; width: auto; margin-bottom: 10px; }
          .receipt-body { margin: 20px 0; }
          .receipt-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .receipt-footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #000; text-align: center; }
          .developer-credit { font-size: 10px; color: #666; position: absolute; top: -10px; right: 0; }
          h1 { margin: 0; font-size: 24px; }
          h2 { margin: 10px 0; font-size: 18px; }
          p { margin: 5px 0; }
        }
        body { font-family: Arial, sans-serif; }
      </style>
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${receiptNumber}</title>
          ${printStyles}
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  // Show loading state
  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b">
            <DialogTitle>Generating Receipt</DialogTitle>
            <DialogDescription>
              Please wait while we generate your receipt...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8 px-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // For bulk payments, use the payments array; otherwise use single payment
  const isBulkPayment = payments && payments.length > 1;
  const displayPayment = payment || (payments && payments[0]);

  if (!displayPayment || !displayPayment.receipt) {
    return null;
  }

  const receipt = displayPayment.receipt;
  const student = displayPayment.student;

  // Calculate total amount and get all months for bulk payments
  const totalAmount = isBulkPayment && payments
    ? payments.reduce((sum, p) => sum + p.amount, 0)
    : displayPayment.amount;

  const paidMonths = isBulkPayment && payments
    ? payments.map(p => formatMonthYear(p.month, p.year, calendarSystem)).join(', ')
    : formatMonthYear(displayPayment.month, displayPayment.year, calendarSystem);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b">
          <DialogTitle>Payment Receipt</DialogTitle>
          <DialogDescription>
            Receipt #{receipt.receiptNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0">
          <div ref={printRef} className="receipt-container">
            <div className="receipt-header relative pt-4">
              <span className="developer-credit hidden print:block text-[10px] absolute top-0 right-0 italic opacity-70">
                © 2ms deelopers 0962520885
              </span>
              <div className="flex flex-col items-center justify-center mb-2">
                <img src="/logo.jpg" alt="Logo" className="h-20 w-auto mb-2" />
                <h1 className="text-2xl font-bold">Payment Receipt</h1>
                <p className="text-sm font-semibold text-blue-600">DIGITAL KG</p>
              </div>
            </div>

            <Card className="receipt-body">
              <CardHeader>
                <CardTitle className="text-lg">Receipt Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="receipt-row">
                  <span className="font-medium text-muted-foreground">Receipt Number:</span>
                  <span className="font-semibold">{receipt.receiptNumber}</span>
                </div>

                <div className="receipt-row">
                  <span className="font-medium text-muted-foreground">Issued Date:</span>
                  <span>{formatDate(receipt.issuedDate)}</span>
                </div>

                {student && (
                  <>
                    <div className="receipt-row">
                      <span className="font-medium text-muted-foreground">Student:</span>
                      <span className="font-semibold">
                        {student.firstName} {student.lastName}
                      </span>
                    </div>
                    {student.parentName && (
                      <div className="receipt-row">
                        <span className="font-medium text-muted-foreground">Parent Name:</span>
                        <span className="font-semibold">{student.parentName}</span>
                      </div>
                    )}
                  </>
                )}

                {displayPayment.paymentType && (
                  <div className="receipt-row">
                    <span className="font-medium text-muted-foreground">Payment Type:</span>
                    <span className="font-semibold">{displayPayment.paymentType.name}</span>
                  </div>
                )}

                {isBulkPayment && payments && payments.length > 1 && (
                  <>
                    <div className="receipt-row">
                      <span className="font-medium text-muted-foreground">Number of Payments:</span>
                      <span className="font-semibold">{payments.length} payment{payments.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="receipt-row">
                      <span className="font-medium text-muted-foreground">Paid For:</span>
                      <span className="font-semibold text-sm">{paidMonths}</span>
                    </div>
                  </>
                )}

                <div className="receipt-row">
                  <span className="font-medium text-muted-foreground">
                    {isBulkPayment ? 'Total Amount:' : 'Amount:'}
                  </span>
                  <span className="font-semibold text-lg">{formatCurrency(totalAmount)}</span>
                </div>

                {!isBulkPayment && (
                  <div className="receipt-row">
                    <span className="font-medium text-muted-foreground">Payment Period:</span>
                    <span>{formatMonthYear(displayPayment.month, displayPayment.year, calendarSystem)}</span>
                  </div>
                )}

                {displayPayment.paymentMethod && (
                  <div className="receipt-row">
                    <span className="font-medium text-muted-foreground">Payment Method:</span>
                    <span className="capitalize">{displayPayment.paymentMethod.replace('_', ' ')}</span>
                  </div>
                )}

                {displayPayment.paymentDate && (
                  <div className="receipt-row">
                    <span className="font-medium text-muted-foreground">Payment Date:</span>
                    <span>{formatDate(displayPayment.paymentDate)}</span>
                  </div>
                )}

                {displayPayment.notes && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="font-medium text-muted-foreground mb-2">Notes:</p>
                    <p className="text-sm">{displayPayment.notes}</p>
                  </div>
                )}

                {(displayPayment.proofImageUrl || displayPayment.transactionNumber) && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="font-medium text-muted-foreground mb-2">Payment Proof:</p>
                    <div className="flex items-center gap-4">
                      {displayPayment.proofImageUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setProofImageViewer({
                            open: true,
                            imageUrl: displayPayment.proofImageUrl!,
                            transactionNumber: displayPayment.transactionNumber,
                          })}
                          className="flex items-center gap-2"
                        >
                          <ImageIcon className="h-4 w-4" />
                          View Proof Image
                        </Button>
                      )}
                      {displayPayment.transactionNumber && (
                        <div className="text-sm">
                          <span className="font-medium text-muted-foreground">Transaction Number: </span>
                          <span className="font-mono font-semibold">{displayPayment.transactionNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="receipt-footer no-print">
              <p className="text-xs text-muted-foreground">
                Thank you for your payment
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="no-print px-6 py-4 flex-shrink-0 border-t bg-muted/50">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print Receipt
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Proof Image Viewer */}
      {proofImageViewer.imageUrl && (
        <Dialog open={proofImageViewer.open} onOpenChange={(open) => setProofImageViewer({ open, imageUrl: null })}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Payment Proof</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-center py-4">
                <img
                  src={proofImageViewer.imageUrl}
                  alt="Payment proof"
                  className="max-w-full max-h-[70vh] rounded-lg object-contain"
                />
              </div>
              {proofImageViewer.transactionNumber && (
                <div className="text-center pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Transaction Number</p>
                  <p className="font-mono font-semibold text-lg">{proofImageViewer.transactionNumber}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
