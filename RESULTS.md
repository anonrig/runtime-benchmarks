# Runtime Benchmarks Results

Generated on: 2025-12-04T16:16:49.428Z

## Summary

Comparing performance across: workerd, deno, bun, node

## next-ssr

| Command | Mean [ms] | Min [ms] | Max [ms] | Relative |
|:---|---:|---:|---:|---:|
| `workerd` | 15.0 ± 2.0 | 10.6 | 19.6 | 1.00 |
| `deno` | 15.1 ± 1.8 | 10.9 | 21.1 | 1.01 ± 0.18 |
| `bun` | 15.3 ± 1.9 | 10.9 | 21.7 | 1.02 ± 0.18 |
| `node` | 15.1 ± 1.8 | 11.2 | 19.8 | 1.01 ± 0.18 |


**Fastest:** workerd (14.97ms)

**Slowest:** bun (15.29ms)

---

## react-ssr

| Command | Mean [ms] | Min [ms] | Max [ms] | Relative |
|:---|---:|---:|---:|---:|
| `workerd` | 85.5 ± 29.4 | 63.5 | 184.0 | 1.28 ± 0.48 |
| `deno` | 118.3 ± 37.4 | 95.4 | 225.5 | 1.78 ± 0.62 |
| `bun` | 66.6 ± 9.4 | 56.0 | 102.2 | 1.00 |
| `node` | 104.3 ± 24.0 | 84.4 | 180.1 | 1.57 ± 0.42 |


**Fastest:** bun (66.55ms)

**Slowest:** deno (118.33ms)

---

## sveltekit-ssr

| Command | Mean [ms] | Min [ms] | Max [ms] | Relative |
|:---|---:|---:|---:|---:|
| `workerd` | 10.9 ± 1.1 | 7.7 | 14.4 | 1.00 |
| `deno` | 11.5 ± 1.3 | 8.3 | 15.2 | 1.05 ± 0.16 |
| `bun` | 11.3 ± 1.2 | 8.2 | 15.1 | 1.03 ± 0.15 |
| `node` | 11.4 ± 1.1 | 8.7 | 16.3 | 1.04 ± 0.15 |


**Fastest:** workerd (10.94ms)

**Slowest:** deno (11.49ms)

---

## url

| Command | Mean [ms] | Min [ms] | Max [ms] | Relative |
|:---|---:|---:|---:|---:|
| `workerd` | 77.4 ± 6.7 | 63.1 | 96.6 | 1.98 ± 0.19 |
| `deno` | 86.5 ± 3.2 | 82.6 | 95.1 | 2.21 ± 0.12 |
| `bun` | 74.5 ± 5.2 | 66.6 | 90.6 | 1.91 ± 0.15 |
| `node` | 39.1 ± 1.6 | 34.7 | 43.1 | 1.00 |


**Fastest:** node (39.10ms)

**Slowest:** deno (86.47ms)

---

## vanilla-ssr

| Command | Mean [ms] | Min [ms] | Max [ms] | Relative |
|:---|---:|---:|---:|---:|
| `workerd` | 11.6 ± 1.2 | 8.7 | 14.8 | 1.00 ± 0.15 |
| `deno` | 12.0 ± 1.3 | 9.0 | 18.0 | 1.04 ± 0.15 |
| `bun` | 11.6 ± 1.2 | 8.5 | 16.8 | 1.00 |
| `node` | 12.1 ± 1.2 | 8.6 | 16.6 | 1.04 ± 0.15 |


**Fastest:** bun (11.57ms)

**Slowest:** node (12.05ms)

---

