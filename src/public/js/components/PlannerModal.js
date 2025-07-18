// Planner Modal Component
export class PlannerModal {
    constructor() {
        this.container = null;
        this.isVisible = false;
        this.floorPlan = null;
        this.pixiApp = null;
        this.currentTool = null;
        this.activeTool = 'select';
        this.showGrid = true;
        
        this.init();
    }
    
    init() {
        // Create modal container
        this.container = document.createElement('div');
        this.container.className = 'planner-modal';
        this.container.style.display = 'none';
        
        this.container.innerHTML = `
            <div class="planner-modal-overlay"></div>
            <div class="planner-modal-content">
                <div class="planner-header">
                    <h2>Floor Planner</h2>
                    <button class="planner-close" title="Close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="planner-body">
                    <div class="planner-sidebar">
                        <div class="tool-section">
                            <h3>Drawing Tools</h3>
                            <button class="tool-btn" data-tool="select" title="Select">
                                <i class="fas fa-mouse-pointer"></i>
                                <span>Select</span>
                            </button>
                            <button class="tool-btn" data-tool="wall" title="Draw Wall">
                                <i class="fas fa-minus"></i>
                                <span>Wall</span>
                            </button>
                            <button class="tool-btn" data-tool="room" title="Draw Room">
                                <i class="fas fa-vector-square"></i>
                                <span>Room</span>
                            </button>
                            <button class="tool-btn" data-tool="door" title="Place Door">
                                <i class="fas fa-door-open"></i>
                                <span>Door</span>
                            </button>
                            <button class="tool-btn" data-tool="window" title="Place Window">
                                <i class="fas fa-window-maximize"></i>
                                <span>Window</span>
                            </button>
                        </div>
                        <div class="tool-section">
                            <h3>View Options</h3>
                            <label class="checkbox-label">
                                <input type="checkbox" id="gridToggle" checked>
                                <span>Show Grid</span>
                            </label>
                        </div>
                    </div>
                    <div class="planner-canvas-container">
                        <div id="plannerCanvas"></div>
                        <div class="planner-status"></div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.container);
        
        // Bind events
        this.bindEvents();
        
        // Initialize when first shown
        this.initialized = false;
    }
    
    bindEvents() {
        // Close button
        const closeBtn = this.container.querySelector('.planner-close');
        closeBtn.addEventListener('click', () => this.hide());
        
        // Overlay click
        const overlay = this.container.querySelector('.planner-modal-overlay');
        overlay.addEventListener('click', () => this.hide());
        
        // Tool buttons
        const toolBtns = this.container.querySelectorAll('.tool-btn');
        toolBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool;
                this.setActiveTool(tool);
            });
        });
        
        // Grid toggle
        const gridToggle = this.container.querySelector('#gridToggle');
        gridToggle.addEventListener('change', (e) => {
            this.showGrid = e.target.checked;
            if (this.gridGraphics) {
                this.gridGraphics.visible = this.showGrid;
            }
        });
        
        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }
    
    initializePixi() {
        if (this.initialized) return;
        
        console.log('🎨 Initializing PixiJS for planner');
        
        const canvasContainer = this.container.querySelector('#plannerCanvas');
        const width = canvasContainer.clientWidth;
        const height = canvasContainer.clientHeight;
        
        // Initialize PixiJS
        this.pixiApp = new PIXI.Application({
            width: width,
            height: height,
            backgroundColor: 0xf8f8f8,
            antialias: true,
            resolution: window.devicePixelRatio || 1
        });
        
        canvasContainer.appendChild(this.pixiApp.view);
        
        // Create layers
        this.gridGraphics = new PIXI.Graphics();
        this.toolsLayer = new PIXI.Container();
        
        this.pixiApp.stage.addChild(this.gridGraphics);
        this.pixiApp.stage.addChild(this.toolsLayer);
        
        // Draw grid
        this.drawGrid();
        
        // Initialize floor plan
        if (window.FloorPlanModels) {
            this.floorPlan = new window.FloorPlanModels.FloorPlan('New Floor');
        } else {
            console.error('FloorPlanModels not loaded');
        }
        
        // Handle resize
        window.addEventListener('resize', () => {
            if (this.isVisible) {
                this.handleResize();
            }
        });
        
        this.initialized = true;
    }
    
    drawGrid() {
        if (!this.gridGraphics || !this.pixiApp) return;
        
        const graphics = this.gridGraphics;
        const app = this.pixiApp;
        
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
    }
    
    handleResize() {
        const canvasContainer = this.container.querySelector('#plannerCanvas');
        const width = canvasContainer.clientWidth;
        const height = canvasContainer.clientHeight;
        
        this.pixiApp.renderer.resize(width, height);
        this.drawGrid();
    }
    
    setActiveTool(toolName) {
        console.log('🔧 Setting active tool:', toolName);
        
        // Update UI
        const toolBtns = this.container.querySelectorAll('.tool-btn');
        toolBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === toolName);
        });
        
        // Deactivate current tool
        if (this.currentTool) {
            this.currentTool.deactivate();
            this.currentTool = null;
        }
        
        // Activate new tool
        if (this.pixiApp) {
            const canvas = this.container.querySelector('canvas');
            
            // Check if drawing tools are loaded
            if (!window.DrawingTools) {
                console.error('DrawingTools not loaded');
                this.setStatus('Error: Drawing tools not loaded');
                return;
            }
            
            if (!this.floorPlan) {
                console.error('FloorPlan not initialized');
                this.setStatus('Error: Floor plan not initialized');
                return;
            }
            
            switch (toolName) {
                case 'wall':
                    try {
                        this.currentTool = new window.DrawingTools.WallDrawingTool(
                            canvas,
                            this.floorPlan
                        );
                        this.currentTool.activate(this.pixiApp);
                        this.setStatus('Click to place wall start point. Click again to complete wall. ESC to cancel.');
                    } catch (error) {
                        console.error('Error activating wall tool:', error);
                        this.setStatus('Error: Could not activate wall tool');
                    }
                    break;
                case 'room':
                    try {
                        this.currentTool = new window.DrawingTools.RoomDrawingTool(
                            canvas,
                            this.floorPlan
                        );
                        this.currentTool.activate(this.pixiApp);
                        this.setStatus('Click to add room corners. Double-click or click near start point to complete. ESC to cancel.');
                    } catch (error) {
                        console.error('Error activating room tool:', error);
                        this.setStatus('Error: Could not activate room tool');
                    }
                    break;
                case 'select':
                default:
                    this.setStatus('');
                    break;
            }
        } else {
            console.error('PixiApp not initialized');
            this.setStatus('Error: Canvas not initialized');
        }
        
        this.activeTool = toolName;
    }
    
    setStatus(message) {
        const statusBar = this.container.querySelector('.planner-status');
        statusBar.textContent = message;
        statusBar.style.display = message ? 'block' : 'none';
    }
    
    show() {
        console.log('📐 Showing planner modal');
        this.container.style.display = 'block';
        this.isVisible = true;
        
        // Initialize PixiJS on first show
        if (!this.initialized) {
            // Wait for next frame to ensure DOM is ready
            setTimeout(() => {
                this.initializePixi();
                this.setActiveTool('select');
            }, 100);
        }
    }
    
    hide() {
        console.log('📐 Hiding planner modal');
        this.container.style.display = 'none';
        this.isVisible = false;
        
        // Deactivate current tool
        if (this.currentTool) {
            this.currentTool.deactivate();
            this.currentTool = null;
        }
    }
}

// Initialize planner modal
window.plannerModal = new PlannerModal();