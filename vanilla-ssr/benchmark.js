// Vanilla SSR benchmark - Pure JavaScript HTML string generation
// Ported from: https://github.com/t3dotgg/cf-vs-vercel-bench/tree/main/vanilla-bench

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
  // Calculate first 10,000 primes
  const primes = calculatePrimes(100000)

  // Calculate fibonacci numbers
  const fibs = Array.from({ length: 100 }, (_, i) => fibonacci(i))

  // Generate complex nested data
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

function renderComplexComponent(data) {
  const totalPrimes = data.reduce(
    (sum, section) => sum + section.primes.length,
    0
  )
  const averageFib =
    data[0].fibonacci.reduce((a, b) => a + b, 0) / data[0].fibonacci.length

  const sectionsHtml = data
    .map((section) => {
      const primesHtml = section.primes
        .map(
          (prime) =>
            `<div style="background-color: #e9d5ff; padding: 8px; text-align: center; border-radius: 4px; font-size: 14px; color: #581c87; border: 1px solid #d8b4fe;">${prime}</div>`
        )
        .join('')

      const fibsHtml = section.fibonacci
        .map(
          (fib) =>
            `<div style="background-color: #dcfce7; padding: 4px 12px; border-radius: 4px; font-size: 14px; color: #14532d; border: 1px solid #bbf7d0;">${fib}</div>`
        )
        .join('')

      const itemsHtml = section.items
        .map(
          (item) => `
      <div style="background-color: #f9fafb; padding: 16px; border-radius: 4px; border: 1px solid #d1d5db; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
        <h4 style="font-weight: 600; color: #111827;">Item ${item.id}</h4>
        <p style="font-size: 14px; color: #4b5563;">${item.description}</p>
        <p style="font-size: 14px; color: #1f2937;">Value: ${item.value.toFixed(4)}</p>
        <div style="margin-top: 8px; font-size: 12px; color: #6b7280;">
          <p>Hash: ${item.metadata.hash}</p>
          <p>Complexity: ${item.metadata.complexity.toFixed(6)}</p>
          <p>Timestamp: ${item.metadata.timestamp}</p>
        </div>
      </div>
    `
        )
        .join('')

      return `
      <div style="margin-bottom: 32px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; background-color: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 16px; color: #111827;">${section.title}</h2>

        <div style="margin-bottom: 16px;">
          <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 8px; color: #6b21a8;">Prime Numbers (100 samples)</h3>
          <div style="display: grid; grid-template-columns: repeat(10, 1fr); gap: 8px;">${primesHtml}</div>
        </div>

        <div style="margin-bottom: 16px;">
          <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 8px; color: #166534;">Fibonacci Sequence</h3>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">${fibsHtml}</div>
        </div>

        <div>
          <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 8px; color: #1e40af;">Items (${section.items.length})</h3>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">${itemsHtml}</div>
        </div>
      </div>
    `
    })
    .join('')

  const additionalComputations = Array.from({ length: 300 }, (_, i) => {
    const n = i + 1
    const factorial = Array.from(
      { length: Math.min(n, 20) },
      (_, j) => j + 1
    ).reduce((acc, val) => acc * val, 1)
    return `
      <div style="background-color: white; padding: 12px; border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;">
        <p style="font-family: monospace; font-size: 14px; color: #1f2937;">n=${n}, f=${factorial.toExponential(2)}</p>
      </div>
    `
  }).join('')

  return `
    <div style="padding: 32px; max-width: 1280px; margin: 0 auto; background-color: white; color: #111827;">
      <h1 style="font-size: 36px; font-weight: bold; margin-bottom: 24px;">Complex Server-Rendered Component (Vanilla)</h1>

      <div style="margin-bottom: 32px; padding: 16px; border-radius: 8px; background-color: #f3f4f6; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h2 style="font-size: 24px; font-weight: 600; margin-bottom: 8px; color: #1f2937;">Statistics</h2>
        <p style="font-size: 18px;">Total Prime Numbers: ${totalPrimes}</p>
        <p style="font-size: 18px;">Average Fibonacci Value: ${averageFib.toFixed(2)}</p>
        <p style="font-size: 18px;">Total Sections: ${data.length}</p>
      </div>

      ${sectionsHtml}

      <div style="margin-top: 32px; padding: 24px; background-color: #f3f4f6; border-radius: 8px; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 16px;">Additional Computations</h2>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">${additionalComputations}</div>
      </div>
    </div>
  `
}

export function handler() {
  const data = generateComplexData()
  const html = renderComplexComponent(data)
  return html.length > 0
}
