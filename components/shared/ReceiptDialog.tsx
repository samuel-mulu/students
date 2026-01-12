'use client';

import { Payment, Receipt } from '@/lib/types';
import { formatCurrency, formatDate, formatMonthYear } from '@/lib/utils/format';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer } from 'lucide-react';
import { useRef } from 'react';

interface ReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: Payment | null;
  payments?: Payment[]; // For bulk payments
  isLoading?: boolean;
}

export function ReceiptDialog({ open, onOpenChange, payment, payments, isLoading }: ReceiptDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);

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
          .receipt-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
          .receipt-body { margin: 20px 0; }
          .receipt-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .receipt-footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #000; text-align: center; }
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
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Generating Receipt</DialogTitle>
            <DialogDescription>
              Please wait while we generate your receipt...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
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
    ? payments.map(p => formatMonthYear(p.month, p.year)).join(', ')
    : formatMonthYear(displayPayment.month, displayPayment.year);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payment Receipt</DialogTitle>
          <DialogDescription>
            Receipt #{receipt.receiptNumber}
          </DialogDescription>
        </DialogHeader>

        <div ref={printRef} className="receipt-container">
          <div className="receipt-header">
            <h1 className="text-2xl font-bold">Payment Receipt</h1>
            <p className="text-sm text-muted-foreground">School Management System</p>
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
                    <span className="font-semibold">{payments.length} months</span>
                  </div>
                  <div className="receipt-row">
                    <span className="font-medium text-muted-foreground">Paid Months:</span>
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
                  <span>{formatMonthYear(displayPayment.month, displayPayment.year)}</span>
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
            </CardContent>
          </Card>

          <div className="receipt-footer no-print">
            <p className="text-xs text-muted-foreground">
              Thank you for your payment
            </p>
          </div>
        </div>

        <DialogFooter className="no-print">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
