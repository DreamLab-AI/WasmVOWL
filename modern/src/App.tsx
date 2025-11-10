/**
 * Main application component
 */

import { GraphCanvas } from './components/Canvas/GraphCanvas';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>WebVOWL Modern</h1>
        <p>High-performance ontology visualization</p>
      </header>

      <main className="app-main">
        <GraphCanvas />
      </main>

      <footer className="app-footer">
        <span>Made with React Three Fiber + Rust/WASM</span>
      </footer>
    </div>
  );
}

export default App;
