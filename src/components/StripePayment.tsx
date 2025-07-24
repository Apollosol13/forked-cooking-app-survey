import React, { useState } from 'react';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// Load Stripe outside of component to avoid recreating
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '16px',
      fontSmoothing: 'antialiased',
      '::placeholder': {
        color: '#8b9dc3',
      },
    },
    invalid: {
      color: '#fa755a',
      iconColor: '#fa755a',
    },
  },
  hidePostalCode: false,
};

interface CheckoutFormProps {
  userId: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ userId, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardError, setCardError] = useState<string>('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      onError('Stripe has not loaded yet. Please try again.');
      return;
    }

    setIsProcessing(true);
    setCardError('');

    try {
      // Create payment intent on your server
      const response = await fetch('/.netlify/functions/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 99, // $0.99 in cents
          currency: 'usd',
          userId: userId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment intent');
      }

      const { clientSecret } = await response.json();

      // Confirm payment with Stripe
      const cardElement = elements.getElement(CardElement);
      
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement as any, // Type assertion to fix Stripe types issue
          billing_details: {
            // Add billing details if needed in the future
          },
        },
      });

      if (result.error) {
        onError(result.error.message || 'Payment failed');
      } else if (result.paymentIntent?.status === 'succeeded') {
        // Payment successful!
        onSuccess();
      } else {
        onError('Payment was not completed successfully');
      }
    } catch (error) {
      console.error('Payment error:', error);
      onError(error instanceof Error ? error.message : 'Network error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardChange = (event: any) => {
    if (event.error) {
      setCardError(event.error.message);
    } else {
      setCardError('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-300">
          Card Information
        </label>
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 focus-within:border-gray-500 transition-colors">
          <CardElement 
            options={CARD_ELEMENT_OPTIONS} 
            onChange={handleCardChange}
          />
        </div>
        {cardError && (
          <p className="text-red-400 text-sm mt-2">{cardError}</p>
        )}
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex justify-between items-center text-sm text-gray-300 mb-2">
          <span>ForkedAI Recipe Access</span>
          <span>$0.99</span>
        </div>
        <div className="flex justify-between items-center font-bold">
          <span>Total</span>
          <span>$0.99</span>
        </div>
      </div>
      
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className={`w-full px-8 py-4 rounded-lg font-bold text-lg transition-colors ${
          isProcessing
            ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
            : 'bg-white text-black hover:bg-gray-200'
        }`}
      >
        {isProcessing ? 'Processing Payment...' : 'Pay $0.99'}
      </button>

      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          <span>Secured by Stripe</span>
        </div>
      </div>
    </form>
  );
};

interface StripePaymentProps {
  userId: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

const StripePayment: React.FC<StripePaymentProps> = ({ userId, onSuccess, onError }) => {
  return (
    <Elements stripe={stripePromise}>
      <div className="max-w-md mx-auto">
        <CheckoutForm userId={userId} onSuccess={onSuccess} onError={onError} />
      </div>
    </Elements>
  );
};

export default StripePayment; 