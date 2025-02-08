/** @jsxImportSource solid-js */
import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import hostedFields from 'braintree-web/hosted-fields';
import type { HostedFields, HostedFieldsEvent } from 'braintree-web/hosted-fields';
interface Props {
  onValidityChange: (isValid: boolean) => void;
  onTokenize: (payload: { nonce: string }) => void;
}
interface BraintreeField {
  selector: string;
  placeholder: string;
}
interface HostedFieldData {
  isEmpty: boolean;
  isValid: boolean;
  isPotentiallyValid: boolean;
  isFocused: boolean;
}
export const BraintreeHostedFields = (props: Props) => {
  const [hostedFieldsInstance, setHostedFieldsInstance] = createSignal<HostedFields | null>(null);
  const [isValid, setIsValid] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [retryCount, setRetryCount] = createSignal(0);
  const MAX_RETRIES = 3;
  onMount(() => {
    const tokenizationKey = window.BRAINTREE_TOKENIZATION_KEY;
    if (!tokenizationKey) {
      setError('Missing Braintree tokenization key');
      return;
    }
    hostedFields.create({
      authorization: tokenizationKey,
      fields: {
        number: {
          selector: '#card-number',
          placeholder: 'Card Number'
        },
        cvv: {
          selector: '#cvv',
          placeholder: 'CVV'
        },
        expirationDate: {
          selector: '#expiration-date',
          placeholder: 'MM/YY'
        }
      }
    }).then((instance: HostedFields) => {
      setHostedFieldsInstance(instance);
      // Debounced validity check to prevent excessive updates
      let validityTimeout: number;
      instance.on('validityChange', (event: HostedFieldsEvent) => {
        clearTimeout(validityTimeout);
        validityTimeout = window.setTimeout(() => {
          const fields = event.fields as Record<string, HostedFieldData>;
          const formValid = Object.values(fields).every(
            field => field.isValid === true
          );
          if (isValid() !== formValid) {
            setIsValid(formValid);
            props.onValidityChange(formValid);
          }
        }, 300);
      });
    }).catch((err: Error) => {
      setError(err.message || 'Failed to initialize payment fields');
    });
    onCleanup(() => {
      hostedFieldsInstance()?.teardown();
    });
  });
  const handleSubmit = async () => {
    const instance = hostedFieldsInstance();
    if (!instance) {
      setError('Payment system not initialized');
      return;
    }
    if (isLoading()) return;

    setIsLoading(true);
    try {
      const { nonce } = await instance.tokenize();
      setError(null);
      setRetryCount(0);
      props.onTokenize({ nonce });
    } catch (error) {
      console.error('Error tokenizing:', error);
      if (retryCount() < MAX_RETRIES) {
        setRetryCount(count => count + 1);
        setTimeout(() => handleSubmit(), 1000 * Math.pow(2, retryCount())); // Exponential backoff
        setError(`Payment processing failed. Retrying... (Attempt ${retryCount() + 1}/${MAX_RETRIES})`);
      } else {
        setError(error instanceof Error ? error.message : 'Payment processing failed after multiple attempts');
      }
    } finally {
      setIsLoading(false);
    }
  };
  // Use onMount instead of createEffect for one-time event listener setup
  onMount(() => {
    const handler = () => handleSubmit();
    document.addEventListener('tokenize-payment', handler);
    onCleanup(() => {
      document.removeEventListener('tokenize-payment', handler);
    });
  });
  return (
    <div class="hosted-fields-wrapper">
      {error() && (
        <div class="error-message" role="alert">
          {error()}
        </div>
      )}
      {isLoading() && (
        <div class="loading-indicator" role="status">
          Processing payment...
        </div>
      )}
      <div class="card-number-wrapper">
        <div id="card-number" class="hosted-field"></div>
        <img src="/assets/checkout/card-lock.webp" alt="Lock" class="lock-icon" />
      </div>
      <div class="expiry-security">
        <div id="expiration-date" class="hosted-field"></div>
        <div id="cvv" class="hosted-field"></div>
      </div>
      <style>{`
        .hosted-field {
          height: 48px;
          border: 1px solid #333;
          border-radius: 4px;
          background: #f9f9f9;
          padding: 0.75rem;
          font-size: 16px;
          display: flex;
          align-items: center;
        }
        ::placeholder {
          color: #999;
          font-weight: normal;
        }
        
        .error-message {
          color: #E53935;
          padding: 0.5rem;
          margin-bottom: 1rem;
          background-color: #FFEBEE;
          border-radius: 4px;
        }
        
        .hosted-fields-wrapper {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .card-number-wrapper {
          position: relative;
        }
        .lock-icon {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 20px;
          height: 20px;
          pointer-events: none;
        }
        .expiry-security {
          display: flex;
          gap: 0.5rem;
        }
        .expiry-security > * {
          flex: 1;
        }
        #expiration-date {
          flex: 2;
        }
        @media (max-width: 600px) {
          .expiry-security {
            flex-wrap: wrap;
          }
        }
        /* Braintree iframe specific styles */
        iframe {
          height: 48px !important;
          width: 100% !important;
          padding: 0.75rem;
          font-size: 16px !important;
          font-weight: normal !important;
        }

        /* Card number specific styles */
        #card-number {
          font-size: 18px !important;
        }
        #card-number iframe {
          font-size: 18px !important;
        }
      .loading-indicator {
          color: #1976D2;
          padding: 0.5rem;
          margin-bottom: 1rem;
          background-color: #E3F2FD;
          border-radius: 4px;
          text-align: center;
        }

        .hosted-fields-wrapper {
          opacity: ${isLoading() ? '0.7' : '1'};
          pointer-events: ${isLoading() ? 'none' : 'auto'};
          transition: opacity 0.2s ease-in-out;
        }
      `}</style>
    </div>
  );
}
