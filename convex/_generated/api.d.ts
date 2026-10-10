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
  import type * as auth from "../auth.js";
import type * as cad from "../cad.js";
import type * as cadControlledUploadContinuityStore from "../cadControlledUploadContinuityStore.js";
import type * as cadControlledUploadDevQualification from "../cadControlledUploadDevQualification.js";
import type * as cadControlledUploadDevQualificationBinding from "../cadControlledUploadDevQualificationBinding.js";
import type * as cadControlledUploadHost from "../cadControlledUploadHost.js";
import type * as cadControlledUploadSchema from "../cadControlledUploadSchema.js";
import type * as cadControlledUploadStore from "../cadControlledUploadStore.js";
import type * as cadDevAuthQualification from "../cadDevAuthQualification.js";
import type * as cadDevAuthQualificationBinding from "../cadDevAuthQualificationBinding.js";
import type * as cadDevAuthQualificationStore from "../cadDevAuthQualificationStore.js";
import type * as cadDevUploadSessionQualification from "../cadDevUploadSessionQualification.js";
import type * as cadDevUploadSessionQualificationAuthority from "../cadDevUploadSessionQualificationAuthority.js";
import type * as cadDevUploadSessionQualificationBinding from "../cadDevUploadSessionQualificationBinding.js";
import type * as cadDevUploadSessionQualificationSession from "../cadDevUploadSessionQualificationSession.js";
import type * as cadDurableEngine from "../cadDurableEngine.js";
import type * as cadUploadSessionGateway from "../cadUploadSessionGateway.js";
import type * as developmentAuth from "../developmentAuth.js";
import type * as http from "../http.js";
import type * as librarySession from "../librarySession.js";

  /**
   * A utility for referencing Convex functions in your app's API.
   *
   * Usage:
   * ```js
   * const myFunctionReference = api.myModule.myFunction;
   * ```
   */
  declare const fullApi: ApiFromModules<{
    "auth": typeof auth,
"cad": typeof cad,
"cadControlledUploadContinuityStore": typeof cadControlledUploadContinuityStore,
"cadControlledUploadDevQualification": typeof cadControlledUploadDevQualification,
"cadControlledUploadDevQualificationBinding": typeof cadControlledUploadDevQualificationBinding,
"cadControlledUploadHost": typeof cadControlledUploadHost,
"cadControlledUploadSchema": typeof cadControlledUploadSchema,
"cadControlledUploadStore": typeof cadControlledUploadStore,
"cadDevAuthQualification": typeof cadDevAuthQualification,
"cadDevAuthQualificationBinding": typeof cadDevAuthQualificationBinding,
"cadDevAuthQualificationStore": typeof cadDevAuthQualificationStore,
"cadDevUploadSessionQualification": typeof cadDevUploadSessionQualification,
"cadDevUploadSessionQualificationAuthority": typeof cadDevUploadSessionQualificationAuthority,
"cadDevUploadSessionQualificationBinding": typeof cadDevUploadSessionQualificationBinding,
"cadDevUploadSessionQualificationSession": typeof cadDevUploadSessionQualificationSession,
"cadDurableEngine": typeof cadDurableEngine,
"cadUploadSessionGateway": typeof cadUploadSessionGateway,
"developmentAuth": typeof developmentAuth,
"http": typeof http,
"librarySession": typeof librarySession,
  }>;
  export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;
  export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;
