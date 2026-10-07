// Offline compatibility probe: real public provider composition and auth store,
// with token generation disabled by the public signInViaProvider helper.
import { actionGeneric } from 'convex/server';
import { v } from 'convex/values';
import { signInViaProvider, type GenericActionCtxWithAuthConfig } from '@convex-dev/auth/server';
import { Password } from '@convex-dev/auth/providers/Password';
import { commercialAuthProviders } from '../convex/commercialPassword';

export const invoke = actionGeneric({
  args: { email: v.string(), password: v.string(), nested: v.boolean() },
  handler: async (ctx, args) => {
    const provider = args.nested ? commercialAuthProviders()[1] : Password();
    return signInViaProvider(ctx as GenericActionCtxWithAuthConfig<any>, provider, {
      params: { email: args.email, password: args.password, flow: args.nested ? 'signIn' : 'signUp' },
    });
  },
});
