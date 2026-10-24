import { createShopifyRouteTemplates } from '@shopify/hydrogen';

// Shared by the server (route handling, redirects) and the browser (ShopifyScripts).
export const routeTemplates = createShopifyRouteTemplates({
	productInCollection: '/products/:productHandle'
});
