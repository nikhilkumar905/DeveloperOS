import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Network, Maximize2, Minimize2, AlertCircle } from 'lucide-react';
import ForceGraph2D from 'react-force-graph-2d';
import './KnowledgeGraphWidget.css';

interface GraphNode {
  id: string;
  label: string;
  type: 'Technology' | 'Repository' | 'Skill' | 'Topic' | 'Achievement';
  properties?: any;
  val?: number; // visual size
  color?: string;
}

interface GraphEdge {
  source: string;
  target: string;
  relationship: string;
  weight: number;
}

const KnowledgeGraphWidget: React.FC = () => {
  const { token } = React.useContext(AuthContext);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: isFullscreen ? window.innerHeight - 100 : 400
      });
    }
    
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: isFullscreen ? window.innerHeight - 100 : 400
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isFullscreen]);

  const fetchGraph = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:6500/api/graph', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const graphData = response.data;
      if (graphData && graphData.nodes && graphData.edges) {
        // Map colors and sizes
        const mappedNodes = graphData.nodes.map((n: GraphNode) => {
          let color = '#94a3b8';
          let val = 1;
          if (n.type === 'Technology') { color = '#eab308'; val = 1.5; }
          else if (n.type === 'Repository') { color = '#3b82f6'; val = 1.2; }
          else if (n.type === 'Skill') { color = '#10b981'; val = 2; }
          else if (n.type === 'Topic') { color = '#8b5cf6'; val = 1; }
          else if (n.type === 'Achievement') { color = '#f59e0b'; val = 1.8; }
          
          return { ...n, color, val };
        });
        
        setNodes(mappedNodes);
        setEdges(graphData.edges);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load Knowledge Graph.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // After data loads, center the graph
  useEffect(() => {
    if (!loading && nodes.length > 0 && fgRef.current) {
      fgRef.current.d3Force('charge')?.strength(-200);
      setTimeout(() => {
        fgRef.current?.zoomToFit(400, 50);
      }, 500);
    }
  }, [loading, nodes]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!nodes.length && !loading && !error) return null;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };



  return (
    <div className={`knowledge-graph-widget ${isFullscreen ? 'fullscreen' : ''}`} ref={containerRef}>
      <div className="graph-header">
        <h2><Network size={20} color="#3b82f6" /> Developer Knowledge Graph</h2>
        <button onClick={toggleFullscreen} className="fullscreen-btn" title="Toggle Fullscreen">
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>
      
      {error && <div className="error-message"><AlertCircle size={16} /> {error}</div>}

      <div className="graph-container" style={{ height: isFullscreen ? 'calc(100vh - 80px)' : '400px' }}>
        {loading ? (
          <div className="loading-graph">Computing Graph Logic...</div>
        ) : (
          <ForceGraph2D
            ref={fgRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={{ nodes, links: edges }}
            nodeLabel="label"
            nodeColor="color"
            nodeVal="val"
            linkColor={() => 'rgba(255,255,255,0.2)'}
            linkWidth={1}
            linkDirectionalArrowLength={3.5}
            linkDirectionalArrowRelPos={1}
            backgroundColor="transparent"
            onNodeClick={(node) => {
              // Center node on click
              fgRef.current?.centerAt(node.x, node.y, 1000);
              fgRef.current?.zoom(4, 2000);
            }}
          />
        )}
      </div>
      
      <div className="graph-legend">
        <span className="legend-item"><span className="dot tech"></span> Technology</span>
        <span className="legend-item"><span className="dot repo"></span> Repository</span>
        <span className="legend-item"><span className="dot skill"></span> Skill</span>
        <span className="legend-item"><span className="dot topic"></span> Topic</span>
        <span className="legend-item"><span className="dot achievement"></span> Achievement</span>
      </div>
    </div>
  );
};

export default KnowledgeGraphWidget;
