import { ChildProcess, execFileSync, execSync, spawn } from 'node:child_process'
import { parseArgs } from 'node:util'
import {
  copyFileSync,
  unlinkSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  existsSync,
} from 'node:fs'
import assert from 'node:assert/strict'
import path from 'node:path'
import { createConnection, createServer } from 'node:net'
import { setTimeout } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const runtimes = ['workerd', 'deno', 'bun', 'node'] as const

// Find an available port by binding to port 0
async function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.listen(0, () => {
      const address = server.address()
      if (address && typeof address === 'object') {
        const port = address.port
        server.close(() => resolve(port))
      } else {
        server.close(() => reject(new Error('Could not get port')))
      }
    })
    server.on('error', reject)
  })
}

// Dynamic port assignments for each runtime
const ports: Record<(typeof runtimes)[number], number> = {
  workerd: 0,
  deno: 0,
  bun: 0,
  node: 0,
}

type Benchmark = {
  directory_name: string
  runtime: 'workerd' | 'deno' | 'bun' | 'node'
}

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    benchmark: {
      type: 'string',
    },
    // 'latency' times sequential requests with hyperfine; 'rps' measures
    // throughput under concurrent load with oha.
    mode: {
      type: 'string',
      default: 'latency',
    },
    duration: {
      type: 'string',
      default: '10s',
    },
    connections: {
      type: 'string',
      default: '50',
    },
  },
  strict: true,
  allowPositionals: false,
})

assert(
  values.mode === 'latency' || values.mode === 'rps',
  `--mode must be 'latency' or 'rps', got '${values.mode}'`
)

const processes: Record<Benchmark['runtime'], ChildProcess> = {}

function cleanup() {
  console.log('\nCleaning up processes...')
  for (const [runtime, proc] of Object.entries(processes)) {
    if (proc && proc.pid) {
      try {
        proc.kill('SIGTERM')
        // Give a moment, then force kill if still running
        try {
          proc.kill('SIGKILL')
        } catch {
          // Process already terminated
        }
      } catch (error) {
        console.error(`Failed to kill ${runtime} process:`, error)
      }
    }
  }
  // Clear the processes record for the next benchmark
  for (const key of Object.keys(processes)) {
    delete processes[key as keyof typeof processes]
  }
}

// Register cleanup handlers
process.on('SIGINT', () => {
  cleanup()
  process.exit(130)
})

process.on('SIGTERM', () => {
  cleanup()
  process.exit(143)
})

process.on('exit', () => {
  cleanup()
})

async function waitForPort(
  port: number,
  runtime: string,
  maxAttempts = 50
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const { promise, resolve, reject } = Promise.withResolvers()
      const socket = createConnection(port, 'localhost')
      socket.on('connect', () => {
        socket.end()
        resolve()
      })
      socket.on('error', reject)
      await promise
      console.log(`[${runtime}] Port ${port} is ready`)
      return // Successfully connected, exit the function
    } catch {
      if (i % 10 === 0 && i > 0) {
        console.log(
          `[${runtime}] Still waiting for port ${port}... (${i}/${maxAttempts})`
        )
      }
      await setTimeout(200)
    }
  }
  throw new Error(`Port ${port} did not become available for ${runtime}`)
}

async function startServer(
  filePath: string,
  runtime: Benchmark['runtime'],
  cwd?: string
): void {
  console.log(`Starting server for ${runtime}`)

  const spawnOptions = {
    stdio: ['ignore', 'pipe', 'pipe'] as const,
    detached: false,
    cwd: cwd,
  }

  let proc: ChildProcess

  switch (runtime) {
    case 'workerd':
      // Spawn the native binary itself rather than node_modules/.bin/workerd.
      // That shim is a shell script that runs workerd as a child, so killing
      // it in cleanup() would leave workerd running.
      const workerdPath: string = createRequire(import.meta.url)(
        'workerd'
      ).default
      console.log(`[workerd] Using binary at: ${workerdPath}`)
      console.log(`[workerd] CWD: ${cwd}`)
      console.log(`[workerd] Serving: ${filePath}`)
      proc = spawn(workerdPath, ['serve', filePath], spawnOptions)
      processes.workerd = proc
      break
    case 'deno':
      proc = spawn(
        'deno',
        ['run', '--allow-net', '--allow-read', '--allow-env', filePath],
        spawnOptions
      )
      processes.deno = proc
      break
    case 'bun':
      proc = spawn('bun', [filePath], spawnOptions)
      processes.bun = proc
      break
    case 'node':
      proc = spawn('node', [filePath], spawnOptions)
      processes.node = proc
      break
  }

  // Capture stdout for debugging
  proc!.stdout?.on('data', (data) => {
    console.log(`[${runtime} stdout]:`, data.toString())
  })

  // Capture stderr for debugging
  proc!.stderr?.on('data', (data) => {
    console.error(`[${runtime} stderr]:`, data.toString())
  })

  proc!.on('error', (error) => {
    console.error(`[${runtime} error]:`, error)
  })

  proc!.on('exit', (code, signal) => {
    if (code !== null && code !== 0) {
      console.error(`[${runtime}] exited with code ${code}`)
    }
    if (signal) {
      console.error(`[${runtime}] killed by signal ${signal}`)
    }
  })

  // Give the process a moment to start
  await setTimeout(500)

  // Check if process is still running
  if (proc!.exitCode !== null) {
    throw new Error(
      `[${runtime}] Process exited immediately with code ${proc!.exitCode}`
    )
  }

  await waitForPort(ports[runtime], runtime)
}

let benchmark = values.benchmark
assert(
  benchmark,
  'Benchmark path is required, such as: node --run bench -- --benchmark=hello-world or --benchmark=all'
)

function runLatencyBenchmark(benchmarkPath: string, dataBinPath?: string) {
  const exportJson = path.join(benchmarkPath, 'benchmark-results.json')
  const exportMarkdown = path.join(benchmarkPath, 'benchmark-results.md')

  let command = `hyperfine --warmup 50 --export-json ${exportJson} --export-markdown ${exportMarkdown} `
  const curlArgs = dataBinPath ? `--data-binary @${dataBinPath}` : ''
  for (const runtime of runtimes) {
    command += ` -n "${runtime}" "curl ${curlArgs} http://localhost:${ports[runtime]}/ -s -o /dev/null"`
  }

  console.log('Now running: ', command)
  console.log('')

  execSync(command, { stdio: ['inherit', 'inherit', 'inherit'] })
}

type RpsResult = {
  runtime: Benchmark['runtime']
  requestsPerSec: number
  totalRequests: number
  p50Ms: number
  p99Ms: number
}

// Runs oha against url and returns its parsed JSON report. Fails if any
// request errored or got a non-200 response, because the throughput of a
// server that is failing requests is not a meaningful number.
function runOha(url: string, duration: string, bodyArgs: string[]) {
  const output = execFileSync(
    'oha',
    [
      '-z',
      duration,
      '-c',
      values.connections!,
      // Count requests still in flight at the deadline instead of
      // reporting them as aborted.
      '-w',
      '--no-tui',
      '--output-format',
      'json',
      ...bodyArgs,
      url,
    ],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  )
  const report = JSON.parse(output)
  const statusCodes: Record<string, number> = report.statusCodeDistribution
  const errors: Record<string, number> = report.errorDistribution
  assert(
    Object.keys(errors).length === 0 &&
      Object.keys(statusCodes).every((code) => code === '200'),
    `${url} failed requests: statuses ${JSON.stringify(statusCodes)}, errors ${JSON.stringify(errors)}`
  )
  return report
}

function runRpsBenchmark(benchmarkPath: string, dataBinPath?: string) {
  const bodyArgs = dataBinPath ? ['-m', 'POST', '-D', dataBinPath] : []
  const warmup = '3s'
  const results: RpsResult[] = []

  // Load one runtime at a time, so that each has the machine to itself
  // while it is being measured.
  for (const runtime of runtimes) {
    // Use the IPv4 loopback address, since not every runtime listens on
    // ::1, which localhost may resolve to.
    const url = `http://127.0.0.1:${ports[runtime]}/`
    console.log(`[${runtime}] Warming up for ${warmup}`)
    runOha(url, warmup, bodyArgs)
    console.log(
      `[${runtime}] Measuring for ${values.duration} with ${values.connections} connections`
    )
    const report = runOha(url, values.duration!, bodyArgs)
    const totalRequests = Object.values(
      report.statusCodeDistribution as Record<string, number>
    ).reduce((sum, count) => sum + count, 0)
    const result: RpsResult = {
      runtime,
      requestsPerSec: report.summary.requestsPerSec,
      totalRequests,
      p50Ms: report.latencyPercentiles.p50 * 1000,
      p99Ms: report.latencyPercentiles.p99 * 1000,
    }
    console.log(
      `[${runtime}] ${Math.round(result.requestsPerSec)} requests/sec`
    )
    results.push(result)
  }

  results.sort((a, b) => b.requestsPerSec - a.requestsPerSec)
  const best = results[0].requestsPerSec

  let markdown = `Duration: ${values.duration}, connections: ${values.connections}\n\n`
  markdown += '| Runtime | Requests/sec | Relative | p50 [ms] | p99 [ms] |\n'
  markdown += '|:---|---:|---:|---:|---:|\n'
  for (const r of results) {
    markdown += `| \`${r.runtime}\` | ${Math.round(r.requestsPerSec)} | ${(r.requestsPerSec / best).toFixed(2)} | ${r.p50Ms.toFixed(2)} | ${r.p99Ms.toFixed(2)} |\n`
  }

  writeFileSync(
    path.join(benchmarkPath, 'rps-results.json'),
    JSON.stringify(
      {
        duration: values.duration,
        connections: Number(values.connections),
        results,
      },
      null,
      2
    )
  )
  writeFileSync(path.join(benchmarkPath, 'rps-results.md'), markdown)

  console.log('')
  console.log(markdown)
}

async function runBenchmark(benchmarkPath: string) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Running benchmark: ${benchmarkPath}`)
  console.log('='.repeat(60) + '\n')

  // Allocate random available ports for each runtime
  for (const runtime of runtimes) {
    ports[runtime] = await getAvailablePort()
  }
  console.log(`Allocated ports: ${JSON.stringify(ports)}`)

  // Write dynamic config.json for node/bun/deno templates to read
  const runtimeConfig = {
    bun: { port: ports.bun },
    deno: { port: ports.deno },
    node: { port: ports.node },
    workerd: { port: ports.workerd },
  }
  writeFileSync(
    path.join(benchmarkPath, 'runtime-config.json'),
    JSON.stringify(runtimeConfig, null, 2)
  )

  // Check if data.bin exists for POST benchmarks
  const dataBinPath = path.join(benchmarkPath, 'data.bin')
  const hasDataBin = existsSync(dataBinPath)
  if (hasDataBin) {
    console.log(`Found data.bin, will POST data to servers`)
  }

  // Generate workerd config with dynamic file embedding
  const destination = path.join(benchmarkPath, 'workerd.config.capnp')
  let baseCapnp = readFileSync('./base.capnp', 'utf8')

  // Replace port placeholder with actual port
  baseCapnp = baseCapnp.replace('{PORT}', String(ports.workerd))

  // Embed benchmark.js as an esModule. A benchmark whose own templates
  // serve requests directly need not have one.
  let additionalFiles = existsSync(path.join(benchmarkPath, 'benchmark.js'))
    ? ',\n    (name = "benchmark.js", esModule = embed "benchmark.js")'
    : ''

  // Check if files.json exists in the benchmark directory
  const filesJsonPath = path.join(benchmarkPath, 'files.json')
  try {
    const files = JSON.parse(readFileSync(filesJsonPath, 'utf8'))
    if (Array.isArray(files) && files.length > 0) {
      additionalFiles +=
        ',\n    ' +
        files
          .map((file) => `(name = "${file}", text = embed "${file}")`)
          .join(',\n    ')
    }
  } catch (error) {
    // No files.json or invalid JSON, no additional files needed
  }

  // Replace the comment line with actual embedded files
  baseCapnp = baseCapnp.replace(
    '    # Additional files will be inserted here by the runner',
    additionalFiles
  )

  try {
    unlinkSync(destination)
  } catch (error) {}
  writeFileSync(destination, baseCapnp, 'utf8')

  // Copy template files for each runtime, preferring the benchmark's own
  // templates/<runtime>.template.js over the shared one.
  for (const runtime of runtimes) {
    const ownTemplatePath = path.join(
      benchmarkPath,
      'templates',
      `${runtime}.template.js`
    )
    const templatePath = existsSync(ownTemplatePath)
      ? ownTemplatePath
      : `./templates/${runtime}.template.js`
    const destinationPath = path.join(benchmarkPath, `${runtime}.js`)
    try {
      unlinkSync(destinationPath)
    } catch (error) {}
    copyFileSync(templatePath, destinationPath)
  }

  for (const runtime of runtimes) {
    if (runtime === 'workerd') {
      await startServer('./workerd.config.capnp', runtime, benchmarkPath)
    } else {
      await startServer(`./${runtime}.js`, runtime, benchmarkPath)
    }
  }

  console.log('All servers ready!')
  console.log('')

  if (values.mode === 'rps') {
    runRpsBenchmark(benchmarkPath, hasDataBin ? dataBinPath : undefined)
  } else {
    runLatencyBenchmark(benchmarkPath, hasDataBin ? dataBinPath : undefined)
  }

  cleanup()

  // Wait for ports to be released before the next benchmark
  await setTimeout(5000)
}

function findBenchmarkDirectories(): string[] {
  const entries = readdirSync('.')
  const benchmarkDirs: string[] = []

  for (const entry of entries) {
    // Skip hidden directories, node_modules, and templates
    if (
      entry.startsWith('.') ||
      entry === 'node_modules' ||
      entry === 'templates'
    ) {
      continue
    }

    const fullPath = path.join('.', entry)

    // Check if it's a directory
    try {
      const stat = statSync(fullPath)
      if (!stat.isDirectory()) {
        continue
      }
    } catch (error) {
      continue
    }

    // Check if it contains benchmark.js or its own server templates
    if (
      existsSync(path.join(fullPath, 'benchmark.js')) ||
      existsSync(path.join(fullPath, 'templates'))
    ) {
      benchmarkDirs.push(entry)
    }
  }

  return benchmarkDirs.sort()
}

function generateResultsMarkdown(benchmarkDirs: string[]): string {
  let markdown = `# Runtime Benchmarks Results\n\n`
  markdown += `Generated on: ${new Date().toISOString()}\n\n`
  markdown += `## Summary\n\n`
  markdown += `Comparing performance across: workerd, deno, bun, node\n\n`

  for (const dir of benchmarkDirs) {
    const resultsPath = path.join(dir, 'benchmark-results.json')
    const markdownPath = path.join(dir, 'benchmark-results.md')

    markdown += `## ${dir}\n\n`

    try {
      // Read the markdown results
      if (existsSync(markdownPath)) {
        const mdContent = readFileSync(markdownPath, 'utf8')
        markdown += mdContent + '\n\n'
      }

      // Add JSON summary
      if (existsSync(resultsPath)) {
        const results = JSON.parse(readFileSync(resultsPath, 'utf8'))
        if (results.results && results.results.length > 0) {
          const sorted = [...results.results].sort(
            (a: any, b: any) => a.mean - b.mean
          )
          const fastest = sorted[0]
          const slowest = sorted[sorted.length - 1]
          markdown += `**Fastest:** ${fastest.command} (${(fastest.mean * 1000).toFixed(2)}ms)\n\n`
          markdown += `**Slowest:** ${slowest.command} (${(slowest.mean * 1000).toFixed(2)}ms)\n\n`
        }
      }
    } catch (error) {
      markdown += `_Results not available_\n\n`
    }

    markdown += `---\n\n`
  }

  return markdown
}

if (benchmark === 'all') {
  const benchmarkDirs = findBenchmarkDirectories()

  if (benchmarkDirs.length === 0) {
    console.error('No benchmark directories found!')
    process.exit(1)
  }

  console.log(
    `Found ${benchmarkDirs.length} benchmark(s): ${benchmarkDirs.join(', ')}`
  )

  for (const dir of benchmarkDirs) {
    await runBenchmark(dir)
  }

  // RESULTS.md collects the latency results only.
  if (values.mode === 'rps') process.exit(0)

  // Generate consolidated results
  const resultsMarkdown = generateResultsMarkdown(benchmarkDirs)
  writeFileSync('RESULTS.md', resultsMarkdown, 'utf8')
  console.log('\nResults written to RESULTS.md')
} else {
  await runBenchmark(benchmark)
}

process.exit(0)
