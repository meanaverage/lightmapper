// Drawing tools for the floor planner

class DrawingTool {
    constructor(canvas, floorPlan, drawnObjectsLayer) {
        this.canvas = canvas;
        this.floorPlan = floorPlan;
        this.drawnObjectsLayer = drawnObjectsLayer; // Layer for permanent objects
        this.pixiApp = null;
        this.graphics = null; // For permanent drawn objects
        this.isActive = false;
        this.snapToGrid = true;
        this.gridSize = 20;
    }
    
    activate(pixiApp) {
        this.pixiApp = pixiApp;
        this.isActive = true;
        // Get or create graphics for this tool's permanent objects
        if (!this.graphics) {
            this.graphics = new PIXI.Graphics();
            if (this.drawnObjectsLayer) {
                this.drawnObjectsLayer.addChild(this.graphics);
            } else {
                // Fallback to stage if no layer provided
                this.pixiApp.stage.addChild(this.graphics);
            }
        }
    }
    
    deactivate() {
        this.isActive = false;
        // Keep the graphics layer - it contains our drawn walls/rooms
        // Only preview graphics should be cleared in subclasses
    }
    
    snapPoint(point) {
        if (!this.snapToGrid) return point;
        
        return {
            x: Math.round(point.x / this.gridSize) * this.gridSize,
            y: Math.round(point.y / this.gridSize) * this.gridSize
        };
    }
    
    getMousePosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        const point = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
        return this.snapPoint(point);
    }
}

class WallDrawingTool extends DrawingTool {
    constructor(canvas, floorPlan, drawnObjectsLayer) {
        super(canvas, floorPlan, drawnObjectsLayer);
        this.startPoint = null;
        this.tempWall = null;
        this.wallThickness = 15;
        this.previewGraphics = null;
    }
    
    activate(pixiApp) {
        super.activate(pixiApp);
        this.previewGraphics = new PIXI.Graphics();
        this.pixiApp.stage.addChild(this.previewGraphics);
        
        // Set up event listeners
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('mouseup', this.handleMouseUp);
        this.canvas.addEventListener('keydown', this.handleKeyDown);
    }
    
    deactivate() {
        // Remove event listeners
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        this.canvas.removeEventListener('mouseup', this.handleMouseUp);
        this.canvas.removeEventListener('keydown', this.handleKeyDown);
        
        if (this.previewGraphics) {
            this.pixiApp.stage.removeChild(this.previewGraphics);
            this.previewGraphics.destroy();
            this.previewGraphics = null;
        }
        
        this.startPoint = null;
        this.tempWall = null;
        
        super.deactivate();
    }
    
    handleMouseDown = (event) => {
        const pos = this.getMousePosition(event);
        
        if (!this.startPoint) {
            // First click - set start point
            this.startPoint = pos;
        } else {
            // Second click - create wall
            const wall = new window.FloorPlanModels.Wall(this.startPoint, pos, this.wallThickness);
            this.floorPlan.addWall(wall);
            this.drawWall(wall);
            
            // Start new wall from end point (chain walls)
            this.startPoint = pos;
            
            // Dispatch event for UI update
            window.dispatchEvent(new CustomEvent('wallAdded', { detail: { wall } }));
        }
    }
    
    handleMouseMove = (event) => {
        if (!this.startPoint) return;
        
        const pos = this.getMousePosition(event);
        this.drawPreview(this.startPoint, pos);
    }
    
    handleMouseUp = (event) => {
        // Optional: could finish wall on mouse up instead of requiring second click
    }
    
    handleKeyDown = (event) => {
        if (event.key === 'Escape') {
            this.startPoint = null;
            // Remove all children before clearing
            while (this.previewGraphics.children.length > 0) {
                const child = this.previewGraphics.children[0];
                this.previewGraphics.removeChild(child);
                if (child.destroy) {
                    child.destroy();
                }
            }
            this.previewGraphics.clear();
        }
    }
    
    drawPreview(start, end) {
        if (!this.previewGraphics) return;
        
        // Remove all children (text labels) before clearing
        while (this.previewGraphics.children.length > 0) {
            const child = this.previewGraphics.children[0];
            this.previewGraphics.removeChild(child);
            if (child.destroy) {
                child.destroy();
            }
        }
        
        this.previewGraphics.clear();
        
        // Draw wall preview
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const perpAngle = angle + Math.PI / 2;
        const halfThickness = this.wallThickness / 2;
        
        // Calculate wall corners
        const dx = Math.cos(perpAngle) * halfThickness;
        const dy = Math.sin(perpAngle) * halfThickness;
        
        this.previewGraphics.beginFill(0x666666, 0.5);
        this.previewGraphics.moveTo(start.x - dx, start.y - dy);
        this.previewGraphics.lineTo(end.x - dx, end.y - dy);
        this.previewGraphics.lineTo(end.x + dx, end.y + dy);
        this.previewGraphics.lineTo(start.x + dx, start.y + dy);
        this.previewGraphics.closePath();
        this.previewGraphics.endFill();
        
        // Draw dimension line
        const length = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
        const midPoint = {
            x: (start.x + end.x) / 2,
            y: (start.y + end.y) / 2
        };
        
        if (length > 20) {
            // Create background for text
            const padding = 4;
            const textStyle = {
                fontFamily: 'Arial',
                fontSize: 12,
                fill: 0x333333
            };
            
            const text = new PIXI.Text(`${Math.round(length)}cm`, textStyle);
            
            // Create white background
            const bg = new PIXI.Graphics();
            bg.beginFill(0xffffff, 0.9);
            bg.drawRoundedRect(
                -padding, 
                -padding, 
                text.width + padding * 2, 
                text.height + padding * 2, 
                3
            );
            bg.endFill();
            
            // Create container for background and text
            const labelContainer = new PIXI.Container();
            labelContainer.addChild(bg);
            labelContainer.addChild(text);
            
            // Position the container
            labelContainer.x = midPoint.x - text.width / 2;
            labelContainer.y = midPoint.y - text.height / 2;
            
            this.previewGraphics.addChild(labelContainer);
        }
    }
    
    drawWall(wall) {
        if (!this.graphics) return;
        
        const angle = wall.getAngle();
        const perpAngle = angle + Math.PI / 2;
        const halfThickness = wall.thickness / 2;
        
        // Calculate wall corners
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
}

class RoomDrawingTool extends DrawingTool {
    constructor(canvas, floorPlan, drawnObjectsLayer) {
        super(canvas, floorPlan, drawnObjectsLayer);
        this.points = [];
        this.tempRoom = null;
        this.previewGraphics = null;
    }
    
    activate(pixiApp) {
        super.activate(pixiApp);
        this.previewGraphics = new PIXI.Graphics();
        this.pixiApp.stage.addChild(this.previewGraphics);
        
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('keydown', this.handleKeyDown);
        this.canvas.addEventListener('dblclick', this.handleDoubleClick);
    }
    
    deactivate() {
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        this.canvas.removeEventListener('keydown', this.handleKeyDown);
        this.canvas.removeEventListener('dblclick', this.handleDoubleClick);
        
        if (this.previewGraphics) {
            this.pixiApp.stage.removeChild(this.previewGraphics);
            this.previewGraphics.destroy();
            this.previewGraphics = null;
        }
        
        this.points = [];
        this.tempRoom = null;
        
        super.deactivate();
    }
    
    handleMouseDown = (event) => {
        const pos = this.getMousePosition(event);
        
        // Add point to room
        this.points.push(pos);
        
        if (this.points.length >= 3) {
            // Check if clicking near first point to close room
            const dist = Math.sqrt(
                (pos.x - this.points[0].x) ** 2 + 
                (pos.y - this.points[0].y) ** 2
            );
            
            if (dist < 20) {
                this.finishRoom();
            }
        }
    }
    
    handleMouseMove = (event) => {
        if (this.points.length === 0) return;
        
        const pos = this.getMousePosition(event);
        this.drawPreview([...this.points, pos]);
    }
    
    handleDoubleClick = (event) => {
        if (this.points.length >= 3) {
            this.finishRoom();
        }
    }
    
    handleKeyDown = (event) => {
        if (event.key === 'Escape') {
            this.points = [];
            this.previewGraphics.clear();
        } else if (event.key === 'Enter' && this.points.length >= 3) {
            this.finishRoom();
        }
    }
    
    drawPreview(points) {
        if (!this.previewGraphics) return;
        
        this.previewGraphics.clear();
        
        if (points.length < 2) return;
        
        // Draw room preview
        this.previewGraphics.beginFill(0x4a90e2, 0.3);
        this.previewGraphics.lineStyle(2, 0x4a90e2);
        
        this.previewGraphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            this.previewGraphics.lineTo(points[i].x, points[i].y);
        }
        
        if (points.length >= 3) {
            this.previewGraphics.lineTo(points[0].x, points[0].y);
        }
        
        this.previewGraphics.endFill();
        
        // Draw points
        points.forEach((point, index) => {
            this.previewGraphics.beginFill(0xffffff);
            this.previewGraphics.lineStyle(2, 0x4a90e2);
            this.previewGraphics.drawCircle(point.x, point.y, 4);
            this.previewGraphics.endFill();
        });
    }
    
    finishRoom() {
        if (this.points.length < 3) return;
        
        const room = new window.FloorPlanModels.Room('New Room');
        this.points.forEach(point => room.addPoint(point));
        
        this.floorPlan.addRoom(room);
        this.drawRoom(room);
        
        // Reset for next room
        this.points = [];
        this.previewGraphics.clear();
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('roomAdded', { detail: { room } }));
    }
    
    drawRoom(room) {
        if (!this.graphics || room.points.length < 3) return;
        
        this.graphics.beginFill(0xf0f0f0, 0.5);
        this.graphics.lineStyle(1, 0x999999);
        
        this.graphics.moveTo(room.points[0].x, room.points[0].y);
        for (let i = 1; i < room.points.length; i++) {
            this.graphics.lineTo(room.points[i].x, room.points[i].y);
        }
        this.graphics.closePath();
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

// Export tools
window.DrawingTools = {
    WallDrawingTool,
    RoomDrawingTool
};