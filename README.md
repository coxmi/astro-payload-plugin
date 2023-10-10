
# In server.ts

```js
import payload from 'payload'
import express from 'express'
import { astro } from 'astro-payload-plugin'

const app = express()

export async function getPayload() {
	await payload.init({
	    secret: PAYLOAD_SECRET,
	    express: app,
	})
	return payload
}

async function serve() {
	await getPayload()
	await astro({
		express: app,
		serverEntry: `path/to/astro/server/entry.mjs`,
		clientDir: `path/to/astro/client`,
	})
	app.listen(1234)
}
```

# In astro.config.ts

```js
import { defineConfig } from 'astro/config'
import node from '@astrojs/node'
import { payload } from 'astro-payload-plugin'
import { getPayload } from './server.ts'

export default defineConfig({
	integrations: [
		payload({
			builtConfigPath: 'absolute/path/to/payload.config.cjs',
			// pass payload instance to init
			init: getPayload
		})
	],
	output: 'hybrid',
	// must use node middleware
	adapter: node({
		mode: "middleware"
	})
})

```


# Example repo

<https://github.com/coxmi/astro-payload-example>