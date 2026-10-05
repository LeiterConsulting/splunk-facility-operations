import { build } from 'esbuild';
await build({
  entryPoints: ['src/main.tsx'], bundle: true, minify: true, format: 'iife',
  outfile: 'splunk_facility_operations/appserver/static/facility-operations.js',
  target: ['es2020'], define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'linked', sourcemap: false,
});
console.log('Built the Splunk UI bundle.');
