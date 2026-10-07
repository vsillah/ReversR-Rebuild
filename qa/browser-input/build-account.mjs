import {build} from 'esbuild';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=fileURLToPath(new URL('../../',import.meta.url));
const stub=fileURLToPath(new URL('./account-stubs.jsx',import.meta.url));
const allowed=new Set(['app/account.tsx','constants/theme.ts','utils/commercialUsage.ts','utils/focusVisibility.ts','hooks/useAndroidKeyboardInset.ts','qa/browser-input/account-fixture.jsx','qa/browser-input/account-stubs.jsx']);
export async function buildAccountFixture({baseline=false}={}){
const before=baseline?execFileSync('git',['show','4d4b498fc6d99bec5561f068b5d2489a6c1d02c1:app/account.tsx'],{cwd:root,encoding:'utf8'}):null;
const result=await build({absWorkingDir:root,entryPoints:['qa/browser-input/account-fixture.jsx'],bundle:true,
  outfile:`qa/browser-input/.generated/account-${baseline?'before':'fixture'}.js`,platform:'browser',metafile:true,
  define:{'process.env.NODE_ENV':'"production"','process.env.EXPO_PUBLIC_COMMERCIAL_BACKEND':'"offline-fixture"','FIXTURE_BASELINE':JSON.stringify(baseline)},
  plugins:[{name:'offline-account-boundary',setup(b){
    b.onResolve({filter:/^(\.\.\/hooks\/(useCommercialization|useCommercialAuth|useAppTheme)|\.\.\/components\/CommercialLogin|@expo\/vector-icons)$/},()=>({path:stub}));
    b.onResolve({filter:/^react-native$/},()=>({path:path.join(root,'node_modules/react-native-web/dist/index.js')}));
    b.onLoad({filter:/\.[cm]?[jt]sx?$/},args=>{
      const relative=path.relative(root,args.path);
      if(!relative.startsWith('node_modules/')&&!allowed.has(relative))throw new Error(`Unapproved fixture source: ${relative}`);
      if(baseline&&relative==='app/account.tsx')return {contents:before,loader:'tsx',resolveDir:path.dirname(args.path)};
    });
  }}],logLevel:'silent'});
const inputs=Object.keys(result.metafile.inputs);
if(inputs.some(p=>/convex|CommercialLogin|useCommercialAuth|useCommercialization|useAppTheme/.test(p)))throw new Error('Provider boundary violated');
return inputs;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
await buildAccountFixture();
await buildAccountFixture({baseline:true});
console.log('Actual AccountScreen bundled offline; provider/auth modules excluded.');
}
