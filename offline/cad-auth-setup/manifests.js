// Canonical source-only schemas. Binding actual evidence requires a new reviewed source change.
const schemas = {
  "immutable-target.json": {
    "schemaVersion": 1,
    "sourceOnly": true,
    "status": "UNBOUND_TEMPLATE",
    "bindingAuthority": false,
    "bindings": {
      "immutableCollectionTarget": {
        "deploymentUrl": null,
        "deploymentCommit": null,
        "deploymentProviderRef": null,
        "sourceMapDigest": null
      },
      "actualRouteInstrumentation": {
        "instrumentationCommit": null,
        "entrypointRef": null,
        "bodyAccessCounterRef": null,
        "platformBufferingReviewRef": null
      }
    },
    "policy": {
      "mutableAliasAllowed": false,
      "historicalPlanDeploymentReusable": false,
      "candidateMounted": false,
      "instrumentationInstalled": false,
      "emptyBodyProvesNonemptyAdmissionOrder": false
    }
  },
  "approval-window.json": {
    "schemaVersion": 1,
    "sourceOnly": true,
    "status": "UNBOUND_TEMPLATE",
    "bindingAuthority": false,
    "bindings": {
      "freshExplicitApprovalWindow": {
        "startsAtUtc": null,
        "expiresAtUtc": null,
        "exactApprovalReceiptRef": null,
        "sealedCardSha256": null
      }
    },
    "policy": {
      "durationMinutes": 30,
      "historicalApprovalReusable": false,
      "automaticRolloverAllowed": false,
      "executableCommandCardIssuanceAllowed": false
    }
  },
  "provider-policy.json": {
    "schemaVersion": 1,
    "sourceOnly": true,
    "status": "UNBOUND_TEMPLATE",
    "bindingAuthority": false,
    "bindings": {
      "providerAdapter": {
        "sourceCommit": null,
        "deployedVersionRef": null,
        "sdkPolicyDigest": null,
        "issuerAudienceAlgorithmPolicy": null
      },
      "providerPolicyAndVersions": {
        "authSdkVersion": null,
        "authCoreVersion": null,
        "providerPolicyRef": null,
        "cacheInvalidationPolicyRef": null
      }
    },
    "policy": {
      "sdkVersionsFromSource": {
        "convex": "1.45.0",
        "auth": "0.0.95",
        "authCore": "0.41.3"
      },
      "deployedVersionsVerified": false,
      "cryptographicVerificationRequired": true,
      "freshExactSessionOwnerRequired": true,
      "freshMembershipRequired": true,
      "sdkRetries": 0,
      "requestBudgetMs": 800
    }
  },
  "custody-reviewer.json": {
    "schemaVersion": 1,
    "sourceOnly": true,
    "status": "UNBOUND_TEMPLATE",
    "bindingAuthority": false,
    "bindings": {
      "custodyAndReviewer": {
        "custodianRef": null,
        "reviewerRef": null,
        "restrictedStoreRef": null,
        "retentionDeletionRef": null
      }
    },
    "policy": {
      "independentReviewerRequired": true,
      "retentionDays": 7,
      "hashAfterSanitization": true,
      "receiptPublicationAllowed": false,
      "rawCredentialCaptureAllowed": false,
      "rawAccountCaptureAllowed": false
    }
  },
  "synthetic-cohort.json": {
    "schemaVersion": 1,
    "sourceOnly": true,
    "status": "UNBOUND_TEMPLATE",
    "bindingAuthority": false,
    "bindings": {
      "syntheticCohortMapping": {
        "cohortRef": null,
        "aliasMapRef": null,
        "lifecycleSetupReceiptRef": null,
        "noRealUserReceiptRef": null
      }
    },
    "policy": {
      "aliases": [
        "U1/L1",
        "U1/L2",
        "U2/L3"
      ],
      "shops": [
        "S1",
        "S2"
      ],
      "realUsers": 0,
      "lifecycleMutationsAuthorized": false,
      "correlatedBeforeAfterRequired": true,
      "rawIdentityMappingsAllowedInRepo": false
    }
  }
};
function expectedManifest(name) {
  if (!Object.hasOwn(schemas, name)) throw Error("UNKNOWN_MANIFEST");
  return JSON.parse(JSON.stringify(schemas[name]));
}
module.exports = { expectedManifest };
