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
}

export function ReceiptDialog({ open, onOpenChange, payment }: ReceiptDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = printRef.current.innerHTML;
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
          <title>Receipt - ${payment?.receipt?.receiptNumber || 'Payment Receipt'}</title>
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

  if (!payment || !payment.receipt) {
    return null;
  }

  const receipt = payment.receipt;
  const student = payment.student;

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

              {payment.paymentType && (
                <div className="receipt-row">
                  <span className="font-medium text-muted-foreground">Payment Type:</span>
                  <span className="font-semibold">{payment.paymentType.name}</span>
                </div>
              )}

              <div className="receipt-row">
                <span className="font-medium text-muted-foreground">Amount:</span>
                <span className="font-semibold text-lg">{formatCurrency(payment.amount)}</span>
              </div>

              <div className="receipt-row">
                <span className="font-medium text-muted-foreground">Payment Period:</span>
                <span>{formatMonthYear(payment.month, payment.year)}</span>
              </div>

              {payment.paymentMethod && (
                <div className="receipt-row">
                  <span className="font-medium text-muted-foreground">Payment Method:</span>
                  <span className="capitalize">{payment.paymentMethod.replace('_', ' ')}</span>
                </div>
              )}

              {payment.paymentDate && (
                <div className="receipt-row">
                  <span className="font-medium text-muted-foreground">Payment Date:</span>
                  <span>{formatDate(payment.paymentDate)}</span>
                </div>
              )}

              {payment.notes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="font-medium text-muted-foreground mb-2">Notes:</p>
                  <p className="text-sm">{payment.notes}</p>
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
