export interface ShoeSelection {
    color: string;
    size: string;
    quantity: number;
}

export interface AddressData {
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone?: string;
}

export interface CheckoutPayload {
    items: ShoeSelection[];
    shippingAddress: AddressData;
    billingAddress: AddressData | null;
    email: string;
    totalAmount: number;
}

export interface CheckoutError {
    message: string;
    code?: string;
    details?: unknown;
}
