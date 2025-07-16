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
            'layers': 'left',
            'debug': 'left',
            
            // Right sidebar panels
            'properties': 'right',
            'scenes': 'right',
            'sceneEditor': 'right',
            'entities': 'right',
            
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
        
        // Setup tab switching - updated for accordion panels
        this.setupTabSwitching();
        
        // Setup drag and drop for panels
        this.setupPanelDragAndDrop();
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
        this.panelContainers.set('entities', document.getElementById('entitiesPanel'));
        this.panelContainers.set('properties', document.getElementById('propertiesPanel'));
        this.panelContainers.set('sceneEditor', document.getElementById('sceneEditorPanel'));
        this.panelContainers.set('layers', document.getElementById('layersPanel'));
        this.panelContainers.set('debug', document.getElementById('debugPanel'));
    }

    /**
     * Set up click handlers for panel tab switching - updated for accordion panels
     * @private
     */
    setupTabSwitching() {
        // For accordion panels, we don't need to set up tab switching
        // The accordion functionality is handled by FloorplanEditor.setupAccordionPanels()
        console.log('📋 Tab switching setup skipped for accordion panels');
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
        
        // Hide panels in the same dock
        panelsInSameDock.forEach(id => {
            const section = document.querySelector(`[data-section="${id}"]`);
            if (section) section.classList.remove('active');
            const panel = this.panels.get(id);
            if (panel) panel.hide();
        });
        
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
    
    /**
     * Set up drag and drop functionality for panel tabs
     * @private
     */
    setupPanelDragAndDrop() {
        const allTabs = document.querySelectorAll('.panel-tab');
        
        allTabs.forEach(tab => {
            // Make tabs draggable
            tab.draggable = true;
            
            // Store panel ID on the tab element
            const panelId = tab.dataset.panel;
            if (!panelId) return;
            
            // Drag start
            tab.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', panelId);
                tab.classList.add('dragging');
                
                // Store the source dock
                const tabGroup = tab.closest('.panel-tabs');
                const dock = tabGroup?.closest('.dock-left, .dock-right');
                const sourceDock = dock?.classList.contains('dock-left') ? 'left' : 'right';
                e.dataTransfer.setData('source-dock', sourceDock);
            });
            
            // Drag end
            tab.addEventListener('dragend', () => {
                tab.classList.remove('dragging');
            });
        });
        
        // Set up drop zones (panel tab containers)
        const tabContainers = document.querySelectorAll('.panel-tabs');
        
        tabContainers.forEach(container => {
            container.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                container.classList.add('drag-over');
            });
            
            container.addEventListener('dragleave', () => {
                container.classList.remove('drag-over');
            });
            
            container.addEventListener('drop', (e) => {
                e.preventDefault();
                container.classList.remove('drag-over');
                
                const panelId = e.dataTransfer.getData('text/plain');
                const sourceDock = e.dataTransfer.getData('source-dock');
                
                // Determine target dock
                const targetDockEl = container.closest('.dock-left, .dock-right');
                const targetDock = targetDockEl?.classList.contains('dock-left') ? 'left' : 'right';
                
                // Don't do anything if dropped on same dock
                if (sourceDock === targetDock) return;
                
                // Move the panel to the new dock
                this.movePanelToDock(panelId, targetDock);
            });
        });
    }
    
    /**
     * Move a panel to a different dock
     * @param {string} panelId - The panel to move
     * @param {string} targetDock - The target dock ('left' or 'right')
     */
    movePanelToDock(panelId, targetDock) {
        // Update dock position
        this.dockPositions.set(panelId, targetDock);
        
        // Find the tab and move it
        const tab = document.querySelector(`[data-panel="${panelId}"]`);
        if (!tab) return;
        
        // Find target container
        const targetDockEl = document.querySelector(`.dock-${targetDock}`);
        const targetTabs = targetDockEl?.querySelector('.panel-tabs');
        if (!targetTabs) return;
        
        // Move the tab
        const currentTabParent = tab.parentElement;
        targetTabs.appendChild(tab);
        
        // Move the panel content
        const panel = this.panels.get(panelId);
        const panelSection = document.querySelector(`[data-section="${panelId}"]`);
        if (panelSection && panel) {
            const targetContent = targetDockEl.querySelector('.panel-content');
            if (targetContent) {
                targetContent.appendChild(panelSection);
            }
        }
        
        // If this panel was active in the old dock, activate a different panel there
        if (tab.classList.contains('active')) {
            tab.classList.remove('active');
            panelSection?.classList.remove('active');
            
            // Activate first remaining tab in old dock
            const remainingTab = currentTabParent.querySelector('.panel-tab');
            if (remainingTab) {
                const remainingPanelId = remainingTab.dataset.panel;
                if (remainingPanelId) {
                    this.showPanel(remainingPanelId);
                }
            }
        }
        
        // Show the moved panel in its new dock
        this.showPanel(panelId);
        
        console.log(`🔄 Moved panel ${panelId} to ${targetDock} dock`);
    }
}