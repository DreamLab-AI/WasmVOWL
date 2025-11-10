/**
 * Main application component
 */

import { useState } from 'react';
import { GraphCanvas } from './components/Canvas/GraphCanvas';
import { FileDropZone } from './components/UI/FileDropZone';
import { TopMenuBar } from './components/UI/TopMenuBar';
import { Sidebar } from './components/UI/Sidebar';
import { NotificationContainer } from './components/UI/NotificationContainer';
import { useGraphStore } from './stores/useGraphStore';
import './App.css';

function App() {
  const [hasData, setHasData] = useState(false);
  const nodeCount = useGraphStore((state) => state.nodes.size);

  // Show FileDropZone if no data is loaded
  const handleFileLoaded = () => {
    setHasData(true);
  };

  const hasLoadedData = hasData && nodeCount > 0;

  return (
    <div className="app">
      <header className="app-header">
        <h1>WebVOWL Modern</h1>
        <p>High-performance ontology visualization with React Three Fiber + Rust/WASM</p>
      </header>

      {hasLoadedData && <TopMenuBar />}

      <main className="app-main">
        {!hasLoadedData ? (
          <FileDropZone onFileLoaded={handleFileLoaded} />
        ) : (
          <>
            <GraphCanvas />
            <Sidebar />
          </>
        )}
      </main>

      {hasLoadedData && (
        <footer className="app-footer">
          <span>Made with React Three Fiber + Rust/WASM</span>
        </footer>
      )}

      <NotificationContainer />
    </div>
  );
}

export default App;
