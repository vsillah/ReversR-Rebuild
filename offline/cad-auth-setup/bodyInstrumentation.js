// Unmounted source guard. Deliberately exposes NO underlying request or body.
// Tests use an inert facade; installation at the real entrypoint needs new review.
function createBodyInstrumentation() {
  const counts = { applicationBodyBytesRead: 0, bodyGetterAttempts: 0,
    readAttempts: 0, parserInvocations: 0 };
  let stopped = false;
  const deny = counter => {
    counts[counter]++;
    stopped = true;
    throw new Error('BODY_ACCESS_FORBIDDEN');
  };
  const readMethods = new Set(['read', 'pipe', 'unpipe', 'resume', 'setEncoding',
    'on', 'once', 'addListener', 'prependListener', 'prependOnceListener', 'emit',
    'iterator', 'compose', Symbol.asyncIterator, Symbol.iterator]);
  const parserMethods = new Set(['json', 'text', 'arrayBuffer', 'blob', 'formData']);
  const bodyProperties = new Set(['body', 'rawBody', '_readableState', 'socket', 'connection']);
  const requestFacade = new Proxy(Object.create(null), {
    get(_target, key) {
      if (bodyProperties.has(key)) return deny('bodyGetterAttempts');
      if (readMethods.has(key)) return () => deny('readAttempts');
      if (parserMethods.has(key)) return () => deny('parserInvocations');
      // Unknown properties are unavailable; this is not an Express request wrapper.
      return undefined;
    },
    set() { return deny('bodyGetterAttempts'); },
    defineProperty() { return deny('bodyGetterAttempts'); },
    setPrototypeOf() { return deny('bodyGetterAttempts'); },
  });
  return Object.freeze({ requestFacade,
    beforeParser: () => deny('parserInvocations'),
    snapshot: () => Object.freeze({ ...counts, stopped,
      actualRouteObserved: false, platformBufferingEvidence: null }),
  });
}
module.exports = { createBodyInstrumentation };
