declare module 'react-native-razorpay' {
  interface RazorpayCheckoutOptions {
    key: string;
    amount: string;
    currency: string;
    name: string;
    description?: string;
    order_id: string;
    theme?: { color?: string; backdrop_color?: string };
    method?: 'card' | 'netbanking' | 'wallet' | 'upi' | 'emi';
    prefill?: { email?: string; contact?: string; name?: string };
    retry?: { enabled?: boolean; max_count?: number };
  }

  interface RazorpayCheckoutResult {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }

  const RazorpayCheckout: {
    open(options: RazorpayCheckoutOptions): Promise<RazorpayCheckoutResult>;
  };

  export default RazorpayCheckout;
}
