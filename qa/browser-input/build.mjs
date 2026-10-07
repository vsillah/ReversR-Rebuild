import {build} from 'esbuild';
await build({entryPoints:[new URL('./react-fixture.jsx',import.meta.url).pathname],bundle:true,
  outfile:new URL('./.generated/react-fixture.js',import.meta.url).pathname,platform:'browser',
  define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'});
console.log('Local React fixture bundled from installed dependencies.');
