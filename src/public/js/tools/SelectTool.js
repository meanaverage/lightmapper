// Selection tool for the floor planner

class SelectTool extends DrawingTool {
    constructor(canvas, floorPlan, drawnObjectsLayer) {
        super(canvas, floorPlan, drawnObjectsLayer);
        this.selectedObject = null;
        this.selectionGraphics = null;
        this.isDragging = false;
        this.dragStart = null;
        this.dragOffset = null;
        this.hoverObject = null;
        this.handles = [];
    }
    
    activate(pixiApp) {
        super.activate(pixiApp);
        
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
        
        // Reset cursor
        this.canvas.style.cursor = 'default';
        
        super.deactivate();
    }
    
    handleMouseDown = (event) => {
        const pos = this.getMousePosition(event);
        
        // Check if clicking on a handle
        const handle = this.getHandleAt(pos);
        if (handle) {
            this.startHandleDrag(handle, pos);
            return;
        }
        
        // Check if clicking on selected object (to drag)
        if (this.selectedObject && this.isPointOnObject(pos, this.selectedObject)) {
            this.startDrag(pos);
            return;
        }
        
        // Otherwise, try to select an object
        const object = this.getObjectAt(pos);
        if (object) {
            this.selectObject(object);
        } else {
            this.clearSelection();
        }
    }
    
    handleMouseMove = (event) => {
        const pos = this.getMousePosition(event);
        
        if (this.isDragging && this.selectedObject) {
            // Drag the selected object
            const dx = pos.x - this.dragStart.x;
            const dy = pos.y - this.dragStart.y;
            
            if (this.selectedObject.type === 'wall') {
                // Update wall position
                this.selectedObject.a.x = this.dragOffset.a.x + dx;
                this.selectedObject.a.y = this.dragOffset.a.y + dy;
                this.selectedObject.b.x = this.dragOffset.b.x + dx;
                this.selectedObject.b.y = this.dragOffset.b.y + dy;
            } else if (this.selectedObject.type === 'room') {
                // Update room points
                this.selectedObject.points.forEach((point, index) => {
                    point.x = this.dragOffset[index].x + dx;
                    point.y = this.dragOffset[index].y + dy;
                });
            }
            
            this.redrawAll();
            this.updateSelection();
        } else {
            // Update hover state and cursor
            const object = this.getObjectAt(pos);
            const handle = this.getHandleAt(pos);
            
            if (handle) {
                this.canvas.style.cursor = 'pointer';
            } else if (object) {
                this.canvas.style.cursor = 'move';
            } else {
                this.canvas.style.cursor = 'default';
            }
        }
    }
    
    handleMouseUp = (event) => {
        this.isDragging = false;
        this.dragStart = null;
        this.dragOffset = null;
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
        // TODO: Implement handle dragging for resizing
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
        // Clear the drawn objects layer
        this.graphics.clear();
        
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
        
        this.graphics.beginFill(0xf0f0f0, 0.5);
        this.graphics.lineStyle(1, 0x999999);
        
        this.graphics.moveTo(room.points[0].x, room.points[0].y);
        for (let i = 1; i < room.points.length; i++) {
            this.graphics.lineTo(room.points[i].x, room.points[i].y);
        }
        this.graphics.closePath();
        this.graphics.endFill();
    }
}

// Export the tool
window.DrawingTools = window.DrawingTools || {};
window.DrawingTools.SelectTool = SelectTool;