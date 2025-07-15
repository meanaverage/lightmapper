import { BasePanel } from './BasePanel.js';

/**
 * Canvas Panel - Provides a clean API for interacting with the Fabric.js floorplan editor
 * @class CanvasPanel
 * @extends BasePanel
 * @description This panel wraps the FloorplanEditor to provide a technology-agnostic API
 * that other panels can use to interact with the canvas without direct Fabric.js dependency.
 */
export class CanvasPanel extends BasePanel {
    /**
     * Creates a new CanvasPanel instance
     * @constructor
     */
    constructor() {
        super('canvas', 'Floorplan Canvas', 'fa-draw-polygon');
        /** @type {FloorplanEditor|null} The wrapped floorplan editor instance */
        this.floorplanEditor = null;
        /** @type {boolean} Whether the panel has been initialized */
        this.isInitialized = false;
    }

    init(container) {
        super.init(container);
        
        // Use the global floorplanEditor instance if it exists
        if (window.floorplanEditor) {
            this.floorplanEditor = window.floorplanEditor;
            this.isInitialized = true;
            
            // Set up event listeners for canvas events
            this.setupCanvasEventBridge();
            
            console.log('✅ CanvasPanel using existing FloorplanEditor');
        } else {
            console.warn('⚠️ FloorplanEditor not found, waiting for initialization');
            
            // Wait for floorplanEditor to be created
            const checkInterval = setInterval(() => {
                if (window.floorplanEditor) {
                    this.floorplanEditor = window.floorplanEditor;
                    this.isInitialized = true;
                    this.setupCanvasEventBridge();
                    console.log('✅ CanvasPanel connected to FloorplanEditor');
                    clearInterval(checkInterval);
                }
            }, 100);
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
        // Prevent circular broadcasts by checking if we're already broadcasting
        if (this._broadcasting) return;
        
        this._broadcasting = true;
        
        // Broadcast to other panels
        window.panelManager?.broadcast('onObjectSelected', { object });
        
        // Store reference
        this.floorplanEditor.selectedLight = object.lightObject ? object : null;
        
        this._broadcasting = false;
    }

    onObjectDeselected() {
        // Prevent circular broadcasts by checking if we're already broadcasting
        if (this._broadcasting) return;
        
        this._broadcasting = true;
        window.panelManager?.broadcast('onObjectDeselected', {});
        this.floorplanEditor.selectedLight = null;
        this._broadcasting = false;
    }

    // ===== PUBLIC API FOR OTHER PANELS =====
    
    /**
     * Get the canvas instance
     * @returns {fabric.Canvas|null} The fabric canvas instance
     */
    getCanvas() {
        return this.floorplanEditor?.canvas || null;
    }
    
    /**
     * Get the floorplan editor instance
     * @returns {FloorplanEditor|null} The floorplan editor instance
     */
    getEditor() {
        return this.floorplanEditor;
    }
    
    /**
     * Get all lights from the canvas
     * @returns {Array<Object>} Array of light objects with their properties
     * @returns {string} [].entityId - The assigned Home Assistant entity ID
     * @returns {boolean} [].lightObject - Flag indicating this is a light
     * @returns {number} [].left - X position
     * @returns {number} [].top - Y position
     */
    getLights() {
        if (!this.floorplanEditor?.canvas) return [];
        
        return this.floorplanEditor.canvas.getObjects().filter(obj => obj.lightObject);
    }

    /**
     * Get all assigned entities from floorplan lights
     * @returns {Array<Object>} Array of Home Assistant entity objects
     * @returns {string} [].entity_id - The entity ID
     * @returns {string} [].friendly_name - Human-readable name
     * @returns {string} [].state - Current state (on/off)
     * @returns {Object} [].attributes - Entity attributes (brightness, color, etc.)
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
     * @param {string} entityId - The Home Assistant entity ID to search for
     * @returns {Object|undefined} The light object if found, undefined otherwise
     */
    findLightByEntityId(entityId) {
        const lights = this.getLights();
        return lights.find(light => light.entityId === entityId);
    }

    /**
     * Select an object on the canvas
     * @param {Object} object - The fabric object to select
     * @fires onObjectSelected - Broadcasts selection to all panels
     */
    selectObject(object) {
        if (!this.floorplanEditor?.canvas) return;
        
        this.floorplanEditor.canvas.setActiveObject(object);
        this.floorplanEditor.canvas.renderAll();
    }

    /**
     * Center view on an object
     * @param {Object} object - The fabric object to center on
     * @description Adjusts the viewport to center the specified object in view
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
     * @param {Object} light - The light object to assign to
     * @param {string} entityId - The Home Assistant entity ID
     * @returns {boolean} True if assignment was successful
     * @fires onLightEntityAssigned - Notifies panels of the assignment
     */
    assignEntityToLight(light, entityId) {
        if (!light || !light.lightObject) return false;
        
        light.entityId = entityId;
        // Find the entity and update the light
        const entity = window.lightEntities?.[entityId];
        if (entity) {
            this.floorplanEditor?.updateLightVisualState(light, entity);
        }
        
        // Broadcast the change
        window.panelManager?.broadcast('onLightEntityAssigned', { light, entityId });
        
        // Trigger auto-save
        this.floorplanEditor?.triggerAutoSave();
        
        return true;
    }

    /**
     * Update light appearance from scene settings
     * @param {string} entityId - The entity ID of the light to update
     * @param {Object} settings - Scene settings to apply
     * @param {number} [settings.brightness] - Brightness percentage (0-100)
     * @param {number} [settings.kelvin] - Color temperature in Kelvin
     * @param {Object} [settings.color] - Color settings
     * @param {number} settings.color.hue - Hue value (0-360)
     * @param {number} settings.color.saturation - Saturation percentage (0-100)
     */
    updateLightFromSceneSettings(entityId, settings) {
        const light = this.findLightByEntityId(entityId);
        if (!light) return;
        
        // Apply scene preview appearance
        this.floorplanEditor?.applySceneSettingsToLight(light, settings);
    }

    /**
     * Set the active tool
     * @param {string} toolName - The tool to activate: 'select', 'light', 'room', 'line', 'text'
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
     * @returns {Object|null} The serialized layout data or null if not available
     */
    saveLayout() {
        if (this.floorplanEditor) {
            return this.floorplanEditor.saveLayout();
        }
        return null;
    }

    /**
     * Load floorplan layout
     * @param {Object} layoutData - The layout data to load
     * @param {Function} [callback] - Optional callback when loading is complete
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
     * @returns {Object|null} Canvas state including objects, viewport, and zoom
     * @returns {Array} .objects - Serialized canvas objects
     * @returns {Array} .viewport - Current viewport transform
     * @returns {number} .zoom - Current zoom level
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
     * @param {boolean} showCurrentState - True to show current state, false for scene preview
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
    
    /**
     * Find object by ID
     * @param {number} objectId - The object ID
     * @returns {fabric.Object|null} The object or null if not found
     */
    findObjectById(objectId) {
        if (!this.floorplanEditor?.canvas) return null;
        
        return this.floorplanEditor.canvas.getObjects().find(obj => obj.id === objectId);
    }
    
    /**
     * Set object visibility
     * @param {fabric.Object} obj - The object
     * @param {boolean} visible - Whether the object should be visible
     */
    setObjectVisibility(obj, visible) {
        if (!obj) return;
        
        obj.visible = visible;
        obj.evented = visible;
        
        this.floorplanEditor.canvas.renderAll();
    }
    
    /**
     * Set object locked state
     * @param {fabric.Object} obj - The object
     * @param {boolean} locked - Whether the object should be locked
     */
    setObjectLocked(obj, locked) {
        if (!obj) return;
        
        obj.selectable = !locked;
        obj.evented = !locked;
        
        // If object is currently selected and we're locking it, deselect it
        if (locked && this.floorplanEditor.canvas.getActiveObject() === obj) {
            this.floorplanEditor.canvas.discardActiveObject();
        }
        
        this.floorplanEditor.canvas.renderAll();
    }
    
    /**
     * Delete object from canvas
     * @param {fabric.Object} obj - The object to delete
     */
    deleteObject(obj) {
        if (!obj || !this.floorplanEditor?.canvas) return;
        
        this.floorplanEditor.canvas.remove(obj);
        this.floorplanEditor.canvas.renderAll();
    }
}