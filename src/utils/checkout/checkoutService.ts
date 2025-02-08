import type { ShoeSelection, AddressData, CheckoutPayload } from '../../types/checkout';
import { prices } from '../data/prices';
import { executeFunction, FunctionPath } from './appwrite';

// Cache for parsed selections
let cachedSelections: { timestamp: number; items: ShoeSelection[] } | null = null;
const CACHE_DURATION = 5000; // 5 seconds

export function getSelectedItems(): ShoeSelection[] {
    const now = Date.now();

    // Return cached value if valid
    if (cachedSelections && (now - cachedSelections.timestamp < CACHE_DURATION)) {
        return cachedSelections.items;
    }

    const selections = localStorage.getItem('selections');
    const quantity = parseInt(localStorage.getItem('selectedQuantity') || '0', 10);

    if (!selections || quantity === 0) {
        cachedSelections = { timestamp: now, items: [] };
        return [];
    }

    try {
        const parsedSelections = JSON.parse(selections);
        const items = parsedSelections.map((selection: { color: string; size: string }) => ({
            color: selection.color,
            size: selection.size,
            quantity: 1
        }));

        // Update cache
        cachedSelections = { timestamp: now, items };
        return items;
    } catch (error) {
        console.error('Error parsing selections:', error);
        cachedSelections = { timestamp: now, items: [] };
        return [];
    }
}

export function getAddressData(form: HTMLFormElement): AddressData {
    const formData = new FormData(form);
    const getData = (field: string) => {
        const value = formData.get(field);
        if (!value && field !== 'address2' && field !== 'phone') {
            throw new Error(`Required field ${field} is missing`);
        }
        return value as string;
    };

    try {
        return {
            firstName: getData('firstName').trim(),
            lastName: getData('lastName').trim(),
            address1: getData('address1').trim(),
            address2: formData.get('address2')?.toString().trim() || undefined,
            city: getData('city').trim(),
            state: getData('state').trim(),
            zipCode: getData('zipCode').trim(),
            country: getData('country').trim(),
            phone: formData.get('phone')?.toString().trim() || undefined,
        };
    } catch (error) {
        throw new Error(`Invalid address data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Memoize price calculations
const priceCache = new Map<number, number>();

export function calculateTotalAmount(quantity: number): number {
    // Check cache first
    if (priceCache.has(quantity)) {
        return priceCache.get(quantity)!;
    }

    const priceInfo = prices[quantity] || prices[1];
    const total = quantity * priceInfo.pricePerPair;

    // Cache the result
    priceCache.set(quantity, total);
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

// Implement request queue to prevent concurrent submissions
let processingPayment = false;

export async function processBraintreePayment(
    payload: CheckoutPayload,
    paymentMethodNonce: string
): Promise<{ orderId: string; transactionId: string }> {
    if (processingPayment) {
        throw new Error('Payment is already being processed');
    }

    processingPayment = true;
    try {
        const braintreePayload: BraintreeCheckoutPayload = {
            name: `${payload.shippingAddress.firstName} ${payload.shippingAddress.lastName}`,
            email: payload.email,
            phone: payload.shippingAddress.phone || '',
            shippingAddress: payload.shippingAddress,
            billingAddress: payload.billingAddress || payload.shippingAddress,
            orderDetails: payload.items,
            payment_method_nonce: paymentMethodNonce,
            amount: payload.totalAmount,
        };

        const data: BraintreeCheckoutResponse = await executeFunction(
            JSON.stringify(braintreePayload),
            FunctionPath.CHECKOUT
        );

        if (!data.ok || !data.orderId || !data.transactionId) {
            throw new Error(data.message || data.error || 'Checkout failed');
        }

        return {
            orderId: data.orderId,
            transactionId: data.transactionId,
        };
    } catch (error) {
        console.error('Error processing payment:', error);
        throw error;
    } finally {
        processingPayment = false;
    }
}
