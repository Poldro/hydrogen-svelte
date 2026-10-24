# hydrogen-svelte — Phase 0 notes

Reconnaissance for an **unofficial** Svelte 5 binding layer over `@shopify/hydrogen`.
Every claim below is backed by a source reference. Paths are relative to the
`Shopify/hydrogen` repo (`packages/hydrogen/src/...`) unless noted.

- Target version: `@shopify/hydrogen@2026.10.2` (stable; `2026.10.0-preview.1…5` preceded it).
- Svelte: `5.57.2` latest. SvelteKit: staying on **Kit 2** (`^2.57`, as in `examples/sveltekit`), although Kit `3.1.0` exists.
- npm name `hydrogen-svelte`: free (registry 404 on 2026-10-24).

---

## 1. Package surface

`package.json` exports: `.` (core), `./react`, `./vue`, `./vite`, `./customer-account`,
`./skills/*`, `./ts-plugin`, `./storefront-api-types`, `./customer-account-api-types`,
GraphQL schemas.

Peer deps `react`, `vue`, `vite` are all **optional** (`peerDependenciesMeta`).
Runtime deps: `gql.tada`, `cross-spawn`.

The CLI (`bin/hydrogen.mjs` → `cli/index.ts:20`) has a `setup` command that syncs agent
skills (`cli/setup.ts`). Skills shipped in the package include `hydrogen-cart-ui`,
`hydrogen-request-handlers`, `hydrogen-variant-form`, `hydrogen-predictive-search`,
`hydrogen-collection-browser`, `hydrogen-shop-pay`, `hydrogen-routing`, `hydrogen-setup`.

### Status of Svelte support

- Official announcement (hydrogen.shopify.dev/update/hydrogen-developer-preview, 2026-06-17):
  *"React bindings ship in the preview today; Vue, Svelte, and Remix 3 are on the way."*
  Vue has since shipped (`./vue`); Svelte has not.
- Repo README lists SvelteKit only as an example using the core directly.
- No GitHub issues or discussions about Svelte bindings (searched 2026-10-24).

---

## 2. Store contract

### Generic observable — `core/observable.ts`

`createObservable(initial)` → `{ state, subscribe(fn, selector?, isEqual?), setState }`.
`setState` is a no-op when `Object.is(prev, next)`; listeners with a selector are skipped
when `isEqual(prev, nextSlice)` (default `Object.is`). **Internal**: stores do not expose it.

### Cart store — `core/cart/cart.ts:140-198`

```ts
type CartStore = {
  connect(): void;          // no-op during SSR; loads cart only if there was no initialData
  destroy(): void;          // aborts in-flight requests, detaches event handlers
  hydrate(data: CartData): void;
  getState(): CartState;
  subscribe(listener: (state: CartState) => void): () => void; // NO selector at store level
  fetch(): Promise<void>;
  refresh(): void;
  reset(): void;
  handleFormSubmit(event: SubmitEvent, eventDetail?: Record<string, unknown>): Promise<void>;
};
type CartActions = Pick<CartStore, "refresh">;
```

`createCartStore({ initialData })` — `cart.ts:2399`:

- `initialData?: { cart: TData | null; errors?: {message}[] } | PromiseLike<…>` (`cart.ts:209-218`).
- Sync `initialData` with a cart → state `loading: false`, data = cart.
- Sync `initialData` with `cart: null` → empty state, `loading: false`.
- Promise → empty state, `loading: true`, starts loading **immediately at creation** (not at connect).
- None → empty, `loading: true`; `connect()` triggers the load.
- `connect()` never re-fetches if initial data (sync or async) was given.

`hydrate(data)` (`cart.ts:2290`): ignored if same cart id or if transactions are in flight;
otherwise replaces the settled state. Useful after client-side navigations that reload
the layout — **open question** whether the provider should call it when `initialData` changes
(Vue does not: "creates its store once from the first initial data and ignores later changes").

`configureCartEndpoint(endpoint)` (`cart.ts:2620`) — **module-level** config in core.
Vue also keeps a module-level `cartEndpoint` (`vue/cart.ts:24-37`). Config, not per-request
state; acceptable on the server because it's the same for every request.

### `CartState` — `core/cart/state.ts`

```ts
interface CartState<TData extends CartData = CartData> {
  data: TData;
  loading: boolean;
  readonly readyPromise?: PromiseLike<void>;
  pending: { lines: Set<string>; note: boolean; attributes: boolean;
             discountCodes: Set<string>; cost?: boolean };
  revalidating?: boolean;
  errors: CartErrorState; // Maps keyed by line id / attribute / discount code + network[]
}
```

New optimistic lines have ids starting with `optimistic:`. `EMPTY_CART_DATA`,
`EMPTY_CART_STATE` exported. State contains `Set`/`Map` → **never serialize CartState**;
only `initialData` (plain JSON) crosses the server/client boundary.

### Other stores (all `getState()` + `subscribe(listener)`)

| Store | Factory | Extra lifecycle | Source |
|---|---|---|---|
| Product form | `createProductFormStore(...)` | `connect`, `destroy` | `core/product/product-form.ts:238` |
| Collection | `createCollectionStore(options)` | — | `core/collection/collection.ts:190` |
| Predictive search | `createPredictiveSearchStore(...)` | `connect`, `destroy` | `core/predictive-search/store.ts:142` |

To be studied in detail in Phase 4 only.

---

## 3. Form layer

### `createCartFormRegister()` — `core/cart/form.ts`

Returns attribute objects to spread on fields/buttons.
Fields: `lineId`, `quantity`, `merchandiseId`, `discountCode`, `note`, `attributeValue` (needs `key`),
`sellingPlanId`. Actions (submit buttons, `name="intent"`): `add`, `increase`, `decrease`, `remove`,
`set`, `discount-apply`, `discount-remove`, `note-update`, `attributes-update`.

⚠️ Attribute names are **React-cased**: `readOnly`, `inputMode`, `autoComplete`, `autoCorrect`.
Fine in the DOM (HTML attribute names are case-insensitive), but **must verify Svelte SSR output**
for booleans like `readOnly: true` / `hidden: true` (Phase 3 test).

### `attachQuantityInput(inputEl, formEl)` — `core/cart/attach-quantity-input.ts:30`

Requires the form's first non-`type=button` button to be `register("set")`; throws otherwise.
Listens to `change` and calls `form.requestSubmit(setButton)`. Returns cleanup → perfect fit
for a Svelte attachment.

### Progressive enhancement — `core/cart/server-handlers.ts:401-402, 526`

The POST handler treats non-JSON bodies as form posts and redirects to the same-origin
`Referer` (fallback `/`). So `<form method="post" action="/api/cart">` works with JS disabled
as long as `method`/`action` are rendered server-side.

---

## 4. Server side

### Handlers — `core/cart/server-handlers.ts`

- `createCartServerHandlers({ fragment? })` → `{ get, post }` (`CartServerHandlers`, line 160).
- `cartHandlers.get({ storefrontClient, request? })` returns `{ data: { cart, errors? } }`
  (examples: `examples/hydrogen/app/root.tsx:118`, `examples/nextjs/app/app-shell.tsx:32`).
  `data` is exactly the `initialData` envelope.
- `CartDataFromHandlers<typeof cartHandlers>` derives the cart type from the fragment.
- Variant with customer session: `get` additionally needs `sessionManager`, `requestContext`.

### Request pipeline (from `examples/sveltekit/src/hooks.server.ts`)

1. `createShopifyRequestContext({ request, i18n, buyerIp })` — per request.
2. `createStorefrontClient({ type: "private", requestContext, config: { storeDomain, privateStorefrontToken, cache } })`.
3. `handleShopifyRoutes({ request, requestContext, sessionManager?, storefrontClient, routeTemplates, handlers: [cartHandlers, …] })` → `Response | null`, before `resolve`.
4. Store context/client in `event.locals`.
5. After `resolve`, on 404: `handleShopifyRedirects({ request, routeTemplates, storefrontClient })`.
6. `requestContext.applyResponseHeaders(response.headers)`; on `TypeError` (immutable headers) clone the Response first.

Request context methods (`core/request-context.ts:105-147`): `applyStorefrontRequestHeaders`,
`captureSubrequestHeaders`, `consumeStorefrontResponseHeaders`, `markResponseAsSessionEstablishing(reason)`,
`markResponseAsPersonalized(reason)`, `applyResponseHeaders`, `getForwardedRequestHeaders`, `i18n`.

⚠️ **SSR of the cart puts customer data in the HTML.** `markResponseAsPersonalized("cart")`
must be called before `applyResponseHeaders` on pages that render the cart, otherwise the page
could be cached by a CDN. Open question: does calling `cartHandlers.get` directly do it?

---

## 5. Official bindings — what to replicate

### Vue (`vue/cart.ts`, 392 lines) — API to mirror

| Export | Behaviour |
|---|---|
| `createCartComponents<THandlers>()` | Returns `{ CartProvider, useCart, useOptionalCart, useCartActions, useCartForm }` typed with `CartDataFromHandlers<THandlers>`. Type-only wrapper over the untyped versions. |
| `CartProvider` | `setup`: `createCartStore({ initialData })` once; `provide`; `onMounted` → `configureCoreCartEndpoint(cartEndpoint)` + `connect()`; `onUnmounted` → `destroy()`. |
| `useCart(selector?, isEqual?)` | `Readonly<ShallowRef<S>>`. Throws outside provider (`"useCart must be used inside a <CartProvider>."`). |
| `useOptionalCart(selector, isEqual?)` | `ShallowRef<S \| undefined>`; `undefined` outside provider. |
| `useCartActions()` | `{ refresh }`. |
| `useCartForm()` | `{ formProps(opts?), register, isPending: { initial: ComputedRef<boolean>, lines(lineId?) } }`. `formProps` → `{ onSubmit, method: "post", action: cartEndpoint }`; `onSubmit` runs `beforeSubmit`, bails if `defaultPrevented`, else `preventDefault()` + `store.handleFormSubmit(e).catch(() => {})` + `afterSubmit`. |
| `useCartAnalytics()` | `trackCartAnalytics(store)` on mount, stop on scope dispose. |
| `configureCartEndpoint`, `getCartEndpoint`, `useCartStore` | Exported from the module (only `createCartComponents`, `useCartAnalytics` re-exported from `vue/index.ts`). |

Selector semantics (`vue/cart.ts:341-357`): selected = `selector(getState())`; on every store
notification recompute; skip if `isEqual?.(prev, next)`; else assign to `shallowRef` (which itself
skips on `Object.is`). **Effective default equality: `Object.is`.**

Vue subscribes eagerly in `setup` — also during SSR (no unsubscribe on server). Our version avoids this.

Other Vue exports (Phase 4): `createProductComponents`, `useProductForm`;
`CollectionProvider` (a provider, *not* a factory; emits `change` with a search string),
`useCollection`, `useCollectionActions`, `useCollectionForm`;
`PredictiveSearchProvider`, `usePredictiveSearch`, `usePredictiveSearchActions`, `usePredictiveSearchForm`;
`ShopPayButton`, `ShopifyScripts`.

### React (`react/cart.tsx`) — differences worth knowing

- Uses `useSyncExternalStore(store.subscribe, getSnapshot, getServerSnapshot)` where the server
  snapshot is a frozen **hydration snapshot** (`react/cart.tsx:355-370`) so hydration matches SSR.
- Has `useSuspenseCart` (no Vue equivalent) for Promise `initialData`.
- Memoizes selector output in a ref cache.

### Vue cart tests to port (`vue/cart.test.ts`) — behaviour spec

refresh action · composable error outside provider · analytics mount/unmount · store created with
initialData · no fetch with async initialData · no fetch with `cart: null` · store not recreated on
re-render · selected slice · re-render only on slice change · custom `isEqual` · full state without
selector · optional cart undefined outside / defined inside · formProps shape · onSubmit →
handleFormSubmit with native SubmitEvent · beforeSubmit can prevent · afterSubmit called ·
register attrs · `isPending.initial` while loading / after hydration · `isPending.lines()` any/specific ·
default action `/api/cart` · custom endpoint flows to transport and `action`.

---

## 6. The existing SvelteKit example (`examples/sveltekit`)

- `src/lib/cart.ts`: **module-level singleton** `let cartStore = createCartStore()` and `connected` flag.
  On the server this instance is shared by every request (harmless today only because it's never
  connected/populated server-side).
- No SSR of the cart: no `initialData`; `connectCartStore()` in `onMount` + `fetch()`.
- Uses `svelte/store` `readable` with a selector, not runes.
- Hand-rolled `createCartForm()` mirrors Vue `formProps`, using `onsubmit`.

→ This binding fixes both points; that's the upstream pitch.

---

## 7. Svelte 5 design mapping

| Concern | Choice |
|---|---|
| Store → reactive value | `createSubscriber` (`svelte/reactivity`) inside a `{ get current() }` object. Subscribes only when read inside an effect → **no subscription on the server** for free. |
| Sharing | `setContext(Symbol)` in `CartProvider.svelte`; store created during component init → one store per SSR render (= per request) and one per client mount. |
| Lifecycle | `onMount(() => { configureCartEndpoint(ep); store.connect(); return () => store.destroy(); })`. |
| Form submit | `formProps()` returns `{ method: "post", action, [createAttachmentKey()]: (form) => listen("submit") }` so `<form {...formProps()}>` mirrors `v-bind="formProps()"`. SSR renders `method`/`action` → no-JS works. |
| Quantity input | `quantityInput` attachment wrapping `attachQuantityInput(node, node.form)`. |
| Typed provider | Factory returns the same `.svelte` component cast to `Component<{ initialData?: …; children: Snippet }>`. |
| `initialData` in SvelteKit | **Await** `cartHandlers.get` in `+layout.server.ts` (sync initialData) so SSR renders the real cart. Streaming a Promise would render the empty/loading state on the server. |

### Divergences from Vue (to document in README)

1. `useCart`/`useOptionalCart` return `{ readonly current }` instead of `ShallowRef` (`.value`).
2. `isPending.initial` is a getter (`boolean`), not a `ComputedRef`.
3. `formProps()` attaches the submit handler through an attachment key instead of an `onSubmit` prop.
4. Extra: `quantityInput` attachment (Vue leaves `attachQuantityInput` to the user).
5. Lazy subscription (only while read reactively) vs Vue's eager subscription.
6. Product: `register('optionValue')` returns lowercase `onchange`/`onclick`, because Svelte
   matches spread event props by exact name.
7. Product: `pending` is a `ReactiveValue<boolean>` (`.current`) instead of a `ShallowRef`.
8. Product: one module-level context key instead of a key per `createProductComponents()` call.
   Two factories in one tree share the nearest provider.
9. Product: rejected submissions aren't logged, because Hydrogen's logger isn't exported. Errors
   still land in `errors` through the cart store.
10. Collection: the provider takes an `onChange(searchString)` callback prop instead of emitting
    `change`.
11. Collection: `useCollectionForm().formProps()` returns an attachment, like the cart form,
    instead of an `onSubmit` prop.
12. Collection: the provider reconciles once during initialisation, then in `$effect.pre`. Vue's
    `flush: 'sync'` watcher has no Svelte equivalent, so a URL change and a handle change are
    handled in one pass: reset the store first, then reconcile.

---

## 8. Open questions

1. **Credentials** — resolved: `vita-senior` is a **Development store** (Settings → Plan:
   "Custom plan · Development store"). Public and private Storefront tokens verified with a
   `shop` query on 2026-10-24 and stored in `apps/example/.env` (gitignored).
   ⚠️ The Storefront API returns **no products** (`products(first: 2)` → `[]`): products must be
   created and published to the Headless sales channel before add-to-cart can be tested.
   Correction: mock.shop *is* supported — `cli/setup.ts` scaffolds a template that
   "uses mock.shop by default". Fallback if the dev store stays empty.
8. Tooling: `sv@1.1.1` scaffolds **Kit 3** layouts (config inside `vite.config.ts`, `$app/tsconfig`,
   `#lib` subpath imports). Rewritten by hand to Kit 2 (`svelte.config.js`, `.svelte-kit/tsconfig.json`, `$lib`).
2. `markResponseAsPersonalized` — resolved: **not** called by `cartHandlers.get` (only
   `request-context.ts` and the UCP MCP proxy reference it). The `/api/cart` route sets its own
   private headers, but a page that server-renders the cart must call it itself
   (`apps/example/src/routes/+layout.server.ts`).
3. Svelte SSR rendering of `register()` attributes — resolved: `readOnly: true`, `hidden: true`
   and `inputMode` render as valid HTML (`cart.ssr.test.ts`).
   Testing note: in the Vitest node project, `vi.mock('@shopify/hydrogen')` does not reach
   imports inside compiled `.svelte` components (different module instance). SSR tests inject a
   store through context (`StoreFixture.svelte`) instead of mocking the module.
4. Should `CartProvider` call `store.hydrate()` when `initialData` changes after an
   `invalidateAll()`? Vue: no. Default: follow Vue, document.
5. Hydration: client store is created from the same `initialData` and `connect()` runs in
   `onMount`, so first client render should match SSR. Verify no mismatch warnings.
6. `useSuspenseCart` (React-only): skip; maybe later as a `{#await}`-friendly helper.
7. Does `handleFormSubmit` need `SubmitEvent.submitter` in jsdom tests? (Vue tests construct a native SubmitEvent — copy their helper.)

## 9. Findings from the end-to-end run (phase 3)

- **Cart mutations need Standard Actions.** `handleFormSubmit` → `dispatchTransaction` →
  `getShopifyStandardActions()` (`core/cart/cart.ts:2669`) waits for `window.Shopify.actions`,
  which `https://cdn.shopify.com/storefront/standard-actions.js` installs; `configureUpdateCartOnce`
  then routes `updateCart` to the configured endpoint. Without the script the store never issues a
  request, and the rejection is only recorded in state. So `ShopifyScripts` is a hard dependency
  of the cart, not an optional extra; it was pulled forward from phase 4.
- **`ShopifyScripts` (Svelte).** Renders `renderShopifyScriptTags(...)` with `{@html}` in
  `<svelte:head>` (as `examples/sveltekit` does) and calls `initializeShopifyScripts` in `onMount`,
  using the initial props only, as React and Vue do. Divergence: it must be server-rendered,
  because scripts inserted through `innerHTML` never execute. Vue builds elements with `h()`;
  Svelte templates cannot emit `<script>` elements.
- **`shop` identity.** `shopId` comes from the Storefront API (`{ shop { id } }`, numeric part
  or GID). For a Headless channel `storefrontId` can be empty, with `analytics.channel: 'headless'`
  (mirrors `examples/nuxt/storefront/shop-identity.ts`).
- **adapter-node origin.** Without `ORIGIN`, adapter-node assumes `https`, and SvelteKit's CSRF
  check rejects the no-JS form POST ("Cross-site POST form submissions are forbidden"). Set
  `ORIGIN` (or `PROTOCOL_HEADER`/`HOST_HEADER` behind a proxy) in production.
- **Optimistic updates in e2e.** With JS, the count changes before the POST resolves. A
  navigation right after the click aborts the request, so tests wait for the `/api/cart` response.
  An aborted `GET /api/cart` surfaces as a logged `AbortError` 500 on the server. That is harmless
  (the client is gone), but noisy.

## 10. Findings from phase 4

- **Collection pagination is app-level.** The core keeps unrelated URL params when it builds the
  next search string, so a cursor (`after`/`before`) would survive a filter change and point into
  the old result list. The example drops the cursor params in `onChange`. That makes the URL that
  arrives differ from the reconciler's pending target, so the reconciler treats it as external
  navigation and settles from it. This only happens when a cursor was present.
- **No-JS collection form.** A plain `method="get"` form with `filter.*` and `sort_by` fields
  works unchanged, because the loader parses the same params with `parseCollectionParams`.
  Empty price inputs are ignored by the parser.
