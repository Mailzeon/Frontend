// Cashfree's hosted checkout (Drop-in) SDK. Loaded lazily on first use so it
// never blocks initial page load for users who aren't placing an order.
// Docs: https://www.cashfree.com/docs/payments/online/web/integrations/web-drop-in/quick-start

declare global {
  interface Window {
    Cashfree?: (config: { mode: 'production' | 'sandbox' }) => {
      checkout: (options: {
        paymentSessionId: string;
        redirectTarget?: '_self' | '_blank' | '_modal';
      }) => Promise<unknown>;
    };
  }
}

const SDK_URL = 'https://sdk.cashfree.com/js/v3/cashfree.js';
let sdkLoadPromise: Promise<void> | null = null;

/** Loads the Cashfree SDK script once and caches the loading promise. */
function loadCashfreeSdk(): Promise<void> {
  if (window.Cashfree) return Promise.resolve();
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Cashfree payment SDK.'));
    document.body.appendChild(script);
  });

  return sdkLoadPromise;
}

/**
 * Opens Cashfree's hosted checkout page for the given payment session.
 * `redirectTarget: '_self'` navigates the current tab to Cashfree's page —
 * the customer completes payment there, then Cashfree redirects them back
 * to our `return_url` (set server-side when the session was created).
 */
export async function openCashfreeCheckout(paymentSessionId: string): Promise<void> {
  await loadCashfreeSdk();

  if (!window.Cashfree) {
    throw new Error('Payment SDK did not load correctly. Please refresh and try again.');
  }

  const cashfree = window.Cashfree({ mode: 'production' });
  await cashfree.checkout({
    paymentSessionId,
    redirectTarget: '_self',
  });
}
