// ─── User ─────────────────────────────────────────────────────────────────────
export type UserRole    = 'customer' | 'worker' | 'admin';
export type WorkerLevel = 'bronze' | 'silver' | 'gold';

// ─── Order ────────────────────────────────────────────────────────────────────
export type OrderStatus =
  | 'payment_pending'   // NEW: order created, awaiting Cashfree payment confirmation
  | 'payment_failed'    // NEW: payment did not succeed — terminal state
  | 'pending'
  | 'accepted'
  | 'credentials_submitted'
  | 'verification_pending'
  | 'success_confirmed'
  | 'completed'
  | 'under_review'
  | 'cancelled';

export interface Order {
  _id:                     string;
  customerId:              string;
  workerId?:               string;
  serviceName:             string;
  // NOTE: `amount`, `platformCommission`, `commissionRate` are only present
  // when the API response is customer- or admin-facing. The backend strips
  // these entirely for worker-facing responses (marketplace list, worker's
  // own order list/detail) — a worker only ever sees `workerEarning`.
  amount?:                 number;
  workerEarning:           number;
  platformCommission?:     number;
  commissionRate?:         number;
  status:                  OrderStatus;
  requestedEmail?:         string;
  credentials?: {
    email:    string;
    password: string;
    notes?:   string;
  };
  verificationCode?:       string;
  acceptedAt?:             string;
  timerExpiresAt?:         string;
  credentialsSubmittedAt?: string;
  autoCompleteAt?:         string;
  completedAt?:            string;
  createdAt:               string;
  updatedAt:               string;
  refundEligible?:         boolean;
  refundStatus?:           'pending' | 'completed' | 'rejected' | null;
}

// ─── Wallet ───────────────────────────────────────────────────────────────────
export interface Wallet {
  balance:        number;
  pendingBalance: number;
  totalEarned:    number;
}

export type TransactionType = 'credit' | 'debit' | 'withdrawal';

export interface Transaction {
  _id:         string;
  type:        TransactionType;
  amount:      number;
  status:      'pending' | 'completed' | 'failed';
  description: string;
  orderId?:    string;
  createdAt:   string;
}

// ─── Notification ─────────────────────────────────────────────────────────────
export type NotificationType = 'order' | 'withdrawal' | 'verification' | 'dispute' | 'system';

export interface Notification {
  _id:      string;
  title:    string;
  message:  string;
  type:     NotificationType;
  isRead:   boolean;
  orderId?: string;
  createdAt: string;
}

// ─── Withdrawal ───────────────────────────────────────────────────────────────
export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'completed';
export type PaymentMethod    = 'upi' | 'bank';

export interface WithdrawRequest {
  _id:           string;
  workerId:      string;
  amount:        number;
  paymentMethod: PaymentMethod;
  upiId?:        string;
  bankDetails?: {
    accountHolder: string;
    accountNumber: string;
    ifscCode:      string;
    bankName:      string;
  };
  status:       WithdrawalStatus;
  adminNote?:   string;
  processedAt?: string;
  createdAt:    string;
}

// ─── Refund ───────────────────────────────────────────────────────────────────
export type RefundStatus = 'pending' | 'completed' | 'rejected';

export interface RefundRequestType {
  _id:          string;
  orderId:      string;
  customerId:   string;
  amount:       number;
  upiId:        string;
  status:       RefundStatus;
  adminNote?:   string;
  processedAt?: string;
  createdAt:    string;
}

// ─── Dispute ──────────────────────────────────────────────────────────────────
export type DisputeReason =
  | 'wrong_password'
  | 'unable_to_login'
  | 'account_issue'
  | 'other';

export type DisputeStatus = 'open' | 'resolved' | 'rejected';

// ─── Generic API response ─────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?:   T;
}
