export default { expoConfig: { extra: {} } };
export const ErrorCode = { UserCancelled: 'cancelled' };
export const useIAP = () => { throw new Error('Native provider forbidden in local QA'); };
export const requireNativeModule = () => { throw new Error('Native provider forbidden in local QA'); };
