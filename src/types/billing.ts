import { Timestamp } from 'firebase/firestore';

export interface BillingControl {
  lastBillingDate: Timestamp;
  nextBillingDate?: Timestamp;
  totalLastInvoice?: number;
}

export interface AppFee {
  storeId: string;
  orderId: string;
  value: number;
  orderDate: Timestamp;
  description?: string;
  settled: boolean;
  isPremiumRate?: boolean;
  percentage: number;
  customerId?: string;
  lastBillingDate?: Timestamp | null;
  orderTotalPrice: number;
  paymentMethod: string;
} 