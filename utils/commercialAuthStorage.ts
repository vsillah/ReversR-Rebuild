// Convex Auth strips punctuation from namespaces. Encode the exact URL/issuer
// tuple as fixed-width UTF-16 hex so distinct endpoints cannot collapse.
export function commercialAuthStorageNamespace(url: string, issuer: string) {
  const identity = JSON.stringify([url, issuer]);
  return 'reversrCommercialV1' + identity.split('')
    .map(character => character.charCodeAt(0).toString(16).padStart(4, '0')).join('');
}
