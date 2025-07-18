// Canvas component with PixiJS integration
const Canvas = ({ activeTool, showGrid, onGridToggle }) => {
    const canvasRef = React.useRef(null);
    const pixiApp = React.useRef(null);
    const gridGraphics = React.useRef(null);
    const [status, setStatus] = React.useState('');
    const floorPlan = React.useRef(null);
    const currentTool = React.useRef(null);
    const toolsLayer = React.useRef(null);
    
    React.useEffect(() => {
        // Initialize floor plan
        floorPlan.current = new window.FloorPlanModels.FloorPlan('New Floor');
        
        // Initialize PixiJS
        const app = new PIXI.Application({
            width: window.innerWidth - 360,
            height: window.innerHeight - 60,
            backgroundColor: 0xf8f8f8,
            antialias: true,
            resolution: window.devicePixelRatio || 1
        });
        
        pixiApp.current = app;
        canvasRef.current.appendChild(app.view);
        
        // Create layers
        gridGraphics.current = new PIXI.Graphics();
        toolsLayer.current = new PIXI.Container();
        
        app.stage.addChild(gridGraphics.current);
        app.stage.addChild(toolsLayer.current);
        
        drawGrid();
        
        // Handle resize
        const handleResize = () => {
            app.renderer.resize(
                canvasRef.current.clientWidth,
                canvasRef.current.clientHeight
            );
            drawGrid();
        };
        
        window.addEventListener('resize', handleResize);
        
        // Listen for drawing events
        window.addEventListener('wallAdded', handleWallAdded);
        window.addEventListener('roomAdded', handleRoomAdded);
        
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('wallAdded', handleWallAdded);
            window.removeEventListener('roomAdded', handleRoomAdded);
            app.destroy();
        };
    }, []);
    
    // Update grid visibility
    React.useEffect(() => {
        if (gridGraphics.current) {
            gridGraphics.current.visible = showGrid;
        }
    }, [showGrid]);
    
    // Handle tool changes
    React.useEffect(() => {
        // Deactivate current tool
        if (currentTool.current) {
            currentTool.current.deactivate();
            currentTool.current = null;
        }
        
        // Activate new tool
        if (pixiApp.current && canvasRef.current) {
            switch (activeTool) {
                case 'wall':
                    currentTool.current = new window.DrawingTools.WallDrawingTool(
                        canvasRef.current.querySelector('canvas'),
                        floorPlan.current
                    );
                    currentTool.current.activate(pixiApp.current);
                    setStatus('Click to place wall start point. Click again to complete wall. ESC to cancel.');
                    break;
                case 'room':
                    currentTool.current = new window.DrawingTools.RoomDrawingTool(
                        canvasRef.current.querySelector('canvas'),
                        floorPlan.current
                    );
                    currentTool.current.activate(pixiApp.current);
                    setStatus('Click to add room corners. Double-click or click near start point to complete. ESC to cancel.');
                    break;
                case 'select':
                default:
                    setStatus('');
                    break;
            }
        }
    }, [activeTool]);
    
    // Draw grid
    const drawGrid = () => {
        if (!gridGraphics.current || !pixiApp.current) return;
        
        const graphics = gridGraphics.current;
        const app = pixiApp.current;
        
        graphics.clear();
        graphics.lineStyle(1, 0xe0e0e0, 0.5);
        
        const gridSize = 20;
        const width = app.renderer.width;
        const height = app.renderer.height;
        
        // Vertical lines
        for (let x = 0; x <= width; x += gridSize) {
            graphics.moveTo(x, 0);
            graphics.lineTo(x, height);
        }
        
        // Horizontal lines
        for (let y = 0; y <= height; y += gridSize) {
            graphics.moveTo(0, y);
            graphics.lineTo(width, y);
        }
        
        // Major grid lines every 5 cells
        graphics.lineStyle(1, 0xcccccc, 0.8);
        for (let x = 0; x <= width; x += gridSize * 5) {
            graphics.moveTo(x, 0);
            graphics.lineTo(x, height);
        }
        for (let y = 0; y <= height; y += gridSize * 5) {
            graphics.moveTo(0, y);
            graphics.lineTo(width, y);
        }
    };
    
    // Event handlers
    const handleWallAdded = (event) => {
        console.log('Wall added:', event.detail.wall);
    };
    
    const handleRoomAdded = (event) => {
        console.log('Room added:', event.detail.room);
    };
    
    return (
        <div className="canvas-container">
            <div ref={canvasRef} className="pixi-canvas"></div>
            
            {/* Status bar */}
            <div className={`status-bar ${status ? 'visible' : ''}`}>
                {status}
            </div>
            
            {/* Grid toggle */}
            <div className="grid-toggle">
                <input
                    type="checkbox"
                    id="grid-toggle"
                    checked={showGrid}
                    onChange={(e) => onGridToggle(e.target.checked)}
                />
                <label htmlFor="grid-toggle">Show Grid</label>
            </div>
            
            {/* Zoom controls */}
            <div className="zoom-controls">
                <button className="zoom-button" title="Zoom In">
                    <i className="fas fa-plus"></i>
                </button>
                <button className="zoom-button" title="Zoom Out">
                    <i className="fas fa-minus"></i>
                </button>
                <button className="zoom-button" title="Fit">
                    <i className="fas fa-expand"></i>
                </button>
            </div>
        </div>
    );
};