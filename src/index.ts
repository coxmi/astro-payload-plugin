import type { AstroIntegration } from 'astro'
import type { Payload } from 'payload'
import express from 'express'
import path from 'path'
import fs from 'fs/promises'


type PayloadArgs = { 
	/** 
	 * Absolute path to the built payload config file
	 * e.g. /path/to/payload.config.js
	 * */
	builtConfigPath: string, 
	/** 
	 * Reference to a function that will run payload.init() and return the payload instance. 
	 * Payload should not be started separately (this is handled by the plugin).
	 * e.g. 
	 * async function() {
	 *     return await payload.init({…})	
	 * }
	 * */
	init: () => Payload | Promise<Payload>
}

export function payload({ builtConfigPath, init }: PayloadArgs): AstroIntegration {
	
	let errors: string[] = []
	if (!path.isAbsolute(builtConfigPath)) {
		errors.push('astro-payload-plugin: payload.builtConfigPath must be an absolute path')
	}

	let mode: string

	return {
		name: 'astro-payload-plugin',
		hooks: {
			'astro:config:setup'({ config, addWatchFile, command, updateConfig, logger }) {
				mode = command
				if (mode === 'dev') addWatchFile(builtConfigPath)

				if (errors.length) {
					errors.map(error => logger.error(error))
					return
				}

				// console.log('test', config.outDir, config)

				// ignore any of astro's built output
				updateConfig({
				    vite: {
				    	ssr: {
				    		external: [
				    			config.outDir,
				    			config.build.client,
				    			config.build.server,
				    			path.resolve('astro-payload-plugin')
				    		].filter(Boolean),
				    	}
				    }
				})
			},

			// astro:server:setup only runs on dev (not preview), 
			// so we can't hook into the preview functionality
			async 'astro:server:setup'({ server }) {
				if (errors.length) return
				if (mode === 'dev') {
					const payload = await init()
					if (payload.express) server.middlewares.use(payload.express)
				}
			},
		}
	}
}


type AstroArgs = {
	/**
	 * The express app used for payload
	 */
	express: ReturnType<typeof express>,
	/**
	 * Absolute path to astro's built ssr entry file
	 * e.g. /path/to/astro/server/entry.mjs
	 */
	serverEntry: string,
	/**
	 * Absolute path to astro's built static assets
	 * e.g. /path/to/astro/client
	 */
	clientDir: string,
	/**
	 * Passed into express.static for hosting astro's static files
	 */
	staticOptions?: {}
}

export async function astro({ express: app, serverEntry, clientDir, staticOptions = {} }: AstroArgs): Promise<ReturnType<typeof express>|void> {
	if (!path.isAbsolute(serverEntry)) throw new Error('serverEntry must be an absolute path')
	if (!path.isAbsolute(clientDir)) throw new Error('clientDir must be an absolute path')
	
	// add astro SSR handler to express app
	const { handler } = await import(serverEntry /* @vite-ignore */)	
	app.use(handler)

	// add astro static files to express
	app.use('/', express.static(clientDir, staticOptions))

	// astro 404s don't work in production, so we fix it here
	try {
		const static404 = await fs.readFile(path.join(clientDir, '404.html'))
		app.use(function (req, res, next) {
			res.status(404).send(static404.toString())
		})	
	} catch(e) {
		console.log('Using basic 404, add a 404.html page and retry')
	}
	
	return app
}