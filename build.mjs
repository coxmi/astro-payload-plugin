import esbuild from 'esbuild'
import payload from 'payload'

let watch = process.argv[2] === '--watch'

const base = {
	entryPoints: [
		'src/index.ts'
	],
	outdir: 'dist',
	bundle: true,
	minify: false,
	sourcemap: true,
	platform: 'node',
  	packages: 'external',
}

const common = await esbuild.context({
	...base,
  	outExtension: { '.js': '.cjs' },
})

const esm = await esbuild.context({
	...base,
	format: 'esm',
  	outExtension: { '.js': '.mjs' },
})

if (watch) {
	await Promise.all([common.watch(), esm.watch()])
} else {
	await Promise.all([common.rebuild(), esm.rebuild()])
	await Promise.all([common.dispose(), esm.dispose()])
}