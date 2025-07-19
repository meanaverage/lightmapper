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
        
        // Wall properties
        this.wallProperties = {
            thickness: 15, // cm (approximately 5 7/8")
            height: 274,   // cm (approximately 9')
            raiseFromFloor: 0
        };
        
        // Units conversion
        this.units = {
            useImperial: true,
            cmToInches: 0.393701,
            cmToFeet: 0.0328084
        };
        
        // Interaction states
        this.isSpacePressed = false;
        
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
                    <div class="planner-canvas-container">
                        <div id="plannerCanvas"></div>
                        <div class="planner-status"></div>
                        <div class="planner-coords">X: 0, Y: 0</div>
                    </div>
                    <div class="planner-sidebar">
                        <button class="sidebar-icon" data-panel="project" title="Project">
                            <i class="fas fa-th-large"></i>
                            <span>Project</span>
                        </button>
                        <button class="sidebar-icon active" data-panel="build" title="Build">
                            <i class="fas fa-hammer"></i>
                            <span>Build</span>
                        </button>
                        <button class="sidebar-icon" data-panel="info" title="Info">
                            <i class="fas fa-info-circle"></i>
                            <span>Info</span>
                        </button>
                        <button class="sidebar-icon" data-panel="objects" title="Objects">
                            <i class="fas fa-cube"></i>
                            <span>Objects</span>
                        </button>
                        <button class="sidebar-icon" data-panel="styleboards" title="Styleboards">
                            <i class="fas fa-palette"></i>
                            <span>Styleboards</span>
                        </button>
                        <button class="sidebar-icon" data-panel="finishes" title="Finishes">
                            <i class="fas fa-paint-roller"></i>
                            <span>Finishes</span>
                        </button>
                        <button class="sidebar-icon" data-panel="export" title="Export">
                            <i class="fas fa-download"></i>
                            <span>Exports</span>
                        </button>
                        <button class="sidebar-icon bottom" data-panel="help" title="Help">
                            <i class="fas fa-question-circle"></i>
                            <span>Help</span>
                        </button>
                    </div>
                    <div class="planner-panels">
                        <div class="panel-content">
                            <div class="panel project-panel">
                                <h2>Project</h2>
                                <p>Project settings and information will be displayed here.</p>
                            </div>
                            <div class="panel build-panel active">
                                <h2>Build</h2>
                                <div class="wall-properties" style="display: none;">
                                    <div class="property-group">
                                        <label>Thickness</label>
                                        <div class="input-with-controls">
                                            <button class="decrement">−</button>
                                            <input type="text" id="wallThickness" value="5 7/8"" readonly>
                                            <button class="increment">+</button>
                                        </div>
                                    </div>
                                    <div class="property-group">
                                        <label>Wall Height</label>
                                        <div class="input-with-controls">
                                            <button class="decrement">−</button>
                                            <input type="text" id="wallHeight" value="9'" readonly>
                                            <button class="increment">+</button>
                                        </div>
                                    </div>
                                    <div class="property-group">
                                        <label>Raise From Floor</label>
                                        <div class="input-with-controls">
                                            <button class="decrement">−</button>
                                            <input type="text" id="raiseFromFloor" value="0" readonly>
                                            <button class="increment">+</button>
                                        </div>
                                    </div>
                                </div>
                                <div class="tool-cancel-container" style="display: none;">
                                    <button class="tool-cancel-btn">
                                        <i class="fas fa-times"></i>
                                        <span>Cancel Drawing</span>
                                    </button>
                                </div>
                                <button class="upload-btn">
                                    <span>Upload 2D floorplan</span>
                                </button>
                                <div class="tools-list">
                                    <button class="tool-item" data-tool="room">
                                        <i class="fas fa-cube"></i>
                                        <span>Draw Room</span>
                                    </button>
                                    <button class="tool-item" data-tool="wall">
                                        <i class="fas fa-vector-square"></i>
                                        <span>Draw Wall</span>
                                    </button>
                                    <button class="tool-item" data-tool="surface">
                                        <i class="fas fa-draw-polygon"></i>
                                        <span>Draw Surface</span>
                                    </button>
                                    <button class="tool-item expandable">
                                        <i class="fas fa-door-open"></i>
                                        <span>Place Doors</span>
                                        <i class="fas fa-chevron-right expand-icon"></i>
                                    </button>
                                    <button class="tool-item expandable">
                                        <i class="fas fa-window-maximize"></i>
                                        <span>Place Windows</span>
                                        <i class="fas fa-chevron-right expand-icon"></i>
                                    </button>
                                    <button class="tool-item expandable">
                                        <i class="fas fa-archway"></i>
                                        <span>Place Structurals</span>
                                        <i class="fas fa-chevron-right expand-icon"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="panel info-panel">
                                <h2>Info</h2>
                                <p>Project information will be displayed here.</p>
                            </div>
                            <div class="panel objects-panel">
                                <h2>Objects</h2>
                                <p>Furniture and object library will be displayed here.</p>
                            </div>
                            <div class="panel styleboards-panel">
                                <h2>Styleboards</h2>
                                <p>Style and material boards will be displayed here.</p>
                            </div>
                            <div class="panel finishes-panel">
                                <h2>Finishes</h2>
                                <p>Wall, floor, and ceiling finishes will be displayed here.</p>
                            </div>
                            <div class="panel export-panel">
                                <h2>Export</h2>
                                <p>Export options will be displayed here.</p>
                            </div>
                            <div class="panel help-panel">
                                <h2>Help</h2>
                                <p>Help and documentation will be displayed here.</p>
                            </div>
                        </div>
                    </div>
                    <div class="zoom-controls">
                        <div class="zoom-handle top"></div>
                        <button class="zoom-btn" title="Zoom In">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="zoom-btn" title="Zoom Out">
                            <i class="fas fa-minus"></i>
                        </button>
                        <button class="zoom-btn" title="Fit to Screen">
                            <i class="fas fa-compress"></i>
                        </button>
                        <div class="zoom-handle bottom"></div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.container);
        
        // Bind events
        this.bindEvents();
        
        // Initialize when first shown
        this.initialized = false;
        
        // Initialize the room properties panel
        this.roomPropertiesPanel = null;
    }
    
    bindEvents() {
        // Close button
        const closeBtn = this.container.querySelector('.planner-close');
        closeBtn.addEventListener('click', () => this.hide());
        
        // Overlay click
        const overlay = this.container.querySelector('.planner-modal-overlay');
        overlay.addEventListener('click', () => this.hide());
        
        // Sidebar panel switching
        const sidebarIcons = this.container.querySelectorAll('.sidebar-icon');
        sidebarIcons.forEach(icon => {
            icon.addEventListener('click', () => {
                const panelName = icon.dataset.panel;
                console.log('🔧 Sidebar icon clicked:', panelName);
                
                // Debug panel-content visibility
                const panelContent = this.container.querySelector('.panel-content');
                console.log('Panel content display:', window.getComputedStyle(panelContent).display);
                console.log('Panel content visibility:', window.getComputedStyle(panelContent).visibility);
                
                // Update active states
                sidebarIcons.forEach(i => i.classList.remove('active'));
                icon.classList.add('active');
                
                // Show corresponding panel
                const panels = this.container.querySelectorAll('.panel');
                console.log('Found panels:', panels.length);
                panels.forEach(p => {
                    p.classList.remove('active');
                    console.log('Removing active from:', p.className);
                });
                
                const targetPanel = this.container.querySelector(`.${panelName}-panel`);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                    console.log('✅ Panel found and activated:', panelName);
                    console.log('Panel classes after activation:', targetPanel.className);
                    console.log('Panel display style:', window.getComputedStyle(targetPanel).display);
                } else {
                    console.log('❌ Panel not found:', `.${panelName}-panel`);
                }
            });
        });
        
        // Tool buttons
        const toolItems = this.container.querySelectorAll('.tool-item[data-tool]');
        toolItems.forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool;
                
                // Update active state
                toolItems.forEach(item => {
                    item.classList.remove('active');
                    // Disable other tools when one is active
                    if (item !== btn) {
                        item.classList.add('disabled');
                    }
                });
                btn.classList.add('active');
                
                // Show wall properties if wall tool is selected
                const wallProps = this.container.querySelector('.wall-properties');
                if (tool === 'wall') {
                    wallProps.style.display = 'block';
                } else {
                    wallProps.style.display = 'none';
                }
                
                // Disable expandable items
                const expandableItems = this.container.querySelectorAll('.tool-item.expandable');
                expandableItems.forEach(item => item.classList.add('disabled'));
                
                // Hide upload button when tool is active
                const uploadBtn = this.container.querySelector('.upload-btn');
                if (uploadBtn) {
                    uploadBtn.style.display = 'none';
                }
                
                // Show cancel button
                const cancelContainer = this.container.querySelector('.tool-cancel-container');
                if (cancelContainer) {
                    cancelContainer.style.display = 'block';
                }
                
                this.setActiveTool(tool);
            });
        });
        
        // Wall property controls
        this.setupWallPropertyControls();
        
        // Cancel button
        const cancelBtn = this.container.querySelector('.tool-cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                if (this.currentTool) {
                    this.currentTool.deactivate();
                    this.currentTool = null;
                }
                this.resetToolUI();
                this.setActiveTool('select');
                this.setStatus('');
            });
        }
        
        // Zoom controls
        this.setupZoomControls();
        
        // ESC key to close - but only if no tool is active
        this.escapeHandler = (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                // If a tool is active, let it handle ESC first
                if (this.currentTool && this.activeTool !== 'select') {
                    // Tool will handle it
                    return;
                }
                // Otherwise close the modal
                this.hide();
            }
        };
        document.addEventListener('keydown', this.escapeHandler);
    }
    
    setupWallPropertyControls() {
        // Wall thickness controls
        const thicknessInput = this.container.querySelector('#wallThickness');
        const thicknessIncrement = thicknessInput.nextElementSibling;
        const thicknessDecrement = thicknessInput.previousElementSibling;
        
        // Wall height controls
        const heightInput = this.container.querySelector('#wallHeight');
        const heightIncrement = heightInput.nextElementSibling;
        const heightDecrement = heightInput.previousElementSibling;
        
        // Raise from floor controls
        const raiseInput = this.container.querySelector('#raiseFromFloor');
        const raiseIncrement = raiseInput.nextElementSibling;
        const raiseDecrement = raiseInput.previousElementSibling;
        
        // Thickness increment/decrement
        thicknessIncrement.addEventListener('click', () => {
            this.wallProperties.thickness += 1;
            this.updateWallPropertyDisplay('thickness', thicknessInput);
        });
        
        thicknessDecrement.addEventListener('click', () => {
            if (this.wallProperties.thickness > 5) {
                this.wallProperties.thickness -= 1;
                this.updateWallPropertyDisplay('thickness', thicknessInput);
            }
        });
        
        // Height increment/decrement (by 15cm / ~6")
        heightIncrement.addEventListener('click', () => {
            this.wallProperties.height += 15;
            this.updateWallPropertyDisplay('height', heightInput);
        });
        
        heightDecrement.addEventListener('click', () => {
            if (this.wallProperties.height > 150) { // Minimum ~5'
                this.wallProperties.height -= 15;
                this.updateWallPropertyDisplay('height', heightInput);
            }
        });
        
        // Raise from floor increment/decrement
        raiseIncrement.addEventListener('click', () => {
            this.wallProperties.raiseFromFloor += 1;
            this.updateWallPropertyDisplay('raise', raiseInput);
        });
        
        raiseDecrement.addEventListener('click', () => {
            if (this.wallProperties.raiseFromFloor > 0) {
                this.wallProperties.raiseFromFloor -= 1;
                this.updateWallPropertyDisplay('raise', raiseInput);
            }
        });
        
        // Initialize displays
        this.updateWallPropertyDisplay('thickness', thicknessInput);
        this.updateWallPropertyDisplay('height', heightInput);
        this.updateWallPropertyDisplay('raise', raiseInput);
    }
    
    updateWallPropertyDisplay(property, input) {
        if (!input) return;
        
        if (this.units.useImperial) {
            switch (property) {
                case 'thickness':
                    // Convert cm to inches and format as fraction
                    const inches = this.wallProperties.thickness * this.units.cmToInches;
                    input.value = this.formatInchesAsFraction(inches) + '"';
                    break;
                case 'height':
                    // Convert cm to feet and inches
                    const totalInches = this.wallProperties.height * this.units.cmToInches;
                    const feet = Math.floor(totalInches / 12);
                    const remainingInches = Math.round(totalInches % 12);
                    input.value = remainingInches > 0 ? `${feet}' ${remainingInches}"` : `${feet}'`;
                    break;
                case 'raise':
                    // Show in inches
                    const raiseInches = this.wallProperties.raiseFromFloor * this.units.cmToInches;
                    input.value = raiseInches > 0 ? Math.round(raiseInches) + '"' : '0';
                    break;
            }
        } else {
            // Metric display
            switch (property) {
                case 'thickness':
                    input.value = this.wallProperties.thickness + ' cm';
                    break;
                case 'height':
                    input.value = this.wallProperties.height + ' cm';
                    break;
                case 'raise':
                    input.value = this.wallProperties.raiseFromFloor + ' cm';
                    break;
            }
        }
        
        // Update the current tool if it's a wall tool
        if (this.currentTool && this.currentTool.setWallProperties) {
            this.currentTool.setWallProperties(this.wallProperties);
        }
    }
    
    formatInchesAsFraction(inches) {
        const wholeInches = Math.floor(inches);
        const fraction = inches - wholeInches;
        
        // Common fractions in construction
        const fractions = [
            { decimal: 0.125, str: '1/8' },
            { decimal: 0.25, str: '1/4' },
            { decimal: 0.375, str: '3/8' },
            { decimal: 0.5, str: '1/2' },
            { decimal: 0.625, str: '5/8' },
            { decimal: 0.75, str: '3/4' },
            { decimal: 0.875, str: '7/8' }
        ];
        
        // Find closest fraction
        let closestFraction = '';
        let minDiff = 1;
        
        for (const f of fractions) {
            const diff = Math.abs(fraction - f.decimal);
            if (diff < minDiff) {
                minDiff = diff;
                closestFraction = f.str;
            }
        }
        
        if (minDiff < 0.0625) { // Within 1/16"
            return wholeInches > 0 ? `${wholeInches} ${closestFraction}` : closestFraction;
        } else {
            return Math.round(inches).toString();
        }
    }
    
    setupZoomControls() {
        const zoomControls = this.container.querySelector('.zoom-controls');
        const zoomInBtn = zoomControls.children[0];
        const zoomOutBtn = zoomControls.children[1];
        const fitBtn = zoomControls.children[2];
        
        // Current zoom level
        this.zoomLevel = 1;
        this.minZoom = 0.25;
        this.maxZoom = 4;
        
        zoomInBtn.addEventListener('click', () => {
            this.zoom(1.2);
        });
        
        zoomOutBtn.addEventListener('click', () => {
            this.zoom(0.8);
        });
        
        fitBtn.addEventListener('click', () => {
            this.fitToScreen();
        });
        
        // Mouse wheel zoom (also zooms from center)
        if (this.container) {
            const canvas = this.container.querySelector('#plannerCanvas');
            canvas.addEventListener('wheel', (e) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? 0.9 : 1.1;
                this.zoom(delta);
            });
        }
        
        // Setup panning
        this.setupPanning();
        
        // Setup coordinate tracking
        this.setupCoordinateTracking();
        
        // Setup zoom controls dragging and flipping
        this.setupZoomControlsInteraction();
    }
    
    setupZoomControlsInteraction() {
        const zoomControlsList = this.container.querySelectorAll('.zoom-controls');
        if (!zoomControlsList.length) return;
        
        // Apply to all zoom control examples
        zoomControlsList.forEach((zoomControls) => {
        
        let isDragging = false;
        let dragStart = { x: 0, y: 0 };
        let controlsStart = { x: 0, y: 0 };
        
        // Find the handle elements
        const topHandle = zoomControls.querySelector('.zoom-handle.top');
        const bottomHandle = zoomControls.querySelector('.zoom-handle.bottom');
        
        if (!topHandle || !bottomHandle) return;
        
        // Dragging functionality
        topHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            isDragging = true;
            
            // Get the current computed position
            const computedStyle = window.getComputedStyle(zoomControls);
            const currentLeft = parseInt(computedStyle.left, 10) || 0;
            const currentTop = parseInt(computedStyle.top, 10) || 0;
            
            // Calculate the offset from the mouse position to the element's position
            dragStart = { x: e.clientX, y: e.clientY };
            controlsStart = { x: currentLeft, y: currentTop };
            
            zoomControls.classList.add('dragging');
            topHandle.style.cursor = 'grabbing';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const dx = e.clientX - dragStart.x;
            const dy = e.clientY - dragStart.y;
            
            // Apply the new position
            zoomControls.style.left = `${controlsStart.x + dx}px`;
            zoomControls.style.top = `${controlsStart.y + dy}px`;
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                zoomControls.classList.remove('dragging');
                topHandle.style.cursor = 'grab';
            }
        });
        
        // Flipping functionality
        bottomHandle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            zoomControls.classList.toggle('horizontal');
        });
        });
    }
    
    setupPanning() {
        if (!this.container) return;
        
        const canvas = this.container.querySelector('#plannerCanvas');
        let isPanning = false;
        let panStart = { x: 0, y: 0 };
        let stageStart = { x: 0, y: 0 };
        
        // Middle mouse button or space + drag for panning
        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 1 || (e.button === 0 && this.isSpacePressed)) {
                e.preventDefault();
                isPanning = true;
                panStart = { x: e.clientX, y: e.clientY };
                if (this.pixiApp) {
                    stageStart = { 
                        x: this.pixiApp.stage.position.x, 
                        y: this.pixiApp.stage.position.y 
                    };
                }
                canvas.style.cursor = 'grabbing';
            }
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (isPanning && this.pixiApp) {
                const dx = e.clientX - panStart.x;
                const dy = e.clientY - panStart.y;
                
                this.pixiApp.stage.position.x = stageStart.x + dx;
                this.pixiApp.stage.position.y = stageStart.y + dy;
            }
        });
        
        canvas.addEventListener('mouseup', (e) => {
            if (isPanning) {
                isPanning = false;
                canvas.style.cursor = this.isSpacePressed ? 'grab' : 'default';
            }
        });
        
        // Track space key for pan mode
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !this.isSpacePressed && this.isVisible) {
                e.preventDefault();
                this.isSpacePressed = true;
                canvas.style.cursor = 'grab';
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space' && this.isSpacePressed) {
                this.isSpacePressed = false;
                canvas.style.cursor = 'default';
            }
        });
    }
    
    setupCoordinateTracking() {
        if (!this.container) return;
        
        const canvas = this.container.querySelector('#plannerCanvas');
        const coordsDisplay = this.container.querySelector('.planner-coords');
        
        canvas.addEventListener('mousemove', (e) => {
            if (!this.pixiApp) return;
            
            const pixiCanvas = this.pixiApp.view;
            const rect = pixiCanvas.getBoundingClientRect();
            
            // Get mouse position relative to canvas
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Check for any CSS scaling
            const cssWidth = rect.width;
            const cssHeight = rect.height;
            const resolution = this.pixiApp.renderer.resolution || 1;
            
            // The actual canvas size might be different from CSS size
            const actualWidth = pixiCanvas.width / resolution;
            const actualHeight = pixiCanvas.height / resolution;
            
            // Calculate scale factors
            const scaleX = actualWidth / cssWidth;
            const scaleY = actualHeight / cssHeight;
            
            // Apply scaling
            const scaledX = x * scaleX;
            const scaledY = y * scaleY;
            
            // Transform to world coordinates
            let worldX, worldY;
            const stageTransform = this.pixiApp.stage.worldTransform;
            
            if (stageTransform) {
                const tempPoint = new PIXI.Point();
                stageTransform.applyInverse({x: scaledX, y: scaledY}, tempPoint);
                worldX = tempPoint.x;
                worldY = tempPoint.y;
            } else {
                const stageScale = this.pixiApp.stage.scale.x;
                const stageX = this.pixiApp.stage.position.x;
                const stageY = this.pixiApp.stage.position.y;
                worldX = (scaledX - stageX) / stageScale;
                worldY = (scaledY - stageY) / stageScale;
            }
            
            // Snap to grid for display
            const gridSize = 20;
            const snappedX = Math.round(worldX / gridSize) * gridSize;
            const snappedY = Math.round(worldY / gridSize) * gridSize;
            
            // Update display
            coordsDisplay.innerHTML = `
                Canvas: ${Math.round(x)}, ${Math.round(y)}<br>
                World: ${Math.round(worldX)}, ${Math.round(worldY)}<br>
                Grid: ${snappedX}, ${snappedY}
            `;
            
            // Log for debugging with Shift key
            if (e.shiftKey) {
                console.log('Coordinate Debug:', {
                    event: { clientX: e.clientX, clientY: e.clientY },
                    rect: { left: rect.left, top: rect.top, width: cssWidth, height: cssHeight },
                    canvas: { 
                        cssWidth, 
                        cssHeight, 
                        actualWidth, 
                        actualHeight,
                        pixelWidth: pixiCanvas.width,
                        pixelHeight: pixiCanvas.height
                    },
                    resolution: resolution,
                    scale: { x: scaleX, y: scaleY },
                    mouseRelative: { x, y },
                    scaled: { x: scaledX, y: scaledY },
                    world: { x: worldX, y: worldY },
                    snapped: { x: snappedX, y: snappedY },
                    stage: {
                        position: this.pixiApp.stage.position,
                        scale: this.pixiApp.stage.scale,
                        pivot: this.pixiApp.stage.pivot,
                        transform: stageTransform ? 'available' : 'not available'
                    }
                });
            }
        });
    }
    
    zoom(factor) {
        if (!this.pixiApp) return;
        
        const newZoom = this.zoomLevel * factor;
        if (newZoom < this.minZoom || newZoom > this.maxZoom) return;
        
        // Get the center of the canvas
        const centerX = this.pixiApp.renderer.width / 2;
        const centerY = this.pixiApp.renderer.height / 2;
        
        // Get the world position at the center before zoom
        const worldCenterBefore = {
            x: (centerX - this.pixiApp.stage.position.x) / this.zoomLevel,
            y: (centerY - this.pixiApp.stage.position.y) / this.zoomLevel
        };
        
        // Update zoom level
        this.zoomLevel = newZoom;
        
        // Apply zoom to the stage
        this.pixiApp.stage.scale.x = this.zoomLevel;
        this.pixiApp.stage.scale.y = this.zoomLevel;
        
        // Calculate new position to keep the same world point at the center
        this.pixiApp.stage.position.x = centerX - worldCenterBefore.x * this.zoomLevel;
        this.pixiApp.stage.position.y = centerY - worldCenterBefore.y * this.zoomLevel;
        
        // Update zoom indicator
        this.updateZoomIndicator();
    }
    
    updateZoomIndicator() {
        // Show zoom level briefly
        const zoomPercent = Math.round(this.zoomLevel * 100);
        this.setStatus(`Zoom: ${zoomPercent}%`, 1000);
    }
    
    fitToScreen() {
        if (!this.pixiApp || !this.floorPlan) return;
        
        // Calculate bounds of all content
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        let hasContent = false;
        
        // Check walls
        this.floorPlan.walls.forEach(wall => {
            hasContent = true;
            minX = Math.min(minX, wall.a.x, wall.b.x);
            minY = Math.min(minY, wall.a.y, wall.b.y);
            maxX = Math.max(maxX, wall.a.x, wall.b.x);
            maxY = Math.max(maxY, wall.a.y, wall.b.y);
        });
        
        // Check rooms
        this.floorPlan.rooms.forEach(room => {
            hasContent = true;
            room.points.forEach(point => {
                minX = Math.min(minX, point.x);
                minY = Math.min(minY, point.y);
                maxX = Math.max(maxX, point.x);
                maxY = Math.max(maxY, point.y);
            });
        });
        
        if (!hasContent) {
            // No content, reset to default
            this.zoomLevel = 1;
            this.pixiApp.stage.scale.set(1);
            this.pixiApp.stage.position.set(0);
            this.pixiApp.stage.pivot.set(0);
            return;
        }
        
        // Add padding
        const padding = 50;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;
        
        // Calculate zoom to fit
        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        const viewWidth = this.pixiApp.renderer.width;
        const viewHeight = this.pixiApp.renderer.height;
        
        const scaleX = viewWidth / contentWidth;
        const scaleY = viewHeight / contentHeight;
        this.zoomLevel = Math.min(scaleX, scaleY, 2); // Max zoom 2x for fit
        
        // Apply zoom
        this.pixiApp.stage.scale.set(this.zoomLevel);
        
        // Center content
        const contentCenterX = (minX + maxX) / 2;
        const contentCenterY = (minY + maxY) / 2;
        
        this.pixiApp.stage.position.x = viewWidth / 2 - contentCenterX * this.zoomLevel;
        this.pixiApp.stage.position.y = viewHeight / 2 - contentCenterY * this.zoomLevel;
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
            backgroundColor: 0xf5f5f5,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true // This helps with high DPI displays
        });
        
        // Log canvas info for debugging
        console.log('PixiJS initialized:', {
            width: width,
            height: height,
            resolution: window.devicePixelRatio || 1,
            viewWidth: this.pixiApp.view.width,
            viewHeight: this.pixiApp.view.height,
            rendererWidth: this.pixiApp.renderer.width,
            rendererHeight: this.pixiApp.renderer.height
        });
        
        canvasContainer.appendChild(this.pixiApp.view);
        
        // Create layers
        this.gridGraphics = new PIXI.Graphics();
        this.drawnObjectsLayer = new PIXI.Container(); // Persistent layer for drawn walls/rooms
        this.toolsLayer = new PIXI.Container(); // Temporary layer for tool previews
        
        this.pixiApp.stage.addChild(this.gridGraphics);
        this.pixiApp.stage.addChild(this.drawnObjectsLayer);
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
        
        // Initialize the room properties panel
        if (!this.roomPropertiesPanel && window.RoomPropertiesPanel) {
            this.roomPropertiesPanel = new window.RoomPropertiesPanel(this.container);
        }
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
                        // Use the actual PixiJS canvas element
                        const pixiCanvas = this.pixiApp.view;
                        this.currentTool = new window.DrawingTools.WallDrawingTool(
                            pixiCanvas,
                            this.floorPlan,
                            this.drawnObjectsLayer
                        );
                        // Set wall properties before activating
                        if (this.currentTool.setWallProperties) {
                            this.currentTool.setWallProperties(this.wallProperties);
                        }
                        this.currentTool.activate(this.pixiApp);
                        this.setStatus('Click to place wall start point. Click again to complete wall. ESC to cancel.');
                    } catch (error) {
                        console.error('Error activating wall tool:', error);
                        this.setStatus('Error: Could not activate wall tool');
                    }
                    break;
                case 'room':
                    try {
                        // Use the actual PixiJS canvas element
                        const pixiCanvas = this.pixiApp.view;
                        this.currentTool = new window.DrawingTools.RoomDrawingTool(
                            pixiCanvas,
                            this.floorPlan,
                            this.drawnObjectsLayer
                        );
                        this.currentTool.activate(this.pixiApp);
                        this.setStatus('Click to set first corner. Move mouse and click again to complete room. ESC to cancel.');
                    } catch (error) {
                        console.error('Error activating room tool:', error);
                        this.setStatus('Error: Could not activate room tool');
                    }
                    break;
                case 'select':
                    try {
                        // Use the actual PixiJS canvas element
                        const pixiCanvas = this.pixiApp.view;
                        this.currentTool = new window.DrawingTools.SelectTool(
                            pixiCanvas,
                            this.floorPlan,
                            this.drawnObjectsLayer
                        );
                        this.currentTool.activate(this.pixiApp);
                        this.setStatus('Click to select objects. Drag to move. Delete key to remove.');
                    } catch (error) {
                        console.error('Error activating select tool:', error);
                        this.setStatus('Error: Could not activate select tool');
                    }
                    break;
                default:
                    this.setStatus('');
                    // Re-enable all tools when no tool is active
                    this.resetToolUI();
                    break;
            }
        } else {
            console.error('PixiApp not initialized');
            this.setStatus('Error: Canvas not initialized');
        }
        
        this.activeTool = toolName;
    }
    
    resetToolUI() {
        // Re-enable all tool items
        const toolItems = this.container.querySelectorAll('.tool-item');
        toolItems.forEach(item => {
            item.classList.remove('disabled', 'active');
        });
        
        // Show upload button
        const uploadBtn = this.container.querySelector('.upload-btn');
        if (uploadBtn) {
            uploadBtn.style.display = 'block';
        }
        
        // Hide wall properties
        const wallProps = this.container.querySelector('.wall-properties');
        if (wallProps) {
            wallProps.style.display = 'none';
        }
        
        // Hide cancel button
        const cancelContainer = this.container.querySelector('.tool-cancel-container');
        if (cancelContainer) {
            cancelContainer.style.display = 'none';
        }
    }
    
    setStatus(message, duration = 0) {
        const statusBar = this.container.querySelector('.planner-status');
        statusBar.textContent = message;
        statusBar.style.display = message ? 'block' : 'none';
        
        // Clear any existing timeout
        if (this.statusTimeout) {
            clearTimeout(this.statusTimeout);
            this.statusTimeout = null;
        }
        
        // If duration specified, hide after that time
        if (duration > 0 && message) {
            this.statusTimeout = setTimeout(() => {
                statusBar.style.display = 'none';
                this.statusTimeout = null;
            }, duration);
        }
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