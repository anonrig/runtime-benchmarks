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
import { createConnection } from 'node:net'
import { setTimeout } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const config = JSON.parse(readFileSync('./config.json', 'utf8'))
const runtimes = ['workerd', 'deno', 'bun', 'node']

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
  },
  strict: true,
  allowPositionals: false,
})

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

  // Force kill any processes still holding the ports
  try {
    execSync(
      'fuser -k 3000/tcp 3001/tcp 3002/tcp 3003/tcp 2>/dev/null || true',
      { stdio: 'ignore' }
    )
  } catch {
    // Ignore errors
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

  await waitForPort(config[runtime].port, runtime)
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

  const exportJson = path.join(benchmarkPath, 'benchmark-results.json')
  const exportMarkdown = path.join(benchmarkPath, 'benchmark-results.md')

  let command = `hyperfine --warmup 50 --export-json ${exportJson} --export-markdown ${exportMarkdown} `

  // Generate workerd config with dynamic file embedding
  const destination = path.join(benchmarkPath, 'workerd.config.capnp')
  let baseCapnp = readFileSync('./base.capnp', 'utf8')

  // Always embed benchmark.js as an esModule
  let additionalFiles =
    ',\n    (name = "benchmark.js", esModule = embed "benchmark.js")'

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

  // Copy template files for each runtime
  for (const runtime of runtimes) {
    const templatePath = `./templates/${runtime}.template.js`
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

    const port = config[runtime].port
    command += ` -n "${runtime}" "curl http://localhost:${port}/"`
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

  // Generate consolidated results
  const resultsMarkdown = generateResultsMarkdown(benchmarkDirs)
  writeFileSync('RESULTS.md', resultsMarkdown, 'utf8')
  console.log('\nResults written to RESULTS.md')
} else {
  await runBenchmark(benchmark)
}

process.exit(0)
