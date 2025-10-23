import config from '../config.json' with { type: 'json' }

Deno.serve(
  {
    port: parseInt(config.deno.port),
  },
  () => {
    return new Response('hello world')
  }
)
