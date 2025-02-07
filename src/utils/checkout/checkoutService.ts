import type { ShoeSelection, AddressData, CheckoutPayload } from '../../types/checkout';
import { prices } from '../data/prices';
import { executeFunction, FunctionPath } from './appwrite';

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
        phone: formData.get('phone') as string || undefined,
    };
}

export function calculateTotalAmount(quantity: number): number {
    const priceInfo = prices[quantity] || prices[1];
    return quantity * priceInfo.pricePerPair;
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

export async function processBraintreePayment(
    payload: CheckoutPayload,
    paymentMethodNonce: string
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
        transactionId: data.transactionId
    };
}