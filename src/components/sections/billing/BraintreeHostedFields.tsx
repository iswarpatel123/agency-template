/** @jsxImportSource solid-js */
import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import hostedFields from 'braintree-web/hosted-fields';
import client from 'braintree-web/client';
import dataCollector from 'braintree-web/data-collector';
import type { HostedFields, HostedFieldsEvent } from 'braintree-web/hosted-fields';
import type { DataCollector } from 'braintree-web/data-collector';

interface Props {
  onValidityChange: (isValid: boolean) => void;
  onTokenize: (payload: { nonce: string; deviceData?: string }) => void;
}

const DEBOUNCE_DELAY = 300;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const RENDER_API_BASE = import.meta.env.PUBLIC_RENDER_API_BASE || 'https://braintree-render.onrender.com';

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
  const [dataCollectorInstance, setDataCollectorInstance] = createSignal<DataCollector | null>(null);
  const [isValid, setIsValid] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [retryCount, setRetryCount] = createSignal(0);
  const [deviceData, setDeviceData] = createSignal<string>('');

  let validityTimeout: number;
  let mountRetryTimeout: number;

  const showGlobalError = (message: string) => {
    const event = new CustomEvent('show-global-error', { detail: { message } });
    document.dispatchEvent(event);
  };

  const initializeHostedFields = async (attempt = 0) => {
    try {
      setIsLoading(true);
      const clientToken = await fetchClientToken();

      // Create braintree client instance
      const clientInstance = await client.create({
        authorization: clientToken,
      });

      // Create dataCollector instance first
      try {
        const dataCollectorInstance = await dataCollector.create({
          client: clientInstance,
          paypal: false, // Only collect device data for credit cards
          kount: true    // Enable Kount fraud protection
        });

        setDataCollectorInstance(dataCollectorInstance);
        setDeviceData(dataCollectorInstance.deviceData || '');
        
        console.log('Device data collected:', dataCollectorInstance.deviceData ? 'Success' : 'Failed');
      } catch (dataCollectorError) {
        console.warn('Data collector failed to initialize:', dataCollectorError);
        // Continue without device data - it's not critical for basic payments
        setDeviceData('');
      }

      // Create hosted fields instance
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
      setError(null);
      setRetryCount(0);
    } catch (err) {
      console.error('Failed to initialize Braintree:', err);
      if (attempt < MAX_RETRIES) {
        setRetryCount(attempt + 1);
        mountRetryTimeout = window.setTimeout(
          () => initializeHostedFields(attempt + 1),
          RETRY_DELAY * Math.pow(2, attempt)
        );
      } else {
        showGlobalError('Failed to initialize payment system. Please refresh and try again.');
      }
    } finally {
      setIsLoading(false);
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

      const currentDeviceData = deviceData();
      console.log('Submitting payment with device data:', currentDeviceData ? 'Present' : 'Missing');

      if (typeof props.onTokenize === 'function') {
        props.onTokenize({ 
          nonce, 
          deviceData: currentDeviceData || undefined 
        });
      } else {
        const event = new CustomEvent('payment-tokenized', {
          detail: { 
            nonce, 
            deviceData: currentDeviceData || undefined 
          },
          bubbles: true
        });
        document.dispatchEvent(event);
      }
    } catch (error) {
      console.error('Payment processing failed:', error);
      showGlobalError('Payment processing failed. Please check your card details and try again.');
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
      
      // Cleanup instances
      const hostedFields = hostedFieldsInstance();
      const dataCollector = dataCollectorInstance();
      
      if (hostedFields) {
        hostedFields.teardown().catch(console.error);
      }
      
      if (dataCollector && typeof dataCollector.teardown === 'function') {
        dataCollector.teardown().catch(console.error);
      }
    });
  });

  return (
    <div class="hosted-fields-wrapper" classList={{ loading: isLoading() }}>
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