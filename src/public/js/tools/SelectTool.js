// Selection tool for the floor planner

class SelectTool {
    constructor(canvas, floorPlan, drawnObjectsLayer) {
        this.canvas = canvas;
        this.floorPlan = floorPlan;
        this.drawnObjectsLayer = drawnObjectsLayer;
        this.pixiApp = null;
        this.graphics = null;
        this.isActive = false;
        this.snapToGrid = true;
        this.gridSize = 20;
        
        this.selectedObject = null;
        this.selectionGraphics = null;
        this.isDragging = false;
        this.isHandleDragging = false;
        this.dragStart = null;
        this.dragOffset = null;
        this.dragHandle = null;
        this.hoverObject = null;
        this.handles = [];
        this.wallHoverType = null; // 'corner' or 'edge'
        this.hoverGraphics = null; // For hover highlights
    }
    
    activate(pixiApp) {
        this.pixiApp = pixiApp;
        this.isActive = true;
        
        // Don't create a new graphics layer - use the existing drawnObjectsLayer
        // The SelectTool should manipulate objects in the existing layer, not create its own
        this.graphics = this.drawnObjectsLayer;
        
        // Create selection graphics layer
        this.selectionGraphics = new PIXI.Graphics();
        this.pixiApp.stage.addChild(this.selectionGraphics);
        
        // Set up event listeners
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('mouseup', this.handleMouseUp);
        this.canvas.addEventListener('dblclick', this.handleDoubleClick);
        document.addEventListener('keydown', this.handleKeyDown);
        
        // Make canvas interactive
        this.canvas.style.cursor = 'default';
        
        // Initial redraw to ensure all objects are visible
        this.redrawAll();
    }
    
    deactivate() {
        // Remove event listeners
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        this.canvas.removeEventListener('mouseup', this.handleMouseUp);
        this.canvas.removeEventListener('dblclick', this.handleDoubleClick);
        document.removeEventListener('keydown', this.handleKeyDown);
        
        // Clear selection
        this.clearSelection();
        
        if (this.selectionGraphics) {
            this.pixiApp.stage.removeChild(this.selectionGraphics);
            this.selectionGraphics.destroy();
            this.selectionGraphics = null;
        }
        
        // Clear hover graphics
        if (this.hoverGraphics) {
            this.pixiApp.stage.removeChild(this.hoverGraphics);
            this.hoverGraphics.destroy();
            this.hoverGraphics = null;
        }
        
        // Reset cursor
        this.canvas.style.cursor = 'default';
        
        this.isActive = false;
    }
    
    getMousePosition(event) {
        if (!this.pixiApp || !this.pixiApp.renderer) {
            console.warn('No pixiApp or renderer available');
            return { x: 0, y: 0 };
        }
        
        // Get the actual PixiJS canvas
        const pixiCanvas = this.pixiApp.view;
        const rect = pixiCanvas.getBoundingClientRect();
        
        // Get mouse position relative to canvas
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // In PixiJS v7, we should use the interaction manager if available
        // Otherwise, we need to account for resolution and any CSS scaling
        let worldX, worldY;
        
        // Check if there's any CSS scaling on the canvas
        const cssWidth = rect.width;
        const cssHeight = rect.height;
        const resolution = this.pixiApp.renderer.resolution || 1;
        
        // The actual canvas size might be different from CSS size due to resolution
        const actualWidth = pixiCanvas.width / resolution;
        const actualHeight = pixiCanvas.height / resolution;
        
        // Calculate scale factors
        const scaleX = actualWidth / cssWidth;
        const scaleY = actualHeight / cssHeight;
        
        // Apply scaling
        const scaledX = x * scaleX;
        const scaledY = y * scaleY;
        
        // Now transform to world coordinates using stage transform
        const stageTransform = this.pixiApp.stage.worldTransform;
        
        // If we have a world transform, use it to convert to world space
        if (stageTransform) {
            // Create a temporary point for transformation
            const tempPoint = new PIXI.Point();
            
            // Apply the inverse transform to get world coordinates
            stageTransform.applyInverse({x: scaledX, y: scaledY}, tempPoint);
            
            worldX = tempPoint.x;
            worldY = tempPoint.y;
        } else {
            // Fallback: account for stage position and scale manually
            const stageScale = this.pixiApp.stage.scale.x; // Assuming uniform scale
            const stageX = this.pixiApp.stage.position.x;
            const stageY = this.pixiApp.stage.position.y;
            
            worldX = (scaledX - stageX) / stageScale;
            worldY = (scaledY - stageY) / stageScale;
        }
        
        return this.snapPoint({
            x: worldX,
            y: worldY
        });
    }
    
    snapPoint(point) {
        if (!this.snapToGrid) return point;
        
        return {
            x: Math.round(point.x / this.gridSize) * this.gridSize,
            y: Math.round(point.y / this.gridSize) * this.gridSize
        };
    }
    
    handleMouseDown = (event) => {
        const pos = this.getMousePosition(event);
        console.log('SelectTool mouseDown at:', pos);
        
        // Check if clicking on a handle
        const handle = this.getHandleAt(pos);
        if (handle) {
            console.log('Clicking on handle:', handle);
            this.startHandleDrag(handle, pos);
            return;
        }
        
        // Check if clicking on room edge/corner for dragging
        if (this.selectedObject && this.selectedObject.type === 'room') {
            const roomHover = this.getRoomHoverInfo(pos);
            if (roomHover) {
                console.log('Clicking on room edge/corner:', roomHover);
                if (roomHover.type === 'corner') {
                    // Create a handle-like object for corner dragging
                    const handle = {
                        id: `room-point-${roomHover.cornerIndex}`,
                        type: 'corner'
                    };
                    this.startHandleDrag(handle, pos);
                } else if (roomHover.type === 'edge') {
                    // Create a handle-like object for edge dragging
                    const handle = {
                        type: 'edge',
                        edgeIndex: roomHover.edgeIndex
                    };
                    this.startHandleDrag(handle, pos);
                }
                return;
            }
        }
        
        // Check if clicking on selected object (to drag)
        if (this.selectedObject && this.isPointOnObject(pos, this.selectedObject)) {
            console.log('Starting drag of selected object:', this.selectedObject);
            this.startDrag(pos);
            return;
        }
        
        // Otherwise, try to select an object
        const object = this.getObjectAt(pos);
        if (object) {
            console.log('Selecting object:', object);
            this.selectObject(object);
        } else {
            console.log('No object found at position, clearing selection');
            this.clearSelection();
        }
    }
    
    handleMouseMove = (event) => {
        const pos = this.getMousePosition(event);
        
        if (this.isHandleDragging && this.selectedObject && this.dragHandle) {
            // Handle dragging for resizing
            const dx = pos.x - this.dragStart.x;
            const dy = pos.y - this.dragStart.y;
            
            if (this.selectedObject.type === 'wall') {
                const wall = this.selectedObject.object;
                if (this.dragHandle.id === 'wall-start') {
                    wall.a.x = this.dragOffset.a.x + dx;
                    wall.a.y = this.dragOffset.a.y + dy;
                } else if (this.dragHandle.id === 'wall-end') {
                    wall.b.x = this.dragOffset.b.x + dx;
                    wall.b.y = this.dragOffset.b.y + dy;
                }
            } else if (this.selectedObject.type === 'room') {
                const room = this.selectedObject.object;
                
                if (this.dragHandle.type === 'corner') {
                    // Handle corner dragging
                    const handleIndex = parseInt(this.dragHandle.id.split('-')[2]);
                    if (!isNaN(handleIndex) && handleIndex < room.points.length) {
                        room.points[handleIndex].x = this.dragOffset[handleIndex].x + dx;
                        room.points[handleIndex].y = this.dragOffset[handleIndex].y + dy;
                        
                        // For rectangular rooms, maintain rectangle shape
                        if (room.points.length === 4) {
                            // Adjust adjacent corners to maintain rectangle
                            if (handleIndex === 0) { // Top-left
                                room.points[1].y = room.points[0].y;
                                room.points[3].x = room.points[0].x;
                            } else if (handleIndex === 1) { // Top-right
                                room.points[0].y = room.points[1].y;
                                room.points[2].x = room.points[1].x;
                            } else if (handleIndex === 2) { // Bottom-right
                                room.points[3].y = room.points[2].y;
                                room.points[1].x = room.points[2].x;
                            } else if (handleIndex === 3) { // Bottom-left
                                room.points[2].y = room.points[3].y;
                                room.points[0].x = room.points[3].x;
                            }
                        }
                    }
                } else if (this.dragHandle.type === 'edge') {
                    // Handle edge dragging (move wall)
                    const edgeIndex = this.dragHandle.edgeIndex;
                    const room = this.selectedObject.object;
                    
                    if (room.points.length === 4) {
                        // For rectangular rooms
                        if (edgeIndex === 0) { // Top edge
                            room.points[0].y = this.dragOffset[0].y + dy;
                            room.points[1].y = this.dragOffset[1].y + dy;
                        } else if (edgeIndex === 1) { // Right edge
                            room.points[1].x = this.dragOffset[1].x + dx;
                            room.points[2].x = this.dragOffset[2].x + dx;
                        } else if (edgeIndex === 2) { // Bottom edge
                            room.points[2].y = this.dragOffset[2].y + dy;
                            room.points[3].y = this.dragOffset[3].y + dy;
                        } else if (edgeIndex === 3) { // Left edge
                            room.points[3].x = this.dragOffset[3].x + dx;
                            room.points[0].x = this.dragOffset[0].x + dx;
                        }
                    }
                }
                
                // Update room area
                room.updateArea();
            }
            
            this.redrawAll();
            this.updateSelection();
            
        } else if (this.isDragging && this.selectedObject) {
            // Drag the selected object
            const dx = pos.x - this.dragStart.x;
            const dy = pos.y - this.dragStart.y;
            
            console.log('Dragging:', { dx, dy, selectedObject: this.selectedObject });
            
            if (this.selectedObject.type === 'wall') {
                // Update wall position - note we need to update the actual wall object
                const wall = this.selectedObject.object;
                wall.a.x = this.dragOffset.a.x + dx;
                wall.a.y = this.dragOffset.a.y + dy;
                wall.b.x = this.dragOffset.b.x + dx;
                wall.b.y = this.dragOffset.b.y + dy;
            } else if (this.selectedObject.type === 'room') {
                // Update room points - note we need to update the actual room object
                const room = this.selectedObject.object;
                room.points.forEach((point, index) => {
                    point.x = this.dragOffset[index].x + dx;
                    point.y = this.dragOffset[index].y + dy;
                });
            }
            
            this.redrawAll();
            this.updateSelection();
        } else {
            // Update hover state and cursor
            const handle = this.getHandleAt(pos);
            
            if (handle) {
                this.canvas.style.cursor = 'pointer';
                this.updateHoverHighlight(handle);
            } else if (this.selectedObject && this.selectedObject.type === 'room') {
                // Check for room edge/corner hover
                const roomHover = this.getRoomHoverInfo(pos);
                if (roomHover) {
                    this.updateHoverHighlight(roomHover);
                    if (roomHover.type === 'corner') {
                        this.canvas.style.cursor = 'move';
                    } else if (roomHover.type === 'edge') {
                        this.canvas.style.cursor = roomHover.cursor;
                    }
                } else {
                    this.clearHoverHighlight();
                    this.canvas.style.cursor = 'move';
                }
            } else if (this.selectedObject && this.selectedObject.type === 'wall') {
                const wallHover = this.getWallHoverType(pos);
                if (wallHover) {
                    if (wallHover.type === 'corner') {
                        this.canvas.style.cursor = 'move';
                    } else if (wallHover.type === 'edge') {
                        this.canvas.style.cursor = wallHover.direction;
                    }
                } else {
                    this.canvas.style.cursor = 'move';
                }
            } else if (this.getObjectAt(pos)) {
                this.canvas.style.cursor = 'move';
            } else {
                this.clearHoverHighlight();
                this.canvas.style.cursor = 'default';
            }
        }
    }
    
    handleMouseUp = (event) => {
        this.isDragging = false;
        this.isHandleDragging = false;
        this.dragStart = null;
        this.dragOffset = null;
        this.dragHandle = null;
    }
    
    handleDoubleClick = (event) => {
        // Could open properties dialog here
    }
    
    handleKeyDown = (event) => {
        if (event.key === 'Delete' && this.selectedObject) {
            this.deleteSelected();
        }
    }
    
    getObjectAt(pos) {
        // Check walls
        for (const wall of this.floorPlan.walls) {
            if (this.isPointOnWall(pos, wall)) {
                return { type: 'wall', object: wall };
            }
        }
        
        // Check rooms
        for (const room of this.floorPlan.rooms) {
            if (this.isPointInRoom(pos, room)) {
                return { type: 'room', object: room };
            }
        }
        
        return null;
    }
    
    isPointOnWall(point, wall) {
        const distance = this.floorPlan.distanceToLineSegment(point, wall.a, wall.b);
        return distance <= wall.thickness / 2 + 5; // 5px tolerance
    }
    
    isPointInRoom(point, room) {
        // Point in polygon test
        let inside = false;
        const points = room.points;
        
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi = points[i].x, yi = points[i].y;
            const xj = points[j].x, yj = points[j].y;
            
            const intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        
        return inside;
    }
    
    isPointOnObject(point, selected) {
        if (selected.type === 'wall') {
            return this.isPointOnWall(point, selected.object);
        } else if (selected.type === 'room') {
            return this.isPointInRoom(point, selected.object);
        }
        return false;
    }
    
    selectObject(selected) {
        this.selectedObject = selected;
        this.updateSelection();
        
        // Dispatch selection event
        window.dispatchEvent(new CustomEvent('objectSelected', { 
            detail: { 
                type: selected.type, 
                object: selected.object 
            } 
        }));
    }
    
    clearSelection() {
        this.selectedObject = null;
        if (this.selectionGraphics) {
            this.selectionGraphics.clear();
        }
        this.handles = [];
    }
    
    updateSelection() {
        if (!this.selectionGraphics || !this.selectedObject) return;
        
        this.selectionGraphics.clear();
        this.handles = [];
        
        if (this.selectedObject.type === 'wall') {
            const wall = this.selectedObject.object;
            
            // Draw selection highlight
            const angle = wall.getAngle();
            const perpAngle = angle + Math.PI / 2;
            const halfThickness = wall.thickness / 2;
            
            const dx = Math.cos(perpAngle) * halfThickness;
            const dy = Math.sin(perpAngle) * halfThickness;
            
            this.selectionGraphics.lineStyle(2, 0x0066cc, 1);
            this.selectionGraphics.beginFill(0x0066cc, 0.1);
            this.selectionGraphics.moveTo(wall.a.x - dx, wall.a.y - dy);
            this.selectionGraphics.lineTo(wall.b.x - dx, wall.b.y - dy);
            this.selectionGraphics.lineTo(wall.b.x + dx, wall.b.y + dy);
            this.selectionGraphics.lineTo(wall.a.x + dx, wall.a.y + dy);
            this.selectionGraphics.closePath();
            this.selectionGraphics.endFill();
            
            // Draw handles at endpoints
            this.drawHandle(wall.a.x, wall.a.y, 'wall-start');
            this.drawHandle(wall.b.x, wall.b.y, 'wall-end');
            
        } else if (this.selectedObject.type === 'room') {
            const room = this.selectedObject.object;
            
            // Draw selection highlight
            this.selectionGraphics.lineStyle(2, 0x0066cc, 1);
            this.selectionGraphics.beginFill(0x0066cc, 0.1);
            
            this.selectionGraphics.moveTo(room.points[0].x, room.points[0].y);
            for (let i = 1; i < room.points.length; i++) {
                this.selectionGraphics.lineTo(room.points[i].x, room.points[i].y);
            }
            this.selectionGraphics.closePath();
            this.selectionGraphics.endFill();
            
            // Draw handles at each vertex
            room.points.forEach((point, index) => {
                this.drawHandle(point.x, point.y, `room-point-${index}`);
            });
        }
    }
    
    drawHandle(x, y, id) {
        this.selectionGraphics.beginFill(0xffffff);
        this.selectionGraphics.lineStyle(2, 0x0066cc);
        this.selectionGraphics.drawRect(x - 4, y - 4, 8, 8);
        this.selectionGraphics.endFill();
        
        this.handles.push({ x, y, id, bounds: { x: x - 4, y: y - 4, width: 8, height: 8 } });
    }
    
    getHandleAt(pos) {
        for (const handle of this.handles) {
            if (pos.x >= handle.bounds.x && 
                pos.x <= handle.bounds.x + handle.bounds.width &&
                pos.y >= handle.bounds.y && 
                pos.y <= handle.bounds.y + handle.bounds.height) {
                return handle;
            }
        }
        return null;
    }
    
    getRoomHoverInfo(pos) {
        if (!this.selectedObject || this.selectedObject.type !== 'room') return null;
        
        const room = this.selectedObject.object;
        const cornerRadius = 20;
        const edgeThreshold = 15;
        
        // Check corners first
        for (let i = 0; i < room.points.length; i++) {
            const point = room.points[i];
            const dist = Math.sqrt((pos.x - point.x) ** 2 + (pos.y - point.y) ** 2);
            if (dist < cornerRadius) {
                return { 
                    type: 'corner', 
                    cornerIndex: i,
                    id: `room-corner-${i}`,
                    position: point
                };
            }
        }
        
        // Check edges
        for (let i = 0; i < room.points.length; i++) {
            const p1 = room.points[i];
            const p2 = room.points[(i + 1) % room.points.length];
            
            const dist = this.distanceToLineSegment(pos, p1, p2);
            if (dist < edgeThreshold) {
                // Determine cursor based on edge orientation
                const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                const isVertical = Math.abs(Math.sin(angle)) > 0.7;
                const isHorizontal = Math.abs(Math.cos(angle)) > 0.7;
                
                let cursor = 'move';
                if (isVertical) {
                    cursor = 'ew-resize';
                } else if (isHorizontal) {
                    cursor = 'ns-resize';
                } else {
                    cursor = Math.abs(angle) < Math.PI / 4 || Math.abs(angle) > 3 * Math.PI / 4 ? 'nesw-resize' : 'nwse-resize';
                }
                
                return { 
                    type: 'edge', 
                    edgeIndex: i,
                    cursor: cursor,
                    p1: p1,
                    p2: p2
                };
            }
        }
        
        return null;
    }
    
    updateHoverHighlight(hoverInfo) {
        if (!this.pixiApp) return;
        
        // Create hover graphics if it doesn't exist
        if (!this.hoverGraphics) {
            this.hoverGraphics = new PIXI.Graphics();
            this.pixiApp.stage.addChild(this.hoverGraphics);
        }
        
        // Clear previous highlights
        this.hoverGraphics.clear();
        
        if (hoverInfo.type === 'corner') {
            // Draw corner highlight
            this.hoverGraphics.lineStyle(3, 0xff6600, 1);
            this.hoverGraphics.beginFill(0xff6600, 0.3);
            this.hoverGraphics.drawCircle(hoverInfo.position.x, hoverInfo.position.y, 8);
            this.hoverGraphics.endFill();
        } else if (hoverInfo.type === 'edge') {
            // Draw edge highlight
            this.hoverGraphics.lineStyle(4, 0xff6600, 0.8);
            this.hoverGraphics.moveTo(hoverInfo.p1.x, hoverInfo.p1.y);
            this.hoverGraphics.lineTo(hoverInfo.p2.x, hoverInfo.p2.y);
        }
    }
    
    clearHoverHighlight() {
        if (this.hoverGraphics) {
            this.hoverGraphics.clear();
        }
    }
    
    distanceToLineSegment(point, p1, p2) {
        const A = point.x - p1.x;
        const B = point.y - p1.y;
        const C = p2.x - p1.x;
        const D = p2.y - p1.y;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) {
            param = dot / lenSq;
        }
        
        let xx, yy;
        
        if (param < 0) {
            xx = p1.x;
            yy = p1.y;
        } else if (param > 1) {
            xx = p2.x;
            yy = p2.y;
        } else {
            xx = p1.x + param * C;
            yy = p1.y + param * D;
        }
        
        const dx = point.x - xx;
        const dy = point.y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    getWallHoverType(pos) {
        if (!this.selectedObject || this.selectedObject.type !== 'wall') return null;
        
        const wall = this.selectedObject.object;
        const cornerRadius = 20;
        
        // Check if near corners
        const distToStart = Math.sqrt((pos.x - wall.a.x) ** 2 + (pos.y - wall.a.y) ** 2);
        const distToEnd = Math.sqrt((pos.x - wall.b.x) ** 2 + (pos.y - wall.b.y) ** 2);
        
        if (distToStart < cornerRadius) {
            return { type: 'corner', point: 'start' };
        }
        if (distToEnd < cornerRadius) {
            return { type: 'corner', point: 'end' };
        }
        
        // Check if on wall edge
        const distToWall = this.floorPlan.distanceToLineSegment(pos, wall.a, wall.b);
        if (distToWall < wall.thickness / 2 + 10) {
            // Determine cursor direction based on wall angle
            const angle = wall.getAngle();
            const isVertical = Math.abs(Math.sin(angle)) > 0.7;
            const isHorizontal = Math.abs(Math.cos(angle)) > 0.7;
            
            let direction = 'move';
            if (isVertical) {
                direction = 'ew-resize';
            } else if (isHorizontal) {
                direction = 'ns-resize';
            } else {
                // Diagonal - determine based on angle
                const angleDeg = (angle * 180 / Math.PI) % 180;
                if (angleDeg > -45 && angleDeg < 45) {
                    direction = 'nesw-resize';
                } else {
                    direction = 'nwse-resize';
                }
            }
            
            return { type: 'edge', direction: direction };
        }
        
        return null;
    }
    
    startDrag(pos) {
        this.isDragging = true;
        this.dragStart = pos;
        
        if (this.selectedObject.type === 'wall') {
            const wall = this.selectedObject.object;
            this.dragOffset = {
                a: { x: wall.a.x, y: wall.a.y },
                b: { x: wall.b.x, y: wall.b.y }
            };
        } else if (this.selectedObject.type === 'room') {
            const room = this.selectedObject.object;
            this.dragOffset = room.points.map(p => ({ x: p.x, y: p.y }));
        }
    }
    
    startHandleDrag(handle, pos) {
        this.isHandleDragging = true;
        this.dragStart = pos;
        this.dragHandle = handle;
        
        // Store original positions based on handle type
        if (this.selectedObject.type === 'wall') {
            const wall = this.selectedObject.object;
            this.dragOffset = {
                a: { x: wall.a.x, y: wall.a.y },
                b: { x: wall.b.x, y: wall.b.y }
            };
        } else if (this.selectedObject.type === 'room') {
            const room = this.selectedObject.object;
            this.dragOffset = room.points.map(p => ({ x: p.x, y: p.y }));
        }
    }
    
    deleteSelected() {
        if (!this.selectedObject) return;
        
        if (this.selectedObject.type === 'wall') {
            this.floorPlan.removeWall(this.selectedObject.object.id);
        } else if (this.selectedObject.type === 'room') {
            this.floorPlan.removeRoom(this.selectedObject.object.id);
        }
        
        this.clearSelection();
        this.redrawAll();
        
        // Dispatch delete event
        window.dispatchEvent(new CustomEvent('objectDeleted', { 
            detail: { 
                type: this.selectedObject.type, 
                object: this.selectedObject.object 
            } 
        }));
    }
    
    redrawAll() {
        console.log('Redrawing all objects');
        
        // Since we're using the shared drawnObjectsLayer, we need to clear ALL graphics in it
        // This includes graphics from other tools
        
        // First, clear all children from the layer
        while (this.drawnObjectsLayer.children.length > 0) {
            const child = this.drawnObjectsLayer.children[0];
            this.drawnObjectsLayer.removeChild(child);
            if (child.destroy) {
                child.destroy();
            }
        }
        
        // Create a new graphics object for drawing
        const newGraphics = new PIXI.Graphics();
        this.drawnObjectsLayer.addChild(newGraphics);
        this.graphics = newGraphics;
        
        // Redraw all walls
        for (const wall of this.floorPlan.walls) {
            this.drawWall(wall);
        }
        
        // Redraw all rooms
        for (const room of this.floorPlan.rooms) {
            this.drawRoom(room);
        }
    }
    
    drawWall(wall) {
        const angle = wall.getAngle();
        const perpAngle = angle + Math.PI / 2;
        const halfThickness = wall.thickness / 2;
        
        const dx = Math.cos(perpAngle) * halfThickness;
        const dy = Math.sin(perpAngle) * halfThickness;
        
        this.graphics.beginFill(0xcccccc);
        this.graphics.lineStyle(1, 0x999999);
        this.graphics.moveTo(wall.a.x - dx, wall.a.y - dy);
        this.graphics.lineTo(wall.b.x - dx, wall.b.y - dy);
        this.graphics.lineTo(wall.b.x + dx, wall.b.y + dy);
        this.graphics.lineTo(wall.a.x + dx, wall.a.y + dy);
        this.graphics.closePath();
        this.graphics.endFill();
    }
    
    drawRoom(room) {
        if (room.points.length < 3) return;
        
        // First draw the room interior (light fill)
        this.graphics.beginFill(0xf0f0f0, 0.5);
        this.graphics.lineStyle(0);
        
        this.graphics.moveTo(room.points[0].x, room.points[0].y);
        for (let i = 1; i < room.points.length; i++) {
            this.graphics.lineTo(room.points[i].x, room.points[i].y);
        }
        this.graphics.closePath();
        this.graphics.endFill();
        
        // Draw black walls as a frame for rectangular rooms
        const wallThickness = 15;
        const halfThickness = wallThickness / 2;
        
        // For rectangular rooms, find the bounds
        const minX = Math.min(...room.points.map(p => p.x));
        const maxX = Math.max(...room.points.map(p => p.x));
        const minY = Math.min(...room.points.map(p => p.y));
        const maxY = Math.max(...room.points.map(p => p.y));
        
        // Draw walls as a black frame
        this.graphics.beginFill(0x000000);
        this.graphics.lineStyle(0);
        
        // Top wall
        this.graphics.drawRect(minX - halfThickness, minY - halfThickness, maxX - minX + wallThickness, wallThickness);
        // Bottom wall
        this.graphics.drawRect(minX - halfThickness, maxY - halfThickness, maxX - minX + wallThickness, wallThickness);
        // Left wall
        this.graphics.drawRect(minX - halfThickness, minY - halfThickness, wallThickness, maxY - minY + wallThickness);
        // Right wall
        this.graphics.drawRect(maxX - halfThickness, minY - halfThickness, wallThickness, maxY - minY + wallThickness);
        
        this.graphics.endFill();
        
        // Draw room label
        const centroid = this.calculateCentroid(room.points);
        const text = new PIXI.Text(room.name, {
            fontFamily: 'Arial',
            fontSize: 14,
            fill: 0x333333
        });
        text.x = centroid.x - text.width / 2;
        text.y = centroid.y - text.height / 2;
        this.graphics.addChild(text);
    }
    
    calculateCentroid(points) {
        let x = 0, y = 0;
        points.forEach(point => {
            x += point.x;
            y += point.y;
        });
        return {
            x: x / points.length,
            y: y / points.length
        };
    }
}

// Export the tool
window.DrawingTools = window.DrawingTools || {};
window.DrawingTools.SelectTool = SelectTool;