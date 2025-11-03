# Runtime Benchmarks

Benchmarking tool to compare performance across different JavaScript runtimes: Node.js, Deno, Bun, and Cloudflare Workers (workerd).

## Requirements

You need to install `hyperfine` to run the benchmarks.

**macOS:**

```shell
brew install hyperfine
```

**Linux:**

```shell
# Ubuntu/Debian
apt install hyperfine

# Arch
pacman -S hyperfine
```

## Installation

```shell
pnpm install
```

## Running Benchmarks

To run a benchmark, use the following command:

```shell
node --run bench -- --benchmark=<benchmark_name>
```

**Example:**

```shell
node --run bench -- --benchmark=hello-world
```

This will:

1. Start servers for all 4 runtimes (workerd, deno, bun, node) on ports 3000-3003
2. Run hyperfine with 50 warmup runs
3. Generate comparison results in the benchmark directory:
   - `benchmark-results.json` - Machine-readable JSON format
   - `benchmark-results.md` - Human-readable markdown table

## Available Scripts

- `node --run bench -- --benchmark=<name>` - Run a specific benchmark
- `node --run format` - Format code with Prettier

## Configuration

Runtime ports are configured in `config.json`:

- Bun: 3000
- Deno: 3001
- Node: 3002
- Workerd: 3003

## Project Structure

```
runtime-benchmarks/
├── templates/           # Runtime-specific templates
│   ├── node.template.js
│   ├── deno.template.js
│   ├── bun.template.js
│   └── workerd.template.js
├── url/                 # Example benchmark
│   ├── benchmark.js     # Shared benchmark logic
│   ├── dataset.txt      # Data file
│   └── files.json       # Files to embed in workerd
├── runner.ts            # Benchmark runner
├── base.capnp          # Base workerd config template
└── config.json         # Runtime port configuration
```

## Creating a New Benchmark

The template system makes it extremely easy to create new benchmarks. You only need to write your benchmark logic once, and it will run across all runtimes.

### Step 1: Create a benchmark directory

```shell
mkdir my-benchmark
```

### Step 2: Write your benchmark logic

Create `my-benchmark/benchmark.js` with a handler function:

```javascript
export function handler() {
  // Your benchmark code here
  // This will be called on every HTTP request for all runtimes

  return true // Must return a truthy value
}
```

**Example with data loading:**

```javascript
import { readFileSync } from 'node:fs';

const data = readFileSync('./data.txt', 'utf8');

export function handler() {
  // Process data
  const result = someExpensiveOperation(data);

  return true // Must return truthy value
}
```

### Step 3: (Optional) Add data files

If your benchmark needs data files:

1. Add the files to your benchmark directory (e.g., `my-benchmark/data.txt`)
2. Create `my-benchmark/files.json` listing files for workerd embedding:

```json
["data.txt", "other-file.json"]
```

**Note:** The `files.json` is only needed if your benchmark loads files that workerd needs to embed. If you don't load any files in your handler, you can skip this step.

### Step 4: Run your benchmark

```shell
node --run bench -- --benchmark=my-benchmark
```

The runner will automatically:
1. Generate runtime-specific files from templates
2. Embed necessary files in the workerd config
3. Start all servers and run the benchmark
4. Generate results in `my-benchmark/benchmark-results.{json,md}`

## How the Template System Works

When you run a benchmark:

1. **Runtime files are auto-generated**: The runner copies templates from `templates/` to your benchmark directory, creating `node.js`, `deno.js`, `bun.js`, and `workerd.js`

2. **Workerd config is built dynamically**: The runner reads your `benchmark.js` and `files.json`, then generates `workerd.config.capnp` with all necessary modules embedded

3. **All files are cleaned up**: Generated files are gitignored and automatically regenerated on each run

This means you only maintain your benchmark logic in `benchmark.js` - no need to write boilerplate server code for each runtime!

## Example: URL Parsing Benchmark

See the `url/` directory for a complete example:

```
url/
├── benchmark.js    # Loads dataset.txt and parses URLs
├── dataset.txt     # 150K URLs to parse
└── files.json      # ["dataset.txt"] - tells workerd to embed this file
```

The benchmark logic is ~10 lines of code, and it runs identically across all runtimes.
