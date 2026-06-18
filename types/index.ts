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
  _id:                    string;
  customerId:             string;
  workerId?:              string;
  serviceName:            string;
  amount:                 number;
  workerEarning:          number;
  status:                 OrderStatus;
  acceptedAt?:            string;
  timerExpiresAt?:        string;
  credentialsSubmittedAt?: string;
  autoCompleteAt?:        string;
  completedAt?:           string;
  createdAt:              string;
  updatedAt:              string;
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

// ─── Dispute ──────────────────────────────────────────────────────────────────
export type DisputeReason  = 'wrong_password' | 'unable_to_login' | 'account_issue' | 'other';
export type DisputeStatus  = 'open' | 'resolved' | 'rejected';

// ─── Generic API response shape ───────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?:   T;
}
