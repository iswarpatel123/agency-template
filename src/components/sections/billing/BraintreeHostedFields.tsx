/** @jsxImportSource solid-js */
import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import hostedFields from 'braintree-web/hosted-fields';
import type { HostedFields, HostedFieldsEvent } from 'braintree-web/hosted-fields';

interface Props {
  onValidityChange: (isValid: boolean) => void;
  onTokenize: (payload: { nonce: string }) => void;
}

const DEBOUNCE_DELAY = 300;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export const BraintreeHostedFields = (props: Props) => {
  const [hostedFieldsInstance, setHostedFieldsInstance] = createSignal<HostedFields | null>(null);
  const [isValid, setIsValid] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [retryCount, setRetryCount] = createSignal(0);

  let validityTimeout: number;
  let mountRetryTimeout: number;

  const initializeHostedFields = async (attempt = 0) => {
    const tokenizationKey = window.BRAINTREE_TOKENIZATION_KEY;
    if (!tokenizationKey) {
      setError('Missing Braintree tokenization key');
      return;
    }

    try {
      const instance = await hostedFields.create({
        authorization: tokenizationKey,
        fields: {
          number: {
            selector: '#card-number',
            placeholder: 'Card Number',
            prefill: '',
          },
          cvv: {
            selector: '#cvv',
            placeholder: 'CVV',
            maxlength: 4,
          },
          expirationDate: {
            selector: '#expiration-date',
            placeholder: 'MM/YY',
          }
        },
        styles: {
          input: {
            color: '#333',
            'font-size': '16px',
            'font-family': 'system-ui, sans-serif',
            padding: '0.75rem', // Add padding to create a gap
            'font-weight': '600', // Match font weight with AddressForm
          },
          'input.invalid': {
            color: '#E53935',
          },
          'input.focused': {
            color: '#1976D2',
          },
        }
      });

      setHostedFieldsInstance(instance);
      setupEventListeners(instance);
    } catch (err) {
      console.error('Failed to initialize Braintree:', err);
      if (attempt < MAX_RETRIES) {
        mountRetryTimeout = window.setTimeout(
          () => initializeHostedFields(attempt + 1),
          RETRY_DELAY * Math.pow(2, attempt)
        );
      } else {
        setError('Failed to initialize payment system. Please refresh the page.');
      }
    }
  };

  const setupEventListeners = (instance: HostedFields) => {
    instance.on('validityChange', (event: HostedFieldsEvent) => {
      window.clearTimeout(validityTimeout);
      validityTimeout = window.setTimeout(() => {
        const fields = event.fields as Record<string, { isValid: boolean }>;
        const formValid = Object.values(fields).every(field => field.isValid);
        
        if (isValid() !== formValid) {
          setIsValid(formValid);
          props.onValidityChange(formValid);
        }
      }, DEBOUNCE_DELAY);
    });

    instance.on('focus', () => setError(null));
  };

  const handleSubmit = async () => {
    const instance = hostedFieldsInstance();
    if (!instance || isLoading()) return;

    setIsLoading(true);
    try {
      const { nonce } = await instance.tokenize();
      setError(null);
      setRetryCount(0);
      props.onTokenize({ nonce });
    } catch (error) {
      if (retryCount() < MAX_RETRIES) {
        setRetryCount(count => count + 1);
        setTimeout(() => handleSubmit(), RETRY_DELAY * Math.pow(2, retryCount()));
        setError(`Payment processing failed. Retrying... (${retryCount() + 1}/${MAX_RETRIES})`);
      } else {
        setError('Payment processing failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  onMount(() => {
    initializeHostedFields();
    const handler = () => handleSubmit();
    document.addEventListener('tokenize-payment', handler);
    
    onCleanup(() => {
      document.removeEventListener('tokenize-payment', handler);
      window.clearTimeout(validityTimeout);
      window.clearTimeout(mountRetryTimeout);
      hostedFieldsInstance()?.teardown().catch(console.error);
    });
  });

  return (
    <div class="hosted-fields-wrapper" classList={{ loading: isLoading() }}>
      {error() && (
        <div class="error-message" role="alert">
          {error()}
        </div>
      )}
      <div class="card-number-wrapper">
        <div id="card-number" class="hosted-field"></div>
        <img 
          src="/assets/checkout/card-lock.webp" 
          alt="Secure payment" 
          class="lock-icon" 
          loading="lazy" 
          width="20" 
          height="20"
        />
      </div>
      <div class="expiry-security">
        <div id="expiration-date" class="hosted-field"></div>
        <div id="cvv" class="hosted-field"></div>
      </div>
      <style>{`
        @import url('/style/BraintreeHostedFields.css');
      `}</style>
    </div>
  );
};
