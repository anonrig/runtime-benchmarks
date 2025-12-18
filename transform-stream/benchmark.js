// TransformStream benchmark - Tests pass-through transform performance
// Based on: https://github.com/cloudflare/workerd/issues/5724
//
// This benchmark tests the performance of piping data through a TransformStream
// that performs no transformation (just re-enqueues chunks). This pattern is
// common in streaming applications and revealed significant performance
// differences between runtimes.

const DATA_SIZE = 10 * 1024 * 1024 // 10 MiB
const CHUNK_SIZE = 64 * 1024 // 64 KiB chunks

export async function handler() {
  // Create a large buffer of random-ish data
  const data = new Uint8Array(DATA_SIZE)
  for (let i = 0; i < DATA_SIZE; i++) {
    data[i] = i & 0xff
  }

  // Create a ReadableStream that yields chunks of data
  let offset = 0
  const readable = new ReadableStream({
    pull(controller) {
      if (offset >= DATA_SIZE) {
        controller.close()
        return
      }
      const end = Math.min(offset + CHUNK_SIZE, DATA_SIZE)
      controller.enqueue(data.subarray(offset, end))
      offset = end
    },
  })

  // Pipe through a pass-through TransformStream (the slow pattern from the issue)
  const transformed = readable.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(chunk)
      },
    })
  )

  // Consume the stream and verify total size
  let totalBytes = 0
  const reader = transformed.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    totalBytes += value.byteLength
  }

  return totalBytes === DATA_SIZE
}
