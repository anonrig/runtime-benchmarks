import { ChildProcess, execSync, spawn } from 'node:child_process'
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

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

type Runtime = 'workerd' | 'workerd-dev' | 'deno' | 'bun' | 'node'

const runtimes: Runtime[] = ['workerd', 'deno', 'bun', 'node']

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
const ports: Record<Runtime, number> = {
  workerd: 0,
  'workerd-dev': 0,
  deno: 0,
  bun: 0,
  node: 0,
}

type Benchmark = {
  directory_name: string
  runtime: Runtime
}

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    benchmark: {
      type: 'string',
    },
    'workerd-binary': {
      type: 'string',
    },
    runtimes: {
      type: 'string',
    },
  },
  strict: true,
  allowPositionals: false,
})

// When --workerd-binary is provided, insert workerd-dev right after workerd
// so hyperfine compares the npm release against the local dev build.
if (values['workerd-binary']) {
  runtimes.splice(1, 0, 'workerd-dev')
}

// When --runtimes is provided, filter to only the requested runtimes.
// e.g. --runtimes=workerd,workerd-dev,node
if (values.runtimes) {
  const requested = values.runtimes.split(',').map((r) => r.trim()) as Runtime[]
  const invalid = requested.filter((r) => !runtimes.includes(r))
  if (invalid.length > 0) {
    console.error(
      `Unknown runtime(s): ${invalid.join(', ')}. Available: ${runtimes.join(', ')}`
    )
    process.exit(1)
  }
  // Keep only requested runtimes, preserving original order
  runtimes.splice(0, runtimes.length, ...runtimes.filter((r) => requested.includes(r)))
}

const processes: Partial<Record<Runtime, ChildProcess>> = {}

function getRuntimeVersion(runtime: Runtime): string {
  try {
    switch (runtime) {
      case 'workerd': {
        const workerdPath = path.join(__dirname, 'node_modules', '.bin', 'workerd')
        return execSync(`${workerdPath} --version`, { encoding: 'utf8' }).trim()
      }
      case 'workerd-dev': {
        const workerdDevPath = path.resolve(values['workerd-binary']!)
        return execSync(`${workerdDevPath} --version`, { encoding: 'utf8' }).trim()
      }
      case 'node':
        return execSync('node --version', { encoding: 'utf8' }).trim()
      case 'deno':
        return execSync('deno --version', { encoding: 'utf8' }).trim().split('\n')[0]
      case 'bun':
        return execSync('bun --version', { encoding: 'utf8' }).trim()
    }
  } catch {
    return 'unknown'
  }
}

const runtimeVersions: Partial<Record<Runtime, string>> = {}
for (const runtime of runtimes) {
  runtimeVersions[runtime] = getRuntimeVersion(runtime)
  console.log(`[${runtime}] version: ${runtimeVersions[runtime]}`)
}

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
  runtime: Runtime,
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
    case 'workerd': {
      const workerdPath = path.join(
        __dirname,
        'node_modules',
        '.bin',
        'workerd'
      )
      console.log(`[workerd] Using binary at: ${workerdPath}`)
      console.log(`[workerd] CWD: ${cwd}`)
      console.log(`[workerd] Serving: ${filePath}`)
      proc = spawn(workerdPath, ['serve', filePath], spawnOptions)
      processes.workerd = proc
      break
    }
    case 'workerd-dev': {
      const workerdDevPath = path.resolve(values['workerd-binary']!)
      console.log(`[workerd-dev] Using binary at: ${workerdDevPath}`)
      console.log(`[workerd-dev] CWD: ${cwd}`)
      console.log(`[workerd-dev] Serving: ${filePath}`)
      proc = spawn(workerdDevPath, ['serve', filePath], spawnOptions)
      processes['workerd-dev'] = proc
      break
    }
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

  const exportJson = path.join(benchmarkPath, 'benchmark-results.json')
  const exportMarkdown = path.join(benchmarkPath, 'benchmark-results.md')

  let command = `hyperfine --warmup 50 --export-json ${exportJson} --export-markdown ${exportMarkdown} `

  // Check if data.bin exists for POST benchmarks
  const dataBinPath = path.join(benchmarkPath, 'data.bin')
  const hasDataBin = existsSync(dataBinPath)
  if (hasDataBin) {
    console.log(`Found data.bin, will POST data to servers`)
  }

  // Build the list of additional embedded files for workerd configs
  let additionalFiles =
    ',\n    (name = "benchmark.js", esModule = embed "benchmark.js")'

  const filesJsonPath = path.join(benchmarkPath, 'files.json')
  try {
    const files = JSON.parse(readFileSync(filesJsonPath, 'utf8'))
    if (Array.isArray(files) && files.length > 0) {
      additionalFiles +=
        ',\n    ' +
        files
          .map((file: string) => `(name = "${file}", text = embed "${file}")`)
          .join(',\n    ')
    }
  } catch (error) {
    // No files.json or invalid JSON, no additional files needed
  }

  // Generate a workerd capnp config for each workerd variant (workerd + workerd-dev)
  for (const rt of runtimes.filter(
    (r) => r === 'workerd' || r === 'workerd-dev'
  )) {
    const destination = path.join(benchmarkPath, `${rt}.config.capnp`)
    let capnp = readFileSync('./base.capnp', 'utf8')
    capnp = capnp.replace('{PORT}', String(ports[rt]))
    capnp = capnp.replace(
      '    # Additional files will be inserted here by the runner',
      additionalFiles
    )
    try {
      unlinkSync(destination)
    } catch (error) {}
    writeFileSync(destination, capnp, 'utf8')
  }

  // Copy template files for each runtime (workerd-dev shares workerd.js)
  for (const runtime of runtimes) {
    if (runtime === 'workerd-dev') continue
    const templatePath = `./templates/${runtime}.template.js`
    const destinationPath = path.join(benchmarkPath, `${runtime}.js`)
    try {
      unlinkSync(destinationPath)
    } catch (error) {}
    copyFileSync(templatePath, destinationPath)
  }

  for (const runtime of runtimes) {
    if (runtime === 'workerd' || runtime === 'workerd-dev') {
      await startServer(`./${runtime}.config.capnp`, runtime, benchmarkPath)
    } else {
      await startServer(`./${runtime}.js`, runtime, benchmarkPath)
    }

    const curlArgs = hasDataBin
      ? `--data-binary @${dataBinPath}`
      : ''
    command += ` -n "${runtime}" "curl -H 'Expect:' ${curlArgs} http://localhost:${ports[runtime]}/ -s -o /dev/null"`
  }

  console.log('All servers ready!')
  console.log('')
  console.log('Now running: ', command)
  console.log('')

  execSync(command, { stdio: ['inherit', 'inherit', 'inherit'] })

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

    // Check if it contains benchmark.js
    const benchmarkFile = path.join(fullPath, 'benchmark.js')
    if (existsSync(benchmarkFile)) {
      benchmarkDirs.push(entry)
    }
  }

  return benchmarkDirs.sort()
}

function generateResultsMarkdown(benchmarkDirs: string[]): string {
  let markdown = `# Runtime Benchmarks Results\n\n`
  markdown += `Generated on: ${new Date().toISOString()}\n\n`
  markdown += `## Summary\n\n`
  markdown += `### Runtimes\n\n`
  for (const runtime of runtimes) {
    markdown += `- **${runtime}**: ${runtimeVersions[runtime] ?? 'unknown'}\n`
  }
  markdown += `\n`

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

  // Generate consolidated results
  const resultsMarkdown = generateResultsMarkdown(benchmarkDirs)
  writeFileSync('RESULTS.md', resultsMarkdown, 'utf8')
  console.log('\nResults written to RESULTS.md')
} else {
  await runBenchmark(benchmark)
}

process.exit(0)
