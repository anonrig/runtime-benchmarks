// HTTP TransformStream benchmark - Tests request body streaming through TransformStream
// Based on: https://github.com/cloudflare/workerd/issues/5724
//
// This benchmark tests the performance of piping an HTTP request body through
// a pass-through TransformStream. This exercises the runtime's IO layer.
//

export function handler(request) {
  // Pipe request body through a pass-through TransformStream
  return new Response(
    request.body.pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          controller.enqueue(chunk)
        },
      })
    )
  )
}
