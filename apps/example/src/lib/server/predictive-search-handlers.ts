import { createPredictiveSearchServerHandlers } from '@shopify/hydrogen';

/**
 * Predictive search route handler. `hooks.server.ts` registers it with `handleShopifyRoutes` to
 * serve `/api/predictive-search`, which the predictive search store fetches as the customer types.
 */
export const predictiveSearchHandlers = createPredictiveSearchServerHandlers();
