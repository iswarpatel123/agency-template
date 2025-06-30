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

    const getData = (field: string): string => {
        const value = formData.get(field)?.toString().trim();
        return value || '';
    };

    const address: AddressData = {
        firstName: getData('firstName'),
        lastName: getData('lastName'),
        address1: getData('address1'),
        city: getData('city'),
        state: getData('state'),
        zipCode: getData('zipCode'),
        country: getData('country') || 'US'
    };

    const address2 = getData('address2');
    if (address2) {
        address.address2 = address2;
    }

    const phone = getData('phone');
    if (phone) {
        address.phone = phone;
    }

    return address;
}

// Store complete order data in localStorage for order confirmation
export function storeOrderData(payload: CheckoutPayload, orderId: string, transactionId: string): void {
    try {
        const orderData = {
            orderId,
            transactionId,
            items: payload.items,
            shippingAddress: payload.shippingAddress,
            billingAddress: payload.billingAddress,
            email: payload.email,
            totalAmount: payload.totalAmount,
            orderDate: new Date().toISOString(),
            status: 'confirmed'
        };
        
        localStorage.setItem('order-data', JSON.stringify(orderData));
        localStorage.setItem('order-completed-at', Date.now().toString());
    } catch (error) {
        console.error('Error storing order data:', error);
    }
}

// Get complete order data for confirmation page
export function getOrderData(): {
    orderId: string | null;
    transactionId: string | null;
    items: ShoeSelection[];
    shippingAddress: AddressData | null;
    billingAddress: AddressData | null;
    email: string | null;
    totalAmount: number | null;
    orderDate: string | null;
    status: string | null;
} {
    try {
        const orderData = localStorage.getItem('order-data');
        if (orderData) {
            const parsed = JSON.parse(orderData);
            return {
                orderId: parsed.orderId || null,
                transactionId: parsed.transactionId || null,
                items: parsed.items || [],
                shippingAddress: parsed.shippingAddress || null,
                billingAddress: parsed.billingAddress || null,
                email: parsed.email || null,
                totalAmount: parsed.totalAmount || null,
                orderDate: parsed.orderDate || null,
                status: parsed.status || null
            };
        }
        
        // Fallback: try to reconstruct from individual localStorage items
        const selections = localStorage.getItem('selections');
        const quantity = localStorage.getItem('selectedQuantity');
        
        if (selections && quantity) {
            const parsedSelections = JSON.parse(selections);
            const items = parsedSelections.map((selection: { color: string; size: string }) => ({
                color: selection.color,
                size: selection.size,
                quantity: 1
            }));
            
            const totalAmount = calculateTotalAmount(parseInt(quantity));
            
            return {
                orderId: `ORD-${Date.now()}`, // Generate fallback order ID
                transactionId: null,
                items,
                shippingAddress: null,
                billingAddress: null,
                email: null,
                totalAmount,
                orderDate: new Date().toISOString(),
                status: 'confirmed'
            };
        }
        
        return {
            orderId: null,
            transactionId: null,
            items: [],
            shippingAddress: null,
            billingAddress: null,
            email: null,
            totalAmount: null,
            orderDate: null,
            status: null
        };
    } catch (error) {
        console.error('Error getting order data:', error);
        return {
            orderId: null,
            transactionId: null,
            items: [],
            shippingAddress: null,
            billingAddress: null,
            email: null,
            totalAmount: null,
            orderDate: null,
            status: null
        };
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

export async function processBraintreePayment(
    payload: CheckoutPayload,
    paymentMethodNonce: string,
    deviceData?: string
): Promise<{ orderId: string; transactionId: string }> {
    
    const braintreePayload = {
        name: `${payload.shippingAddress.firstName} ${payload.shippingAddress.lastName}`,
        email: payload.email,
        phone: payload.shippingAddress.phone || '',
        shippingAddress: JSON.stringify(payload.shippingAddress),
        billingAddress: JSON.stringify(payload.billingAddress || ''),
        orderDetails: JSON.stringify(payload.items),
        payment_method_nonce: paymentMethodNonce,
        amount: payload.totalAmount,
        deviceData: deviceData || '',
    };

    try {
        const res = await fetch(`${RENDER_API_BASE}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(braintreePayload),
        });
        const data = await res.json();
        if (!data.ok) {
            throw new Error(data.error ? `error: ${data.error}` : data.message || 'Checkout failed');
        }
        if (!data.orderId || !data.transactionId) {
            throw new Error('Checkout succeeded but failed to get order details.');
        }
        
        // Store complete order data for confirmation page
        storeOrderData(payload, data.orderId, data.transactionId);
        
        return {
            orderId: data.orderId,
            transactionId: data.transactionId,
        };
    } catch (error: any) {
        throw error;
    }
}

// Clear checkout data after successful order completion
export function clearCheckoutData(): void {
    try {
        const keysToRemove = [
            'selectedQuantity',
            'selections',
            'shoeSelection'
        ];
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });
        
        console.log('Checkout data cleared successfully');
    } catch (error) {
        console.error('Error clearing checkout data:', error);
    }
}

// Clear order data (call this when user starts a new order)
export function clearOrderData(): void {
    try {
        const keysToRemove = [
            'order-data',
            'order-completed-at'
        ];
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });
        
        console.log('Order data cleared successfully');
    } catch (error) {
        console.error('Error clearing order data:', error);
    }
}