-- REVIEW ONLY: no functions, grants to runtime, or activation wiring.
-- Not an executable production migration. See cad-provider-store-design.md.
BEGIN;
CREATE SCHEMA cad_auth;
REVOKE ALL ON SCHEMA cad_auth FROM PUBLIC;
CREATE DOMAIN cad_auth.opaque_id AS text
  CHECK (VALUE ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$');
CREATE DOMAIN cad_auth.digest AS text CHECK (VALUE ~ '^[a-f0-9]{64}$');
CREATE DOMAIN cad_auth.epoch_ms AS bigint
  CHECK (VALUE BETWEEN 0 AND 9007199254740991);
CREATE DOMAIN cad_auth.auth_method AS text CHECK (VALUE IN ('password','passkey','oidc'));

CREATE TABLE cad_auth.users (
  user_id cad_auth.opaque_id PRIMARY KEY,
  issuer text NOT NULL CHECK (length(issuer) BETWEEN 1 AND 2048),
  subject text NOT NULL CHECK (length(subject) BETWEEN 1 AND 255),
  disabled boolean NOT NULL DEFAULT false,
  UNIQUE (issuer, subject)
);
CREATE TABLE cad_auth.shops (shop_id cad_auth.opaque_id PRIMARY KEY);
CREATE TABLE cad_auth.memberships (
  user_id cad_auth.opaque_id REFERENCES cad_auth.users NOT NULL,
  shop_id cad_auth.opaque_id REFERENCES cad_auth.shops NOT NULL,
  active boolean NOT NULL DEFAULT false,
  cad_upload_allowed boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, shop_id),
  CHECK (active OR NOT cad_upload_allowed)
);
CREATE TABLE cad_auth.login_sessions (
  login_session_id cad_auth.opaque_id PRIMARY KEY,
  user_id cad_auth.opaque_id REFERENCES cad_auth.users NOT NULL,
  login_secret_digest cad_auth.digest NOT NULL UNIQUE,
  provider_session_ref text CHECK (length(provider_session_ref) BETWEEN 1 AND 2048),
  auth_method cad_auth.auth_method NOT NULL,
  created_at cad_auth.epoch_ms NOT NULL,
  expires_at cad_auth.epoch_ms NOT NULL,
  revoked_at cad_auth.epoch_ms,
  UNIQUE (login_session_id, user_id, auth_method),
  CHECK (auth_method <> 'oidc' OR provider_session_ref IS NOT NULL),
  CHECK (expires_at > created_at),
  CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);
CREATE TABLE cad_auth.cad_upload_sessions (
  credential_digest cad_auth.digest PRIMARY KEY,
  schema_version smallint NOT NULL CHECK (schema_version = 2),
  session_id cad_auth.opaque_id NOT NULL UNIQUE,
  login_session_id cad_auth.opaque_id NOT NULL,
  user_id cad_auth.opaque_id NOT NULL,
  shop_id cad_auth.opaque_id NOT NULL,
  auth_method cad_auth.auth_method NOT NULL,
  cad_upload_allowed boolean NOT NULL,
  transport text NOT NULL CHECK (transport IN ('bearer','cookie')),
  issued_at cad_auth.epoch_ms NOT NULL,
  expires_at cad_auth.epoch_ms NOT NULL,
  status text NOT NULL CHECK (status IN ('active','revoked')),
  csrf_digest cad_auth.digest,
  revoked_at cad_auth.epoch_ms,
  FOREIGN KEY (login_session_id, user_id, auth_method)
    REFERENCES cad_auth.login_sessions (login_session_id, user_id, auth_method),
  FOREIGN KEY (user_id, shop_id) REFERENCES cad_auth.memberships,
  CHECK (expires_at > issued_at AND expires_at - issued_at <= 900000),
  CHECK ((transport = 'cookie' AND csrf_digest IS NOT NULL)
      OR (transport = 'bearer' AND csrf_digest IS NULL)),
  CHECK ((status = 'active' AND revoked_at IS NULL)
      OR (status = 'revoked' AND revoked_at IS NOT NULL AND revoked_at >= issued_at))
);
CREATE INDEX ON cad_auth.login_sessions (user_id, login_session_id);
CREATE INDEX ON cad_auth.cad_upload_sessions (login_session_id);
CREATE INDEX ON cad_auth.cad_upload_sessions (user_id, shop_id, credential_digest);
CREATE INDEX ON cad_auth.cad_upload_sessions (expires_at);
REVOKE ALL ON ALL TABLES IN SCHEMA cad_auth FROM PUBLIC;
-- Actual function owner/default privileges and guarded operations are future work.
ROLLBACK;
