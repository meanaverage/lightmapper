export class PanelManager {
    constructor() {
        this.panels = new Map();
        this.activePanel = null;
        this.panelContainers = new Map();
    }

    register(panel) {
        if (!panel.id || !panel.title) {
            throw new Error('Panel must have id and title properties');
        }
        
        this.panels.set(panel.id, panel);
        console.log(`📦 Registered panel: ${panel.id}`);
    }

    init() {
        // Initialize panel containers from the sidebar
        this.setupPanelContainers();
        
        // Initialize all registered panels
        this.panels.forEach((panel, id) => {
            const container = this.panelContainers.get(id);
            if (container) {
                panel.init(container);
                console.log(`✅ Initialized panel: ${id}`);
            } else {
                console.warn(`⚠️ No container found for panel: ${id}`);
            }
        });
        
        // Setup tab switching
        this.setupTabSwitching();
        
        // Show the first panel by default (lights/scenes)
        this.showPanel('lights');
    }

    setupPanelContainers() {
        // These are the actual sidebar panels
        this.panelContainers.set('lights', document.getElementById('lightsPanel'));
        this.panelContainers.set('scenes', document.getElementById('scenesPanel'));
        this.panelContainers.set('liveState', document.getElementById('liveStatePanel'));
        this.panelContainers.set('entities', document.getElementById('entitiesPanel'));
        this.panelContainers.set('properties', document.getElementById('propertiesPanel'));
        this.panelContainers.set('sceneEditor', document.getElementById('sceneEditorPanel'));
    }

    setupTabSwitching() {
        // Setup sidebar tab buttons
        const tabButtons = document.querySelectorAll('.sidebar-tab');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const panelId = button.dataset.panel;
                if (panelId) {
                    this.showPanel(panelId);
                    
                    // Update active tab styling
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                }
            });
        });
    }

    showPanel(panelId) {
        // Hide all panels
        this.panelContainers.forEach((container, id) => {
            if (container) {
                container.style.display = 'none';
            }
            const panel = this.panels.get(id);
            if (panel) {
                panel.hide();
            }
        });
        
        // Show selected panel
        const container = this.panelContainers.get(panelId);
        const panel = this.panels.get(panelId);
        
        if (container && panel) {
            container.style.display = 'block';
            panel.show();
            this.activePanel = panelId;
            console.log(`👁️ Showing panel: ${panelId}`);
        }
    }

    getPanel(panelId) {
        return this.panels.get(panelId);
    }

    refreshPanel(panelId) {
        const panel = this.panels.get(panelId);
        if (panel && panel.refresh) {
            panel.refresh();
        }
    }

    refreshAllPanels() {
        this.panels.forEach(panel => {
            if (panel.refresh) {
                panel.refresh();
            }
        });
    }

    // Utility method to broadcast events to all panels
    broadcast(eventName, data) {
        this.panels.forEach(panel => {
            if (panel[eventName] && typeof panel[eventName] === 'function') {
                panel[eventName](data);
            }
        });
    }
}