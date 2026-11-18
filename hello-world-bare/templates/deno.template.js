import config from './runtime-config.json' with { type: 'json' }

Deno.serve({ port: config.deno.port }, () => new Response('hello world'))
