import braintree from 'braintree';

type Environment = 'Sandbox' | 'Production';

// Ensure environment variables are loaded, e.g., using dotenv if not handled by Astro/Vite
// For Astro, environment variables prefixed with PUBLIC_ are available on the client,
// server-side variables (like Braintree private key) are available directly via process.env
// in .ts/.js files processed by Vite (which Astro uses under the hood).

export const gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment[import.meta.env.BRAINTREE_ENVIRONMENT as Environment || 'Sandbox'],
  merchantId: import.meta.env.BRAINTREE_MERCHANT_ID as string,
  publicKey: import.meta.env.BRAINTREE_PUBLIC_KEY as string,
  privateKey: import.meta.env.BRAINTREE_PRIVATE_KEY as string,
});