import type { ShoeSelection, AddressData, CheckoutPayload } from '../../types/checkout';
import { prices } from '../data/prices';

export function getSelectedItems(): ShoeSelection[] {
    const selections = localStorage.getItem('selections');
    const quantity = parseInt(localStorage.getItem('selectedQuantity') || '0', 10);

    if (!selections || quantity === 0) {
        return [];
    }

    try {
        const parsedSelections = JSON.parse(selections);
        return parsedSelections.map((selection: { color: string; size: string }) => ({
            color: selection.color,
            size: selection.size,
            quantity: 1
        }));
    } catch (error) {
        console.error('Error parsing selections:', error);
        return [];
    }
}

export function getAddressData(form: HTMLFormElement): AddressData {
    const formData = new FormData(form);
    return {
        firstName: formData.get('firstName') as string,
        lastName: formData.get('lastName') as string,
        address1: formData.get('address1') as string,
        address2: formData.get('address2') as string || undefined,
        city: formData.get('city') as string,
        state: formData.get('state') as string,
        zipCode: formData.get('zipCode') as string,
        country: formData.get('country') as string,
    };
}

export function calculateTotalAmount(quantity: number): number {
    const priceInfo = prices[quantity] || prices[1];
    return quantity * priceInfo.pricePerPair;
}

export interface BraintreeResponse {
    ok: boolean;
    clientToken?: string;
    message?: string;
    error?: string;
}

export async function getClientToken(): Promise<string> {
    const response = await fetch('/client_token', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    const data: BraintreeResponse = await response.json();

    if (!data.ok || !data.clientToken) {
        throw new Error(data.message || data.error || 'Failed to get client token');
    }

    return data.clientToken;
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

export async function checkout(
    payload: CheckoutPayload,
    paymentMethodNonce: string,
    deviceData?: string
): Promise<{ orderId: string; transactionId: string }> {
    const braintreePayload: BraintreeCheckoutPayload = {
        name: `${payload.shippingAddress.firstName} ${payload.shippingAddress.lastName}`,
        email: payload.email,
        phone: payload.shippingAddress.phone || '',
        shippingAddress: payload.shippingAddress,
        billingAddress: payload.billingAddress || payload.shippingAddress,
        orderDetails: payload.items,
        payment_method_nonce: paymentMethodNonce,
        amount: payload.totalAmount,
        deviceData
    };

    const response = await fetch('/checkout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(braintreePayload),
    });

    const data: BraintreeCheckoutResponse = await response.json();

    if (!data.ok || !data.orderId || !data.transactionId) {
        throw new Error(data.message || data.error || 'Checkout failed');
    }

    return {
        orderId: data.orderId,
        transactionId: data.transactionId
    };
}

export async function createCheckoutSession(payload: CheckoutPayload): Promise<{ sessionUrl: string }> {
    // This function might need to be updated or removed depending on how the checkout process is integrated.
    // For now, we'll keep it as is, assuming it's used for a different payment method.
    const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Checkout failed: ${response.statusText}`);
    }

    return response.json();
}
