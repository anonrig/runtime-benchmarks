// Next.js-style SSR benchmark - Server component rendering simulation
// Ported from: https://github.com/t3dotgg/cf-vs-vercel-bench/tree/main/next-bench
// Note: This extracts the server-side computation logic from the Next.js benchmark

function isPrime(num) {
  if (num <= 1) return false
  if (num <= 3) return true
  if (num % 2 === 0 || num % 3 === 0) return false
  for (let i = 5; i * i <= num; i += 6) {
    if (num % i === 0 || num % (i + 2) === 0) return false
  }
  return true
}

function calculatePrimes(limit) {
  const primes = []
  for (let i = 2; i <= limit; i++) {
    if (isPrime(i)) {
      primes.push(i)
    }
  }
  return primes
}

function fibonacci(n) {
  if (n <= 1) return n
  let a = 0,
    b = 1
  for (let i = 2; i <= n; i++) {
    const temp = a + b
    a = b
    b = temp
  }
  return b
}

function generateComplexData() {
  const primes = calculatePrimes(100000)
  const fibs = Array.from({ length: 100 }, (_, i) => fibonacci(i))

  const complexData = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    title: `Section ${i + 1}`,
    primes: primes.slice(i * 100, (i + 1) * 100),
    fibonacci: fibs,
    items: Array.from({ length: 20 }, (_, j) => ({
      id: j,
      value: Math.sqrt(i * 1000 + j),
      description: `Item ${j} in section ${i}`,
      metadata: {
        timestamp: Date.now(),
        hash: (i * j * 12345).toString(36),
        complexity: Math.sin(i) * Math.cos(j),
      },
    })),
  }))

  return complexData
}

// Simulate Next.js Server Component rendering
function ComplexComponent() {
  const data = generateComplexData()

  const totalPrimes = data.reduce(
    (sum, section) => sum + section.primes.length,
    0
  )
  const averageFib =
    data[0].fibonacci.reduce((a, b) => a + b, 0) / data[0].fibonacci.length

  // Generate HTML similar to Next.js server component output
  const sectionsHtml = data
    .map((section) => {
      const primesHtml = section.primes
        .map(
          (prime) =>
            `<div class="bg-purple-100 p-2 text-center rounded text-sm text-purple-900 border border-purple-200">${prime}</div>`
        )
        .join('')

      const fibsHtml = section.fibonacci
        .map(
          (fib) =>
            `<div class="bg-green-100 px-3 py-1 rounded text-sm text-green-900 border border-green-200">${fib}</div>`
        )
        .join('')

      const itemsHtml = section.items
        .map(
          (item) => `
        <div class="bg-gray-50 p-4 rounded border border-gray-300 shadow-sm">
          <h4 class="font-semibold text-gray-900">Item ${item.id}</h4>
          <p class="text-sm text-gray-600">${item.description}</p>
          <p class="text-sm text-gray-800">Value: ${item.value.toFixed(4)}</p>
          <div class="mt-2 text-xs text-gray-500">
            <p>Hash: ${item.metadata.hash}</p>
            <p>Complexity: ${item.metadata.complexity.toFixed(6)}</p>
            <p>Timestamp: ${item.metadata.timestamp}</p>
          </div>
        </div>`
        )
        .join('')

      return `
      <div class="mb-8 border border-gray-200 rounded-lg p-6 bg-white shadow">
        <h2 class="text-2xl font-bold mb-4 text-gray-900">${section.title}</h2>
        <div class="mb-4">
          <h3 class="text-xl font-semibold mb-2 text-purple-800">Prime Numbers (100 samples)</h3>
          <div class="grid grid-cols-10 gap-2">${primesHtml}</div>
        </div>
        <div class="mb-4">
          <h3 class="text-xl font-semibold mb-2 text-green-800">Fibonacci Sequence</h3>
          <div class="flex flex-wrap gap-2">${fibsHtml}</div>
        </div>
        <div>
          <h3 class="text-xl font-semibold mb-2 text-blue-800">Items (${section.items.length})</h3>
          <div class="grid grid-cols-2 gap-4">${itemsHtml}</div>
        </div>
      </div>`
    })
    .join('')

  const computationsHtml = Array.from({ length: 300 }, (_, i) => {
    const n = i + 1
    const factorial = Array.from(
      { length: Math.min(n, 20) },
      (_, j) => j + 1
    ).reduce((acc, val) => acc * val, 1)
    return `<div class="bg-white p-3 rounded shadow-sm border border-gray-200">
      <p class="font-mono text-sm text-gray-800">n=${n}, f=${factorial.toExponential(2)}</p>
    </div>`
  }).join('')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Next.js SSR Benchmark</title>
</head>
<body>
  <main class="flex flex-col items-center justify-center min-h-screen">
    <h1 class="text-2xl font-bold mb-4">Last rendered at:</h1>
    <p class="text-lg font-mono px-4 py-2 rounded">${new Date().toLocaleString()}</p>
    <div class="p-8 max-w-7xl mx-auto bg-white text-gray-900">
      <h1 class="text-4xl font-bold mb-6 text-gray-900">Complex Server-Rendered Component (Next.js)</h1>
      <div class="mb-8 p-4 rounded-lg bg-gray-100 border border-gray-200 shadow">
        <h2 class="text-2xl font-semibold mb-2 text-gray-800">Statistics</h2>
        <p class="text-lg">Total Prime Numbers: ${totalPrimes}</p>
        <p class="text-lg">Average Fibonacci Value: ${averageFib.toFixed(2)}</p>
        <p class="text-lg">Total Sections: ${data.length}</p>
      </div>
      ${sectionsHtml}
      <div class="mt-8 p-6 bg-gray-100 rounded-lg border border-gray-200 shadow">
        <h2 class="text-2xl font-bold mb-4 text-gray-900">Additional Computations</h2>
        <div class="grid grid-cols-3 gap-4">${computationsHtml}</div>
      </div>
    </div>
  </main>
</body>
</html>`
}

export function handler() {
  const html = ComplexComponent()
  return html.length > 0
}
