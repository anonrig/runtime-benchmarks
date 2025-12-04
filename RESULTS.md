# Runtime Benchmarks Results

Generated on: 2025-12-04T16:11:34.575Z

## Summary

Comparing performance across: workerd, deno, bun, node

## next-ssr

| Command   |  Mean [ms] | Min [ms] | Max [ms] |    Relative |
| :-------- | ---------: | -------: | -------: | ----------: |
| `workerd` | 15.0 ± 2.1 |     10.5 |     19.6 | 1.01 ± 0.19 |
| `deno`    | 15.4 ± 2.0 |     10.9 |     21.0 | 1.03 ± 0.18 |
| `bun`     | 15.2 ± 2.0 |     10.5 |     20.2 | 1.02 ± 0.18 |
| `node`    | 14.9 ± 1.8 |     10.3 |     21.7 |        1.00 |

**Fastest:** node (14.89ms)

**Slowest:** deno (15.35ms)

---

## react-ssr

| Command   |    Mean [ms] | Min [ms] | Max [ms] |    Relative |
| :-------- | -----------: | -------: | -------: | ----------: |
| `workerd` |  88.9 ± 29.7 |     67.1 |    185.9 | 1.37 ± 0.49 |
| `deno`    | 115.5 ± 36.8 |     96.0 |    225.9 | 1.78 ± 0.62 |
| `bun`     |   65.0 ± 8.9 |     55.6 |     97.2 |        1.00 |
| `node`    | 104.2 ± 25.7 |     80.7 |    183.3 | 1.60 ± 0.45 |

**Fastest:** bun (64.98ms)

**Slowest:** deno (115.48ms)

---

## sveltekit-ssr

| Command   |  Mean [ms] | Min [ms] | Max [ms] |    Relative |
| :-------- | ---------: | -------: | -------: | ----------: |
| `workerd` | 12.1 ± 1.2 |      9.1 |     16.8 | 1.02 ± 0.15 |
| `deno`    | 11.9 ± 1.2 |      8.7 |     17.7 | 1.01 ± 0.14 |
| `bun`     | 11.9 ± 1.2 |      9.2 |     16.3 | 1.00 ± 0.14 |
| `node`    | 11.8 ± 1.2 |      8.7 |     15.7 |        1.00 |

**Fastest:** node (11.85ms)

**Slowest:** workerd (12.10ms)

---

## url

| Command   |  Mean [ms] | Min [ms] | Max [ms] |    Relative |
| :-------- | ---------: | -------: | -------: | ----------: |
| `workerd` | 66.9 ± 2.6 |     62.5 |     72.9 | 1.71 ± 0.09 |
| `deno`    | 89.5 ± 3.7 |     80.6 |     96.8 | 2.29 ± 0.13 |
| `bun`     | 71.8 ± 3.0 |     66.7 |     80.1 | 1.84 ± 0.10 |
| `node`    | 39.1 ± 1.5 |     35.2 |     42.2 |        1.00 |

**Fastest:** node (39.14ms)

**Slowest:** deno (89.48ms)

---

## vanilla-ssr

| Command   |  Mean [ms] | Min [ms] | Max [ms] |    Relative |
| :-------- | ---------: | -------: | -------: | ----------: |
| `workerd` | 11.5 ± 1.1 |      8.8 |     14.9 |        1.00 |
| `deno`    | 12.0 ± 1.4 |      9.0 |     17.6 | 1.05 ± 0.16 |
| `bun`     | 11.7 ± 1.2 |      8.5 |     16.2 | 1.02 ± 0.15 |
| `node`    | 12.2 ± 1.2 |      8.9 |     15.4 | 1.06 ± 0.15 |

**Fastest:** workerd (11.48ms)

**Slowest:** node (12.17ms)

---
