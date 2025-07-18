// Core data models for the floor planner

// Wall model
class Wall {
    constructor(startPoint, endPoint, thickness = 15) {
        this.id = `wall_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.a = { x: startPoint.x, y: startPoint.y }; // Start point
        this.b = { x: endPoint.x, y: endPoint.y };     // End point
        this.thickness = thickness;
        this.height = 250; // Default wall height in cm
        this.openings = []; // Doors and windows
        this.material = null;
        this.color = '#ffffff';
    }
    
    addOpening(opening) {
        opening.wallId = this.id;
        this.openings.push(opening);
    }
    
    removeOpening(openingId) {
        this.openings = this.openings.filter(o => o.id !== openingId);
    }
    
    getLength() {
        const dx = this.b.x - this.a.x;
        const dy = this.b.y - this.a.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    getAngle() {
        return Math.atan2(this.b.y - this.a.y, this.b.x - this.a.x);
    }
    
    getMidpoint() {
        return {
            x: (this.a.x + this.b.x) / 2,
            y: (this.a.y + this.b.y) / 2
        };
    }
}

// Opening model (doors and windows)
class Opening {
    constructor(type, width, height, position = 0.5) {
        this.id = `opening_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.type = type; // 'door' or 'window'
        this.width = width;
        this.height = height;
        this.position = position; // 0-1 position along wall
        this.wallId = null;
        this.z = type === 'window' ? 90 : 0; // Window sill height
        this.direction = 'left'; // Door swing direction
        this.asset = null; // 3D model reference
    }
}

// Room model
class Room {
    constructor(name = 'Room') {
        this.id = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.name = name;
        this.points = []; // Polygon points defining room boundary
        this.area = 0;
        this.height = 250;
        this.floorMaterial = null;
        this.ceilingMaterial = null;
        this.furniture = [];
    }
    
    addPoint(point) {
        this.points.push({ x: point.x, y: point.y });
        this.updateArea();
    }
    
    updateArea() {
        if (this.points.length < 3) {
            this.area = 0;
            return;
        }
        
        // Calculate area using shoelace formula
        let area = 0;
        for (let i = 0; i < this.points.length; i++) {
            const j = (i + 1) % this.points.length;
            area += this.points[i].x * this.points[j].y;
            area -= this.points[j].x * this.points[i].y;
        }
        this.area = Math.abs(area) / 2;
    }
}

// Floor plan model
class FloorPlan {
    constructor(name = 'New Floor') {
        this.id = `floor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.name = name;
        this.walls = [];
        this.rooms = [];
        this.dimensions = { width: 1000, height: 800 }; // Canvas dimensions
        this.gridSize = 20; // Grid size in pixels
        this.scale = 1; // 1 pixel = 1cm
        this.furniture = [];
        this.labels = [];
    }
    
    addWall(wall) {
        this.walls.push(wall);
        return wall;
    }
    
    removeWall(wallId) {
        this.walls = this.walls.filter(w => w.id !== wallId);
    }
    
    addRoom(room) {
        this.rooms.push(room);
        return room;
    }
    
    removeRoom(roomId) {
        this.rooms = this.rooms.filter(r => r.id !== roomId);
    }
    
    findWallAt(point, tolerance = 5) {
        for (const wall of this.walls) {
            const distance = this.distanceToLineSegment(point, wall.a, wall.b);
            if (distance <= tolerance) {
                return wall;
            }
        }
        return null;
    }
    
    distanceToLineSegment(point, a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const lengthSquared = dx * dx + dy * dy;
        
        if (lengthSquared === 0) {
            return Math.sqrt((point.x - a.x) ** 2 + (point.y - a.y) ** 2);
        }
        
        let t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared;
        t = Math.max(0, Math.min(1, t));
        
        const projection = {
            x: a.x + t * dx,
            y: a.y + t * dy
        };
        
        return Math.sqrt((point.x - projection.x) ** 2 + (point.y - projection.y) ** 2);
    }
    
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            walls: this.walls,
            rooms: this.rooms,
            dimensions: this.dimensions,
            gridSize: this.gridSize,
            scale: this.scale,
            furniture: this.furniture,
            labels: this.labels
        };
    }
    
    static fromJSON(json) {
        const floorPlan = new FloorPlan(json.name);
        floorPlan.id = json.id;
        floorPlan.walls = json.walls.map(w => {
            const wall = new Wall(w.a, w.b, w.thickness);
            Object.assign(wall, w);
            return wall;
        });
        floorPlan.rooms = json.rooms.map(r => {
            const room = new Room(r.name);
            Object.assign(room, r);
            return room;
        });
        floorPlan.dimensions = json.dimensions;
        floorPlan.gridSize = json.gridSize;
        floorPlan.scale = json.scale;
        floorPlan.furniture = json.furniture;
        floorPlan.labels = json.labels;
        return floorPlan;
    }
}

// Export classes
window.FloorPlanModels = {
    Wall,
    Opening,
    Room,
    FloorPlan
};