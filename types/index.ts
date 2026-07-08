// ─── User ─────────────────────────────────────────────────────────────────────
export type UserRole    = 'customer' | 'worker' | 'admin';
export type WorkerLevel = 'bronze' | 'silver' | 'gold';

// ─── Order ────────────────────────────────────────────────────────────────────
export type OrderStatus =
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
  amount:                  number;
  workerEarning:           number;
  status:                  OrderStatus;
  requestedEmail?:         string;
  // NEW (Issue 1 fix): the account credentials the worker submitted. Only
  // present once status reaches 'credentials_submitted' or later. The
  // customer legitimately needs this — it's the password to their account.
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
  // NEW (Issue 3 — refund flow): only populated on the customer's own
  // order-detail fetch, computed server-side, not stored on the document.
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

// ─── Refund (NEW) ─────────────────────────────────────────────────────────────
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
