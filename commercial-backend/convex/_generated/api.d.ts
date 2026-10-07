/* eslint-disable */
  /**
   * Generated `api` utility.
   *
   * THIS CODE IS AUTOMATICALLY GENERATED.
   *
   * To regenerate, run `npx convex dev`.
   * @module
   */

  import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";
  import type * as accounts from "../accounts.js";
import type * as auth from "../auth.js";
import type * as billing from "../billing.js";
import type * as billingState from "../billingState.js";
import type * as catalog from "../catalog.js";
import type * as commercialPassword from "../commercialPassword.js";
import type * as configuration from "../configuration.js";
import type * as http from "../http.js";
import type * as ledger from "../ledger.js";
import type * as session from "../session.js";

  /**
   * A utility for referencing Convex functions in your app's API.
   *
   * Usage:
   * ```js
   * const myFunctionReference = api.myModule.myFunction;
   * ```
   */
  declare const fullApi: ApiFromModules<{
    "accounts": typeof accounts,
"auth": typeof auth,
"billing": typeof billing,
"billingState": typeof billingState,
"catalog": typeof catalog,
"commercialPassword": typeof commercialPassword,
"configuration": typeof configuration,
"http": typeof http,
"ledger": typeof ledger,
"session": typeof session,
  }>;
  export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;
  export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;
