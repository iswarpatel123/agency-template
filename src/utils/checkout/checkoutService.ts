import type { ShoeSelection, AddressData, CheckoutPayload } from '../../types/checkout';
import { prices } from '../data/prices';

// Memoization with TTL
class MemoCache<T> {
    private cache: Map<string, { value: T; timestamp: number }> = new Map();
    private ttl: number;

    constructor(ttlMs: number) {
        this.ttl = ttlMs;
    }

    get(key: string): T | undefined {
        const entry = this.cache.get(key);
        if (!entry) return undefined;

        if (Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(key);
            return undefined;
        }

        return entry.value;
    }

    set(key: string, value: T): void {
        this.cache.set(key, { value, timestamp: Date.now() });
    }
}

// Initialize caches
const selectionsCache = new MemoCache<ShoeSelection[]>(5000); // 5 second TTL
const priceCache = new MemoCache<number>(60000); // 1 minute TTL

export function getSelectedItems(): ShoeSelection[] {
    const cacheKey = 'selections';
    const cached = selectionsCache.get(cacheKey);
    if (cached) return cached;

    const selections = localStorage.getItem('selections');
    const quantity = parseInt(localStorage.getItem('selectedQuantity') || '0', 10);

    if (!selections || quantity === 0) {
        const empty: ShoeSelection[] = [];
        selectionsCache.set(cacheKey, empty);
        return empty;
    }

    try {
        const parsedSelections = JSON.parse(selections);
        const items = parsedSelections.map((selection: { color: string; size: string }) => ({
            color: selection.color,
            size: selection.size,
            quantity: 1
        }));

        selectionsCache.set(cacheKey, items);
        return items;
    } catch (error) {
        console.error('Error parsing selections:', error);
        const empty: ShoeSelection[] = [];
        selectionsCache.set(cacheKey, empty);
        return empty;
    }
}

export function getAddressData(form: HTMLFormElement): AddressData {
    const formData = new FormData(form);
    const requiredFields = ['firstName', 'lastName', 'address1', 'city', 'state', 'zipCode', 'country'];
    const optionalFields = ['address2', 'phone'];

    const getData = (field: string, required: boolean): string => {
        const value = formData.get(field)?.toString().trim();
        if (required && !value) {
            throw new Error(`Required field ${field} is missing`);
        }
        return value || '';
    };

    try {
        const address: AddressData = {
            firstName: getData('firstName', true),
            lastName: getData('lastName', true),
            address1: getData('address1', true),
            city: getData('city', true),
            state: getData('state', true),
            zipCode: getData('zipCode', true),
            country: getData('country', true)
        };

        // Add optional fields only if they have values
        const address2 = getData('address2', false);
        if (address2) address.address2 = address2;

        const phone = getData('phone', false);
        if (phone) address.phone = phone;

        return address;
    } catch (error) {
        throw new Error(`Invalid address data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export function calculateTotalAmount(quantity: number): number {
    const cacheKey = quantity.toString();
    const cached = priceCache.get(cacheKey);
    if (cached !== undefined) {
        return cached;
    }

    const priceInfo = prices[quantity] || prices[1];
    const total = quantity * priceInfo.pricePerPair;
    priceCache.set(cacheKey, total);
    return total;
}

export interface BraintreeCheckoutPayload {
    name: string;
    email: string;
    phone: string;
    shippingAddress: AddressData;
    billingAddress: AddressData;
    orderDetails: ShoeSelection[];
    payment_method_nonce: string;
    amount: number;
    deviceData?: string;
}

export interface BraintreeCheckoutResponse {
    ok: boolean;
    orderId?: string;
    transactionId?: string;
    message?: string;
    error?: string;
}

// Request queue implementation for payment processing
export class PaymentQueue {
    private processing = false;
    private retryCount = 0;
    private readonly maxRetries = 3;
    private readonly baseDelay = 1000;

    async process(
        payload: CheckoutPayload,
        paymentMethodNonce: string
    ): Promise<{ orderId: string; transactionId: string }> {
        if (this.processing) {
            throw new Error('Payment is already being processed');
        }

        this.processing = true;
        try {
            const braintreePayload = this.prepareBraintreePayload(payload, paymentMethodNonce);
            return await this.executeWithRetry(braintreePayload);
        } finally {
            this.processing = false;
            this.retryCount = 0;
        }
    }

    private prepareBraintreePayload(payload: CheckoutPayload, nonce: string): BraintreeCheckoutPayload {
        return {
            name: `${payload.shippingAddress.firstName} ${payload.shippingAddress.lastName}`,
            email: payload.email,
            phone: payload.shippingAddress.phone || '',
            shippingAddress: payload.shippingAddress,
            billingAddress: payload.billingAddress || payload.shippingAddress,
            orderDetails: payload.items,
            payment_method_nonce: nonce,
            amount: payload.totalAmount
        };
    }

    private async executeWithRetry(payload: BraintreeCheckoutPayload): Promise<{ orderId: string; transactionId: string }> {
        console.log('Executing Braintree payment with payload:', payload);
        try {
            const response = await fetch('/api/braintree-checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!data.ok || !data.orderId || !data.transactionId) {
                throw new Error(data.message || data.error || 'Checkout failed');
            }

            return {
                orderId: data.orderId,
                transactionId: data.transactionId
            };
        } catch (error) {
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                const delay = this.baseDelay * Math.pow(2, this.retryCount - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.executeWithRetry(payload);
            }
            throw error;
        }
    }
}

const paymentQueue = new PaymentQueue();
export const processBraintreePayment = paymentQueue.process.bind(paymentQueue);
