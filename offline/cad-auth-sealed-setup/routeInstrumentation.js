// Unmounted source instrumentation. Never receives or inspects a request/body.
// A future entrypoint integration must invoke guards BEFORE accessing the body.
const EVENTS = Object.freeze(['bodyGetterAttempts', 'readAttempts', 'parserInvocations',
  'streamSubscriptions', 'pipeAttempts', 'iteratorAttempts']);
function createRouteInstrumentation() {
  const counters = Object.fromEntries(EVENTS.map(key => [key, 0]));
  let entered = false, stopped = false;
  const fail = () => { stopped = true; throw Error('BODY_ACCESS_BLOCKED'); };
  return Object.freeze({
    enter() { if (entered || stopped) fail(); entered = true; },
    beforeBodyAccess(event) {
      if (!EVENTS.includes(event)) fail();
      counters[event]++;
      fail(); // No callback or underlying read is ever invoked.
    },
    beforeVerifier() { if (!entered || stopped) fail(); },
    stop() { stopped = true; },
    snapshot() { return Object.freeze({ ...counters, entered, stopped,
      applicationBytesRead: 0, instrumentationInstalled: false,
      actualRouteProven: false, platformBufferingReviewed: false }); },
  });
}
module.exports = { EVENTS, createRouteInstrumentation };
