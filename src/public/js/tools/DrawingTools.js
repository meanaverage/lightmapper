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
        
        // Debug logging - expanded
        const debugInfo = {
            event: { clientX: event.clientX, clientY: event.clientY },
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
            stage: {
                position: this.pixiApp.stage.position,
                scale: this.pixiApp.stage.scale,
                pivot: this.pixiApp.stage.pivot
            }
        };
        
        console.log('🎯 getMousePosition debug:', debugInfo);
        
        return this.snapPoint({
            x: worldX,
            y: worldY
        });
    }
}

class WallDrawingTool extends DrawingTool {
    constructor(canvas, floorPlan, drawnObjectsLayer) {
        super(canvas, floorPlan, drawnObjectsLayer);
        this.startPoint = null;
        this.tempWall = null;
        this.wallThickness = 15;
        this.wallHeight = 274; // Default 9'
        this.raiseFromFloor = 0;
        this.previewGraphics = null;
    }
    
    setWallProperties(properties) {
        this.wallThickness = properties.thickness || 15;
        this.wallHeight = properties.height || 274;
        this.raiseFromFloor = properties.raiseFromFloor || 0;
    }
    
    activate(pixiApp) {
        super.activate(pixiApp);
        this.previewGraphics = new PIXI.Graphics();
        this.pixiApp.stage.addChild(this.previewGraphics);
        
        // Set up event listeners
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('mouseup', this.handleMouseUp);
        document.addEventListener('keydown', this.handleKeyDown);
    }
    
    deactivate() {
        // Remove event listeners
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        this.canvas.removeEventListener('mouseup', this.handleMouseUp);
        document.removeEventListener('keydown', this.handleKeyDown);
        
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
            // Set additional properties
            wall.height = this.wallHeight;
            wall.raiseFromFloor = this.raiseFromFloor;
            
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
            event.preventDefault();
            event.stopPropagation();
            
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
            
            // Clear the status message and reset UI
            if (window.plannerModal) {
                window.plannerModal.setStatus('');
                window.plannerModal.resetToolUI();
                window.plannerModal.activeTool = 'select';
            }
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
        this.startPoint = null;
        this.previewGraphics = null;
    }
    
    activate(pixiApp) {
        super.activate(pixiApp);
        this.previewGraphics = new PIXI.Graphics();
        this.pixiApp.stage.addChild(this.previewGraphics);
        
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('keydown', this.handleKeyDown);
    }
    
    deactivate() {
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('keydown', this.handleKeyDown);
        
        if (this.previewGraphics) {
            this.pixiApp.stage.removeChild(this.previewGraphics);
            this.previewGraphics.destroy();
            this.previewGraphics = null;
        }
        
        this.startPoint = null;
        
        super.deactivate();
    }
    
    handleMouseDown = (event) => {
        const pos = this.getMousePosition(event);
        
        // Debug logging
        console.log('🔴 Room tool mouse down:', {
            eventX: event.clientX,
            eventY: event.clientY,
            calculatedPos: pos,
            startPoint: this.startPoint,
            canvas: {
                width: this.canvas.width,
                height: this.canvas.height,
                rect: this.canvas.getBoundingClientRect()
            }
        });
        
        if (!this.startPoint) {
            // First click - set start corner
            this.startPoint = pos;
            console.log('📍 Room start point set:', this.startPoint);
        } else {
            // Second click - create rectangular room
            console.log('📦 Creating room from', this.startPoint, 'to', pos);
            this.createRectangularRoom(this.startPoint, pos);
            this.startPoint = null;
            // Clear preview graphics properly
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
    
    handleMouseMove = (event) => {
        if (!this.startPoint) return;
        
        const pos = this.getMousePosition(event);
        this.drawRectanglePreview(this.startPoint, pos);
    }
    
    handleKeyDown = (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            
            this.startPoint = null;
            // Clear preview graphics properly
            while (this.previewGraphics.children.length > 0) {
                const child = this.previewGraphics.children[0];
                this.previewGraphics.removeChild(child);
                if (child.destroy) {
                    child.destroy();
                }
            }
            this.previewGraphics.clear();
            
            // Clear the status message and reset UI
            if (window.plannerModal) {
                window.plannerModal.setStatus('');
                window.plannerModal.resetToolUI();
                window.plannerModal.activeTool = 'select';
            }
        }
    }
    
    drawRectanglePreview(start, end) {
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
        
        // Create rectangle points
        const points = [
            { x: start.x, y: start.y },     // Top-left
            { x: end.x, y: start.y },       // Top-right
            { x: end.x, y: end.y },         // Bottom-right
            { x: start.x, y: end.y }        // Bottom-left
        ];
        
        // Draw room with black walls (similar to the final room appearance)
        // First draw the light fill
        this.previewGraphics.beginFill(0xf0f0f0, 0.5);
        this.previewGraphics.lineStyle(0);
        this.previewGraphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            this.previewGraphics.lineTo(points[i].x, points[i].y);
        }
        this.previewGraphics.closePath();
        this.previewGraphics.endFill();
        
        // Draw black walls as a frame (simple approach for rectangles)
        const wallThickness = 15;
        const halfThickness = wallThickness / 2;
        
        // Calculate the bounds
        const minX = Math.min(start.x, end.x);
        const maxX = Math.max(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const maxY = Math.max(start.y, end.y);
        
        // Draw walls as a black frame
        this.previewGraphics.beginFill(0x000000);
        this.previewGraphics.lineStyle(0);
        
        // Top wall
        this.previewGraphics.drawRect(minX - halfThickness, minY - halfThickness, maxX - minX + wallThickness, wallThickness);
        // Bottom wall
        this.previewGraphics.drawRect(minX - halfThickness, maxY - halfThickness, maxX - minX + wallThickness, wallThickness);
        // Left wall
        this.previewGraphics.drawRect(minX - halfThickness, minY - halfThickness, wallThickness, maxY - minY + wallThickness);
        // Right wall
        this.previewGraphics.drawRect(maxX - halfThickness, minY - halfThickness, wallThickness, maxY - minY + wallThickness);
        
        this.previewGraphics.endFill();
        
        // Draw dimension labels for all four sides
        const sides = [
            { start: points[0], end: points[1] }, // Top
            { start: points[1], end: points[2] }, // Right
            { start: points[2], end: points[3] }, // Bottom
            { start: points[3], end: points[0] }  // Left
        ];
        
        sides.forEach((side, index) => {
            const length = Math.sqrt(
                (side.end.x - side.start.x) ** 2 + 
                (side.end.y - side.start.y) ** 2
            );
            
            if (length < 20) return; // Skip very short segments
            
            // Calculate midpoint
            const midX = (side.start.x + side.end.x) / 2;
            const midY = (side.start.y + side.end.y) / 2;
            
            // Calculate angle for text rotation
            const angle = Math.atan2(side.end.y - side.start.y, side.end.x - side.start.x);
            
            // Format dimension text
            const inches = length * 0.393701; // Convert to inches
            const feet = Math.floor(inches / 12);
            const remainingInches = Math.round(inches % 12);
            const fraction = this.getInchFraction(inches % 1);
            
            let dimensionText;
            if (feet > 0) {
                if (remainingInches > 0) {
                    dimensionText = fraction ? 
                        `${feet}' ${Math.floor(remainingInches)} ${fraction}"` : 
                        `${feet}' ${remainingInches}"`;
                } else {
                    dimensionText = `${feet}'`;
                }
            } else {
                dimensionText = fraction ? 
                    `${Math.floor(inches)} ${fraction}"` : 
                    `${Math.round(inches)}"`;
            }
            
            // Create dimension label
            const textStyle = {
                fontFamily: 'Arial',
                fontSize: 12,
                fill: 0x333333,
                align: 'center'
            };
            
            const text = new PIXI.Text(dimensionText, textStyle);
            
            // Position text offset from the line (inside for horizontal, outside for vertical)
            const offsetDistance = index % 2 === 0 ? -20 : 30; // Negative for top/bottom (inside)
            const perpAngle = angle + Math.PI / 2;
            const offsetX = Math.cos(perpAngle) * offsetDistance;
            const offsetY = Math.sin(perpAngle) * offsetDistance;
            
            // Draw dimension line (lighter blue/gray)
            this.previewGraphics.lineStyle(1, 0x999999, 0.3);
            
            // Extension lines (only for outside dimensions)
            if (index % 2 === 1) {
                const extLength = 35;
                const extX = Math.cos(perpAngle) * extLength;
                const extY = Math.sin(perpAngle) * extLength;
                
                this.previewGraphics.moveTo(side.start.x, side.start.y);
                this.previewGraphics.lineTo(side.start.x + extX, side.start.y + extY);
                
                this.previewGraphics.moveTo(side.end.x, side.end.y);
                this.previewGraphics.lineTo(side.end.x + extX, side.end.y + extY);
                
                // Dimension line
                const dimLineOffset = 30;
                const dimX = Math.cos(perpAngle) * dimLineOffset;
                const dimY = Math.sin(perpAngle) * dimLineOffset;
                
                this.previewGraphics.moveTo(side.start.x + dimX, side.start.y + dimY);
                this.previewGraphics.lineTo(side.end.x + dimX, side.end.y + dimY);
            }
            
            // Create container for background and text
            const labelContainer = new PIXI.Container();
            
            // Create white background
            const padding = 4;
            const bg = new PIXI.Graphics();
            bg.beginFill(0xffffff, 0.9);
            bg.drawRoundedRect(
                -text.width / 2 - padding,
                -text.height / 2 - padding,
                text.width + padding * 2,
                text.height + padding * 2,
                3
            );
            bg.endFill();
            
            // Center the text
            text.anchor.set(0.5);
            
            labelContainer.addChild(bg);
            labelContainer.addChild(text);
            
            // Position the container
            labelContainer.x = midX + offsetX;
            labelContainer.y = midY + offsetY;
            
            // Rotate text to be readable
            if (Math.abs(angle) > Math.PI / 2) {
                labelContainer.rotation = angle + Math.PI;
            } else {
                labelContainer.rotation = angle;
            }
            
            this.previewGraphics.addChild(labelContainer);
        });
        
        // No corner points needed for room preview
    }
    
    getInchFraction(decimal) {
        const fractions = [
            { decimal: 0.125, str: '1/8' },
            { decimal: 0.25, str: '1/4' },
            { decimal: 0.375, str: '3/8' },
            { decimal: 0.5, str: '1/2' },
            { decimal: 0.625, str: '5/8' },
            { decimal: 0.75, str: '3/4' },
            { decimal: 0.875, str: '7/8' }
        ];
        
        for (const f of fractions) {
            if (Math.abs(decimal - f.decimal) < 0.0625) {
                return f.str;
            }
        }
        return '';
    }
    
    createRectangularRoom(start, end) {
        // Create rectangle points
        const points = [
            { x: start.x, y: start.y },     // Top-left
            { x: end.x, y: start.y },       // Top-right
            { x: end.x, y: end.y },         // Bottom-right
            { x: start.x, y: end.y }        // Bottom-left
        ];
        
        const room = new window.FloorPlanModels.Room('New Room');
        points.forEach(point => room.addPoint(point));
        
        this.floorPlan.addRoom(room);
        this.drawRoom(room);
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('roomAdded', { detail: { room } }));
    }
    
    drawRoom(room) {
        if (!this.graphics || room.points.length < 3) return;
        
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

// Export tools
window.DrawingTools = {
    WallDrawingTool,
    RoomDrawingTool
};