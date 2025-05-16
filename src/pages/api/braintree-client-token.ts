import type { APIContext } from 'astro';
import { gateway } from '../../config/braintree';

export async function GET(context: APIContext) {
    try {
        const res = await gateway.clientToken.generate({});
        return new Response(JSON.stringify({ clientToken: res.clientToken }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (err) {
        console.error(err);
        return new Response(JSON.stringify({ message: 'Error generating Braintree client token' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}