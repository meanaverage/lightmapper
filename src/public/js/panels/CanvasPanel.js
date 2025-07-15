import { BasePanel } from './BasePanel.js';

export class CanvasPanel extends BasePanel {
    constructor() {
        super('canvas', 'Floorplan Canvas', 'fa-draw-polygon');
        this.floorplanEditor = null;
        this.isInitialized = false;
    }

    init(container) {
        super.init(container);
        
        // Initialize the FloorplanEditor when ready
        if (window.FloorplanEditor) {
            this.floorplanEditor = new window.FloorplanEditor();
            this.isInitialized = true;
            
            // Set up event listeners for canvas events
            this.setupCanvasEventBridge();
        }
    }

    render() {
        // The canvas is already in the HTML, we just manage it
        this.container = document.getElementById('canvas-container');
    }

    setupCanvasEventBridge() {
        if (!this.floorplanEditor?.canvas) return;
        
        // Bridge canvas selection events to panel system
        this.floorplanEditor.canvas.on('selection:created', (e) => {
            this.onObjectSelected(e.selected[0]);
        });
        
        this.floorplanEditor.canvas.on('selection:updated', (e) => {
            this.onObjectSelected(e.selected[0]);
        });
        
        this.floorplanEditor.canvas.on('selection:cleared', () => {
            this.onObjectDeselected();
        });
        
        // Bridge light assignment events
        this.floorplanEditor.canvas.on('object:modified', (e) => {
            if (e.target.lightObject) {
                window.panelManager?.broadcast('onLightModified', { light: e.target });
            }
        });
    }

    onObjectSelected(object) {
        // Broadcast to other panels
        window.panelManager?.broadcast('onObjectSelected', { object });
        
        // Store reference
        this.floorplanEditor.selectedLight = object.lightObject ? object : null;
    }

    onObjectDeselected() {
        window.panelManager?.broadcast('onObjectDeselected', {});
        this.floorplanEditor.selectedLight = null;
    }

    // ===== PUBLIC API FOR OTHER PANELS =====
    
    /**
     * Get all lights from the canvas
     */
    getLights() {
        if (!this.floorplanEditor?.canvas) return [];
        
        return this.floorplanEditor.canvas.getObjects().filter(obj => obj.lightObject);
    }

    /**
     * Get all assigned entities from floorplan lights
     */
    getAssignedEntities() {
        const lights = this.getLights();
        const entities = [];
        const seenIds = new Set();
        
        lights.forEach(light => {
            if (light.entityId && !seenIds.has(light.entityId)) {
                seenIds.add(light.entityId);
                const entity = window.lightEntities?.[light.entityId];
                if (entity) {
                    entities.push(entity);
                }
            }
        });
        
        return entities;
    }

    /**
     * Find a light by entity ID
     */
    findLightByEntityId(entityId) {
        const lights = this.getLights();
        return lights.find(light => light.entityId === entityId);
    }

    /**
     * Select an object on the canvas
     */
    selectObject(object) {
        if (!this.floorplanEditor?.canvas) return;
        
        this.floorplanEditor.canvas.setActiveObject(object);
        this.floorplanEditor.canvas.renderAll();
    }

    /**
     * Center view on an object
     */
    centerOnObject(object) {
        if (!this.floorplanEditor?.canvas) return;
        
        const zoom = this.floorplanEditor.canvas.getZoom();
        const center = object.getCenterPoint();
        
        this.floorplanEditor.canvas.setViewportTransform([
            zoom, 0, 0, zoom,
            -center.x * zoom + this.floorplanEditor.canvas.getWidth() / 2,
            -center.y * zoom + this.floorplanEditor.canvas.getHeight() / 2
        ]);
    }

    /**
     * Assign an entity to a light
     */
    assignEntityToLight(light, entityId) {
        if (!light || !light.lightObject) return false;
        
        light.entityId = entityId;
        this.floorplanEditor?.updateLightFromEntity(light, entityId);
        
        // Broadcast the change
        window.panelManager?.broadcast('onLightEntityAssigned', { light, entityId });
        
        // Trigger auto-save
        this.floorplanEditor?.triggerAutoSave();
        
        return true;
    }

    /**
     * Update light appearance from scene settings
     */
    updateLightFromSceneSettings(entityId, settings) {
        const light = this.findLightByEntityId(entityId);
        if (!light) return;
        
        // Apply scene preview appearance
        this.floorplanEditor?.applySceneSettingsToLight(light, settings);
    }

    /**
     * Set the active tool
     */
    setTool(toolName) {
        if (this.floorplanEditor) {
            this.floorplanEditor.setTool(toolName);
        }
    }

    /**
     * Toggle grid visibility
     */
    toggleGrid() {
        if (this.floorplanEditor) {
            this.floorplanEditor.toggleGrid();
        }
    }

    /**
     * Toggle snap to grid
     */
    toggleSnap() {
        if (this.floorplanEditor) {
            this.floorplanEditor.toggleSnap();
        }
    }

    /**
     * Save floorplan layout
     */
    saveLayout() {
        if (this.floorplanEditor) {
            return this.floorplanEditor.saveLayout();
        }
        return null;
    }

    /**
     * Load floorplan layout
     */
    loadLayout(layoutData, callback) {
        if (this.floorplanEditor) {
            this.floorplanEditor.loadLayout(layoutData, callback);
        }
    }

    /**
     * Clear all objects from canvas
     */
    clearCanvas() {
        if (this.floorplanEditor?.canvas) {
            this.floorplanEditor.canvas.clear();
            this.floorplanEditor.lights = [];
            this.floorplanEditor.texts = [];
            this.floorplanEditor.canvas.renderAll();
        }
    }

    /**
     * Get canvas state for saving
     */
    getCanvasState() {
        if (!this.floorplanEditor?.canvas) return null;
        
        return {
            objects: this.floorplanEditor.canvas.toJSON([
                'lightObject', 'entityId', 'lightStyle', 
                'roomObject', 'roomOutline', 'roomName',
                'textObject', 'lineObject', 'backgroundImage'
            ]),
            viewport: this.floorplanEditor.canvas.viewportTransform,
            zoom: this.floorplanEditor.canvas.getZoom()
        };
    }

    /**
     * Set display mode (current state vs scene preview)
     */
    setDisplayMode(showCurrentState) {
        if (this.floorplanEditor) {
            this.floorplanEditor.setDisplayMode(showCurrentState);
        }
    }

    /**
     * Refresh all light states
     */
    refreshLightStates() {
        if (this.floorplanEditor) {
            this.floorplanEditor.refreshAllLightStates();
        }
    }

    /**
     * Show/hide network labels
     */
    showIPLabels() {
        if (this.floorplanEditor) {
            this.floorplanEditor.showIPLabels();
        }
    }

    showHostnameLabels() {
        if (this.floorplanEditor) {
            this.floorplanEditor.showHostnameLabels();
        }
    }

    showMACLabels() {
        if (this.floorplanEditor) {
            this.floorplanEditor.showMACLabels();
        }
    }

    clearNetworkLabels() {
        if (this.floorplanEditor) {
            this.floorplanEditor.clearAllNetworkLabels();
        }
    }

    /**
     * Get reference to the actual canvas
     */
    getCanvas() {
        return this.floorplanEditor?.canvas;
    }

    /**
     * Get reference to the floorplan editor
     */
    getEditor() {
        return this.floorplanEditor;
    }
}