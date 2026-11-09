# ADR-0001 — Ephemeris engine language and bindings

**Status:** Accepted design dependency (not implemented).
**Date:** 2026-11-09

## Dependency boundary

`Astrological Functions` remains a framework-independent **TypeScript** library covering signs, house methods, aspects, chart models, transits and astrological event orchestration.

`VirgoStars Ephemeris` is the **single Rust astronomical engine**. Its Rust implementation owns SPK/JPL access, precise time scales, coordinates and astronomical corrections. No separate TypeScript or Python astronomical engine should be maintained in this repository.

Consume a documented TypeScript interface from the upstream Rust engine, initially via WebAssembly and a thin typed JS wrapper. An optional native Node adapter can be evaluated after benchmarks. Never import a Swiss Ephemeris binding or copy its code.

Python users will be served independently by upstream **PyO3 + maturin** bindings to that same Rust engine. They do not need this TypeScript library for astronomical calculations, and a Python binding should not cause a second astronomical implementation.

## Integration contract and safeguards

- Consume explicit time scale/epoch, center/observer, frame, units, and correction metadata from ephemeris outputs.
- Do not infer that a Rust engine or npm/Python package is already implemented, released, or production-ready.
- Verify the same astronomical outputs via Rust, JS/TS and Python fixtures against independent JPL Horizons references before production integration.
- Continue using the existing VirgoStars monorepo implementation in production until explicit migration gates and approval; no deployment, DB, Astrolabio, or API behavior changes here.
- No GitHub Actions added as a side effect of documentation.
- Upstream specification: [VirgoStars Ephemeris ADR-0001](https://github.com/Cesare-ml/VirgoStars-Ephemeris/blob/main/docs/ADR-0001-RUST-CORE-AND-BINDINGS.md).

## Sintesi italiana

Il motore astronomico viene scritto **una volta in Rust** nel repository VirgoStars Ephemeris. Questa libreria rimane **TypeScript**, con un adattatore verso il core Rust tramite WASM/JS. Python potrà usare direttamente lo stesso core attraverso PyO3/maturin, senza duplicare i calcoli.
