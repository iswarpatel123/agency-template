import type { ShoeSelection, AddressData, CheckoutPayload } from '../types/checkout';
import { prices } from './data/prices';

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

export async function createCheckoutSession(payload: CheckoutPayload): Promise<{ sessionUrl: string }> {
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
