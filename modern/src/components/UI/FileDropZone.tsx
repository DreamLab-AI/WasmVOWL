/**
 * File drop zone component for loading ontology files
 * Supports drag-and-drop and file picker for JSON/RDF files
 */

import { useCallback, useState } from 'react';
import { useGraphStore } from '../../stores/useGraphStore';
import { useUIStore } from '../../stores/useUIStore';
import { normaliseOwl2Vowl } from '../../lib/owl2vowl';
import './FileDropZone.css';

interface FileDropZoneProps {
  onFileLoaded?: (filename: string) => void;
}

export function FileDropZone({ onFileLoaded }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOntology = useGraphStore((state) => state.loadOntology);
  const addNotification = useUIStore((state) => state.addNotification);

  /**
   * Normalise a parsed owl2vowl / WebVOWL document, load it into the store
   * (which the simulation hook then feeds to the engine), and report what was
   * loaded. Throws on a document that cannot be normalised.
   */
  const ingest = useCallback((data: unknown, name: string) => {
    const ontology = normaliseOwl2Vowl(data);
    loadOntology(ontology);

    const nodeCount = ontology.nodes.length;
    const edgeCount = ontology.edges.length;
    if (nodeCount === 0) {
      addNotification({
        type: 'warning',
        message: `${name} contains no classes to display`,
        duration: 6000
      });
      return false;
    }

    const dropped = ontology.report.dropped.length;
    addNotification({
      type: dropped > 0 ? 'warning' : 'success',
      message: `Loaded ${name}: ${nodeCount} nodes and ${edgeCount} edges` +
        (dropped > 0 ? ` (${dropped} record(s) skipped, see console)` : ''),
      duration: 4000
    });
    return true;
  }, [loadOntology, addNotification]);

  /**
   * Load ontology from file
   */
  const loadFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      // Check file type
      if (!file.name.endsWith('.json')) {
        throw new Error('Only JSON files are currently supported');
      }

      // Read file content
      const text = await file.text();
      const data = JSON.parse(text);

      if (ingest(data, file.name)) {
        onFileLoaded?.(file.name);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);

      addNotification({
        type: 'error',
        message: `Failed to load file: ${message}`,
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  }, [ingest, addNotification, onFileLoaded]);

  /**
   * Handle drag over event
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  /**
   * Handle drag leave event
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  /**
   * Handle drop event
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      loadFile(files[0]);
    }
  }, [loadFile]);

  /**
   * Handle file input change
   */
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      loadFile(files[0]);
    }
  }, [loadFile]);

  /**
   * Load sample ontology
   */
  const loadSample = useCallback(async (filename: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/ontologies/${filename}`);
      if (!response.ok) {
        throw new Error('Failed to load sample ontology');
      }

      const data = await response.json();

      if (ingest(data, filename)) {
        onFileLoaded?.(filename);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);

      addNotification({
        type: 'error',
        message: `Failed to load sample: ${message}`,
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  }, [ingest, addNotification, onFileLoaded]);

  return (
    <div className="file-drop-zone-container">
      <div
        className={`file-drop-zone ${isDragging ? 'dragging' : ''} ${isLoading ? 'loading' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isLoading ? (
          <div className="drop-zone-content">
            <div className="spinner" />
            <p>Loading ontology...</p>
          </div>
        ) : (
          <div className="drop-zone-content">
            <svg className="drop-zone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>

            <h3>Drop ontology file here</h3>
            <p>or</p>

            <label className="file-input-label">
              <input
                type="file"
                accept=".json"
                onChange={handleFileInput}
                className="file-input"
              />
              <span className="file-input-button">Choose File</span>
            </label>

            <p className="file-hint">Supports: JSON (owl2vowl / WebVOWL format)</p>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="sample-ontologies">
        <h4>Sample Ontologies</h4>
        <div className="sample-buttons">
          <button
            onClick={() => loadSample('foaf.json')}
            disabled={isLoading}
            className="sample-button"
          >
            FOAF
          </button>
          <button
            onClick={() => loadSample('sioc.json')}
            disabled={isLoading}
            className="sample-button"
          >
            SIOC
          </button>
          <button
            onClick={() => loadSample('minimal.json')}
            disabled={isLoading}
            className="sample-button"
          >
            Minimal Example
          </button>
        </div>
      </div>
    </div>
  );
}
