// Canonical Package 8 limits. Node and Convex load the same declarative source.
const source = require('./cadPhase5Package8Limits.json');

const PACKAGE8_QUALIFICATION_LIMITS = Object.freeze({ ...source.qualification });
const PACKAGE8_APPROVAL_ISSUER_LIMITS = Object.freeze({ ...source.issuer });

const PACKAGE8_QUALIFICATION_LIMITS_JSON = JSON.stringify(PACKAGE8_QUALIFICATION_LIMITS);

module.exports = {
  PACKAGE8_APPROVAL_ISSUER_LIMITS,
  PACKAGE8_QUALIFICATION_LIMITS,
  PACKAGE8_QUALIFICATION_LIMITS_JSON,
};
