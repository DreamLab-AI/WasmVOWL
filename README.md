# WasmVOWL

**WebVOWL rewritten in Rust with a modern React frontend.**

WasmVOWL is a modern web application for visualizing ontologies, based on the original [WebVOWL](http://vowl.visualdataweb.org/) project. This project is a complete rewrite, featuring a Rust-powered backend compiled to WebAssembly (Wasm) for high-performance graph layout and rendering, and a modern, responsive frontend built with React.

## Key Features

- **High-Performance Visualization**: Leveraging Rust and WebAssembly for efficient, client-side rendering of large and complex ontologies.
- **Modern, Responsive UI**: A completely redesigned user interface built with React, providing a seamless and intuitive user experience across all devices.
- **Interactive Graph Visualization**: Smooth, interactive controls for panning, zooming, and exploring ontology graphs.
- **Extensible and Modular**: A clean, modern architecture that is easy to extend and customize.
- **Based on a Proven Concept**: Built on the solid foundation of the original WebVOWL, a widely used and respected tool in the semantic web community.

## Project Structure

- **/legacy**: The original WebVOWL codebase, preserved for reference and comparison.
- **/modern**: The new React-based frontend application.
- The Rust-powered WebAssembly backend for graph layout and rendering is no longer
  vendored here. It lives in its own MIT repo, [DreamLab-AI/vowl-wasm](https://github.com/DreamLab-AI/vowl-wasm),
  and is consumed as the pinned `@dreamlab-ai/vowl-wasm` package (crate `vowl-wasm` on crates.io).

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v22 or higher)

No Rust or wasm-pack toolchain is required: the WASM engine is installed as a
pinned, integrity-locked npm dependency.

### Installation and Setup

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/DreamLab-AI/WasmVOWL.git
    cd WasmVOWL
    ```

2.  **Install frontend dependencies** (this pulls the pinned WASM engine):

    ```bash
    cd modern
    npm ci
    ```

3.  **Run the development server:**

    ```bash
    npm run dev
    ```

The application will be available at `http://localhost:5173`.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue to discuss your ideas.

## License

This project is licensed under the MIT License - see the [license.txt](license.txt) file for details.

## Verification and closeout — 2026-09-07

The standalone demo remains held while its consumer contract is reconciled. The remote engine extraction is retained: this checkout consumes `@dreamlab-ai/vowl-wasm` 0.3.0 from the npm registry. It was pinned exactly on 2026-11-23, after 0.1.1 and then 0.2.3. The npm tarball is byte-identical to the v0.3.0 GitHub release asset (sha256 `d2af7e50…d305`) and carries npm provenance from the vowl-wasm release workflow. Other publishers have separate package pins. As of 2026-11-23 the explorer feeds the engine normalised owl2vowl data and loads all nine legacy ontologies. With 0.3.0 the force layout is bounded and settles in 300 ticks on every one of them, which the real-engine tests and a browser run on foaf, goodrelations and sioc confirm. Dense graphs (goodrelations) are still hard to read, small disconnected components sit around the main graph, and the default camera needs zooming out to show a whole layout; see the ADR's 0.3.0 adoption section. The earlier 47 native / 19 passing and 60 failing frontend observations refer to the pre-extraction checkout, not a test of this merged version. See the [proposed consumer-contract ADR](docs/adr/ADR-001-explorer-consumer-contract-closeout.md). Historical readiness and performance claims are not re-certified.
