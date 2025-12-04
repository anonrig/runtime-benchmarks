// SvelteKit-style SSR benchmark - Server-side data generation and rendering
// Ported from: https://github.com/t3dotgg/cf-vs-vercel-bench/tree/main/sveltekit-bench
// Note: This extracts the server-side computation logic from the SvelteKit benchmark

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

// SvelteKit page.server.ts load function equivalent
function getComplexData() {
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

  const totalPrimes = complexData.reduce(
    (sum, section) => sum + section.primes.length,
    0
  )
  const averageFib =
    complexData[0].fibonacci.reduce((a, b) => a + b, 0) /
    complexData[0].fibonacci.length

  return {
    data: complexData,
    totalPrimes,
    averageFib,
  }
}

// Simulate SvelteKit's load function + page render
function load() {
  const { data, totalPrimes, averageFib } = getComplexData()

  const computations = Array.from({ length: 300 }, (_, i) => {
    const n = i + 1
    const factorial = Array.from(
      { length: Math.min(n, 20) },
      (_, j) => j + 1
    ).reduce((acc, val) => acc * val, 1)
    return { n, factorial }
  })

  return {
    data,
    totalPrimes,
    averageFib,
    computations,
  }
}

// Render to HTML string (simulating Svelte's SSR output)
function render(pageData) {
  const { data, totalPrimes, averageFib, computations } = pageData

  const sectionsHtml = data
    .map((section) => {
      const primesHtml = section.primes
        .map((prime) => `<span class="prime">${prime}</span>`)
        .join('')

      const fibsHtml = section.fibonacci
        .map((fib) => `<span class="fib">${fib}</span>`)
        .join('')

      const itemsHtml = section.items
        .map(
          (item) => `
        <div class="item">
          <h4>Item ${item.id}</h4>
          <p class="desc">${item.description}</p>
          <p class="value">Value: ${item.value.toFixed(4)}</p>
          <div class="meta">
            <p>Hash: ${item.metadata.hash}</p>
            <p>Complexity: ${item.metadata.complexity.toFixed(6)}</p>
            <p>Timestamp: ${item.metadata.timestamp}</p>
          </div>
        </div>`
        )
        .join('')

      return `
      <section class="data-section">
        <h2>${section.title}</h2>
        <div class="primes-grid">${primesHtml}</div>
        <div class="fibs-wrap">${fibsHtml}</div>
        <div class="items-grid">${itemsHtml}</div>
      </section>`
    })
    .join('')

  const computationsHtml = computations
    .map(
      ({ n, factorial }) =>
        `<div class="computation">n=${n}, f=${factorial.toExponential(2)}</div>`
    )
    .join('')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SvelteKit SSR Benchmark</title>
</head>
<body>
  <main>
    <h1>Complex Server-Rendered Component (SvelteKit)</h1>
    <div class="stats">
      <h2>Statistics</h2>
      <p>Total Prime Numbers: ${totalPrimes}</p>
      <p>Average Fibonacci Value: ${averageFib.toFixed(2)}</p>
      <p>Total Sections: ${data.length}</p>
    </div>
    ${sectionsHtml}
    <div class="computations">
      <h2>Additional Computations</h2>
      <div class="computation-grid">${computationsHtml}</div>
    </div>
  </main>
</body>
</html>`
}

export function handler() {
  const pageData = load()
  const html = render(pageData)
  return html.length > 0
}
