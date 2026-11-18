// Does no work, so a request costs only what each runtime's HTTP server
// and the shared template add. Run it with `node --run bench:rps` to see
// how many requests per second each runtime serves.
export function handler() {
  return true
}
