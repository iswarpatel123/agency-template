/** @jsxImportSource solid-js */
import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import hostedFields from 'braintree-web/hosted-fields';
import client from 'braintree-web/client';
import dataCollector from 'braintree-web/data-collector';
import type { HostedFields, HostedFieldsEvent } from 'braintree-web/hosted-fields';

interface Props {
  onValidityChange: (isValid: boolean) => void;
  onTokenize: (payload: { nonce: string; deviceData?: string }) => void;
}

const DEBOUNCE_DELAY = 300;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const RENDER_API_BASE = import.meta.env.PUBLIC_RENDER_API_BASE || 'http://braintree-render.onrender.com';

export async function fetchClientToken(): Promise<string> {
    const res = await fetch(`${RENDER_API_BASE}/client_token`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to fetch client token');
    const data = await res.json();
    if (!data.clientToken) throw new Error('No client token in response');
    return data.clientToken;
}

export const BraintreeHostedFields = (props: Props) => {
  const [hostedFieldsInstance, setHostedFieldsInstance] = createSignal<HostedFields | null>(null);
  const [isValid, setIsValid] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [retryCount, setRetryCount] = createSignal(0);
  const [deviceData, setDeviceData] = createSignal<string | undefined>(undefined);

  let validityTimeout: number;
  let mountRetryTimeout: number;

  const initializeHostedFields = async (attempt = 0) => {
    try {
      const clientToken = await fetchClientToken();

      // Create braintree client instance
      const clientInstance = await client.create({
        authorization: clientToken,
      });

      // Create dataCollector instance
      const dataCollectorInstance = await dataCollector.create({
        client: clientInstance,
        paypal: false,
      });

      setDeviceData(dataCollectorInstance.deviceData);

      const instance = await hostedFields.create({
        authorization: clientToken,
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
            padding: '0.75rem',
            'font-weight': '600',
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
        setError('Failed to initialize payment system. Please refresh and try again.');
      }
    }
  };

  const setupEventListeners = (instance: HostedFields) => {
    instance.on('validityChange', (event: HostedFieldsEvent) => {
      window.clearTimeout(validityTimeout);
      validityTimeout = window.setTimeout(() => {
        const fields = event.fields as Record<string, { isValid: boolean }>;
        const formValid = Object.values(fields).every(field => field.isValid);

        if (typeof props.onValidityChange === 'function') {
          props.onValidityChange(formValid);
        }
        setIsValid(formValid);
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

      if (typeof props.onTokenize === 'function') {
        props.onTokenize({ nonce, deviceData: deviceData() });
      } else {
        const event = new CustomEvent('payment-tokenized', {
          detail: { nonce, deviceData: deviceData() },
          bubbles: true
        });
        document.dispatchEvent(event);
      }
    } catch (error) {
      if (retryCount() < MAX_RETRIES) {
        setRetryCount(count => count + 1);
        setTimeout(() => handleSubmit(), RETRY_DELAY * Math.pow(2, retryCount()));
        console.error('Payment processing failed:', error);
        setError(`Payment processing failed. Retrying... (${retryCount() + 1}/${MAX_RETRIES})`);
      } else {
        setError('Payment processing failed. Please refresh and try again.');
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