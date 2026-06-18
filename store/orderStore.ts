import { create } from 'zustand';
import { OrderStatus } from '@/types';

export interface ActiveOrder {
  _id:             string;
  status:          OrderStatus;
  serviceName:     string;
  workerEarning:   number;
  timerExpiresAt?: string;    // ISO date — used to calculate countdown
  credentialsSubmittedAt?: string;
  autoCompleteAt?: string;
}

interface OrderState {
  activeOrder:    ActiveOrder | null;
  timerSeconds:   number;    // Seconds remaining on the 10-min credential timer
  timerRunning:   boolean;

  setActiveOrder:  (order: ActiveOrder | null) => void;
  setTimerSeconds: (seconds: number) => void;
  setTimerRunning: (running: boolean) => void;
  clearOrder:      () => void;
}

export const useOrderStore = create<OrderState>((set) => ({
  activeOrder:   null,
  timerSeconds:  0,
  timerRunning:  false,

  setActiveOrder:  (order)   => set({ activeOrder: order }),
  setTimerSeconds: (seconds) => set({ timerSeconds: seconds }),
  setTimerRunning: (running) => set({ timerRunning: running }),
  clearOrder:      ()        => set({ activeOrder: null, timerSeconds: 0, timerRunning: false }),
}));
