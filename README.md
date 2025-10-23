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

## Creating a New Benchmark

1. Create a new directory with your benchmark name (e.g., `my-benchmark/`)
2. Add implementation files for each runtime:
   - `node.js` - Node.js implementation
   - `deno.js` - Deno implementation
   - `bun.js` - Bun implementation
   - `workerd.js` - Workerd implementation
3. Run: `node --run bench -- --benchmark=my-benchmark`
