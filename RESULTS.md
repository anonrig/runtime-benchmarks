# Runtime Benchmarks Results

Generated on: 2026-01-02T17:54:15.217Z

## Summary

Comparing performance across: workerd, deno, bun, node

## http-transform-stream

| Command | Mean [s] | Min [s] | Max [s] | Relative |
|:---|---:|---:|---:|---:|
| `workerd` | 1.117 ± 0.005 | 1.107 | 1.123 | 39.70 ± 3.02 |
| `deno` | 0.073 ± 0.007 | 0.032 | 0.079 | 2.60 ± 0.32 |
| `bun` | 0.028 ± 0.002 | 0.023 | 0.034 | 1.00 |
| `node` | 0.032 ± 0.002 | 0.027 | 0.036 | 1.13 ± 0.11 |


**Fastest:** bun (28.13ms)

**Slowest:** workerd (1116.83ms)

---

## next-ssr

| Command | Mean [ms] | Min [ms] | Max [ms] | Relative |
|:---|---:|---:|---:|---:|
| `workerd` | 13.2 ± 1.7 | 9.1 | 19.0 | 1.00 |
| `deno` | 14.0 ± 1.7 | 10.4 | 18.8 | 1.06 ± 0.19 |
| `bun` | 14.1 ± 1.7 | 10.3 | 19.0 | 1.07 ± 0.19 |
| `node` | 14.3 ± 1.8 | 9.1 | 19.1 | 1.08 ± 0.20 |


**Fastest:** workerd (13.24ms)

**Slowest:** node (14.29ms)

---

## react-ssr

| Command | Mean [ms] | Min [ms] | Max [ms] | Relative |
|:---|---:|---:|---:|---:|
| `workerd` | 79.6 ± 28.7 | 57.8 | 175.4 | 1.04 ± 0.40 |
| `deno` | 105.4 ± 31.3 | 85.3 | 201.6 | 1.37 ± 0.45 |
| `bun` | 76.7 ± 10.3 | 63.7 | 112.4 | 1.00 |
| `node` | 96.4 ± 24.0 | 77.4 | 183.9 | 1.26 ± 0.36 |


**Fastest:** bun (76.65ms)

**Slowest:** deno (105.36ms)

---

## sveltekit-ssr

| Command | Mean [ms] | Min [ms] | Max [ms] | Relative |
|:---|---:|---:|---:|---:|
| `workerd` | 10.1 ± 1.2 | 6.9 | 13.6 | 1.02 ± 0.16 |
| `deno` | 10.3 ± 1.1 | 7.3 | 13.2 | 1.03 ± 0.15 |
| `bun` | 9.9 ± 1.0 | 7.4 | 12.8 | 1.00 |
| `node` | 10.5 ± 1.1 | 7.6 | 13.1 | 1.05 ± 0.15 |


**Fastest:** bun (9.95ms)

**Slowest:** node (10.47ms)

---

## transform-stream

| Command | Mean [ms] | Min [ms] | Max [ms] | Relative |
|:---|---:|---:|---:|---:|
| `workerd` | 20.8 ± 2.4 | 15.2 | 28.7 | 1.42 ± 0.25 |
| `deno` | 16.9 ± 2.5 | 10.8 | 24.4 | 1.15 ± 0.23 |
| `bun` | 14.7 ± 1.9 | 10.8 | 22.0 | 1.00 |
| `node` | 15.9 ± 1.7 | 11.8 | 21.6 | 1.08 ± 0.18 |


**Fastest:** bun (14.70ms)

**Slowest:** workerd (20.82ms)

---

## url

| Command | Mean [ms] | Min [ms] | Max [ms] | Relative |
|:---|---:|---:|---:|---:|
| `workerd` | 73.0 ± 2.5 | 67.5 | 76.9 | 1.96 ± 0.10 |
| `deno` | 84.6 ± 2.4 | 80.0 | 88.4 | 2.27 ± 0.10 |
| `bun` | 68.2 ± 2.1 | 64.7 | 75.3 | 1.83 ± 0.09 |
| `node` | 37.3 ± 1.3 | 34.0 | 40.1 | 1.00 |


**Fastest:** node (37.33ms)

**Slowest:** deno (84.60ms)

---

## vanilla-ssr

| Command | Mean [ms] | Min [ms] | Max [ms] | Relative |
|:---|---:|---:|---:|---:|
| `workerd` | 10.2 ± 1.1 | 7.2 | 13.6 | 1.00 |
| `deno` | 11.6 ± 1.3 | 8.5 | 17.2 | 1.14 ± 0.17 |
| `bun` | 11.1 ± 1.2 | 8.0 | 14.6 | 1.09 ± 0.17 |
| `node` | 11.3 ± 1.1 | 8.9 | 14.7 | 1.10 ± 0.16 |


**Fastest:** workerd (10.21ms)

**Slowest:** deno (11.65ms)

---

