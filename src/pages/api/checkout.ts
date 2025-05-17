import type { APIContext } from 'astro';
import { gateway } from '../../config/braintree';
import { v4 as uuidv4 } from 'uuid';

export async function POST({ request }: APIContext) {
    try {
        const payload = await request.json();

        // Validate required fields
        if (!payload.payment_method_nonce || !payload.amount) {
            return new Response(
                JSON.stringify({
                    ok: false,
                    error: 'Missing required payment information'
                }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // Generate a unique order ID
        const orderId = `order-${uuidv4()}`;

        // Map the payload to Braintree's expected format
        const transactionRequest = {
            amount: payload.amount.toFixed(2),
            orderId: orderId,
            paymentMethodNonce: payload.payment_method_nonce,
            customer: {
                firstName: payload.name.split(' ')[0] || '',
                lastName: payload.name.split(' ').slice(1).join(' ') || '',
                email: payload.email,
                phone: payload.phone
            },
            billing: {
                firstName: payload.billingAddress.firstName,
                lastName: payload.billingAddress.lastName,
                streetAddress: payload.billingAddress.address1,
                extendedAddress: payload.billingAddress.address2 || '',
                locality: payload.billingAddress.city,
                region: payload.billingAddress.state,
                postalCode: payload.billingAddress.zipCode,
                countryCodeAlpha2: payload.billingAddress.country
            },
            shipping: {
                firstName: payload.shippingAddress.firstName,
                lastName: payload.shippingAddress.lastName,
                streetAddress: payload.shippingAddress.address1,
                extendedAddress: payload.shippingAddress.address2 || '',
                locality: payload.shippingAddress.city,
                region: payload.shippingAddress.state,
                postalCode: payload.shippingAddress.zipCode,
                countryCodeAlpha2: payload.shippingAddress.country
            },
            options: {
                submitForSettlement: true
            }
        };

        // Process the transaction
        const result = await gateway.transaction.sale(transactionRequest);

        if (result.success) {
            return new Response(
                JSON.stringify({
                    ok: true,
                    orderId: orderId,
                    transactionId: result.transaction.id,
                    message: 'Payment processed successfully'
                }),
                {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        } else {
            return new Response(
                JSON.stringify({
                    ok: false,
                    error: result.message || 'Transaction failed',
                    message: 'Payment processing failed'
                }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }
    } catch (error) {
        console.error('Checkout error:', error);
        return new Response(
            JSON.stringify({
                ok: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                message: 'An unexpected error occurred'
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}