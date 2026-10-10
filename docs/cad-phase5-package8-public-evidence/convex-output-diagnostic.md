# Phase 5 Package 8 Convex output diagnosis

Status: stopped at ambiguous output behavior. No provider request or retry was
made during this diagnosis.

## Finding

The installed Convex `1.45.0` source writes function-spec JSON to stdout. The
consumed sanitizer nevertheless retained no artifact, sanitized output, or
parser exit status. Its four silent exits represented JSON, response-shape,
target, and identifier failures without emitting a fixed classification.

Synthetic reproduction proves each of those branches can produce the same
empty observable result. The exact branch taken by the consumed live command
cannot be recovered without rerunning it, which is prohibited. The fixed
classification is therefore `WRAPPER_SILENT_EXIT_UNOBSERVABLE`.

The source review also found two system queries per `function-spec` command and
an installed transport retry ceiling of six, with no function-spec no-retry
flag. A future zero-retry metadata read cannot safely reuse this official CLI
path without a separately reviewed one-attempt transport.

## Added diagnostic contract

The offline diagnostic now emits only fixed classifications, a function count,
and a digest. It never emits or persists raw stdout, stderr, validators,
function bodies, credentials, environment values, rows, logs, or account data.
Synthetic tests cover empty output, malformed JSON, response-shape drift,
target mismatch, missing, duplicate, and unsupported identifiers, stderr
presence, successful sanitization, and the consumed-run evidence gap.

The 17 unavailable Package 8 values, inactive ten-minute candidate window,
consumed read, no-retry gate, and all disabled runtime authorities are unchanged.
