/**
 * Panel Manager - Central registry and coordinator for all panels
 * @class PanelManager
 * @description Manages panel registration, initialization, visibility, and inter-panel communication
 * through an event broadcasting system.
 */
export class PanelManager {
    /**
     * Creates a new PanelManager instance
     * @constructor
     */
    constructor() {
        /** @type {Map<string, BasePanel>} Registry of all panels */
        this.panels = new Map();
        /** @type {string|null} ID of the currently active panel */
        this.activePanel = null;
        /** @type {Map<string, HTMLElement>} Map of panel IDs to their container elements */
        this.panelContainers = new Map();
        /** @type {Map<string, string>} Map of panel IDs to their dock positions */
        this.dockPositions = new Map();
        
        // Define default dock positions for panels
        this.defaultDockPositions = {
            // Left sidebar panels
            'lights': 'left',
            'liveState': 'left',
            'layers': 'left',
            'debug': 'left',
            
            // Right sidebar panels
            'properties': 'right',
            'scenes': 'right',
            'sceneEditor': 'right',
            
            // Bottom panels
            'entities': 'bottom',
            
            // Main area
            'canvas': 'main'
        };
    }

    /**
     * Register a panel with the manager
     * @param {BasePanel} panel - The panel instance to register
     * @throws {Error} If panel doesn't have required id and title properties
     */
    register(panel) {
        if (!panel.id || !panel.title) {
            throw new Error('Panel must have id and title properties');
        }
        
        this.panels.set(panel.id, panel);
        console.log(`📦 Registered panel: ${panel.id}`);
    }

    /**
     * Initialize all registered panels
     * @description Sets up panel containers, initializes each panel, and sets up tab switching
     */
    init() {
        // Setup dock containers
        this.setupDockContainers();
        
        // Initialize panel containers from the sidebar
        this.setupPanelContainers();
        
        // Initialize all registered panels
        this.panels.forEach((panel, id) => {
            const container = this.panelContainers.get(id);
            if (container) {
                panel.init(container);
                // Set dock position
                const dockPosition = this.defaultDockPositions[id] || 'left';
                this.dockPositions.set(id, dockPosition);
                console.log(`✅ Initialized panel: ${id} in dock: ${dockPosition}`);
            } else {
                console.warn(`⚠️ No container found for panel: ${id}`);
            }
        });
        
        // Setup tab switching
        this.setupTabSwitching();
        
        // Show the first panel by default (lights/scenes)
        this.showPanel('lights');
    }
    
    /**
     * Set up the dock containers
     * @private
     */
    setupDockContainers() {
        this.dockContainers = {
            left: document.getElementById('dockLeft'),
            center: document.getElementById('dockCenter'),
            right: document.getElementById('dockRight'),
            bottom: document.getElementById('dockBottom'),
            main: document.getElementById('canvas-container')
        };
    }

    /**
     * Set up the mapping between panel IDs and their DOM containers
     * @private
     */
    setupPanelContainers() {
        // Map panel IDs to their container elements
        this.panelContainers.set('canvas', document.getElementById('canvas-container'));
        this.panelContainers.set('lights', document.getElementById('lightsPanel'));
        this.panelContainers.set('scenes', document.getElementById('scenesPanel'));
        this.panelContainers.set('liveState', document.getElementById('liveStatePanel'));
        this.panelContainers.set('entities', document.getElementById('entitiesPanel'));
        this.panelContainers.set('properties', document.getElementById('propertiesPanel'));
        this.panelContainers.set('sceneEditor', document.getElementById('sceneEditorPanel'));
        this.panelContainers.set('layers', document.getElementById('layersPanel'));
        this.panelContainers.set('debug', document.getElementById('debugPanel'));
    }

    /**
     * Set up click handlers for panel tab switching
     * @private
     */
    setupTabSwitching() {
        // Setup all panel tab buttons (both sidebar and regular tabs)
        const tabButtons = document.querySelectorAll('.panel-tab');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const panelId = button.dataset.panel;
                if (panelId) {
                    console.log(`🔄 Switching to panel: ${panelId}`);
                    this.showPanel(panelId);
                    
                    // Update active tab styling for the clicked button's group
                    const tabGroup = button.closest('.panel-tabs');
                    if (tabGroup) {
                        tabGroup.querySelectorAll('.panel-tab').forEach(btn => btn.classList.remove('active'));
                        button.classList.add('active');
                    }
                }
            });
        });
    }

    /**
     * Show a specific panel and hide others in the same group
     * @param {string} panelId - The ID of the panel to show
     * @description Panels are grouped (left, right, entity) and only one panel
     * per group can be visible at a time
     */
    showPanel(panelId) {
        // Get the dock position for this panel
        const dockPosition = this.dockPositions.get(panelId) || this.defaultDockPositions[panelId];
        
        // Get all panels in the same dock
        const panelsInSameDock = [];
        this.panels.forEach((panel, id) => {
            const panelDock = this.dockPositions.get(id) || this.defaultDockPositions[id];
            if (panelDock === dockPosition && id !== panelId) {
                panelsInSameDock.push(id);
            }
        });
        
        // Hide panels in the same dock (except bottom panels which can stay visible)
        if (dockPosition !== 'bottom') {
            panelsInSameDock.forEach(id => {
                const section = document.querySelector(`[data-section="${id}"]`);
                if (section) section.classList.remove('active');
                const panel = this.panels.get(id);
                if (panel) panel.hide();
            });
        }
        
        // Show the selected panel
        const section = document.querySelector(`[data-section="${panelId}"]`);
        if (section) {
            section.classList.add('active');
        }
        
        const panel = this.panels.get(panelId);
        if (panel) {
            panel.show();
            this.activePanel = panelId;
            console.log(`👁️ Showing panel: ${panelId}`);
        }
    }

    /**
     * Get a panel instance by ID
     * @param {string} panelId - The panel ID
     * @returns {BasePanel|undefined} The panel instance or undefined if not found
     */
    getPanel(panelId) {
        return this.panels.get(panelId);
    }

    /**
     * Refresh a specific panel
     * @param {string} panelId - The ID of the panel to refresh
     */
    refreshPanel(panelId) {
        const panel = this.panels.get(panelId);
        if (panel && panel.refresh) {
            panel.refresh();
        }
    }

    /**
     * Refresh all registered panels
     */
    refreshAllPanels() {
        this.panels.forEach(panel => {
            if (panel.refresh) {
                panel.refresh();
            }
        });
    }

    /**
     * Broadcast an event to all panels
     * @param {string} eventName - The event method name to call on each panel
     * @param {*} data - Data to pass to the event handler
     * @description If a panel has a method matching eventName, it will be called with data
     * @example
     * // Broadcast object selection to all panels
     * panelManager.broadcast('onObjectSelected', { object: selectedObject });
     */
    broadcast(eventName, data) {
        this.panels.forEach(panel => {
            if (panel[eventName] && typeof panel[eventName] === 'function') {
                panel[eventName](data);
            }
        });
    }
}