// Detect API base path for ingress compatibility
function getApiBasePath() {
    // Check if we're running through Home Assistant ingress
    const currentPath = window.location.pathname;
    
    // If path contains hassio_ingress, extract the ingress path
    if (currentPath.includes('/api/hassio_ingress/')) {
        const ingressMatch = currentPath.match(/\/api\/hassio_ingress\/([^\/]+)/);
        if (ingressMatch) {
            return `/api/hassio_ingress/${ingressMatch[1]}`;
        }
    }
    
    // For direct access or unknown paths, use root
    return '';
}

const API_BASE = getApiBasePath();
window.API_BASE = API_BASE;
console.log('🔗 API Base Path detected:', API_BASE || '(root)');

// ========================================
// Entity Panel Management System
// ========================================
class EntityPanelManager {
    constructor() {
        this.allEntities = [];
        this.filteredEntities = [];
        this.selectedEntity = null;
        this.selectedLight = null;
        this.currentFilter = 'light';
        this.searchTerm = '';
        
        console.log('🎛️ EntityPanelManager initialized');
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Type filter
        const typeFilter = document.getElementById('entityTypeFilter');
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.filterAndDisplayEntities();
            });
        }
        
        // Search input
        const searchBox = document.getElementById('entitySearchBox');
        if (searchBox) {
            searchBox.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.filterAndDisplayEntities();
                this.updateClearButton();
            });
        }
        
        // Clear search button
        const clearSearch = document.getElementById('clearEntitySearch');
        if (clearSearch) {
            clearSearch.addEventListener('click', () => {
                this.clearSearch();
            });
        }
        
        // Assign button
        const assignBtn = document.getElementById('assignSelectedEntity');
        if (assignBtn) {
            assignBtn.addEventListener('click', () => {
                this.assignSelectedEntityToLight();
            });
        }
        
        console.log('🔧 Entity panel event listeners setup complete');
    }
    
    async loadEntities() {
        console.log('📋 Loading entities for entity panel...');
        
        try {
            const response = await fetch(`${API_BASE}/api/lights`);
            if (!response.ok) {
                throw new Error(`Failed to load entities: ${response.status}`);
            }
            
            const entities = await response.json();
            console.log('✅ Loaded', entities.length, 'entities for panel');
            
            // Convert to a format suitable for the entity panel
            this.allEntities = entities.map(entity => ({
                entityId: entity.entityId,
                friendlyName: entity.friendlyName,
                type: entity.entityId.split('.')[0], // Extract type from entity ID
                state: entity.state || 'unknown',
                area: entity.area,
                attributes: {
                    brightness: entity.brightness,
                    colorTemp: entity.colorTemp,
                    hsColor: entity.hsColor
                }
            }));
            
            this.filterAndDisplayEntities();
            
        } catch (error) {
            console.error('❌ Failed to load entities:', error);
            this.displayError('Failed to load entities. Please check your connection.');
        }
    }
    
    filterAndDisplayEntities() {
        console.log('🔍 Filtering entities - Type:', this.currentFilter, 'Search:', this.searchTerm);
        
        this.filteredEntities = this.allEntities.filter(entity => {
            // Type filter
            const typeMatch = this.currentFilter === 'all' || entity.type === this.currentFilter;
            
            // Search filter
            const searchMatch = !this.searchTerm || 
                entity.friendlyName.toLowerCase().includes(this.searchTerm) ||
                entity.entityId.toLowerCase().includes(this.searchTerm);
            
            return typeMatch && searchMatch;
        });
        
        console.log('📋 Filtered to', this.filteredEntities.length, 'entities');
        this.displayEntities();
        this.updateEntityCount();
    }
    
    displayEntities() {
        const entityList = document.getElementById('entityList');
        if (!entityList) return;
        
        if (this.filteredEntities.length === 0) {
            entityList.innerHTML = `
                <div class="entity-loading">
                    <i class="fas fa-info-circle"></i>
                    <span>No entities found matching your criteria</span>
                </div>
            `;
            return;
        }
        
        // Sort entities alphabetically by friendly name
        const sortedEntities = [...this.filteredEntities].sort((a, b) => 
            a.friendlyName.localeCompare(b.friendlyName)
        );
        
        entityList.innerHTML = sortedEntities.map(entity => {
            const isSelected = this.selectedEntity?.entityId === entity.entityId;
            const isAssigned = this.isEntityAssigned(entity.entityId);
            
            return `
                <div class="entity-item ${isSelected ? 'selected' : ''} ${isAssigned ? 'assigned' : ''}" 
                     data-entity-id="${entity.entityId}" 
                     data-type="${entity.type}">
                    <div class="entity-icon">
                        ${this.getEntityIcon(entity.type)}
                    </div>
                    <div class="entity-info">
                        <div class="entity-name">${entity.friendlyName}</div>
                        <div class="entity-id">${entity.entityId}</div>
                    </div>
                    <div class="entity-status">
                        <div class="entity-state ${entity.state}">${entity.state.toUpperCase()}</div>
                        ${entity.area ? `<div class="entity-area">${entity.area.name}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        // Add click handlers to entity items
        entityList.querySelectorAll('.entity-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectEntity(item.dataset.entityId);
            });
        });
    }
    
    getEntityIcon(type) {
        const icons = {
            light: '<i class="fas fa-lightbulb"></i>',
            switch: '<i class="fas fa-toggle-on"></i>',
            sensor: '<i class="fas fa-thermometer-half"></i>',
            binary_sensor: '<i class="fas fa-dot-circle"></i>',
            climate: '<i class="fas fa-snowflake"></i>',
            cover: '<i class="fas fa-window-maximize"></i>',
            fan: '<i class="fas fa-fan"></i>',
            media_player: '<i class="fas fa-play-circle"></i>'
        };
        
        return icons[type] || '<i class="fas fa-question-circle"></i>';
    }
    
    selectEntity(entityId) {
        console.log('🎯 Selected entity:', entityId);
        
        this.selectedEntity = this.allEntities.find(e => e.entityId === entityId);
        
        // Update UI
        document.querySelectorAll('.entity-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.entityId === entityId);
        });
        
        this.updateAssignButton();
    }
    
    setSelectedLight(light) {
        console.log('💡 Selected light for assignment:', light);
        this.selectedLight = light;
        this.updateSelectedLightInfo();
        this.updateAssignButton();
    }
    
    updateSelectedLightInfo() {
        const lightInfo = document.getElementById('selectedLightInfo');
        if (!lightInfo) return;
        
        if (this.selectedLight) {
            const entityId = this.selectedLight.entityId || 'Unassigned';
            lightInfo.textContent = `Selected Light: ${entityId}`;
        } else {
            lightInfo.textContent = 'No light selected';
        }
    }
    
    updateAssignButton() {
        const assignBtn = document.getElementById('assignSelectedEntity');
        if (!assignBtn) return;
        
        const canAssign = this.selectedEntity && this.selectedLight;
        assignBtn.disabled = !canAssign;
    }
    
    assignSelectedEntityToLight() {
        if (!this.selectedEntity || !this.selectedLight) {
            window.sceneManager?.showStatus('Please select both an entity and a light', 'warning');
            return;
        }
        
        console.log('🔗 Assigning entity', this.selectedEntity.entityId, 'to light');
        
        // Assign the entity to the light
        this.selectedLight.entityId = this.selectedEntity.entityId;
        
        // Update the light's visual state
        if (window.floorplanEditor) {
            window.floorplanEditor.updateLightVisualState(this.selectedLight, this.selectedEntity);
        }
        
        // Clear selections
        this.selectedEntity = null;
        this.selectedLight = null;
        
        // Update UI
        this.filterAndDisplayEntities();
        this.updateSelectedLightInfo();
        this.updateAssignButton();
        
        // Trigger autosave
        if (window.floorplanEditor) {
            window.floorplanEditor.triggerAutoSave();
        }
        
        window.sceneManager?.showStatus('Entity assigned successfully!', 'success');
    }
    
    isEntityAssigned(entityId) {
        if (!window.floorplanEditor?.lights) return false;
        
        return window.floorplanEditor.lights.some(light => light.entityId === entityId);
    }
    
    updateEntityCount() {
        const countElement = document.getElementById('entityCount');
        if (countElement) {
            countElement.textContent = this.filteredEntities.length;
        }
    }
    
    clearSearch() {
        const searchBox = document.getElementById('entitySearchBox');
        if (searchBox) {
            searchBox.value = '';
            this.searchTerm = '';
            this.filterAndDisplayEntities();
            this.updateClearButton();
        }
    }
    
    updateClearButton() {
        const clearBtn = document.getElementById('clearEntitySearch');
        if (clearBtn) {
            clearBtn.style.display = this.searchTerm ? 'block' : 'none';
        }
    }
    
    displayError(message) {
        const entityList = document.getElementById('entityList');
        if (!entityList) return;
        
        entityList.innerHTML = `
            <div class="entity-loading">
                <i class="fas fa-exclamation-triangle"></i>
                <span>${message}</span>
            </div>
        `;
    }
}

// ========================================
// Layer Management System (Photoshop-style)
// ========================================
class LayerManager {
    constructor(floorplanEditor) {
        this.floorplanEditor = floorplanEditor;
        // Dynamic layers - each object gets its own layer
        this.layers = {};
        this.layerOrder = []; // Track layer stacking order (bottom to top)
        
        // Counter for generating unique layer names
        this.layerCounters = {
            room: 0,
            light: 0,
            text: 0,
            object: 0
        };
        
        console.log('🗂️ LayerManager initialized with dynamic layers (Photoshop-style)');
    }
    
    /**
     * Create a new layer for an object
     * @param {fabric.Object} obj - The fabric object
     * @param {string} customName - Optional custom name for the layer
     * @returns {string} The layer ID
     */
    createLayerForObject(obj, customName = null) {
        if (!obj) return null;
        
        // Generate unique layer ID
        const layerId = `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Determine layer name based on object type
        let layerName = customName;
        if (!layerName) {
            if (obj.lightObject) {
                this.layerCounters.light++;
                layerName = obj.entityId ? `Light: ${obj.entityId.replace('light.', '')}` : `Light ${this.layerCounters.light}`;
            } else if (obj.roomObject) {
                this.layerCounters.room++;
                layerName = `ROOM ${this.layerCounters.room}`;
            } else if (obj.textObject) {
                this.layerCounters.text++;
                layerName = `Text ${this.layerCounters.text}`;
            } else if (obj.labelObject) {
                layerName = 'Label';
            } else if (obj.backgroundImage) {
                layerName = 'Background Image';
            } else {
                this.layerCounters.object++;
                layerName = `Object ${this.layerCounters.object}`;
            }
        }
        
        // Create layer
        const layer = {
            id: layerId,
            name: layerName,
            visible: true,
            locked: false,
            objectId: obj.id || Date.now(),
            objectType: this.getObjectType(obj),
            zIndex: this.layerOrder.length,
            // Light-specific properties
            circleVisible: true,
            brightnessVisible: true,
            labelVisible: true
        };
        
        // Add to layers and order
        this.layers[layerId] = layer;
        this.layerOrder.unshift(layerId); // Add to top
        
        // Set object's layer reference
        obj.customLayer = layerId;
        
        // Update z-indices
        this.updateAllZIndices();
        
        console.log(`🗂️ Created layer "${layerName}" (${layerId}) for object`);
        return layerId;
    }
    
    /**
     * Get object type for categorization
     * @param {fabric.Object} obj - The fabric object
     * @returns {string} The object type
     */
    getObjectType(obj) {
        if (obj.lightObject) return 'light';
        if (obj.roomObject) return 'room';
        if (obj.textObject) return 'text';
        if (obj.labelObject) return 'label';
        if (obj.backgroundImage) return 'background';
        if (obj.gridLine) return 'grid';
        return 'object';
    }
    
    /**
     * Remove a layer
     * @param {string} layerId - The layer ID to remove
     */
    removeLayer(layerId) {
        if (!this.layers[layerId]) return;
        
        // Remove from order
        const index = this.layerOrder.indexOf(layerId);
        if (index > -1) {
            this.layerOrder.splice(index, 1);
        }
        
        // Remove layer
        delete this.layers[layerId];
        
        // Update z-indices
        this.updateAllZIndices();
        
        console.log(`🗂️ Removed layer ${layerId}`);
    }
    
    /**
     * Update all layer z-indices based on order
     */
    updateAllZIndices() {
        const totalLayers = this.layerOrder.length;
        this.layerOrder.forEach((layerId, index) => {
            if (this.layers[layerId]) {
                // Top of layers panel = highest z-index
                this.layers[layerId].zIndex = totalLayers - 1 - index;
            }
        });
    }
    
    /**
     * Reorder layers
     * @param {string} draggedLayerId - The ID of the dragged layer
     * @param {string} targetLayerId - The ID of the target layer
     */
    reorderLayers(draggedLayerId, targetLayerId) {
        const draggedIndex = this.layerOrder.indexOf(draggedLayerId);
        const targetIndex = this.layerOrder.indexOf(targetLayerId);
        
        if (draggedIndex === -1 || targetIndex === -1) return;
        
        // Remove dragged layer from current position
        this.layerOrder.splice(draggedIndex, 1);
        
        // Insert at new position
        const newTargetIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
        this.layerOrder.splice(newTargetIndex, 0, draggedLayerId);
        
        // Update z-indices
        this.updateAllZIndices();
        
        // Update canvas object order
        this.updateCanvasObjectOrder();
        
        console.log('✅ Layer order updated:', this.layerOrder);
    }
    
    /**
     * Update canvas object order based on layer order
     */
    updateCanvasObjectOrder() {
        if (!this.floorplanEditor?.canvas) return;
        
        const canvas = this.floorplanEditor.canvas;
        const objects = canvas.getObjects();
        
        // Group objects by layer
        const objectsByLayer = {};
        objects.forEach(obj => {
            const layerId = obj.customLayer || this.getObjectLayer(obj);
            if (!objectsByLayer[layerId]) {
                objectsByLayer[layerId] = [];
            }
            objectsByLayer[layerId].push(obj);
        });
        
        // Clear and rebuild canvas objects in correct order
        canvas._objects = [];
        
        // Add objects in reverse layer order (bottom to top)
        [...this.layerOrder].reverse().forEach(layerId => {
            if (objectsByLayer[layerId]) {
                objectsByLayer[layerId].forEach(obj => {
                    canvas._objects.push(obj);
                });
            }
        });
        
        // Add any orphaned objects at the bottom
        objects.forEach(obj => {
            if (!obj.customLayer && !canvas._objects.includes(obj)) {
                canvas._objects.unshift(obj);
            }
        });
        
        canvas.renderAll();
    }
    
    /**
     * Get the layer ID for an object
     * @param {fabric.Object} obj - The fabric object
     * @returns {string|null} The layer ID or null
     */
    getObjectLayer(obj) {
        return obj.customLayer || null;
    }
    
    /**
     * Light-specific layer controls
     */
    toggleLightCircle(layerId) {
        const layer = this.layers[layerId];
        if (!layer || layer.objectType !== 'light') return;
        
        layer.circleVisible = !layer.circleVisible;
        
        // Find and update the light object
        const lightObject = this.floorplanEditor.canvas.getObjects().find(obj => 
            obj.customLayer === layerId && obj.lightObject
        );
        
        if (lightObject) {
            lightObject.visible = layer.circleVisible;
            this.floorplanEditor.canvas.renderAll();
            console.log('💡 Light circle visibility set to:', layer.circleVisible);
        }
        
        // Broadcast to other panels
        window.panelManager?.broadcast('onLayerOptionChanged', { 
            layerId: 'lights',
            optionId: 'bulbs',
            value: layer.circleVisible
        });
    }
    
    toggleLightBrightness(layerId) {
        const layer = this.layers[layerId];
        if (!layer || layer.objectType !== 'light') return;
        
        layer.brightnessVisible = !layer.brightnessVisible;
        
        // Find the light object
        const lightObject = this.floorplanEditor.canvas.getObjects().find(obj => 
            obj.customLayer === layerId && obj.lightObject
        );
        
        if (!lightObject) {
            console.warn('❌ Light object not found for layer:', layerId);
            return;
        }
        
        console.log('🔍 Looking for brightness effects for light:', lightObject.entityId || lightObject.id);
        
        // Find brightness effects matching the light's entityId or id
        // Look for both glowCircle property and brightnessEffect property
        const allObjects = this.floorplanEditor.canvas.getObjects();
        console.log('🔍 All objects on canvas:', allObjects.length);
        
        const brightnessEffects = allObjects.filter(obj => {
            const isGlowCircle = obj.glowCircle === true;
            const isBrightnessEffect = obj.brightnessEffect === true;
            const isNotLight = !obj.lightObject;
            const parentMatches = obj.parentLightId === lightObject.entityId || 
                                obj.parentLightId === lightObject.id ||
                                obj.parentLightId === `light_${lightObject.entityId}`;
            
            console.log('🔍 Object:', obj.name || obj.type, {
                isGlowCircle,
                isBrightnessEffect,
                isNotLight,
                parentLightId: obj.parentLightId,
                lightEntityId: lightObject.entityId,
                lightId: lightObject.id,
                parentMatches
            });
            
            return (isGlowCircle || isBrightnessEffect) && isNotLight && parentMatches;
        });
        
        console.log('🌟 Found brightness effects:', brightnessEffects.length);
        
        if (brightnessEffects.length === 0) {
            // Also check if the light has a glowCircle reference
            if (lightObject.glowCircle) {
                console.log('🔍 Found brightness effect via light reference');
                brightnessEffects.push(lightObject.glowCircle);
            }
        }
        
        brightnessEffects.forEach(effect => {
            effect.visible = layer.brightnessVisible;
            console.log('👁️ Setting brightness effect visibility to:', layer.brightnessVisible);
        });
        
        // Make sure the light itself stays visible unless circleVisible is false
        if (lightObject && layer.circleVisible !== false) {
            lightObject.visible = true;
            console.log('💡 Ensuring light object stays visible');
        }
        
        this.floorplanEditor.canvas.renderAll();
        
        // Broadcast to other panels
        window.panelManager?.broadcast('onLayerOptionChanged', { 
            layerId: 'lights',
            optionId: 'brightness',
            value: layer.brightnessVisible
        });
    }
    
    toggleLightLabel(layerId) {
        const layer = this.layers[layerId];
        if (!layer || layer.objectType !== 'light') return;
        
        layer.labelVisible = !layer.labelVisible;
        
        // Find label
        const label = this.floorplanEditor.canvas.getObjects().find(obj => 
            obj.labelObject && obj.lightRef?.customLayer === layerId
        );
        
        if (label) {
            label.visible = layer.labelVisible;
            this.floorplanEditor.canvas.renderAll();
        }
        
        // Broadcast to other panels
        window.panelManager?.broadcast('onLayerOptionChanged', { 
            layerId: 'lights',
            optionId: 'labels',
            value: layer.labelVisible
        });
    }
}

// ========================================
// CAD Interface Manager
// ========================================
class CADInterfaceManager {
    constructor() {
        this.currentRibbonTab = 'home';
        this.currentLeftPanel = 'lights';
        this.currentRightPanel = 'properties';
        this.commandHistory = [];
        this.currentCommand = '';
        this.mouseCoordinates = { x: 0, y: 0 };
        this.selectedCount = 0;
        this.setupRibbonInterface();
        this.setupPanelSwitching();
        this.setupCommandPalette();
        this.setupStatusBar();
        this.setupKeyboardShortcuts();
        console.log('✅ CAD Interface Manager initialized');
    }
    
    setupRibbonInterface() {
        // Ribbon tab switching
        const ribbonTabs = document.querySelectorAll('.ribbon-tab');
        const ribbonPanels = document.querySelectorAll('.ribbon-panel');
        
        ribbonTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetTab = e.target.closest('.ribbon-tab').dataset.tab;
                this.switchRibbonTab(targetTab);
            });
        });
        
        console.log('🎀 Ribbon interface setup complete');
    }
    
    switchRibbonTab(tabName) {
        // Update active tab
        document.querySelectorAll('.ribbon-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update active panel
        document.querySelectorAll('.ribbon-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.querySelector(`[data-panel="${tabName}"]`).classList.add('active');
        
        this.currentRibbonTab = tabName;
        console.log(`🎀 Switched to ribbon tab: ${tabName}`);
    }
    
    setupPanelSwitching() {
        // Setup accordion panels
        this.setupAccordionPanels();
        console.log('📋 Accordion panel setup complete');
    }
    
    setupAccordionPanels() {
        console.log('🔧 Setting up accordion panels...');
        
        // Remove any existing accordion event listeners to prevent duplicates
        const existingHeaders = document.querySelectorAll('.panel-accordion-header');
        existingHeaders.forEach(header => {
            const newHeader = header.cloneNode(true);
            header.parentNode.replaceChild(newHeader, header);
        });
        
        // Setup left panel accordion
        const leftHeaders = document.querySelectorAll('.left-panel .panel-accordion-header');
        console.log(`📋 Found ${leftHeaders.length} left panel headers`);
        leftHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const panelName = e.target.closest('.panel-accordion-header').dataset.panel;
                console.log(`🖱️ Left panel header clicked: ${panelName}`);
                this.toggleAccordionPanel(panelName, 'left');
            });
        });
        
        // Setup right panel accordion
        const rightHeaders = document.querySelectorAll('.right-panel .panel-accordion-header');
        console.log(`📋 Found ${rightHeaders.length} right panel headers`);
        rightHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const panelName = e.target.closest('.panel-accordion-header').dataset.panel;
                console.log(`🖱️ Right panel header clicked: ${panelName}`);
                this.toggleAccordionPanel(panelName, 'right');
            });
        });
        
        // Setup tertiary panel accordion
        const tertiaryHeaders = document.querySelectorAll('.tertiary-panel .panel-accordion-header');
        console.log(`📋 Found ${tertiaryHeaders.length} tertiary panel headers`);
        tertiaryHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                // Skip if clicking on the collapse button
                if (e.target.closest('.tertiary-collapse-btn')) {
                    return;
                }
                
                e.preventDefault();
                e.stopPropagation();
                
                // Don't toggle if there's only one panel in tertiary
                const tertiaryItems = document.querySelectorAll('.tertiary-panel .panel-accordion-item');
                if (tertiaryItems.length === 1) {
                    console.log('📋 Only one panel in tertiary sidebar, not toggling');
                    return;
                }
                
                const panelName = e.target.closest('.panel-accordion-header').dataset.panel;
                console.log(`🖱️ Tertiary panel header clicked: ${panelName}`);
                this.toggleAccordionPanel(panelName, 'tertiary');
            });
        });
        
        console.log('✅ Accordion panels setup complete');
    }
    
    toggleAccordionPanel(panelName, side) {
        console.log(`🔄 toggleAccordionPanel called: ${panelName} (${side})`);
        
        // Prevent rapid toggling
        const throttleKey = `${panelName}_${side}`;
        if (this._accordionThrottle && this._accordionThrottle[throttleKey]) {
            console.log(`⏱️ Throttling accordion toggle for ${panelName}`);
            return;
        }
        
        if (!this._accordionThrottle) this._accordionThrottle = {};
        this._accordionThrottle[throttleKey] = true;
        setTimeout(() => {
            delete this._accordionThrottle[throttleKey];
        }, 350); // Slightly longer than CSS transition
        
        const selector = side === 'left' ? '.left-panel' : 
                         side === 'tertiary' ? '.tertiary-panel' : '.right-panel';
        const header = document.querySelector(`${selector} [data-panel="${panelName}"].panel-accordion-header`);
        const content = document.querySelector(`${selector} [data-panel="${panelName}"] .panel-accordion-content`);
        const chevron = header.querySelector('.accordion-chevron');
        
        if (!header || !content || !chevron) {
            console.warn(`⚠️ Missing accordion elements for ${panelName}`);
            return;
        }
        
        const isExpanded = content.classList.contains('expanded');
        console.log(`📋 Panel ${panelName} is currently ${isExpanded ? 'expanded' : 'collapsed'}`);
        
        if (isExpanded) {
            // Collapse
            content.classList.remove('expanded');
            content.classList.add('collapsing');
            header.classList.remove('active');
            chevron.classList.remove('fa-chevron-up');
            chevron.classList.add('fa-chevron-down');
            
            // Remove collapsing class after animation
            setTimeout(() => {
                content.classList.remove('collapsing');
            }, 300);
        } else {
            // Expand
            content.classList.add('expanding');
            content.classList.add('expanded');
            header.classList.add('active');
            chevron.classList.remove('fa-chevron-down');
            chevron.classList.add('fa-chevron-up');
            
            // Remove expanding class after animation
            setTimeout(() => {
                content.classList.remove('expanding');
            }, 300);
        }
        
        // Update current panel tracking
        if (side === 'left') {
            this.currentLeftPanel = isExpanded ? null : panelName;
        } else {
            this.currentRightPanel = isExpanded ? null : panelName;
        }
        
        console.log(`📋 Toggled ${side} panel: ${panelName} (${isExpanded ? 'collapsed' : 'expanded'})`);
    }
    
    // Legacy panel switching methods - keeping for compatibility
    switchLeftPanel(panelName) {
        // Use accordion toggle instead
        this.toggleAccordionPanel(panelName, 'left');
    }
    
    switchRightPanel(panelName) {
        // Use accordion toggle instead
        this.toggleAccordionPanel(panelName, 'right');
    }
    
    setupCommandPalette() {
        const commandInput = document.getElementById('commandInput');
        const commandStatus = document.getElementById('commandStatus');
        const commandSuggestions = document.getElementById('commandSuggestions');
        
        if (!commandInput) return;
        
        commandInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.executeCommand(commandInput.value);
                commandInput.value = '';
            } else if (e.key === 'Escape') {
                commandInput.value = '';
                commandSuggestions.style.display = 'none';
            }
        });
        
        commandInput.addEventListener('input', (e) => {
            this.updateCommandSuggestions(e.target.value);
        });
        
        commandInput.addEventListener('focus', () => {
            commandStatus.textContent = 'Type a command...';
        });
        
        commandInput.addEventListener('blur', () => {
            commandStatus.textContent = 'Ready';
            // Hide suggestions after a delay to allow clicking
            setTimeout(() => {
                commandSuggestions.style.display = 'none';
            }, 200);
        });
        
        console.log('⌨️ Command palette setup complete');
    }
    
    updateCommandSuggestions(value) {
        const suggestions = this.getCommandSuggestions(value.toLowerCase());
        const commandSuggestions = document.getElementById('commandSuggestions');
        
        if (suggestions.length > 0 && value.length > 0) {
            commandSuggestions.innerHTML = suggestions.map(cmd => 
                `<div class="command-suggestion" data-command="${cmd.name}">${cmd.name} - ${cmd.description}</div>`
            ).join('');
            commandSuggestions.style.display = 'block';
            
            // Add click handlers for suggestions
            commandSuggestions.querySelectorAll('.command-suggestion').forEach(item => {
                item.addEventListener('click', (e) => {
                    const command = e.target.dataset.command;
                    document.getElementById('commandInput').value = command;
                    commandSuggestions.style.display = 'none';
                });
            });
        } else {
            commandSuggestions.style.display = 'none';
        }
    }
    
    getCommandSuggestions(partial) {
        const commands = [
            { name: 'select', description: 'Select tool' },
            { name: 'light', description: 'Add light tool' },
            { name: 'room', description: 'Draw room tool' },
            { name: 'line', description: 'Draw line tool' },
            { name: 'text', description: 'Add text tool' },
            { name: 'zoom', description: 'Zoom to fit' },
            { name: 'grid', description: 'Toggle grid' },
            { name: 'snap', description: 'Toggle snap' },
            { name: 'save', description: 'Save layout' },
            { name: 'load', description: 'Load layout' },
            { name: 'clear', description: 'Clear selection' },
            { name: 'delete', description: 'Delete selected' },
            { name: 'layer-lights', description: 'Toggle lights layer visibility' },
            { name: 'layer-rooms', description: 'Toggle rooms layer visibility' },
            { name: 'layer-background', description: 'Toggle background layer visibility' },
            { name: 'layer-grid', description: 'Toggle grid layer visibility' },
            { name: 'lock-lights', description: 'Toggle lights layer lock' },
            { name: 'lock-rooms', description: 'Toggle rooms layer lock' },
            { name: 'lock-background', description: 'Toggle background layer lock' },
            { name: 'lock-grid', description: 'Toggle grid layer lock' },
            { name: 'help', description: 'Show help' }
        ];
        
        return commands.filter(cmd => 
            cmd.name.toLowerCase().includes(partial) || 
            cmd.description.toLowerCase().includes(partial)
        );
    }
    
    executeCommand(command) {
        const cmd = command.toLowerCase().trim();
        console.log(`⚡ Executing command: ${cmd}`);
        
        // Add to command history
        this.commandHistory.push(cmd);
        if (this.commandHistory.length > 50) {
            this.commandHistory.shift();
        }
        
        // Execute command
        switch (cmd) {
            case 'select':
            case 's':
                window.floorplanEditor?.setTool('select');
                break;
            case 'light':
            case 'l':
                window.floorplanEditor?.setTool('light');
                break;
            case 'room':
            case 'r':
                window.floorplanEditor?.setTool('room');
                break;
            case 'line':
                window.floorplanEditor?.setTool('line');
                break;
            case 'text':
            case 't':
                window.floorplanEditor?.setTool('text');
                break;
            case 'zoom':
            case 'z':
                window.floorplanEditor?.fitToScreen();
                break;
            case 'grid':
            case 'g':
                window.floorplanEditor?.toggleGrid();
                break;
            case 'snap':
                window.floorplanEditor?.toggleSnap();
                break;
            case 'save':
                window.floorplanEditor?.saveLayoutToFile();
                break;
            case 'load':
                window.floorplanEditor?.loadLayoutFromFile();
                break;
            case 'clear':
                window.lightController?.clearSelection();
                break;
            case 'delete':
                window.floorplanEditor?.deleteSelected();
                break;
            
            // Layer visibility commands
            case 'layer-lights':
                window.layerManager?.toggleLayerVisibility('lights');
                break;
            case 'layer-rooms':
                window.layerManager?.toggleLayerVisibility('rooms');
                break;
            case 'layer-background':
                window.layerManager?.toggleLayerVisibility('background');
                break;
            case 'layer-grid':
                window.layerManager?.toggleLayerVisibility('grid');
                break;
            
            // Layer lock commands
            case 'lock-lights':
                window.layerManager?.toggleLayerLock('lights');
                break;
            case 'lock-rooms':
                window.layerManager?.toggleLayerLock('rooms');
                break;
            case 'lock-background':
                window.layerManager?.toggleLayerLock('background');
                break;
            case 'lock-grid':
                window.layerManager?.toggleLayerLock('grid');
                break;
            
            case 'help':
                window.lightController?.openSettings();
                break;
            default:
                this.updateCommandStatus(`Unknown command: ${cmd}`);
                return;
        }
        
        this.updateCommandStatus(`Executed: ${cmd}`);
    }
    
    updateCommandStatus(message) {
        const commandStatus = document.getElementById('commandStatus');
        if (commandStatus) {
            commandStatus.textContent = message;
            setTimeout(() => {
                commandStatus.textContent = 'Ready';
            }, 2000);
        }
    }
    
    setupStatusBar() {
        const mouseCoordinates = document.getElementById('mouseCoordinates');
        const selectedCount = document.getElementById('selectedCount');
        const zoomLevel = document.getElementById('zoom-level');
        
        // Update mouse coordinates when moving over canvas
        document.addEventListener('mousemove', (e) => {
            const canvas = document.getElementById('floorplan-canvas');
            if (canvas && e.target === canvas) {
                const rect = canvas.getBoundingClientRect();
                const x = Math.round(e.clientX - rect.left);
                const y = Math.round(e.clientY - rect.top);
                this.updateMouseCoordinates(x, y);
            }
        });
        
        // Update status toggles
        this.updateStatusToggles();
        
        console.log('📊 Status bar setup complete');
    }
    
    updateMouseCoordinates(x, y) {
        this.mouseCoordinates = { x, y };
        const mouseCoordinatesElement = document.getElementById('mouseCoordinates');
        if (mouseCoordinatesElement) {
            mouseCoordinatesElement.textContent = `${x}, ${y}`;
        }
    }
    
    updateSelectedCount(count) {
        this.selectedCount = count;
        const selectedCountElement = document.getElementById('selectedCount');
        if (selectedCountElement) {
            selectedCountElement.textContent = count.toString();
        }
    }
    
    updateStatusToggles() {
        const gridStatus = document.getElementById('gridStatus');
        const snapStatus = document.getElementById('snapStatus');
        const orthoStatus = document.getElementById('orthoStatus');
        
        // Add click handlers for status toggles
        if (gridStatus) {
            gridStatus.addEventListener('click', () => {
                window.floorplanEditor?.toggleGrid();
            });
        }
        
        if (snapStatus) {
            snapStatus.addEventListener('click', () => {
                window.floorplanEditor?.toggleSnap();
            });
        }
        
        if (orthoStatus) {
            orthoStatus.addEventListener('click', () => {
                // Toggle orthogonal mode (to be implemented)
                orthoStatus.classList.toggle('active');
            });
        }
    }
    
    updateToggleState(toggleId, active) {
        const toggle = document.getElementById(toggleId);
        if (toggle) {
            if (active) {
                toggle.classList.add('active');
            } else {
                toggle.classList.remove('active');
            }
        }
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't override if user is typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            // CAD-style keyboard shortcuts
            if (!e.ctrlKey && !e.altKey && !e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 's':
                        e.preventDefault();
                        this.executeCommand('select');
                        break;
                    case 'l':
                        e.preventDefault();
                        this.executeCommand('light');
                        break;
                    case 'r':
                        e.preventDefault();
                        this.executeCommand('room');
                        break;
                    case 't':
                        e.preventDefault();
                        this.executeCommand('text');
                        break;
                    case 'g':
                        e.preventDefault();
                        this.executeCommand('grid');
                        break;
                    case 'z':
                        e.preventDefault();
                        this.executeCommand('zoom');
                        break;
                    case 'escape':
                        e.preventDefault();
                        this.executeCommand('select');
                        break;
                }
            }
            
            // Ctrl+Key shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 's':
                        e.preventDefault();
                        this.executeCommand('save');
                        break;
                    case 'o':
                        e.preventDefault();
                        this.executeCommand('load');
                        break;
                    case 'a':
                        e.preventDefault();
                        window.lightController?.selectAll();
                        break;
                    case 'd':
                        e.preventDefault();
                        window.lightController?.clearSelection();
                        break;
                }
            }
        });
        
        console.log('⌨️ CAD keyboard shortcuts setup complete');
    }
    
    // Public methods for external integration
    setRibbonTab(tabName) {
        this.switchRibbonTab(tabName);
    }
    
    setLeftPanel(panelName) {
        this.switchLeftPanel(panelName);
    }
    
    setRightPanel(panelName) {
        this.switchRightPanel(panelName);
    }
    
    showCommandPalette() {
        const commandInput = document.getElementById('commandInput');
        if (commandInput) {
            commandInput.focus();
        }
    }
    
    updateZoomLevel(zoom) {
        const zoomElement = document.getElementById('zoom-level');
        if (zoomElement) {
            zoomElement.textContent = `${Math.round(zoom * 100)}%`;
        }
    }
}

class LightMapperController {
    constructor() {
        this.config = {};
        this.scenes = [];
        this.lights = [];
        this.mappings = [];
        this.areas = [];
        this.selectedLights = new Set(); // Keep for backwards compatibility
        this.selectedFloorplanLights = new Set(); // New selection system using entity IDs
        this.selectedScene = null;
        this.individualMode = false;
        this.selectedAreaId = null;
        this.sceneLightSettings = new Map(); // Track brightness, kelvin, color for each light in scene mode
        
        this.init();
    }
    
    async init() {
        try {
            // Initialize CAD interface first
            window.cadInterface = new CADInterfaceManager();
            
            // Don't initialize old entity panel - we use the new panel system
            // this.initializeEntityPanel();
            
            await this.loadConfig();
            await this.loadInitialData();
            this.setupEventListeners();
            this.showStatus('LightMapper CAD loaded successfully', 'success');
        } catch (error) {
            console.error('Initialization error:', error);
            this.showStatus('Failed to initialize application', 'error');
        }
    }
    
    async loadConfig() {
        try {
            console.log('🔧 Loading config from:', `${API_BASE}/api/config`);
            const response = await fetch(`${API_BASE}/api/internal/config`);
            if (!response.ok) {
                throw new Error(`Config request failed: ${response.status} ${response.statusText}`);
            }
            this.config = await response.json();
            console.log('✅ Config loaded successfully:', this.config);
            this.initializeDefaults();
        } catch (error) {
            console.error('❌ Error loading config:', error);
            throw error;
        }
    }
    
    setupWebSocketEventListeners() {
        // Wait for WebSocket client to be available
        const checkForWebSocket = () => {
            if (window.haWsClient) {
                console.log('📡 Setting up central WebSocket event listeners');
                
                // Listen for light state changes and update everything
                window.haWsClient.on('light_state_changed', (data) => {
                    console.log('💡 Central handler: Light state changed:', data.entityId);
                    
                    // Update the global light entities cache
                    if (window.lightEntities && data.state) {
                        window.lightEntities[data.entityId] = data.state;
                    }
                    
                    // Update the canvas if the light is on the floorplan
                    if (window.floorplanEditor) {
                        const canvasLights = window.floorplanEditor.canvas.getObjects().filter(obj => 
                            obj.lightObject && obj.entityId === data.entityId
                        );
                        
                        canvasLights.forEach(light => {
                            console.log('🎨 Updating canvas light:', light.entityId);
                            window.floorplanEditor.updateLightVisualState(light, data.state);
                        });
                    }
                    
                    // The LiveStatePanel will update itself through its own listener
                });
                
                window.haWsClient.on('connected', () => {
                    console.log('✅ WebSocket connected to Home Assistant');
                    this.showStatus('Connected to Home Assistant', 'success');
                });
                
                window.haWsClient.on('disconnected', () => {
                    console.log('❌ WebSocket disconnected from Home Assistant');
                    this.showStatus('Disconnected from Home Assistant', 'warning');
                });
                
            } else {
                // WebSocket client not ready yet, check again in 100ms
                setTimeout(checkForWebSocket, 100);
            }
        };
        
        checkForWebSocket();
    }
    
    initializeDefaults() {
        // Set default values from config (only if elements exist)
        const globalBrightness = document.getElementById('globalBrightness');
        if (globalBrightness) globalBrightness.value = this.config.defaults.brightness;
        
        const globalColorTemp = document.getElementById('globalColorTemp');
        if (globalColorTemp) globalColorTemp.value = this.config.defaults.colorTemp;
        
        const globalHue = document.getElementById('globalHue');
        if (globalHue) globalHue.value = this.config.defaults.hue;
        
        const globalSaturation = document.getElementById('globalSaturation');
        if (globalSaturation) globalSaturation.value = this.config.defaults.saturation;
        
        // Only call these methods if the global controls exist
        if (globalBrightness && globalColorTemp && globalHue && globalSaturation) {
            this.updateGlobalControlValues();
            this.updateColorPreview();
        }
    }
    
    async loadInitialData() {
        await Promise.all([
            this.loadScenes(),
            this.loadLights(),
            this.loadMappings(),
            this.loadAreas(),
            this.loadSavedFloorplans()
        ]);
    }
    
    async loadScenes() {
        try {
            const response = await fetch(`${API_BASE}/api/internal/scenes`);
            if (!response.ok) {
                throw new Error(`Scenes request failed: ${response.status} ${response.statusText}`);
            }
            this.scenes = await response.json();
            this.renderScenes();
        } catch (error) {
            console.error('Error loading scenes:', error);
            this.showStatus('Failed to load scenes', 'error');
        }
    }
    
    async loadLights() {
        try {
            const response = await fetch(`${API_BASE}/api/lights`);
            if (!response.ok) {
                throw new Error(`Lights request failed: ${response.status} ${response.statusText}`);
            }
            this.lights = await response.json();
            
            // Make lights available globally for floorplan editor
            window.lightEntities = {};
            this.lights.forEach(light => {
                window.lightEntities[light.entityId] = light;
            });
            
            // Entity panel now loads entities automatically through the new panel system
            // No need to manually call loadEntities
        } catch (error) {
            console.error('Error loading lights:', error);
            this.showStatus('Failed to load lights from Home Assistant', 'error');
        }
    }
    
    async loadMappings() {
        try {
            const response = await fetch(`${API_BASE}/api/internal/mappings`);
            if (!response.ok) {
                throw new Error(`Mappings request failed: ${response.status} ${response.statusText}`);
            }
            this.mappings = await response.json();
        } catch (error) {
            console.error('Error loading mappings:', error);
            this.showStatus('Failed to load light mappings', 'warning');
        }
    }

    async loadAreas() {
        try {
            const response = await fetch(`${API_BASE}/api/areas`);
            if (!response.ok) {
                throw new Error(`Areas request failed: ${response.status} ${response.statusText}`);
            }
            this.areas = await response.json();
            console.log('🏠 Areas loaded:', this.areas);
            this.populateAreaSelector();
        } catch (error) {
            console.error('❌ Failed to load areas:', error);
            this.areas = [];
            this.populateAreaSelector();
        }
    }

    setupEventListeners() {
        // Always initialize floorplan editor
        this.initializeFloorplanEditor();
        
        // Set up WebSocket listeners for real-time updates
        this.setupWebSocketEventListeners();

        // Header buttons
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }

        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.openSettings());
        }

        const notificationBtn = document.getElementById('notificationBtn');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.toggleNotificationPanel();
            });
        }

        const clearNotifications = document.getElementById('clearNotifications');
        if (clearNotifications) {
            clearNotifications.addEventListener('click', () => this.clearAllNotifications());
        }

        const closeNotifications = document.getElementById('closeNotifications');
        if (closeNotifications) {
            closeNotifications.addEventListener('click', () => this.closeNotificationPanel());
        }

        // Grid controls
        const clearSelection = document.getElementById('clearSelection');
        if (clearSelection) {
            clearSelection.addEventListener('click', () => this.clearSelection());
        }

        const selectAll = document.getElementById('selectAll');
        if (selectAll) {
            selectAll.addEventListener('click', () => this.selectAll());
        }

        // Removed captureState button - functionality now handled by Save Scene

        // Individual mode toggle
        const individualMode = document.getElementById('individualMode');
        if (individualMode) {
            individualMode.addEventListener('change', () => this.toggleControlMode());
        }

        // Scene controls (now in ribbon interface)
        const saveScene = document.getElementById('saveScene');
        if (saveScene) {
            saveScene.addEventListener('click', () => this.saveScene());
        }

        const applyScene = document.getElementById('applyScene');
        if (applyScene) {
            applyScene.addEventListener('click', () => this.applyScene());
        }

        // Settings modal
        const modalClose = document.querySelector('.modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', () => this.closeSettings());
        }

        const saveMappings = document.getElementById('saveMappings');
        if (saveMappings) {
            saveMappings.addEventListener('click', () => this.saveMappings());
        }

        // Setup control sliders
        this.setupControlSliders();
        
        // Entity panel is now in the right sidebar - no special setup needed
    }

    initializeFloorplanEditor() {
        // Always show floorplan mode
        if (!window.floorplanEditor) {
            console.log('🎨 Initializing FloorplanEditor...');
            window.floorplanEditor = new FloorplanEditor();
        }
        
        // Store global references for CAD interface integration
        window.lightController = this;
        window.sceneManager = this; // Keep backwards compatibility
        
        // Initialize the lights tab header text based on current mode
        this.updateLightsTabHeader();
        
        // Setup event listeners for panel buttons
        this.setupPanelEventListeners();
        
        this.renderFloorplanLightsList();
    }
    
    initializeEntityPanel() {
        console.log('🎛️ Initializing entity panel...');
        
        // Initialize entity panel manager
        window.entityPanel = new EntityPanelManager();
        
        console.log('✅ Entity panel initialized');
    }
    
    updateLightsTabHeader() {
        // Update the lights tab header based on current mode
        const lightsTabHeader = document.getElementById('lightsTabHeader');
        if (lightsTabHeader && window.floorplanEditor) {
            const isCurrentMode = window.floorplanEditor.showCurrentState;
            lightsTabHeader.textContent = isCurrentMode ? 'Live States' : 'Scene Lights';
            console.log('🔄 Updated lights tab header to:', lightsTabHeader.textContent);
        }
    }
    
    setupPanelEventListeners() {
        // Toggle All Collapse/Expand button
        const toggleAllBtn = document.getElementById('toggleAllCollapse');
        if (toggleAllBtn && !toggleAllBtn.dataset.listenerAdded) {
            toggleAllBtn.addEventListener('click', () => {
                this.toggleAllLightsCollapse();
            });
            toggleAllBtn.dataset.listenerAdded = 'true';
            console.log('✅ Toggle All Collapse button event listener added');
        }

        // Area selection functionality
        const areaSelector = document.getElementById('areaSelector');
        if (areaSelector && !areaSelector.dataset.listenerAdded) {
            areaSelector.addEventListener('change', (e) => {
                const previousArea = this.selectedArea;
                this.selectedArea = e.target.value;
                
                console.log('🏠 DEBUG - Area selection changed:');
                console.log('   Previous Area:', previousArea);
                console.log('   New Area ID:', this.selectedArea);
                console.log('   New Area Name:', this.getAreaName(this.selectedArea));
                
                this.showStatus(`Selected area: ${this.getAreaName(this.selectedArea)}`, 'info');
                
                // Show what floorplans exist for debugging
                this.debugLocalStorageFloorplans();
            });
            areaSelector.dataset.listenerAdded = 'true';
        }

        // Save floorplan button
        const saveFloorplanBtn = document.getElementById('save-floorplan-btn');
        if (saveFloorplanBtn && !saveFloorplanBtn.dataset.listenerAdded) {
            saveFloorplanBtn.addEventListener('click', () => {
                this.saveFloorplanLayout();
            });
            saveFloorplanBtn.dataset.listenerAdded = 'true';
        }

        // Load floorplan button
        const loadFloorplanBtn = document.getElementById('load-floorplan-btn');
        if (loadFloorplanBtn && !loadFloorplanBtn.dataset.listenerAdded) {
            loadFloorplanBtn.addEventListener('click', () => {
                this.loadFloorplanLayout();
            });
            loadFloorplanBtn.dataset.listenerAdded = 'true';
        }
    }

    populateAreaSelector() {
        const areaSelector = document.getElementById('areaSelector');
        if (!areaSelector) return;

        // Clear existing options
        areaSelector.innerHTML = '';

        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = this.areas.length === 0 ? 'No areas found' : 'Select an area...';
        areaSelector.appendChild(defaultOption);

        // Add area options
        if (this.areas && this.areas.length > 0) {
            // Sort areas alphabetically by name
            const sortedAreas = [...this.areas].sort((a, b) => {
                const nameA = a.name || a.id || '';
                const nameB = b.name || b.id || '';
                return nameA.localeCompare(nameB);
            });

            sortedAreas.forEach(area => {
                const option = document.createElement('option');
                option.value = area.id;  // Fixed: use area.id instead of area.area_id
                option.textContent = area.name || area.id;
                areaSelector.appendChild(option);
            });

            console.log(`🏠 Populated area selector with ${this.areas.length} areas`);
        }
    }

    getAreaName(areaId) {
        if (!areaId || !this.areas) return 'Unknown';
        const area = this.areas.find(a => a.id === areaId);  // Fixed: use area.id instead of area.area_id
        return area ? (area.name || area.id) : areaId;
    }

    async saveFloorplanLayout() {
        if (!this.selectedArea || this.selectedArea === '' || this.selectedArea === 'undefined') {
            this.showStatus('Please select a valid area first', 'warning');
            console.log('❌ Save blocked: Invalid selectedArea:', this.selectedArea);
            return;
        }

        if (!window.floorplanEditor) {
            this.showStatus('Floorplan editor not available', 'error');
            return;
        }

        try {
            // Get the floorplan layout data
            const layoutData = window.floorplanEditor.saveLayout();
            
            // Enhanced debugging
            const storageKey = `lightmapper_floorplan_${this.selectedArea}`;
            console.log('🔍 DEBUG - Save operation:');
            console.log('   Selected Area ID:', this.selectedArea);
            console.log('   Selected Area Name:', this.getAreaName(this.selectedArea));
            console.log('   Storage Key:', storageKey);
            console.log('   Layout Data Length:', layoutData ? JSON.stringify(layoutData).length : 'NULL');
            
            // Add metadata
            const saveData = {
                area_id: this.selectedArea,
                area_name: this.getAreaName(this.selectedArea),
                layout: layoutData,
                version: '3.0.72',
                timestamp: new Date().toISOString(),
                lights_count: this.getAssignedFloorplanEntities().length
            };

            // Save to localStorage with area-specific key
            localStorage.setItem(storageKey, JSON.stringify(saveData));
            
            console.log('💾 Floorplan saved to localStorage with key:', storageKey);
            console.log('💾 Save data summary:', {
                area_id: saveData.area_id,
                area_name: saveData.area_name,
                version: saveData.version,
                lights_count: saveData.lights_count,
                timestamp: saveData.timestamp
            });
            
            this.showStatus(`Floorplan saved for ${this.getAreaName(this.selectedArea)}`, 'success');
            
            // Show localStorage inspector for debugging
            this.debugLocalStorageFloorplans();
            
            // Refresh saved floorplans list
            await this.loadSavedFloorplans();
            
        } catch (error) {
            console.error('❌ Failed to save floorplan:', error);
            this.showStatus('Failed to save floorplan', 'error');
        }
    }

    async loadFloorplanLayout() {
        if (!this.selectedArea) {
            this.showStatus('Please select an area first', 'warning');
            return;
        }

        // Show immediate loading state on canvas
        if (window.floorplanEditor) {
            window.floorplanEditor.showLoadingState();
        }

        try {
            // Enhanced debugging
            const storageKey = `lightmapper_floorplan_${this.selectedArea}`;
            console.log('🔍 DEBUG - Load operation:');
            console.log('   Selected Area ID:', this.selectedArea);
            console.log('   Selected Area Name:', this.getAreaName(this.selectedArea));
            console.log('   Storage Key:', storageKey);
            
            // Show localStorage inspector for debugging
            this.debugLocalStorageFloorplans();
            
            // Load saved floorplan from localStorage for the selected area
            const savedDataString = localStorage.getItem(storageKey);
            
            console.log('   Found data in localStorage:', savedDataString ? 'YES' : 'NO');
            if (savedDataString) {
                console.log('   Data length:', savedDataString.length);
            }
            
            if (!savedDataString) {
                // Hide loading state on error
                if (window.floorplanEditor) {
                    window.floorplanEditor.hideLoadingState();
                }
                this.showStatus('No saved floorplan found for this area', 'warning');
                return;
            }

            const savedData = JSON.parse(savedDataString);
            
            console.log('📂 Loaded data summary:', {
                area_id: savedData.area_id,
                area_name: savedData.area_name,
                version: savedData.version,
                lights_count: savedData.lights_count,
                timestamp: savedData.timestamp,
                has_layout: !!savedData.layout
            });
            
            if (!savedData.layout) {
                // Hide loading state on error
                if (window.floorplanEditor) {
                    window.floorplanEditor.hideLoadingState();
                }
                this.showStatus('Invalid floorplan data', 'error');
                return;
            }

            // Load the layout into the floorplan editor
            if (window.floorplanEditor) {
                // Pass a callback to be called when loading is complete
                window.floorplanEditor.loadLayout(savedData.layout, () => {
                    console.log('📂 Floorplan loaded successfully for area:', this.selectedArea);
                    this.showStatus(`Floorplan loaded for ${this.getAreaName(this.selectedArea)} (saved ${new Date(savedData.timestamp).toLocaleString()})`, 'success');
                    
                    // Hide loading state
                    window.floorplanEditor.hideLoadingState();
                    
                    // Refresh the lights list to show loaded entities (after loading is complete)
                    this.renderFloorplanLightsList();
                });
            } else {
                // Hide loading state on error
                window.floorplanEditor.hideLoadingState();
                this.showStatus('Floorplan editor not available', 'error');
            }
            
        } catch (error) {
            console.error('❌ Failed to load floorplan:', error);
            // Hide loading state on error
            if (window.floorplanEditor) {
                window.floorplanEditor.hideLoadingState();
            }
            this.showStatus('Failed to load floorplan', 'error');
        }
    }

    async loadSavedFloorplans() {
        try {
            // Load all saved floorplans from localStorage
            this.savedFloorplans = [];
            
            // Iterate through all localStorage keys to find floorplan data
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('lightmapper_floorplan_')) {
                    try {
                        const savedDataString = localStorage.getItem(key);
                        const savedData = JSON.parse(savedDataString);
                        
                        // Extract area_id from the key
                        const areaId = key.replace('lightmapper_floorplan_', '');
                        
                        // Add summary info for the saved floorplan
                        this.savedFloorplans.push({
                            area_id: areaId,
                            area_name: savedData.area_name,
                            version: savedData.version,
                            timestamp: savedData.timestamp,
                            lights_count: savedData.lights_count
                        });
                    } catch (parseError) {
                        console.warn(`❌ Failed to parse saved floorplan for key ${key}:`, parseError);
                    }
                }
            }
            
            // Sort by most recently saved
            this.savedFloorplans.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            console.log('📋 Saved floorplans loaded from localStorage:', this.savedFloorplans);
        } catch (error) {
            console.error('❌ Failed to load saved floorplans:', error);
            this.savedFloorplans = [];
        }
    }

    // Utility function to check if a saved floorplan exists for the current area
    hasSavedFloorplan(areaId = null) {
        const targetAreaId = areaId || this.selectedArea;
        if (!targetAreaId) return false;
        
        const storageKey = `lightmapper_floorplan_${targetAreaId}`;
        return localStorage.getItem(storageKey) !== null;
    }

    // Utility function to delete a saved floorplan (for future use)
    deleteSavedFloorplan(areaId) {
        try {
            const storageKey = `lightmapper_floorplan_${areaId}`;
            localStorage.removeItem(storageKey);
            console.log(`🗑️ Deleted saved floorplan for area: ${areaId}`);
            
            // Refresh the saved floorplans list
            this.loadSavedFloorplans();
            
            return true;
        } catch (error) {
            console.error('❌ Failed to delete saved floorplan:', error);
            return false;
        }
    }

    // Debug function to inspect all localStorage floorplan data
    debugLocalStorageFloorplans() {
        console.log('🔍 DEBUG - LocalStorage Floorplan Inspector:');
        console.log('================================================');
        
        const floorplanKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('lightmapper_floorplan_')) {
                floorplanKeys.push(key);
            }
        }
        
        console.log(`Found ${floorplanKeys.length} saved floorplan(s):`);
        
        if (floorplanKeys.length === 0) {
            console.log('   (No saved floorplans found)');
        } else {
            floorplanKeys.forEach(key => {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    const areaId = key.replace('lightmapper_floorplan_', '');
                    console.log(`   📁 ${key}:`);
                    console.log(`      Area ID: ${data.area_id}`);
                    console.log(`      Area Name: ${data.area_name}`);
                    console.log(`      Timestamp: ${data.timestamp}`);
                    console.log(`      Lights Count: ${data.lights_count}`);
                    console.log(`      Has Layout: ${!!data.layout}`);
                    console.log(`      Layout Size: ${data.layout ? JSON.stringify(data.layout).length : 0} chars`);
                } catch (error) {
                    console.log(`   ❌ ${key}: CORRUPTED DATA`);
                }
            });
        }
        
        console.log('================================================');
        
        // Also expose as global function for manual debugging
        window.debugFloorplans = () => this.debugLocalStorageFloorplans();
        
        // Auto-cleanup corrupted entries
        this.cleanupCorruptedFloorplans();
        
        return floorplanKeys.length;
    }

    // Auto-cleanup corrupted/invalid floorplan entries
    cleanupCorruptedFloorplans() {
        const keysToCleanup = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('lightmapper_floorplan_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    
                    // Remove entries with undefined area_id or missing layout data
                    if (!data.area_id || data.area_id === 'undefined' || !data.layout) {
                        keysToCleanup.push(key);
                        console.log(`🧹 Marking for cleanup: ${key} (area_id: ${data.area_id}, has_layout: ${!!data.layout})`);
                    }
                } catch (error) {
                    // Remove corrupted entries that can't be parsed
                    keysToCleanup.push(key);
                    console.log(`🧹 Marking corrupted entry for cleanup: ${key}`);
                }
            }
        }
        
        // Remove corrupted entries
        keysToCleanup.forEach(key => {
            localStorage.removeItem(key);
            console.log(`✅ Cleaned up corrupted entry: ${key}`);
        });
        
        if (keysToCleanup.length > 0) {
            console.log(`🧹 Cleanup complete: removed ${keysToCleanup.length} corrupted floorplan(s)`);
        }
        
        return keysToCleanup.length;
    }

    // Debug function to clear all floorplan data (for testing)
    clearAllFloorplanData() {
        console.log('🗑️ DEBUG - Clearing all floorplan data from localStorage...');
        
        const keysToDelete = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('lightmapper_floorplan_')) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => {
            localStorage.removeItem(key);
            console.log(`   Deleted: ${key}`);
        });
        
        console.log(`✅ Cleared ${keysToDelete.length} floorplan(s) from localStorage`);
        
        // Refresh the saved floorplans list
        this.loadSavedFloorplans();
        
        // Expose as global function for manual debugging
        window.clearFloorplans = () => this.clearAllFloorplanData();
        window.cleanupFloorplans = () => this.cleanupCorruptedFloorplans();
        
        return keysToDelete.length;
    }
    
    renderFloorplanLightsList() {
        const container = document.getElementById('floorplanLightsList');
        container.innerHTML = '';
        
        // Get all assigned entities from floorplan lights
        const assignedEntities = this.getAssignedFloorplanEntities();
        
        if (assignedEntities.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">No lights assigned in floorplan yet. Add lights to the floorplan and assign entities to see them here.</p>';
            return;
        }
        
        // Check if we're in current state mode
        const isCurrentStateMode = window.floorplanEditor?.showCurrentState || false;
        
        // Sort entities alphabetically by friendly name
        assignedEntities.sort((a, b) => {
            const nameA = (a.friendly_name && a.friendly_name !== a.entity_id 
                ? a.friendly_name 
                : a.entity_id.replace(/^light\./, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())).toLowerCase();
            const nameB = (b.friendly_name && b.friendly_name !== b.entity_id 
                ? b.friendly_name 
                : b.entity_id.replace(/^light\./, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())).toLowerCase();
            return nameA.localeCompare(nameB);
        });
        
        assignedEntities.forEach(entity => {
            const lightCard = document.createElement('div');
            lightCard.className = 'light-card';
            lightCard.dataset.entityId = entity.entity_id;
            
            let displaySettings;
            let isActive = false;
            
            if (isCurrentStateMode) {
                // In current state mode, show actual light values from Home Assistant
                const currentEntity = window.lightEntities ? window.lightEntities[entity.entity_id] : null;
                if (currentEntity && currentEntity.state === 'on') {
                    isActive = true;
                    
                    // Extract current light values
                    const brightness = currentEntity.attributes?.brightness 
                        ? Math.round((currentEntity.attributes.brightness / 255) * 100) 
                        : null;
                    
                    const kelvin = currentEntity.attributes?.color_temp_kelvin || null;
                    
                    const hsColor = currentEntity.attributes?.hs_color;
                    const color = hsColor ? { hue: hsColor[0], saturation: hsColor[1] } : null;
                    
                    displaySettings = {
                        brightness: brightness,
                        kelvin: kelvin,
                        color: color
                    };
                } else {
                    // Light is off or no entity data
                    displaySettings = {
                        brightness: null,
                        kelvin: null,
                        color: null
                    };
                }
            } else {
                // In scene mode, show scene settings
                displaySettings = this.sceneLightSettings.get(entity.entity_id) || {
                    brightness: null,  // null means "Not set"
                    kelvin: null,      // null means "Not set" 
                    color: null        // null means "Not set"
                };
                isActive = Object.values(displaySettings).some(val => val !== null);
            }
            
            const safeId = entity.entity_id.replace(/\./g, '_');
            
            // Generate a friendly display name
            const friendlyName = entity.friendly_name && entity.friendly_name !== entity.entity_id 
                ? entity.friendly_name 
                : entity.entity_id.replace(/^light\./, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            // Helper function to format color value display
            const formatColorValue = (color) => {
                if (!color) return 'Not Set';
                const hue = Math.round(color.hue);
                const sat = Math.round(color.saturation);
                return `HSV(${hue}°,${sat}%)`;
            };
            
            // Helper function to get color preview style
            const getColorPreviewStyle = (color) => {
                if (!color) return '';
                return `<div class="chip-color-preview" style="background-color: hsl(${color.hue}, ${color.saturation}%, 50%)"></div>`;
            };
            
            lightCard.innerHTML = `
                <div class="light-header" data-light-toggle="${safeId}">
                    <div class="light-icon">•</div>
                    <div class="light-info">
                        <div class="light-label">${friendlyName}</div>
                        <div class="light-entity-id">${entity.entity_id}</div>
                    </div>
                    <div class="light-collapse-toggle expanded" data-light-toggle="${safeId}">
                        <i class="fas fa-chevron-down"></i>
                    </div>
                </div>
                <div class="light-scene-controls expanded" id="controls_container_${safeId}">
                    <div class="property-chips">
                        <div class="property-chip ${displaySettings.brightness !== null ? 'active' : ''}" 
                             data-property="brightness" data-entity="${entity.entity_id}">
                            <span class="chip-icon">●</span>
                            <span class="chip-label">Brightness</span>
                            <span class="chip-value">${displaySettings.brightness !== null ? displaySettings.brightness + '%' : 'Not Set'}</span>
                        </div>
                        <div class="property-chip ${displaySettings.kelvin !== null ? 'active' : ''}" 
                             data-property="kelvin" data-entity="${entity.entity_id}">
                            <span class="chip-icon">K</span>
                            <span class="chip-label">Kelvin</span>
                            <span class="chip-value">${displaySettings.kelvin !== null ? displaySettings.kelvin + 'K' : 'Not Set'}</span>
                        </div>
                        <div class="property-chip ${displaySettings.color !== null ? 'active' : ''}" 
                             data-property="color" data-entity="${entity.entity_id}">
                            <span class="chip-icon">●</span>
                            <span class="chip-label">Color</span>
                            <span class="chip-value">${formatColorValue(displaySettings.color)}</span>
                            ${getColorPreviewStyle(displaySettings.color)}
                        </div>
                    </div>
                    
                    <!-- Inline controls (hidden by default) -->
                    <div class="inline-controls" id="controls_${safeId}" style="display: none;">
                        <div class="inline-brightness" style="display: none;">
                            <label>Brightness</label>
                            <input type="range" id="brightness_value_${safeId}" min="1" max="100" 
                                   value="${displaySettings.brightness || 50}">
                            <span id="brightness_display_${safeId}">${displaySettings.brightness || 50}%</span>
                        </div>
                        <div class="inline-kelvin" style="display: none;">
                            <label>Kelvin</label>
                            <input type="range" id="kelvin_value_${safeId}" min="2000" max="6500" step="100"
                                   value="${displaySettings.kelvin || 3000}">
                            <span id="kelvin_display_${safeId}">${displaySettings.kelvin || 3000}K</span>
                        </div>
                    </div>
                </div>
            `;
            
            container.appendChild(lightCard);
            
            // Setup event listeners for this light's controls (only in scene mode)
            if (!isCurrentStateMode) {
                this.setupSceneLightControls(entity.entity_id, safeId);
            }
            
            // Setup collapsible functionality
            this.setupLightCollapse(safeId);
        });
        
        // Update the toggle all button state
        this.updateToggleAllButtonState();
    }
    
    updateToggleAllButtonState() {
        const toggleButton = document.getElementById('toggleAllCollapse');
        const toggleIcon = toggleButton?.querySelector('i');
        
        if (!toggleButton || !toggleIcon) return;
        
        // Check current state of all lights
        const lightCards = document.querySelectorAll('.light-card');
        if (lightCards.length === 0) return;
        
        // Count expanded lights
        let expandedCount = 0;
        lightCards.forEach(lightCard => {
            const controlsContainer = lightCard.querySelector('.light-scene-controls');
            if (controlsContainer?.classList.contains('expanded')) {
                expandedCount++;
            }
        });
        
        // Update button based on majority state
        const allExpanded = expandedCount === lightCards.length;
        const allCollapsed = expandedCount === 0;
        
        if (allExpanded) {
            // All are expanded, show collapse icon
            toggleIcon.className = 'fas fa-chevron-down';
            toggleButton.title = 'Collapse All';
        } else {
            // Some or all are collapsed, show expand icon
            toggleIcon.className = 'fas fa-chevron-right';
            toggleButton.title = 'Expand All';
        }
    }
    
    toggleAllLightsCollapse() {
        console.log('🔄 Toggle all lights collapse/expand');
        
        // Get all light cards
        const lightCards = document.querySelectorAll('.light-card');
        const toggleButton = document.getElementById('toggleAllCollapse');
        const toggleIcon = toggleButton.querySelector('i');
        
        if (lightCards.length === 0) {
            console.log('⚠️ No light cards found');
            return;
        }
        
        // Check current state by looking at the first light card
        const firstCard = lightCards[0];
        const firstControlsContainer = firstCard.querySelector('.light-scene-controls');
        const isCurrentlyExpanded = firstControlsContainer?.classList.contains('expanded');
        
        console.log(`🔍 Current state: ${isCurrentlyExpanded ? 'expanded' : 'collapsed'}`);
        
        // Toggle all lights to opposite state
        lightCards.forEach(lightCard => {
            const safeId = lightCard.dataset.entityId?.replace(/\./g, '_');
            if (safeId) {
                const controlsContainer = lightCard.querySelector('.light-scene-controls');
                const toggleElements = lightCard.querySelectorAll(`[data-light-toggle="${safeId}"]`);
                const chevronIcon = lightCard.querySelector(`[data-light-toggle="${safeId}"] i`);
                
                if (isCurrentlyExpanded) {
                    // Collapse this light
                    controlsContainer?.classList.remove('expanded');
                    controlsContainer?.classList.add('collapsed');
                    toggleElements.forEach(el => el.classList.remove('expanded'));
                    toggleElements.forEach(el => el.classList.add('collapsed'));
                    if (chevronIcon) {
                        chevronIcon.className = 'fas fa-chevron-right';
                    }
                } else {
                    // Expand this light
                    controlsContainer?.classList.remove('collapsed');
                    controlsContainer?.classList.add('expanded');
                    toggleElements.forEach(el => el.classList.remove('collapsed'));
                    toggleElements.forEach(el => el.classList.add('expanded'));
                    if (chevronIcon) {
                        chevronIcon.className = 'fas fa-chevron-down';
                    }
                }
            }
        });
        
        // Update the toggle all button icon and tooltip
        if (isCurrentlyExpanded) {
            // We just collapsed all, so show expand icon
            toggleIcon.className = 'fas fa-chevron-right';
            toggleButton.title = 'Expand All';
            console.log('✅ Collapsed all lights');
        } else {
            // We just expanded all, so show collapse icon  
            toggleIcon.className = 'fas fa-chevron-down';
            toggleButton.title = 'Collapse All';
            console.log('✅ Expanded all lights');
        }
        
        // Show status message
        const message = isCurrentlyExpanded ? 'All lights collapsed' : 'All lights expanded';
        console.log(`💬 Status: ${message}`);
        this.showStatus(message, 'info');
    }
    
    getAssignedFloorplanEntities() {
        console.log('🔍 getAssignedFloorplanEntities called');
        const assignedEntities = [];
        
        if (window.floorplanEditor?.canvas) {
            const lights = window.floorplanEditor.canvas.getObjects().filter(obj => obj.lightObject === true);
            console.log('🔍 Found lights on canvas:', lights.length);
            
            lights.forEach(light => {
                console.log('🔍 Checking light:', {
                    entityId: light.entityId,
                    hasEntity: !!light.entityId
                });
                
                if (light.entityId) {
                    // Try multiple ways to find the entity data
                    let entityData = null;
                    
                    // Method 1: Check this.lights array
                    if (this.lights && Array.isArray(this.lights)) {
                        entityData = this.lights.find(l => l.entity_id === light.entityId);
                        console.log('🔍 Method 1 (this.lights):', !!entityData);
                    }
                    
                    // Method 2: Check window.lightEntities
                    if (!entityData && window.lightEntities) {
                        const entity = window.lightEntities[light.entityId];
                        if (entity) {
                            entityData = {
                                entity_id: light.entityId,
                                friendly_name: entity.attributes?.friendly_name || entity.friendly_name || light.entityId,
                                attributes: entity.attributes
                            };
                            console.log('🔍 Method 2 (window.lightEntities):', !!entityData);
                        }
                    }
                    
                    // Method 3: Create minimal entity data as fallback
                    if (!entityData) {
                        entityData = {
                            entity_id: light.entityId,
                            friendly_name: light.entityId,
                            attributes: {}
                        };
                        console.log('🔍 Method 3 (fallback):', !!entityData);
                    }
                    
                    if (entityData) {
                        assignedEntities.push(entityData);
                        console.log('✅ Added entity to list:', entityData.entity_id);
                    }
                }
            });
        }
        
        console.log('🔍 Total assigned entities found:', assignedEntities.length);
        return assignedEntities;
    }
    
    setupSceneLightControls(entityId, safeId) {
        // Get all property chips for this light
        const propertyChips = document.querySelectorAll(`[data-entity="${entityId}"]`);
        
        propertyChips.forEach(chip => {
            chip.addEventListener('click', (e) => {
                const property = chip.dataset.property;
                const isActive = chip.classList.contains('active');
                
                if (property === 'color') {
                    // Handle color chip - show color picker popup
                    if (isActive) {
                        // Turn off color
                        this.setSceneLightProperty(entityId, 'color', null);
                        this.updateChipDisplay(chip, property, null);
                    } else {
                        // Show color picker
                        this.showColorPicker(entityId, chip);
                    }
                } else {
                    // Handle brightness/kelvin chips
                    if (isActive) {
                        // Turn off property
                        this.setSceneLightProperty(entityId, property, null);
                        this.updateChipDisplay(chip, property, null);
                        this.hideInlineControls(safeId, property);
                    } else {
                        // Turn on property and show inline controls
                        const defaultValue = property === 'brightness' ? 80 : 3000;
                        this.setSceneLightProperty(entityId, property, defaultValue);
                        this.updateChipDisplay(chip, property, defaultValue);
                        this.showInlineControls(safeId, property, defaultValue);
                    }
                }
            });
        });
        
        // Setup inline control listeners
        const brightnessSlider = document.getElementById(`brightness_value_${safeId}`);
        const kelvinSlider = document.getElementById(`kelvin_value_${safeId}`);
        
        if (brightnessSlider) {
            brightnessSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.setSceneLightProperty(entityId, 'brightness', value);
                const chip = document.querySelector(`[data-entity="${entityId}"][data-property="brightness"]`);
                this.updateChipDisplay(chip, 'brightness', value);
                document.getElementById(`brightness_display_${safeId}`).textContent = value + '%';
            });
        }
        
        if (kelvinSlider) {
            kelvinSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.setSceneLightProperty(entityId, 'kelvin', value);
                const chip = document.querySelector(`[data-entity="${entityId}"][data-property="kelvin"]`);
                this.updateChipDisplay(chip, 'kelvin', value);
                document.getElementById(`kelvin_display_${safeId}`).textContent = value + 'K';
            });
        }
    }
    
    setupLightCollapse(safeId) {
        // Get the toggle elements for this light
        const toggleElements = document.querySelectorAll(`[data-light-toggle="${safeId}"]`);
        const controlsContainer = document.getElementById(`controls_container_${safeId}`);
        
        if (!controlsContainer || toggleElements.length === 0) return;
        
        // Add click event listener to both header and toggle button
        toggleElements.forEach(element => {
            element.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleLightCollapse(safeId);
            });
        });
    }
    
    toggleLightCollapse(safeId) {
        const controlsContainer = document.getElementById(`controls_container_${safeId}`);
        const toggleIcon = document.querySelector(`[data-light-toggle="${safeId}"] i`);
        const toggleButton = document.querySelector(`[data-light-toggle="${safeId}"].light-collapse-toggle`);
        
        if (!controlsContainer || !toggleIcon || !toggleButton) return;
        
        const isExpanded = controlsContainer.classList.contains('expanded');
        
        if (isExpanded) {
            // Collapse
            controlsContainer.classList.remove('expanded');
            controlsContainer.classList.add('collapsed');
            toggleButton.classList.remove('expanded');
            toggleButton.classList.add('collapsed');
            toggleIcon.className = 'fas fa-chevron-right';
        } else {
            // Expand
            controlsContainer.classList.remove('collapsed');
            controlsContainer.classList.add('expanded');
            toggleButton.classList.remove('collapsed');
            toggleButton.classList.add('expanded');
            toggleIcon.className = 'fas fa-chevron-down';
        }
        
        // Update the toggle all button state after individual toggle
        this.updateToggleAllButtonState();
    }
    
    updateChipDisplay(chip, property, value) {
        const valueSpan = chip.querySelector('.chip-value');
        const colorPreview = chip.querySelector('.chip-color-preview');
        
        if (value === null) {
            chip.classList.remove('active');
            valueSpan.textContent = 'Not Set';
            if (colorPreview) {
                colorPreview.remove();
            }
        } else {
            chip.classList.add('active');
            if (property === 'brightness') {
                valueSpan.textContent = value + '%';
            } else if (property === 'kelvin') {
                valueSpan.textContent = value + 'K';
            } else if (property === 'color') {
                valueSpan.textContent = 'Set';
                if (!colorPreview) {
                    const preview = document.createElement('div');
                    preview.className = 'chip-color-preview';
                    chip.appendChild(preview);
                }
                const preview = chip.querySelector('.chip-color-preview');
                preview.style.backgroundColor = `hsl(${value.hue}, ${value.saturation}%, 50%)`;
            }
        }
    }
    
    showInlineControls(safeId, property, value) {
        const controls = document.getElementById(`controls_${safeId}`);
        const propertyControl = controls.querySelector(`.inline-${property}`);
        
        controls.style.display = 'block';
        propertyControl.style.display = 'flex';
        
        // Update the slider value
        const slider = propertyControl.querySelector('input[type="range"]');
        const display = propertyControl.querySelector('span');
        slider.value = value;
        display.textContent = property === 'brightness' ? value + '%' : value + 'K';
    }
    
    hideInlineControls(safeId, property) {
        const controls = document.getElementById(`controls_${safeId}`);
        const propertyControl = controls.querySelector(`.inline-${property}`);
        
        propertyControl.style.display = 'none';
        
        // Check if any controls are still visible
        const visibleControls = controls.querySelectorAll('.inline-brightness[style*="flex"], .inline-kelvin[style*="flex"]');
        if (visibleControls.length === 0) {
            controls.style.display = 'none';
        }
    }
    
    showColorPicker(entityId, chip) {
        const currentSettings = this.sceneLightSettings.get(entityId) || {};
        const currentColor = currentSettings.color || { hue: 0, saturation: 100 };
        
        console.log('🎨 Opening color picker for', entityId, 'with stored color:', currentColor);
        console.log('🎨 Current scene light settings:', this.sceneLightSettings.get(entityId));
        
        // Convert HSV to RGB for the color picker
        // Note: hsvToRgb expects hue: 0-360, saturation: 0-100, value: 0-100
        const rgb = this.hsvToRgb(currentColor.hue, currentColor.saturation, 100);
        const currentHex = this.rgbToHex(Math.round(rgb.r), Math.round(rgb.g), Math.round(rgb.b));
        
        console.log('🎨 Converted to RGB:', rgb, 'Hex:', currentHex);
        
        // Create enhanced color picker popup
        const popup = document.createElement('div');
        popup.className = 'color-picker-popup';
        popup.innerHTML = `
            <div class="color-picker-content enhanced">
                <div class="color-picker-header">
                    <h3>Choose Light Color</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="color-picker-body">
                    <div class="color-picker-main">
                        <div class="color-picker-visual">
                            <div class="color-picker-native">
                                <input type="color" id="nativeColorPicker" value="${currentHex}">
                                <label for="nativeColorPicker">
                                    <i class="fas fa-palette"></i>
                                    Color Wheel
                                </label>
                            </div>
                        </div>
                        <div class="color-inputs-section">
                            <div class="rgb-inputs">
                                <div class="rgb-input-group">
                                    <input type="number" id="redInput" min="0" max="255" value="${Math.round(rgb.r)}">
                                    <label>R</label>
                                </div>
                                <div class="rgb-input-group">
                                    <input type="number" id="greenInput" min="0" max="255" value="${Math.round(rgb.g)}">
                                    <label>G</label>
                                </div>
                                <div class="rgb-input-group">
                                    <input type="number" id="blueInput" min="0" max="255" value="${Math.round(rgb.b)}">
                                    <label>B</label>
                                </div>
                            </div>
                            <div class="hex-input-section">
                                <div class="hex-input-group">
                                    <input type="text" id="hexInput" value="${currentHex}" maxlength="7" placeholder="#FFFFFF">
                                    <label>HEX</label>
                                </div>
                            </div>
                            <div class="hsv-sliders" id="hsvSliders" style="margin-bottom: 30px; padding-bottom: 20px;">
                                <div class="slider-group" style="margin-bottom: 15px;">
                                    <label style="display: block; margin-bottom: 5px;">Hue</label>
                                    <input type="range" id="hueSlider" min="0" max="360" value="${currentColor.hue}" 
                                           style="width: 100%; pointer-events: auto !important; cursor: pointer !important; z-index: 1000; position: relative;">
                                    <span id="hueValue" style="display: block; text-align: center; margin-top: 5px;">${currentColor.hue}°</span>
                                </div>
                                <div class="slider-group" style="margin-bottom: 15px;">
                                    <label style="display: block; margin-bottom: 5px;">Saturation</label>
                                    <input type="range" id="saturationSlider" min="0" max="100" value="${currentColor.saturation}"
                                           style="width: 100%; pointer-events: auto !important; cursor: pointer !important; z-index: 1000; position: relative;">
                                    <span id="saturationValue" style="display: block; text-align: center; margin-top: 5px;">${currentColor.saturation}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="color-picker-actions">
                        <button class="btn btn-primary" id="applyColor">Apply Color</button>
                        <button class="btn btn-secondary" id="cancelColor">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Get all the elements
        const nativeColorPicker = popup.querySelector('#nativeColorPicker');
        const redInput = popup.querySelector('#redInput');
        const greenInput = popup.querySelector('#greenInput');
        const blueInput = popup.querySelector('#blueInput');
        const hexInput = popup.querySelector('#hexInput');
        const hueSlider = popup.querySelector('#hueSlider');
        const saturationSlider = popup.querySelector('#saturationSlider');
        const hueValue = popup.querySelector('#hueValue');
        const saturationValue = popup.querySelector('#saturationValue');
        
        const updateColorPreview = () => {
            const r = parseInt(redInput.value) || 0;
            const g = parseInt(greenInput.value) || 0;
            const b = parseInt(blueInput.value) || 0;
            
            console.log('🎨 Updating color preview with RGB:', { r, g, b });
            
            // Update hex picker to show the current color
            const hex = rgbToHexLocal(r, g, b);
            nativeColorPicker.value = hex;
            hexInput.value = hex;
            console.log('🎨 Updated hex picker and input to:', hex);
            
            // Update HSV sliders (only if this wasn't triggered by HSV slider change)
            const hsv = rgbToHsvLocal(r, g, b);
            const hue = Math.round(hsv.h * 360);
            const saturation = Math.round(hsv.s * 100);
            hueSlider.value = hue;
            saturationSlider.value = saturation;
            hueValue.textContent = hue + '°';
            saturationValue.textContent = saturation + '%';
            
            // Update floorplan light color in real-time (temporarily set color for preview)
            const tempSettings = this.sceneLightSettings.get(entityId) || {};
            const originalColor = tempSettings.color;
            tempSettings.color = { hue, saturation };
            this.updateFloorplanLightFromSceneSettings(entityId);
            // Don't restore original color since this is just a preview
        };
        
        // Local RGB to Hex conversion
        const rgbToHexLocal = (r, g, b) => {
            return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        };
        
        // Local RGB to HSV conversion
        const rgbToHsvLocal = (r, g, b) => {
            r /= 255;
            g /= 255;
            b /= 255;
            
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const delta = max - min;
            
            let h = 0;
            const s = max === 0 ? 0 : delta / max;
            const v = max;
            
            if (delta !== 0) {
                if (max === r) {
                    h = ((g - b) / delta) % 6;
                } else if (max === g) {
                    h = (b - r) / delta + 2;
                } else {
                    h = (r - g) / delta + 4;
                }
                h /= 6;
                if (h < 0) h += 1;
            }
            
            return { h, s, v };
        };
        
        const updateFromNative = () => {
            const hex = nativeColorPicker.value;
            console.log('🎨 Native color picker changed to:', hex);
            const rgb = hexToRgbLocal(hex);
            redInput.value = rgb.r;
            greenInput.value = rgb.g;
            blueInput.value = rgb.b;
            hexInput.value = hex;
            updateColorPreview();
        };
        
        const updateFromHex = () => {
            let hex = hexInput.value.trim();
            if (!hex.startsWith('#')) {
                hex = '#' + hex;
                hexInput.value = hex;
            }
            console.log('🎨 Hex input changed to:', hex);
            const rgb = hexToRgbLocal(hex);
            redInput.value = rgb.r;
            greenInput.value = rgb.g;
            blueInput.value = rgb.b;
            nativeColorPicker.value = hex;
            updateColorPreview();
        };
        
        // Local Hex to RGB conversion
        const hexToRgbLocal = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : { r: 0, g: 0, b: 0 };
        };
        
        const updateFromHSV = () => {
            const hue = parseInt(hueSlider.value);
            const saturation = parseInt(saturationSlider.value);
            console.log('🎨 HSV slider changed:', { hue, saturation });
            
            // Convert HSV to RGB (using local function to avoid scope issues)
            const rgb = hsvToRgbLocal(hue / 360, saturation / 100, 1);
            console.log('🎨 Converted RGB:', rgb);
            
            // Update RGB inputs
            redInput.value = Math.round(rgb.r);
            greenInput.value = Math.round(rgb.g);
            blueInput.value = Math.round(rgb.b);
            
            // Update HSV display values
            hueValue.textContent = hue + '°';
            saturationValue.textContent = saturation + '%';
            
            // Update color preview and native picker
            updateColorPreview();
            
            // Update floorplan light color in real-time (temporarily set color for preview)
            const tempSettings = this.sceneLightSettings.get(entityId) || {};
            const originalColor = tempSettings.color;
            tempSettings.color = { hue, saturation };
            this.updateFloorplanLightFromSceneSettings(entityId);
            // Don't restore original color since this is just a preview
        };
        
        // Local HSV to RGB conversion function to avoid scope issues
        const hsvToRgbLocal = (h, s, v) => {
            let r, g, b;
            
            const i = Math.floor(h * 6);
            const f = h * 6 - i;
            const p = v * (1 - s);
            const q = v * (1 - f * s);
            const t = v * (1 - (1 - f) * s);
            
            switch (i % 6) {
                case 0: r = v; g = t; b = p; break;
                case 1: r = q; g = v; b = p; break;
                case 2: r = p; g = v; b = t; break;
                case 3: r = p; g = q; b = v; break;
                case 4: r = t; g = p; b = v; break;
                case 5: r = v; g = p; b = q; break;
            }
            
            return {
                r: Math.round(r * 255),
                g: Math.round(g * 255),
                b: Math.round(b * 255)
            };
        };
        
        // Event listeners with debugging
        nativeColorPicker.addEventListener('input', updateFromNative);
        redInput.addEventListener('input', updateColorPreview);
        greenInput.addEventListener('input', updateColorPreview);
        blueInput.addEventListener('input', updateColorPreview);
        hexInput.addEventListener('input', updateFromHex);
        hexInput.addEventListener('change', updateFromHex);
        
        // Enhanced HSV slider event listeners with event prevention
        if (hueSlider) {
            console.log('🎨 Hue slider found, adding event listeners');
            hueSlider.addEventListener('input', updateFromHSV);
            hueSlider.addEventListener('change', updateFromHSV);
            hueSlider.addEventListener('mousedown', (e) => e.stopPropagation());
            hueSlider.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: false });
            hueSlider.addEventListener('click', (e) => e.stopPropagation());
        } else {
            console.error('❌ Hue slider not found!');
        }
        
        if (saturationSlider) {
            console.log('🎨 Saturation slider found, adding event listeners');
            saturationSlider.addEventListener('input', updateFromHSV);
            saturationSlider.addEventListener('change', updateFromHSV);
            saturationSlider.addEventListener('mousedown', (e) => e.stopPropagation());
            saturationSlider.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: false });
            saturationSlider.addEventListener('click', (e) => e.stopPropagation());
        } else {
            console.error('❌ Saturation slider not found!');
        }
        
        // Initialize preview
        updateColorPreview();
        
        // Handle buttons
        popup.querySelector('#applyColor').addEventListener('click', () => {
            const r = parseInt(redInput.value) || 0;
            const g = parseInt(greenInput.value) || 0;
            const b = parseInt(blueInput.value) || 0;
            const hsv = rgbToHsvLocal(r, g, b);
            const hue = Math.round(hsv.h * 360);
            const saturation = Math.round(hsv.s * 100);
            
            console.log('🎨 Applying color - RGB:', { r, g, b }, 'HSV:', { hue, saturation });
            this.setSceneLightProperty(entityId, 'color', { hue, saturation });
            this.updateChipDisplay(chip, 'color', { hue, saturation });
            popup.remove();
        });
        
        popup.querySelector('#cancelColor').addEventListener('click', () => {
            popup.remove();
        });
        
        popup.querySelector('.close-btn').addEventListener('click', () => {
            popup.remove();
        });
        
        // Close on backdrop click (but not on slider interaction)
        popup.addEventListener('click', (e) => {
            // Don't close if clicking on sliders or their containers
            if (e.target === popup && !e.target.closest('.hsv-sliders')) {
                popup.remove();
            }
        });
        
        // Prevent modal close when interacting with HSV slider area
        const hsvContainer = popup.querySelector('#hsvSliders');
        if (hsvContainer) {
            hsvContainer.addEventListener('click', (e) => e.stopPropagation());
            hsvContainer.addEventListener('mousedown', (e) => e.stopPropagation());
            hsvContainer.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: false });
        }
    }
    
    setSceneLightProperty(entityId, property, value) {
        if (!this.sceneLightSettings.has(entityId)) {
            this.sceneLightSettings.set(entityId, {
                brightness: null,
                kelvin: null,
                color: null
            });
        }
        
        const settings = this.sceneLightSettings.get(entityId);
        settings[property] = value;
        
        // Implement mutual exclusivity for kelvin and color
        if (property === 'color' && value !== null) {
            // When color is set, clear kelvin
            if (settings.kelvin !== null) {
                console.log(`🎬 Color set for ${entityId}, clearing kelvin (was: ${settings.kelvin})`);
                settings.kelvin = null;
                
                // Update kelvin chip UI to show "Not Set"
                const kelvinChip = document.querySelector(`[data-entity="${entityId}"][data-property="kelvin"]`);
                if (kelvinChip) {
                    this.updateChipDisplay(kelvinChip, 'kelvin', null);
                }
                
                // Hide kelvin inline controls
                const safeId = entityId.replace(/\./g, '_');
                this.hideInlineControls(safeId, 'kelvin');
            }
        } else if (property === 'kelvin' && value !== null) {
            // When kelvin is set, clear color
            if (settings.color !== null) {
                console.log(`🎬 Kelvin set for ${entityId}, clearing color (was: ${JSON.stringify(settings.color)})`);
                settings.color = null;
                
                // Update color chip UI to show "Not Set"
                const colorChip = document.querySelector(`[data-entity="${entityId}"][data-property="color"]`);
                if (colorChip) {
                    this.updateChipDisplay(colorChip, 'color', null);
                }
            }
        }
        
        console.log(`🎬 Scene ${property} for ${entityId}:`, value);
        console.log('🎬 Updated scene light settings:', this.sceneLightSettings.get(entityId));
        
        // Update floorplan light appearance based on new scene settings
        this.updateFloorplanLightFromSceneSettings(entityId);
    }
    

    
    toggleFloorplanLight(entityId) {
        const lightBtn = document.querySelector(`[data-entity-id="${entityId}"]`);
        const isSelected = lightBtn.classList.contains('selected');
        
        if (isSelected) {
            lightBtn.classList.remove('selected');
            this.selectedFloorplanLights.delete(entityId);
        } else {
            lightBtn.classList.add('selected');
            this.selectedFloorplanLights.add(entityId);
        }
        
        this.updateSelectionUI();
        
        // Update individual controls if in individual mode
        if (this.individualMode) {
            this.renderIndividualControls();
        }
    }
    
    setupControlSliders() {
        // Brightness slider
        const brightnessSlider = document.getElementById('globalBrightness');
        const brightnessValue = document.getElementById('globalBrightnessValue');
        
        brightnessSlider?.addEventListener('input', (e) => {
            brightnessValue.textContent = e.target.value + '%';
            this.updateColorPreview();
            this.updateSelectedFloorplanLight();
        });

        // Color temperature slider
        const colorTempSlider = document.getElementById('globalColorTemp');
        const colorTempValue = document.getElementById('globalColorTempValue');
        
        colorTempSlider?.addEventListener('input', (e) => {
            colorTempValue.textContent = e.target.value + 'K';
            this.updateColorPreview();
            this.updateSelectedFloorplanLight();
        });

        // Hue slider
        const hueSlider = document.getElementById('globalHue');
        const hueValue = document.getElementById('globalHueValue');
        
        hueSlider?.addEventListener('input', (e) => {
            hueValue.textContent = e.target.value + '°';
            this.updateColorPreview();
            this.updateSelectedFloorplanLight();
        });

        // Saturation slider
        const saturationSlider = document.getElementById('globalSaturation');
        const saturationValue = document.getElementById('globalSaturationValue');
        
        saturationSlider?.addEventListener('input', (e) => {
            saturationValue.textContent = e.target.value + '%';
            this.updateColorPreview();
            this.updateSelectedFloorplanLight();
        });
    }
    
    updateSelectedFloorplanLight() {
        // Update the selected floorplan light if one exists
        if (window.floorplanEditor?.selectedLight) {
            const selectedLight = window.floorplanEditor.selectedLight;
            
            const brightness = parseInt(document.getElementById('globalBrightness')?.value || 100);
            const hue = parseInt(document.getElementById('globalHue')?.value || 60);
            const saturation = parseInt(document.getElementById('globalSaturation')?.value || 100);
            
            // Use HSV values for color representation
            const h = hue / 360;
            const s = saturation / 100;
            const v = brightness / 100;
            
            const rgb = this.hsvToRgb(h, s, v);
            const fillColor = `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`;
            
            // Update the light's visual appearance
            selectedLight.set('fill', fillColor);
            window.floorplanEditor.canvas.renderAll();
        }
    }
    
    updateFloorplanLightColor(entityId, hue, saturation) {
        // Find the light object on the floorplan by entity ID
        if (window.floorplanEditor?.lights) {
            const light = window.floorplanEditor.lights.find(light => light.entityId === entityId);
            if (light) {
                console.log('🎨 Updating floorplan light color for', entityId, { hue, saturation });
                
                // Get brightness from scene settings for glow effect
                const currentSettings = this.sceneLightSettings.get(entityId) || {};
                const brightness = currentSettings.brightness;
                
                console.log('🎨 Using brightness for glow:', brightness);
                
                // Convert HSV to RGB at full brightness for fill color
                const rgb = this.hsvToRgb(hue, saturation, 100);
                const fillColor = `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`;
                
                console.log('🎨 Setting light fill color to:', fillColor);
                
                                 // Apply glow effect using separate glow circle behind main light
                 if (brightness !== null) {
                     const glowIntensity = brightness / 100; // 0.0 to 1.0
                     const glowSize = Math.max(5, brightness * 0.4); // Glow radius extension (5px to 40px)
                     const glowOpacity = Math.max(0.4, 0.4 - (glowIntensity * 0.3)); // 0.4 at 0% brightness, 0.1 at 100% brightness (more subtle)
                     
                     // Remove any existing glow circle
                     if (light.glowCircle) {
                         window.floorplanEditor.canvas.remove(light.glowCircle);
                         light.glowCircle = null;
                     }
                     
                     // Create a separate larger circle behind the main light for glow effect
                     const glowCircle = new fabric.Circle({
                         left: light.left + light.radius - (light.radius + glowSize),
                         top: light.top + light.radius - (light.radius + glowSize),
                         radius: light.radius + glowSize,
                         fill: fillColor,
                         opacity: glowOpacity,
                         selectable: false,
                         evented: false,
                         excludeFromExport: true,
                         glowCircle: true,
                         brightnessEffect: true,
                         parentLightId: light.entityId || light.id || `light_${Date.now()}`,
                         name: `Glow Effect - ${light.entityId || 'Light'}`
                     });
                     
                     // Add glow circle behind the main light
                     window.floorplanEditor.canvas.add(glowCircle);
                     
                     // Use canvas methods to control layering (v6 API)
                     window.floorplanEditor.canvas.sendObjectToBack(glowCircle);
                     window.floorplanEditor.canvas.bringObjectToFront(light);
                     
                     // Store reference to glow circle for cleanup
                     light.glowCircle = glowCircle;
                     
                     // Add outline to main light when brightness is set
                     light.set({
                         fill: fillColor,
                         stroke: this.getContrastingColor(fillColor),
                         strokeWidth: 2,
                         shadow: null
                     });
                     
                     console.log('🌟 Applied glow effect - Glow Size:', glowSize, 'Brightness:', brightness, 'Opacity:', glowOpacity);
                 } else {
                     // No brightness setting, remove glow circle
                     if (light.glowCircle) {
                         window.floorplanEditor.canvas.remove(light.glowCircle);
                         light.glowCircle = null;
                     }
                     
                     light.set({
                         fill: fillColor,
                         stroke: null,
                         strokeWidth: 0,
                         shadow: null
                     });
                     console.log('🌟 No brightness setting, removed glow effect');
                 }
                 
                 window.floorplanEditor.canvas.renderAll();
            } else {
                console.log('🎨 Light not found on floorplan for entity:', entityId);
            }
        }
    }
    
    updateFloorplanLightFromSceneSettings(entityId) {
        // Find the light object on the floorplan by entity ID
        if (window.floorplanEditor?.lights) {
            const light = window.floorplanEditor.lights.find(light => light.entityId === entityId);
            if (light) {
                const currentSettings = this.sceneLightSettings.get(entityId) || {};
                
                console.log('🎬 Updating floorplan light from scene settings for', entityId, currentSettings);
                
                // Get brightness setting for glow effect
                const brightness = currentSettings.brightness;
                let fillColor;
                
                if (currentSettings.color && currentSettings.color.hue !== undefined && currentSettings.color.saturation !== undefined) {
                    // Use color setting at full saturation for fill
                    const rgb = this.hsvToRgb(currentSettings.color.hue, currentSettings.color.saturation, 100);
                    fillColor = `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`;
                    console.log('🎨 Using color setting:', currentSettings.color, 'with glow brightness:', brightness);
                } else if (currentSettings.kelvin !== null) {
                    // Use kelvin setting at full brightness for fill
                    const rgb = this.colorTempToRgb(currentSettings.kelvin);
                    fillColor = `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`;
                    console.log('🎨 Using kelvin setting:', currentSettings.kelvin, 'with glow brightness:', brightness);
                } else if (brightness !== null) {
                    // Only brightness is set, use default warm white
                    fillColor = `rgb(255, 255, 200)`;
                    console.log('🎨 Using default warm white with glow brightness:', brightness);
                } else {
                    // Nothing is set, use default light appearance
                    fillColor = '#ffa500'; // Default orange
                    console.log('🎨 No scene settings, using default orange color');
                }
                
                                 // Apply glow effect using separate glow circle behind main light
                 if (brightness !== null) {
                     const glowIntensity = brightness / 100; // 0.0 to 1.0
                     const glowSize = Math.max(5, brightness * 0.4); // Glow radius extension (5px to 40px)
                     const glowOpacity = Math.max(0.4, 0.4 - (glowIntensity * 0.3)); // 0.4 at 0% brightness, 0.1 at 100% brightness (more subtle)
                     
                     // Remove any existing glow circle
                     if (light.glowCircle) {
                         window.floorplanEditor.canvas.remove(light.glowCircle);
                         light.glowCircle = null;
                     }
                     
                     // Create a separate larger circle behind the main light for glow effect
                     const glowCircle = new fabric.Circle({
                         left: light.left + light.radius - (light.radius + glowSize),
                         top: light.top + light.radius - (light.radius + glowSize),
                         radius: light.radius + glowSize,
                         fill: fillColor,
                         opacity: glowOpacity,
                         selectable: false,
                         evented: false,
                         excludeFromExport: true,
                         glowCircle: true,
                         brightnessEffect: true,
                         parentLightId: light.entityId || light.id || `light_${Date.now()}`,
                         name: `Glow Effect - ${light.entityId || 'Light'}`
                     });
                     
                     // Add glow circle behind the main light
                     window.floorplanEditor.canvas.add(glowCircle);
                     
                     // Use canvas methods to control layering (v6 API)
                     window.floorplanEditor.canvas.sendObjectToBack(glowCircle);
                     window.floorplanEditor.canvas.bringObjectToFront(light);
                     
                     // Store reference to glow circle for cleanup
                     light.glowCircle = glowCircle;
                     
                     // Add outline to main light when brightness is set
                     light.set({
                         fill: fillColor,
                         stroke: this.getContrastingColor(fillColor),
                         strokeWidth: 2,
                         shadow: null
                     });
                     
                     console.log('🌟 Applied glow effect - Glow Size:', glowSize, 'Brightness:', brightness, 'Opacity:', glowOpacity);
                 } else {
                     // No brightness setting, remove glow circle
                     if (light.glowCircle) {
                         window.floorplanEditor.canvas.remove(light.glowCircle);
                         light.glowCircle = null;
                     }
                     
                     light.set({
                         fill: fillColor,
                         stroke: null,
                         strokeWidth: 0,
                         shadow: null
                     });
                     console.log('🌟 No brightness setting, removed glow effect');
                 }
                 
                 console.log('🎨 Setting light fill color to:', fillColor);
                 
                 // Update the canvas
                 window.floorplanEditor.canvas.renderAll();
            } else {
                console.log('🎨 Light not found on floorplan for entity:', entityId);
            }
        }
    }
    
    getLastColorForEntity(entityId) {
        const settings = this.sceneLightSettings.get(entityId);
        if (settings && settings.color && settings.color.hue !== undefined && settings.color.saturation !== undefined) {
            console.log('🎨 Retrieved last color for', entityId, ':', settings.color);
            return settings.color;
        }
        console.log('🎨 No stored color found for', entityId);
        return null;
    }
    
    updateGlobalControlValues() {
        // Only update if global control elements exist
        const brightness = document.getElementById('globalBrightness');
        const colorTemp = document.getElementById('globalColorTemp');
        const hue = document.getElementById('globalHue');
        const saturation = document.getElementById('globalSaturation');
        
        if (!brightness || !colorTemp || !hue || !saturation) return;
        
        const brightnessValue = document.getElementById('globalBrightnessValue');
        const colorTempValue = document.getElementById('globalColorTempValue');
        const hueValue = document.getElementById('globalHueValue');
        const saturationValue = document.getElementById('globalSaturationValue');
        
        if (brightnessValue) brightnessValue.textContent = `${brightness.value}%`;
        if (colorTempValue) colorTempValue.textContent = `${colorTemp.value}K`;
        if (hueValue) hueValue.textContent = `${hue.value}°`;
        if (saturationValue) saturationValue.textContent = `${saturation.value}%`;
    }
    
    updateColorPreview() {
        // Only update if global control elements exist
        const hueElement = document.getElementById('globalHue');
        const saturationElement = document.getElementById('globalSaturation');
        
        if (!hueElement || !saturationElement) return;
        
        const hue = parseInt(hueElement.value);
        const saturation = parseInt(saturationElement.value);
        
        const rgb = this.hsvToRgb(hue, saturation, 100);
        const rgbString = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        
        const colorPreview = document.getElementById('globalColorPreview');
        const colorText = document.getElementById('globalColorText');
        
        if (colorPreview) colorPreview.style.backgroundColor = rgbString;
        if (colorText) colorText.textContent = rgbString;
    }
    
    hsvToRgb(h, s, v) {
        h = h / 360;
        s = s / 100;
        v = v / 100;
        
        const c = v * s;
        const x = c * (1 - Math.abs((h * 6) % 2 - 1));
        const m = v - c;
        
        let r, g, b;
        
        if (h < 1/6) {
            r = c; g = x; b = 0;
        } else if (h < 2/6) {
            r = x; g = c; b = 0;
        } else if (h < 3/6) {
            r = 0; g = c; b = x;
        } else if (h < 4/6) {
            r = 0; g = x; b = c;
        } else if (h < 5/6) {
            r = x; g = 0; b = c;
        } else {
            r = c; g = 0; b = x;
        }
        
        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    }
    
    rgbToHsv(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        
        let h = 0;
        const s = max === 0 ? 0 : delta / max;
        const v = max;
        
        if (delta !== 0) {
            if (max === r) {
                h = ((g - b) / delta) % 6;
            } else if (max === g) {
                h = (b - r) / delta + 2;
            } else {
                h = (r - g) / delta + 4;
            }
            h /= 6;
            if (h < 0) h += 1;
        }
        
        return { h, s, v };
    }
    
    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    getContrastingColor(fillColor) {
        // Parse RGB values from fillColor string
        let r, g, b;
        
        if (fillColor.startsWith('rgb(')) {
            // Extract RGB values from "rgb(r, g, b)" format
            const match = fillColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (match) {
                r = parseInt(match[1]);
                g = parseInt(match[2]);
                b = parseInt(match[3]);
            } else {
                return '#000000'; // Default to black if parsing fails
            }
        } else if (fillColor.startsWith('#')) {
            // Extract RGB values from hex format
            const rgb = this.hexToRgb(fillColor);
            r = rgb.r;
            g = rgb.g;
            b = rgb.b;
        } else {
            return '#000000'; // Default to black if format unknown
        }
        
        // Calculate luminance using the relative luminance formula
        // https://www.w3.org/TR/WCAG20/#relativeluminancedef
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        // Return black for light colors, white for dark colors
        return luminance > 0.5 ? '#000000' : '#FFFFFF';
    }
    
    // Color temperature to RGB approximation
    colorTempToRgb(colorTemp) {
        // Simplified color temperature to RGB conversion
        const temp = colorTemp / 100;
        let r, g, b;
        
        if (temp <= 66) {
            r = 255;
            g = temp;
            g = 99.4708025861 * Math.log(g) - 161.1195681661;
            
            if (temp >= 19) {
                b = temp - 10;
                b = 138.5177312231 * Math.log(b) - 305.0447927307;
            } else {
                b = 0;
            }
        } else {
            r = temp - 60;
            r = 329.698727446 * Math.pow(r, -0.1332047592);
            
            g = temp - 60;
            g = 288.1221695283 * Math.pow(g, -0.0755148492);
            
            b = 255;
        }
        
        return {
            r: Math.max(0, Math.min(255, r)),
            g: Math.max(0, Math.min(255, g)),
            b: Math.max(0, Math.min(255, b))
        };
    }
    
    clearSelection() {
        console.log('🎬 Clearing all scene settings for all lights');
        const assignedEntities = this.getAssignedFloorplanEntities();
        
        // Clear all scene settings for all lights
        assignedEntities.forEach(entity => {
            // Reset all properties to "Not set"
            this.sceneLightSettings.set(entity.entity_id, {
                brightness: null,
                kelvin: null,
                color: null
            });
        });
        
        // Re-render the lights list to update the UI
        this.renderFloorplanLightsList();
        
        console.log('🎬 All scene settings cleared');
        this.showStatus(`Cleared scene settings for ${assignedEntities.length} lights`, 'success');
        
        // Keep for backwards compatibility
        this.selectedFloorplanLights.clear();
        this.updateSelectionUI();
    }

    selectAll() {
        console.log('🎬 Setting default scene values for all lights');
        const assignedEntities = this.getAssignedFloorplanEntities();
        
        // Set default scene values for all lights
        assignedEntities.forEach(entity => {
            this.sceneLightSettings.set(entity.entity_id, {
                brightness: 80,    // 80% brightness
                kelvin: 3000,     // 3000K (warm white)
                color: null       // No color (keep "Not set")
            });
        });
        
        // Re-render the lights list to update the UI
        this.renderFloorplanLightsList();
        
        console.log('🎬 All lights set with default scene values');
        this.showStatus(`Set default scene values for ${assignedEntities.length} lights`, 'success');
    }
    
    updateSelectionUI() {
        // Scene saving now uses all floorplan lights, not selections
        const hasFloorplanLights = this.getAssignedFloorplanEntities().length > 0;
        const hasSceneName = document.getElementById('newSceneName').value.trim().length > 0;
        document.getElementById('saveScene').disabled = !hasFloorplanLights || !hasSceneName;
        
        // Individual controls removed - using Scene Lights cards instead
        // if (this.individualMode) {
        //     this.renderIndividualControls();
        // }
    }
    
    toggleControlMode() {
        // Toggle the mode first
        this.individualMode = !this.individualMode;
        
        const globalControls = document.getElementById('globalControls');
        const individualControls = document.getElementById('individualControls');
        
        if (this.individualMode) {
            globalControls.style.display = 'none';
            individualControls.style.display = 'block';
            this.renderIndividualControls();
        } else {
            globalControls.style.display = 'block';
            individualControls.style.display = 'none';
        }
    }
    
    renderIndividualControls() {
        const container = document.getElementById('individualControlsList');
        container.innerHTML = '';
        
        const assignedEntities = this.getAssignedFloorplanEntities();
        
        if (assignedEntities.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">No lights in floorplan yet. Add lights to see individual controls.</p>';
            return;
        }
        
        assignedEntities.forEach(entity => {
            const entityId = entity.entity_id;
            // Generate a friendly display name
            const lightName = entity.friendly_name && entity.friendly_name !== entityId 
                ? entity.friendly_name 
                : entityId.replace(/^light\./, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            // Create a safe ID for DOM elements by replacing dots with underscores
            const safeId = entityId.replace(/\./g, '_');
            
            const controlDiv = document.createElement('div');
            controlDiv.className = 'individual-light-control';
            controlDiv.innerHTML = `
                <h4>${lightName}</h4>
                <div class="entity-id-small">${entityId}</div>
                <div class="control-group">
                    <label>Brightness (%)</label>
                    <input type="range" id="light${safeId}Brightness" min="0" max="100" value="${this.config.defaults.brightness}">
                    <span id="light${safeId}BrightnessValue">${this.config.defaults.brightness}%</span>
                </div>
                <div class="control-group">
                    <label>Color Temperature (K)</label>
                    <input type="range" id="light${safeId}ColorTemp" min="2000" max="6500" value="${this.config.defaults.colorTemp}" step="100">
                    <span id="light${safeId}ColorTempValue">${this.config.defaults.colorTemp}K</span>
                </div>
                <div class="control-group">
                    <label>Hue (°)</label>
                    <input type="range" id="light${safeId}Hue" min="0" max="360" value="${this.config.defaults.hue}">
                    <span id="light${safeId}HueValue">${this.config.defaults.hue}°</span>
                </div>
                <div class="control-group">
                    <label>Saturation (%)</label>
                    <input type="range" id="light${safeId}Saturation" min="0" max="100" value="${this.config.defaults.saturation}">
                    <span id="light${safeId}SaturationValue">${this.config.defaults.saturation}%</span>
                </div>
                <div class="color-preview">
                    <div id="light${safeId}ColorPreview" class="color-preview-box"></div>
                    <span id="light${safeId}ColorText">rgb(255, 165, 0)</span>
                </div>
            `;
            
            container.appendChild(controlDiv);
            
            // Setup individual control listeners
            this.setupIndividualControlListeners(safeId);
        });
    }
    
    setupIndividualControlListeners(safeId) {
        const controls = ['Brightness', 'ColorTemp', 'Hue', 'Saturation'];
        const suffixes = ['%', 'K', '°', '%'];
        
        controls.forEach((control, index) => {
            const slider = document.getElementById(`light${safeId}${control}`);
            const valueSpan = document.getElementById(`light${safeId}${control}Value`);
            
            if (slider && valueSpan) {
                slider.addEventListener('input', () => {
                    valueSpan.textContent = `${slider.value}${suffixes[index]}`;
                    this.updateIndividualColorPreview(safeId);
                });
            }
        });
        
        this.updateIndividualColorPreview(safeId);
    }
    
    updateIndividualColorPreview(safeId) {
        const hue = parseInt(document.getElementById(`light${safeId}Hue`)?.value || this.config.defaults.hue);
        const saturation = parseInt(document.getElementById(`light${safeId}Saturation`)?.value || this.config.defaults.saturation);
        
        const rgb = this.hsvToRgb(hue, saturation, 100);
        const rgbString = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        
        const preview = document.getElementById(`light${safeId}ColorPreview`);
        const text = document.getElementById(`light${safeId}ColorText`);
        
        if (preview && text) {
            preview.style.backgroundColor = rgbString;
            text.textContent = rgbString;
        }
    }
    
    updateSelectedIndividualControls() {
        const assignedEntities = this.getAssignedFloorplanEntities();
        
        assignedEntities.forEach(entity => {
            const entityId = entity.entity_id;
            const safeId = entityId.replace(/\./g, '_');
            const brightness = document.getElementById('globalBrightness').value;
            const colorTemp = document.getElementById('globalColorTemp').value;
            const hue = document.getElementById('globalHue').value;
            const saturation = document.getElementById('globalSaturation').value;
            
            const controls = [
                { id: `light${safeId}Brightness`, value: brightness, suffix: '%' },
                { id: `light${safeId}ColorTemp`, value: colorTemp, suffix: 'K' },
                { id: `light${safeId}Hue`, value: hue, suffix: '°' },
                { id: `light${safeId}Saturation`, value: saturation, suffix: '%' }
            ];
            
            controls.forEach(control => {
                const element = document.getElementById(control.id);
                const valueElement = document.getElementById(`${control.id}Value`);
                
                if (element && valueElement) {
                    element.value = control.value;
                    valueElement.textContent = `${control.value}${control.suffix}`;
                }
            });
            
            this.updateIndividualColorPreview(safeId);
        });
    }
    
    renderScenes() {
        const container = document.getElementById('scenesList');
        container.innerHTML = '';
        
        if (this.scenes.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">No scenes saved yet. Create your first scene!</p>';
            return;
        }
        
        this.scenes.forEach(scene => {
            const sceneCard = document.createElement('div');
            sceneCard.className = 'scene-card';
            sceneCard.dataset.sceneId = scene.id;
            
            const createdDate = new Date(scene.created_at).toLocaleDateString();
            const updatedDate = new Date(scene.updated_at).toLocaleDateString();
            
            sceneCard.innerHTML = `
                <div class="scene-name">${scene.name}</div>
                <div class="scene-info">
                    ${scene.light_count} light${scene.light_count !== 1 ? 's' : ''}<br>
                    Created: ${createdDate}<br>
                    ${scene.created_at !== scene.updated_at ? `Updated: ${updatedDate}` : ''}
                </div>
                <div class="scene-actions-card">
                    <button class="btn btn-small btn-primary" onclick="sceneManager.loadScene(${scene.id})">Load</button>
                    <button class="btn btn-small btn-success" onclick="sceneManager.applySceneById(${scene.id})">Apply</button>
                    <button class="btn btn-small btn-error" onclick="sceneManager.deleteScene(${scene.id})">Delete</button>
                </div>
            `;
            
            sceneCard.addEventListener('click', (e) => {
                if (!e.target.closest('.scene-actions-card')) {
                    this.selectScene(scene.id);
                }
            });
            
            container.appendChild(sceneCard);
        });
    }
    
    selectScene(sceneId) {
        // Remove previous selection
        document.querySelectorAll('.scene-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Select new scene
        const sceneCard = document.querySelector(`[data-scene-id="${sceneId}"]`);
        if (sceneCard) {
            sceneCard.classList.add('selected');
            this.selectedScene = sceneId;
            document.getElementById('applyScene').disabled = false;
        }
    }
    
    async loadScene(sceneId) {
        try {
            const response = await fetch(`${API_BASE}/api/internal/scenes/${sceneId}`);
            if (!response.ok) {
                throw new Error(`Scene request failed: ${response.status} ${response.statusText}`);
            }
            const scene = await response.json();
            
            this.clearSelection();
            
            scene.lights.forEach(light => {
                this.selectedLights.add(light.position);
                const button = document.querySelector(`[data-position="${light.position}"]`);
                if (button) {
                    button.classList.add('selected');
                }
                
                // Update individual controls if in individual mode
                if (this.individualMode) {
                    this.setIndividualLightValues(light.position, light);
                }
            });
            
            this.selectScene(sceneId);
            this.updateSelectionUI();
            this.showStatus(`Scene "${scene.name}" loaded`, 'success');
            
        } catch (error) {
            console.error('Error loading scene:', error);
            this.showStatus('Failed to load scene', 'error');
        }
    }
    

    
    async saveScene() {
        const sceneName = document.getElementById('newSceneName').value.trim();
        
        if (!sceneName) {
            this.showStatus('Please enter a scene name', 'warning');
            return;
        }
        
        // Get ALL floorplan lights (no selection required)
        const assignedEntities = this.getAssignedFloorplanEntities();
        
        if (assignedEntities.length === 0) {
            this.showStatus('No lights found in floorplan. Add lights to the floorplan first.', 'warning');
            return;
        }
        
        const lights = assignedEntities.map(entity => {
            const entityId = entity.entity_id;
            
            // Get scene settings for this light
            const sceneSettings = this.sceneLightSettings.get(entityId) || {
                brightness: null,
                kelvin: null,
                color: null
            };
            
            const lightData = {
                entityId,
                haEntityId: entityId
            };
            
            // Only include properties that are set (not null)
            if (sceneSettings.brightness !== null) {
                lightData.brightness = sceneSettings.brightness;
            }
            
            if (sceneSettings.kelvin !== null) {
                lightData.colorTemp = sceneSettings.kelvin;
            }
            
            if (sceneSettings.color !== null) {
                lightData.hue = sceneSettings.color.hue;
                lightData.saturation = sceneSettings.color.saturation;
            }
            
            console.log(`🎬 Scene data for ${entityId}:`, lightData);
            return lightData;
        });
        
        console.log('🎬 Saving scene with lights:', lights);
        
        try {
            const response = await fetch(`${API_BASE}/api/internal/scenes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: sceneName,
                    lights
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showStatus(`Scene "${sceneName}" saved successfully with ${lights.length} lights`, 'success');
                document.getElementById('newSceneName').value = '';
                await this.loadScenes();
                this.updateSelectionUI();
            } else {
                this.showStatus(result.error || 'Failed to save scene', 'error');
            }
            
        } catch (error) {
            console.error('Error saving scene:', error);
            this.showStatus('Failed to save scene', 'error');
        }
    }
    
    async applyScene() {
        if (!this.selectedScene) {
            this.showStatus('Please select a scene first', 'warning');
            return;
        }
        
        await this.applySceneById(this.selectedScene);
    }
    
    async applySceneById(sceneId) {
        try {
            const response = await fetch(`${API_BASE}/api/internal/scenes/${sceneId}/apply`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showStatus(result.message, 'success');
                // Refresh light states
                await this.loadLights();
                this.renderFloorplanLightsList();
            } else {
                this.showStatus(result.error || 'Failed to apply scene', 'error');
            }
            
        } catch (error) {
            console.error('Error applying scene:', error);
            this.showStatus('Failed to apply scene', 'error');
        }
    }
    
    async deleteScene(sceneId) {
        const scene = this.scenes.find(s => s.id === sceneId);
        if (!scene) return;
        
        if (!confirm(`Are you sure you want to delete the scene "${scene.name}"?`)) {
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE}/api/internal/scenes/${sceneId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showStatus(`Scene "${scene.name}" deleted`, 'success');
                await this.loadScenes();
                
                if (this.selectedScene === sceneId) {
                    this.selectedScene = null;
                    document.getElementById('applyScene').disabled = true;
                }
            } else {
                this.showStatus(result.error || 'Failed to delete scene', 'error');
            }
            
        } catch (error) {
            console.error('Error deleting scene:', error);
            this.showStatus('Failed to delete scene', 'error');
        }
    }
    
    // Removed captureCurrentState method - functionality now integrated into Save Scene
    
    async refresh() {
        try {
            this.showStatus('Refreshing data...', 'info');
            
            // Reload all data in parallel
            await Promise.all([
                this.loadScenes(),
                this.loadLights(),
                this.loadMappings(),
                this.loadAreas(),
                this.loadSavedFloorplans()
            ]);
            
            // Update UI components
            this.renderFloorplanLightsList();
            
            this.showStatus('Data refreshed successfully', 'success');
        } catch (error) {
            console.error('Error refreshing:', error);
            this.showStatus('Failed to refresh data', 'error');
        }
    }
    
    openSettings() {
        document.getElementById('settingsModal').style.display = 'block';
    }
    
    closeSettings() {
        document.getElementById('settingsModal').style.display = 'none';
    }

    // Notification History Methods
    initializeNotificationSystem() {
        if (!this.notificationHistory) {
            this.notificationHistory = [];
            this.maxNotifications = 50;
        }
    }

    addToNotificationHistory(message, type) {
        this.initializeNotificationSystem();
        
        const notification = {
            id: Date.now() + Math.random(),
            message: message,
            type: type,
            timestamp: new Date()
        };
        
        // Add to beginning of array (newest first)
        this.notificationHistory.unshift(notification);
        
        // Limit history size
        if (this.notificationHistory.length > this.maxNotifications) {
            this.notificationHistory = this.notificationHistory.slice(0, this.maxNotifications);
        }
        
        // Update notification badge
        this.updateNotificationBadge();
        
        // Update notification panel if open
        if (this.isNotificationPanelOpen()) {
            this.renderNotificationHistory();
        }
    }

    updateNotificationBadge() {
        const badge = document.getElementById('notificationBadge');
        if (badge && this.notificationHistory) {
            const count = this.notificationHistory.length;
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count.toString();
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    isNotificationPanelOpen() {
        const panel = document.getElementById('notificationPanel');
        return panel && panel.style.display !== 'none';
    }

    toggleNotificationPanel() {
        const panel = document.getElementById('notificationPanel');
        if (!panel) return;
        
        if (this.isNotificationPanelOpen()) {
            this.closeNotificationPanel();
        } else {
            this.openNotificationPanel();
        }
    }

    openNotificationPanel() {
        const panel = document.getElementById('notificationPanel');
        if (!panel) return;
        
        panel.style.display = 'block';
        this.renderNotificationHistory();
        
        // Add click outside to close with proper event handling
        setTimeout(() => {
            document.addEventListener('click', this.handleNotificationPanelOutsideClick, true);
        }, 150);
    }

    closeNotificationPanel() {
        const panel = document.getElementById('notificationPanel');
        if (!panel) return;
        
        panel.style.display = 'none';
        document.removeEventListener('click', this.handleNotificationPanelOutsideClick, true);
    }

    handleNotificationPanelOutsideClick = (e) => {
        const panel = document.getElementById('notificationPanel');
        const notificationBtn = document.getElementById('notificationBtn');
        
        // Check if panel is actually open
        if (!panel || panel.style.display === 'none') {
            return;
        }
        
        // Don't close if clicking on the notification button or inside the panel
        if (panel && notificationBtn && 
            !panel.contains(e.target) && 
            !notificationBtn.contains(e.target) &&
            !e.target.closest('.notification-badge')) {
            this.closeNotificationPanel();
        }
    }

    renderNotificationHistory() {
        const container = document.getElementById('notificationHistory');
        if (!container) return;
        
        if (!this.notificationHistory || this.notificationHistory.length === 0) {
            container.innerHTML = `
                <div class="notification-empty">
                    <i class="fas fa-bell-slash"></i>
                    <p>No notifications yet</p>
                </div>
            `;
            return;
        }
        
        const getIcon = (type) => {
            switch (type) {
                case 'success': return 'fas fa-check-circle';
                case 'error': return 'fas fa-exclamation-circle';
                case 'warning': return 'fas fa-exclamation-triangle';
                case 'info': 
                default: return 'fas fa-info-circle';
            }
        };
        
        const formatTime = (timestamp) => {
            const now = new Date();
            const diff = now - timestamp;
            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            
            if (seconds < 60) return 'Just now';
            if (minutes < 60) return `${minutes}m ago`;
            if (hours < 24) return `${hours}h ago`;
            return timestamp.toLocaleDateString();
        };
        
        container.innerHTML = this.notificationHistory.map(notification => `
            <div class="notification-item" data-id="${notification.id}">
                <div class="notification-icon ${notification.type}">
                    <i class="${getIcon(notification.type)}"></i>
                </div>
                <div class="notification-content">
                    <p class="notification-message">${notification.message}</p>
                    <div class="notification-time">${formatTime(notification.timestamp)}</div>
                </div>
                <button class="notification-delete" onclick="window.lightController.deleteNotification('${notification.id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }

    deleteNotification(notificationId) {
        if (!this.notificationHistory) return;
        
        this.notificationHistory = this.notificationHistory.filter(n => n.id != notificationId);
        this.updateNotificationBadge();
        this.renderNotificationHistory();
    }

    clearAllNotifications() {
        this.notificationHistory = [];
        this.updateNotificationBadge();
        this.renderNotificationHistory();
    }
    

    

    

    
    setupSearchableSelect(selectElement, onSelect) {
        const input = selectElement.querySelector('input');
        const dropdown = selectElement.querySelector('.dropdown-options');
        let isOpen = false;
        let originalValue = '';
        
        // Store reference for cleanup
        if (!selectElement._listeners) {
            selectElement._listeners = [];
        }
        
        // Open dropdown when input is focused or clicked
        const openDropdown = () => {
            if (!isOpen) {
                this.closeAllDropdowns();
                dropdown.classList.add('show');
                isOpen = true;
                originalValue = input.value;
                input.removeAttribute('readonly');
                input.focus();
                
                // Reset search filter when opening
                this.filterDropdownOptions(dropdown, '');
            }
        };
        
        const handleFocus = (e) => {
            openDropdown();
        };
        
        const handleClick = (e) => {
            e.stopPropagation();
            if (!isOpen) {
                openDropdown();
            }
        };
        
        // Search functionality  
        const handleInput = () => {
            if (!isOpen) {
                openDropdown();
            }
            
            const searchTerm = input.value.toLowerCase();
            this.filterDropdownOptions(dropdown, searchTerm);
        };
        
        // Option selection
        const handleOptionClick = (e) => {
            const option = e.target.closest('.dropdown-option');
            if (!option) return;
            
            e.stopPropagation();
            const value = option.dataset.value;
            const entityName = option.querySelector('.entity-name')?.textContent || '';
            
            input.value = entityName;
            selectElement.dataset.selectedValue = value;
            originalValue = entityName;
            this.closeDropdown(selectElement);
            
            if (onSelect) onSelect(value, entityName);
        };
        
        // Keyboard navigation
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                input.value = originalValue;
                this.closeDropdown(selectElement);
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateDropdownOptions(dropdown, e.key === 'ArrowDown' ? 1 : -1);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const selected = dropdown.querySelector('.dropdown-option.highlighted');
                if (selected) {
                    selected.click();
                }
            }
        };
        
        // Add event listeners
        input.addEventListener('focus', handleFocus);
        input.addEventListener('click', handleClick);
        input.addEventListener('input', handleInput);
        dropdown.addEventListener('click', handleOptionClick);
        input.addEventListener('keydown', handleKeydown);
        
        // Store listeners for cleanup
        selectElement._listeners.push(
            { element: input, event: 'focus', handler: handleFocus },
            { element: input, event: 'click', handler: handleClick },
            { element: input, event: 'input', handler: handleInput },
            { element: dropdown, event: 'click', handler: handleOptionClick },
            { element: input, event: 'keydown', handler: handleKeydown }
        );
        
        // Close dropdown function
        selectElement._closeDropdown = () => {
            if (isOpen) {
                dropdown.classList.remove('show');
                isOpen = false;
                input.setAttribute('readonly', true);
                
                // Reset to selected value if no valid selection was made
                const selectedValue = selectElement.dataset.selectedValue;
                if (selectedValue) {
                    const selectedOption = dropdown.querySelector(`[data-value="${selectedValue}"]`);
                    if (selectedOption) {
                        const entityName = selectedOption.querySelector('.entity-name')?.textContent || '';
                        input.value = entityName;
                        originalValue = entityName;
                    }
                } else if (!input.value.trim()) {
                    input.value = '';
                    originalValue = '';
                }
            }
        };
    }
    
    filterDropdownOptions(dropdown, searchTerm) {
        const options = dropdown.querySelectorAll('.dropdown-option');
        let hasVisibleOptions = false;
        
        options.forEach(option => {
            const entityName = option.querySelector('.entity-name')?.textContent.toLowerCase() || '';
            const entityId = option.querySelector('.entity-id')?.textContent.toLowerCase() || '';
            const isMatch = !searchTerm || entityName.includes(searchTerm) || entityId.includes(searchTerm);
            
            option.style.display = isMatch ? 'block' : 'none';
            if (isMatch) hasVisibleOptions = true;
            
            // Remove any existing highlighting
            option.classList.remove('highlighted');
        });
        
        // Show/hide no results message
        let noResults = dropdown.querySelector('.no-results');
        if (!hasVisibleOptions && searchTerm) {
            if (!noResults) {
                noResults = document.createElement('div');
                noResults.className = 'no-results dropdown-option';
                noResults.innerHTML = '<div class="entity-name">No matching lights found</div>';
                dropdown.appendChild(noResults);
            }
            noResults.style.display = 'block';
        } else if (noResults) {
            noResults.style.display = 'none';
        }
    }
    
    navigateDropdownOptions(dropdown, direction) {
        const visibleOptions = Array.from(dropdown.querySelectorAll('.dropdown-option'))
            .filter(option => option.style.display !== 'none' && !option.classList.contains('no-results'));
        
        if (visibleOptions.length === 0) return;
        
        const currentHighlighted = dropdown.querySelector('.dropdown-option.highlighted');
        let newIndex = 0;
        
        if (currentHighlighted) {
            const currentIndex = visibleOptions.indexOf(currentHighlighted);
            newIndex = currentIndex + direction;
            currentHighlighted.classList.remove('highlighted');
        }
        
        // Wrap around
        if (newIndex < 0) newIndex = visibleOptions.length - 1;
        if (newIndex >= visibleOptions.length) newIndex = 0;
        
        visibleOptions[newIndex].classList.add('highlighted');
        visibleOptions[newIndex].scrollIntoView({ block: 'nearest' });
    }
    
    closeDropdown(selectElement) {
        if (selectElement._closeDropdown) {
            selectElement._closeDropdown();
        }
    }
    
    closeAllDropdowns() {
        document.querySelectorAll('.searchable-select').forEach(selectElement => {
            if (selectElement._closeDropdown) {
                selectElement._closeDropdown();
            }
        });
    }
    

    
    showStatus(message, type = 'info') {
        // Add to notification history
        this.addToNotificationHistory(message, type);
        const container = document.getElementById('statusMessages');
        const statusDiv = document.createElement('div');
        statusDiv.className = `status-message status-${type}`;
        statusDiv.textContent = message;
        
        container.appendChild(statusDiv);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (statusDiv.parentNode) {
                statusDiv.remove();
            }
        }, 5000);
    }
    showLoadingState() {
        console.log('📋 Showing loading state on canvas...');
        
        // Clear the canvas immediately
        this.canvas.clear();
        this.lights = [];
        this.texts = [];
        this.labels = [];
        this.roomOutline = null;
        this.backgroundImage = null;
        
        // Set canvas background
        this.canvas.backgroundColor = this.isDarkTheme ? '#1a1a1a' : '#f5f5f5';
        
        // Create loading message
        const loadingText = new fabric.Text('Loading floorplan...', {
            left: this.canvas.width / 2,
            top: this.canvas.height / 2,
            fontSize: 32,
            fill: this.isDarkTheme ? '#ffffff' : '#333333',
            fontFamily: 'Arial, sans-serif',
            textAlign: 'center',
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false
        });
        
        // Create loading spinner using text characters
        const spinner = new fabric.Text('⟳', {
            left: this.canvas.width / 2,
            top: (this.canvas.height / 2) + 60,
            fontSize: 48,
            fill: this.isDarkTheme ? '#4CAF50' : '#2196F3',
            fontFamily: 'Arial, sans-serif',
            textAlign: 'center',
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false
        });
        
        // Add loading elements to canvas
        this.canvas.add(loadingText);
        this.canvas.add(spinner);
        
        // Store references for cleanup
        this.loadingText = loadingText;
        this.loadingSpinner = spinner;
        
        // Animate the spinner
        this.startSpinnerAnimation();
        
        this.canvas.renderAll();
    }

    hideLoadingState() {
        console.log('📋 Hiding loading state from canvas...');
        
        // Stop spinner animation
        this.stopSpinnerAnimation();
        
        // Remove loading elements
        if (this.loadingText) {
            this.canvas.remove(this.loadingText);
            this.loadingText = null;
        }
        
        if (this.loadingSpinner) {
            this.canvas.remove(this.loadingSpinner);
            this.loadingSpinner = null;
        }
        
        this.canvas.renderAll();
    }

    startSpinnerAnimation() {
        if (this.loadingSpinner) {
            // Stop any existing animation
            this.stopSpinnerAnimation();
            
            // Start rotation animation
            this.spinnerAnimation = setInterval(() => {
                if (this.loadingSpinner) {
                    this.loadingSpinner.set('angle', (this.loadingSpinner.angle + 30) % 360);
                    this.canvas.renderAll();
                }
            }, 100);
        }
    }

    stopSpinnerAnimation() {
        if (this.spinnerAnimation) {
            clearInterval(this.spinnerAnimation);
            this.spinnerAnimation = null;
        }
    }
    
    // ========================================
    // Network Label Management
    // ========================================
    
    async showIPLabels() {
        console.log('🌐 Showing IP labels...');
        window.sceneManager?.showStatus('Loading IP addresses...', 'info');
        
        try {
            // Clear existing IP labels
            this.clearIPLabels();
            
            // Get network info for all assigned lights
            const networkInfo = await this.getNetworkInfoForLights();
            
            if (networkInfo.length === 0) {
                window.sceneManager?.showStatus('No lights with network information found', 'warning');
                return;
            }
            
            // Create IP labels
            let labelsCreated = 0;
            networkInfo.forEach(info => {
                if (info.ipAddress) {
                    const label = this.createNetworkLabel(info.light, info.ipAddress, 'ip');
                    if (label) {
                        this.ipLabels.push(label);
                        labelsCreated++;
                    }
                }
            });
            
            window.sceneManager?.showStatus(`${labelsCreated} IP labels displayed`, 'success');
            this.canvas.renderAll();
            
        } catch (error) {
            console.error('❌ Error showing IP labels:', error);
            window.sceneManager?.showStatus('Failed to load IP labels: ' + error.message, 'error');
        }
    }
    
    async showHostnameLabels() {
        console.log('🖥️ Showing hostname labels...');
        window.sceneManager?.showStatus('Loading hostnames...', 'info');
        
        try {
            // Clear existing hostname labels
            this.clearHostnameLabels();
            
            // Get network info for all assigned lights
            const networkInfo = await this.getNetworkInfoForLights();
            
            if (networkInfo.length === 0) {
                window.sceneManager?.showStatus('No lights with network information found', 'warning');
                return;
            }
            
            // Create hostname labels
            let labelsCreated = 0;
            networkInfo.forEach(info => {
                if (info.hostname) {
                    const label = this.createNetworkLabel(info.light, info.hostname, 'hostname');
                    if (label) {
                        this.hostnameLabels.push(label);
                        labelsCreated++;
                    }
                }
            });
            
            window.sceneManager?.showStatus(`${labelsCreated} hostname labels displayed`, 'success');
            this.canvas.renderAll();
            
        } catch (error) {
            console.error('❌ Error showing hostname labels:', error);
            window.sceneManager?.showStatus('Failed to load hostname labels: ' + error.message, 'error');
        }
    }
    
    async showMACLabels() {
        console.log('🔗 Showing MAC address labels...');
        window.sceneManager?.showStatus('Loading MAC addresses...', 'info');
        
        try {
            // Clear existing MAC labels
            this.clearMACLabels();
            
            // Get network info for all assigned lights
            const networkInfo = await this.getNetworkInfoForLights();
            
            if (networkInfo.length === 0) {
                window.sceneManager?.showStatus('No lights with network information found', 'warning');
                return;
            }
            
            // Create MAC labels
            let labelsCreated = 0;
            networkInfo.forEach(info => {
                if (info.macAddress) {
                    const label = this.createNetworkLabel(info.light, info.macAddress, 'mac');
                    if (label) {
                        this.macLabels.push(label);
                        labelsCreated++;
                    }
                }
            });
            
            window.sceneManager?.showStatus(`${labelsCreated} MAC address labels displayed`, 'success');
            this.canvas.renderAll();
            
        } catch (error) {
            console.error('❌ Error showing MAC labels:', error);
            window.sceneManager?.showStatus('Failed to load MAC labels: ' + error.message, 'error');
        }
    }
    
    async getNetworkInfoForLights() {
        // Get all lights on the floorplan that have assigned entities
        const assignedLights = this.lights.filter(light => light.entityId);
        
        if (assignedLights.length === 0) {
            throw new Error('No lights with assigned entities found on floorplan');
        }
        
        console.log(`🔍 Found ${assignedLights.length} assigned lights on floorplan`);
        
        // Get HA API configuration
        const haUrl = `${window.location.protocol}//${window.location.host}${API_BASE}`;
        const haToken = localStorage.getItem('ha_token') || '';
        
        if (!haToken) {
            throw new Error('Home Assistant token not configured');
        }
        
        // Get device registry and device trackers
        const [deviceRegistry, deviceTrackers] = await Promise.all([
            this.getDeviceRegistry(haUrl, haToken),
            this.getDeviceTrackersByMAC(haUrl, haToken)
        ]);
        
        console.log(`📱 Found ${Object.keys(deviceRegistry).length} devices in registry`);
        console.log(`📍 Found ${Object.keys(deviceTrackers).length} device trackers`);
        
        // Match lights to network information
        const networkInfo = [];
        
        for (const light of assignedLights) {
            try {
                const entityId = light.entityId;
                
                // Find device for this entity
                const device = this.findDeviceForEntity(entityId, deviceRegistry);
                if (!device) {
                    console.warn(`⚠️ No device found for entity: ${entityId}`);
                    continue;
                }
                
                // Get MAC address from device
                const macAddress = this.getMACAddressFromDevice(device);
                if (!macAddress) {
                    console.warn(`⚠️ No MAC address found for device: ${device.name}`);
                    continue;
                }
                
                // Find corresponding device tracker
                const tracker = deviceTrackers[macAddress.toLowerCase()];
                if (!tracker) {
                    console.warn(`⚠️ No device tracker found for MAC: ${macAddress}`);
                    continue;
                }
                
                // Extract network information
                const info = {
                    light: light,
                    entityId: entityId,
                    deviceName: device.name || device.name_by_user,
                    macAddress: macAddress.toUpperCase(),
                    ipAddress: null,
                    hostname: null
                };
                
                // Get IP address if device is online
                if (tracker.state === 'home' && tracker.attributes?.ip) {
                    info.ipAddress = tracker.attributes.ip;
                }
                
                // Get hostname from device tracker name or attributes
                if (tracker.attributes?.friendly_name) {
                    info.hostname = tracker.attributes.friendly_name;
                } else if (tracker.entity_id) {
                    // Extract hostname from entity_id (device_tracker.hostname)
                    const parts = tracker.entity_id.split('.');
                    if (parts.length > 1) {
                        info.hostname = parts[1];
                    }
                }
                
                networkInfo.push(info);
                console.log(`✅ Network info for ${entityId}:`, info);
                
            } catch (error) {
                console.error(`❌ Error processing light ${light.entityId}:`, error);
            }
        }
        
        return networkInfo;
    }
    
    async getDeviceRegistry(haUrl, haToken) {
        // For now, we'll get device info from the existing light entities
        // This is a simplified approach that works with the current system
        const devices = {};
        
        if (window.lightEntities) {
            Object.values(window.lightEntities).forEach(entity => {
                if (entity.device_id) {
                    devices[entity.device_id] = {
                        id: entity.device_id,
                        name: entity.friendlyName || entity.friendly_name || entity.entity_id,
                        name_by_user: entity.friendlyName || entity.friendly_name,
                        connections: entity.connections || [],
                        // For WiZ lights, try to extract MAC from entity attributes
                        mac_address: entity.attributes?.mac || null
                    };
                }
            });
        }
        
        return devices;
    }
    
    async getDeviceTrackersByMAC(haUrl, haToken) {
        try {
            const response = await fetch(`${haUrl}/api/states`, {
                headers: {
                    'Authorization': `Bearer ${haToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to get states: ${response.status}`);
            }
            
            const states = await response.json();
            const trackerMap = {};
            
            // Build MAC -> device tracker mapping
            states.forEach(state => {
                if (state.entity_id.startsWith('device_tracker.')) {
                    const mac = state.attributes?.mac?.toLowerCase();
                    if (mac) {
                        trackerMap[mac] = {
                            entity_id: state.entity_id,
                            state: state.state,
                            attributes: state.attributes
                        };
                    }
                }
            });
            
            return trackerMap;
            
        } catch (error) {
            console.error('❌ Error getting device trackers:', error);
            throw error;
        }
    }
    
    findDeviceForEntity(entityId, deviceRegistry) {
        // For lights with device_id in the entity data
        const entity = window.lightEntities?.[entityId];
        if (entity?.device_id && deviceRegistry[entity.device_id]) {
            return deviceRegistry[entity.device_id];
        }
        
        // Fallback: try to find by name matching
        const entityName = entity?.friendlyName || entity?.friendly_name || entityId;
        return Object.values(deviceRegistry).find(device => 
            device.name?.includes(entityName) || 
            entityName.includes(device.name)
        );
    }
    
    getMACAddressFromDevice(device) {
        // Try device connections first
        if (device.connections) {
            for (const connection of device.connections) {
                if (connection[0] === 'mac') {
                    return connection[1];
                }
            }
        }
        
        // Try direct mac_address property
        return device.mac_address || null;
    }
    
    createNetworkLabel(light, text, labelType) {
        try {
            const labelText = new fabric.Text(text, {
                left: light.left,
                top: light.top + 40 + (labelType === 'ip' ? 0 : labelType === 'hostname' ? 15 : 30),
                fontSize: 10,
                fill: this.isDarkTheme ? '#ffffff' : '#333333',
                backgroundColor: this.isDarkTheme ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.8)',
                fontFamily: 'Monaco, Consolas, monospace',
                textAlign: 'center',
                originX: 'center',
                originY: 'center',
                selectable: false,
                evented: false,
                networkLabel: true,
                labelType: labelType,
                parentLight: light
            });
            
            this.canvas.add(labelText);
            return labelText;
            
        } catch (error) {
            console.error('❌ Error creating network label:', error);
            return null;
        }
    }
    
    clearIPLabels() {
        this.ipLabels.forEach(label => {
            this.canvas.remove(label);
        });
        this.ipLabels = [];
    }
    
    clearHostnameLabels() {
        this.hostnameLabels.forEach(label => {
            this.canvas.remove(label);
        });
        this.hostnameLabels = [];
    }
    
    clearMACLabels() {
        this.macLabels.forEach(label => {
            this.canvas.remove(label);
        });
        this.macLabels = [];
    }
    
    clearAllNetworkLabels() {
        this.clearIPLabels();
        this.clearHostnameLabels();
        this.clearMACLabels();
        this.canvas.renderAll();
    }
    
    // Entity Panel Methods - Removed since entity panel is now in right sidebar
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing LightMapper Controller...');
    window.sceneManager = new LightMapperController();
    
    // Initialize floating settings panel
    import('./panels/SettingsPanel.js').then(module => {
        window.settingsPanel = new module.SettingsPanel();
        console.log('✅ Settings panel initialized');
    }).catch(err => {
        console.error('Failed to load settings panel:', err);
    });
    
    // Setup scene name input validation after sceneManager is initialized
    const newSceneName = document.getElementById('newSceneName');
    if (newSceneName) {
        newSceneName.addEventListener('input', (e) => {
            const hasText = e.target.value.trim().length > 0;
            const hasSelection = window.sceneManager?.selectedLights.size > 0;
            const saveButton = document.getElementById('saveScene');
            if (saveButton) {
                saveButton.disabled = !hasText || !hasSelection;
            }
        });
    }
});

// Floorplan Editor using Fabric.js
class FloorplanEditor {
    constructor() {
        this.canvas = null;
        this.currentTool = 'select';
        this.gridVisible = true;
        this.snapEnabled = true;
        
        // Grid system: 1 foot = 48 pixels, so 0.5 feet = 24 pixels per grid square
        this.pixelsPerFoot = 48; // Base scale: 48 pixels = 1 foot
        this.gridSize = 24; // 0.5 feet per grid square (24 pixels)
        this.feetPerGrid = 0.5; // Each grid square represents 0.5 feet
        
        // Measurement system
        this.useMetric = false; // false = Imperial (feet), true = Metric (meters)
        this.pixelsPerMeter = this.pixelsPerFoot * 3.28084; // 1 meter = 3.28084 feet
        this.metersPerGrid = this.feetPerGrid / 3.28084; // Grid size in meters
        
        this.isDarkTheme = false;
        this.showLabels = false;
        this.useFriendlyNames = false; // Always use entity names
        this.lightIconStyle = 'circle'; // Default light style
        this.showCurrentState = true; // true = show HA current state, false = show scene preview

        this.isDrawing = false;
        this.drawingPoints = [];
        this.roomOutline = null;

        this.lights = [];
        this.texts = [];
        this.labels = [];
        
        // Network label tracking
        this.ipLabels = [];
        this.hostnameLabels = [];
        this.macLabels = [];
        
        // Snapping enhancements
        this.snapTolerance = 10; // pixels within which to snap to objects
        this.snapGuides = []; // for visual feedback lines
        this.selectedLight = null; // currently selected light for controls integration
        
        // Distance measurement display
        this.measurementDisplay = null; // Current measurement overlay
        this.showMeasurements = true; // Enable/disable measurement display
        
        this.autoSaveTimer = null;
        this.saveDelay = 2000; // 2 seconds after last change
        this.autoSaveInterval = 30000; // 30 seconds periodic save
        this.isLoadingLayout = false; // Flag to prevent auto-save during loading
        this.initialLoadComplete = false; // Flag to prevent automatic loading after init
        this.zoomLevel = 1.0; // Initialize zoom level to 100%
        
        // Panning state
        this.isPanning = false;
        this.panStart = null;
        this.spacebarPressed = false;
        
        // Room drawing mode - default to rectangle
        this.roomDrawingMode = 'rectangle'; // 'rectangle' or 'polygon'
        
        // Room fill color settings
        this.roomFillColor = '#cccccc'; // Default room fill color (hex)
        this.roomFillOpacity = 0.3; // Default opacity (0.0 to 1.0)
        
        this.init();
    }
    
    init() {
        console.log('🚀 FloorplanEditor.init() called');
        this.setupCanvas();
        this.setupEventListeners();
        this.drawGrid();
        this.resizeCanvas();
        this.loadLayoutFromAutoSave();
        this.createLabels();
        this.startAutoSave();
        
        // Initialize layer manager after canvas is ready
        this.layerManager = new LayerManager(this);
        window.layerManager = this.layerManager; // Make globally accessible
        
        // Connect LayersPanel to LayerManager
        setTimeout(() => {
            const layersPanel = window.panelManager?.getPanel('layers');
            if (layersPanel) {
                layersPanel.setLayerManager(this.layerManager);
                console.log('✅ LayersPanel connected to LayerManager');
            }
        }, 500); // Small delay to ensure panels are initialized
        
        // Setup canvas event handlers for layer management
        this.setupLayerEventHandlers();
        
        // ✅ SET DEFAULT TOOL TO SELECT MODE
        console.log('🎯 Setting default tool to SELECT');
        this.setTool('select');
        
        // Fix existing rooms without wallHeight
        this.fixExistingRooms();
    }
    
    fixExistingRooms() {
        // Fix any existing rooms that don't have wallHeight property
        const objects = this.canvas.getObjects();
        let fixedCount = 0;
        
        objects.forEach(obj => {
            if (obj.roomObject && !obj.wallHeight) {
                obj.wallHeight = 10; // Default 10 feet
                fixedCount++;
                console.log(`🔧 Fixed room ${obj.id || 'unnamed'} - added wallHeight: 10ft`);
            }
        });
        
        if (fixedCount > 0) {
            console.log(`✅ Fixed ${fixedCount} rooms with missing wallHeight property`);
            this.canvas.requestRenderAll();
            this.triggerAutoSave();
        }
    }
    
    setupLayerEventHandlers() {
        // Auto-create layers for new objects
        this.canvas.on('object:added', (e) => {
            const obj = e.target;
            
            // Skip temporary objects and objects that already have layers
            if (obj.customLayer || obj.isTemporary || obj.gridLine || obj.snapGuide || obj.selectionRing) {
                return;
            }
            
            // Create layer for content objects (but not labels - they're part of lights)
            if (obj.lightObject || obj.roomObject || obj.textObject || obj.backgroundImage || (obj.labelObject && !obj.lightRef)) {
                this.layerManager.createLayerForObject(obj);
                
                // Notify LayersPanel to refresh
                const layersPanel = window.panelManager?.getPanel('layers');
                if (layersPanel) {
                    layersPanel.refresh();
                }
                
                // Broadcast to other panels
                window.panelManager?.broadcast('onObjectAdded', { object: obj });
            }
        });
        
        // Remove layers when objects are removed
        this.canvas.on('object:removed', (e) => {
            const obj = e.target;
            
            if (obj.customLayer) {
                this.layerManager.removeLayer(obj.customLayer);
                
                // Notify LayersPanel to refresh
                const layersPanel = window.panelManager?.getPanel('layers');
                if (layersPanel) {
                    layersPanel.refresh();
                }
                
                // Broadcast to other panels
                window.panelManager?.broadcast('onObjectRemoved', { object: obj });
            }
        });
        
        // Handle selection changes
        this.canvas.on('selection:created', (e) => {
            const obj = e.selected[0];
            if (obj?.customLayer) {
                window.panelManager?.broadcast('onObjectSelected', { object: obj });
            }
        });
        
        this.canvas.on('selection:updated', (e) => {
            const obj = e.selected[0];
            if (obj?.customLayer) {
                window.panelManager?.broadcast('onObjectSelected', { object: obj });
            }
        });
        
        this.canvas.on('selection:cleared', () => {
            window.panelManager?.broadcast('onObjectDeselected', {});
        });
        
        console.log('✅ Layer event handlers setup complete');
        
        console.log('✅ FloorplanEditor initialization complete');
    }
    
    updateSelectionCount() {
        const selection = this.canvas.getActiveObjects();
        const count = selection ? selection.length : 0;
        
        // Dispatch event for footer
        window.dispatchEvent(new CustomEvent('selection:changed', {
            detail: { count }
        }));
    }
    
    setupCanvas() {
        console.log('🎨 Setting up canvas...');
        
        const canvasElement = document.getElementById('floorplan-canvas');
        const workspace = document.querySelector('.drawing-area');
        
        if (!canvasElement) {
            console.error('❌ Canvas element not found!');
            return;
        }
        
        if (!workspace) {
            console.error('❌ Workspace element not found!');
            return;
        }
        
        // Wait for the DOM to be properly rendered
        if (!workspace.clientWidth || !workspace.clientHeight) {
            console.warn('⚠️ Workspace not fully rendered yet, retrying in 100ms...');
            setTimeout(() => this.setupCanvas(), 100);
            return;
        }
        
        console.log('  Canvas element found:', canvasElement);
        console.log('  Workspace found:', workspace);
        
        // Set canvas size to fill workspace with proper sizing
        const width = workspace.clientWidth || 800;
        const height = workspace.clientHeight || 600;
        
        console.log('  Calculated dimensions:', { width, height });
        console.log('  Workspace clientWidth/Height:', workspace.clientWidth, workspace.clientHeight);
        console.log('  Workspace offsetWidth/Height:', workspace.offsetWidth, workspace.offsetHeight);
        
        canvasElement.width = width;
        canvasElement.height = height;
        
        console.log('  Canvas element dimensions set to:', { 
            width: canvasElement.width, 
            height: canvasElement.height,
            style: canvasElement.style.cssText
        });
        
        try {
            this.canvas = new fabric.Canvas('floorplan-canvas', {
                backgroundColor: this.isDarkTheme ? '#1a1a1a' : '#ffffff',
                selection: true,
                preserveObjectStacking: true,
                allowTouchScrolling: false,
                imageSmoothingEnabled: false,
                width: width,
                height: height,
                // Enable SHIFT key for proportional scaling and constrained angles
                uniScaleTransform: true,
                centeredScaling: false,
                centeredRotation: false,
                // 🔧 FIX: Proper right-click handling for Fabric.js v6
                stopContextMenu: true,  // Prevents browser context menu
                fireRightClick: true    // Enables right-click events in Fabric
            });
            
            console.log('✅ Fabric.js canvas created successfully');
            console.log('  Canvas dimensions in Fabric:', { 
                width: this.canvas.width, 
                height: this.canvas.height
            });
            
            // Override toObject for all fabric objects to include custom properties
            const originalToObject = fabric.Object.prototype.toObject;
            fabric.Object.prototype.toObject = function(propertiesToInclude) {
                const obj = originalToObject.call(this, propertiesToInclude);
                // Include our custom properties
                if (this.roomObject !== undefined) obj.roomObject = this.roomObject;
                if (this.roomOutline !== undefined) obj.roomOutline = this.roomOutline;
                if (this.lightObject !== undefined) obj.lightObject = this.lightObject;
                if (this.entityId !== undefined) obj.entityId = this.entityId;
                if (this.iconStyle !== undefined) obj.iconStyle = this.iconStyle;
                if (this.textObject !== undefined) obj.textObject = this.textObject;
                if (this.lineObject !== undefined) obj.lineObject = this.lineObject;
                if (this.customLayer !== undefined) obj.customLayer = this.customLayer;
                if (this.roomName !== undefined) obj.roomName = this.roomName;
                if (this.wallHeight !== undefined) obj.wallHeight = this.wallHeight;
                return obj;
            };
            console.log('✅ Custom properties serialization enabled');
            
            // 🔧 FIX: Additional context menu prevention for better browser compatibility
            this.canvas.getElement().addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                return false;
            });
            
            // 🔧 FIX: Also prevent on upper canvas element
            this.canvas.upperCanvasEl.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                return false;
            });
            
        } catch (error) {
            console.error('❌ Failed to create Fabric.js canvas:', error);
            return;
        }
        
        // Configure selection styles
        this.canvas.selectionColor = 'rgba(0, 153, 255, 0.1)';
        this.canvas.selectionBorderColor = '#0099ff';
        this.canvas.selectionLineWidth = 1;
        
        // 🔥 COMPREHENSIVE EVENT DEBUGGING
        console.log('🔥 Setting up canvas events with extensive debugging...');
        
        // 🔧 FIX: Right-click event for context menu (set up FIRST to handle right-clicks)
        this.canvas.on('mouse:down', (e) => {
            // Check if this is a right-click (button 3 or e.button === 2)
            if (e.e && (e.e.button === 2 || e.e.which === 3)) {
                console.log('🖱️ RIGHT CLICK detected:', e);
                console.log('  Target:', e.target);
                console.log('  Pointer:', e.pointer);
                
                // Prevent the default context menu
                e.e.preventDefault();
                e.e.stopPropagation();
                
                // Only show context menu on light objects
                if (e.target && e.target.lightObject) {
                    console.log('🔧 Right-click on light object - showing context menu');
                    this.showLightContextMenu(e.target, e.e);
                }
                return false;
            }
            
            // Handle non-right-click mouse down events
            console.log('🖱️ MOUSE DOWN:', e);
            console.log('  Target:', e.target);
            console.log('  Pointer:', e.pointer);
            console.log('  Current tool:', this.currentTool);
            this.handleMouseDown(e);
        });
        
        this.canvas.on('mouse:move', (e) => {
            // Don't log every mouse move to avoid spam
            this.handleMouseMove(e);
        });
        
        this.canvas.on('mouse:up', (e) => {
            console.log('🖱️ MOUSE UP:', e);
            console.log('  Target:', e.target);
            console.log('  Pointer:', e.pointer);
            this.handleMouseUp(e);
        });
        
        // 🔧 FIX: Double-click event for entity assignment
        this.canvas.on('mouse:dblclick', (e) => {
            console.log('🖱️ DOUBLE CLICK:', e);
            console.log('  Target:', e.target);
            console.log('  Pointer:', e.pointer);
            
            // Only handle double-click on light objects
            if (e.target && e.target.lightObject) {
                console.log('🔧 Double-click on light object - setting light for entity panel');
                // Use the new entity panel instead of old popup
                if (window.entityPanel) {
                    window.entityPanel.setSelectedLight(e.target);
                    window.sceneManager?.showStatus('Light selected. Choose an entity below to assign.', 'info');
                } else {
                    // Fallback to old method if entity panel not available
                    this.assignEntityToLight(e.target);
                }
            }
        });
        
        // Selection events
        this.canvas.on('object:selected', (e) => {
            console.log('🎯 OBJECT SELECTED EVENT:', e);
            console.log('  Selected object:', e.target);
            console.log('  Object type:', e.target?.type);
            console.log('  Object properties:', {
                lightObject: e.target?.lightObject,
                entityId: e.target?.entityId,
                iconStyle: e.target?.iconStyle,
                selectable: e.target?.selectable,
                evented: e.target?.evented
            });
            this.handleObjectSelected(e);
        });
        
        this.canvas.on('selection:created', (e) => {
            console.log('🎯 SELECTION CREATED:', e);
            console.log('  Selected objects:', e.selected);
            if (e.selected && e.selected.length > 0) {
                const obj = e.selected[0];
                console.log('  First selected object properties:', {
                    type: obj.type,
                    lightObject: obj.lightObject,
                    entityId: obj.entityId,
                    selectable: obj.selectable,
                    evented: obj.evented
                });
                
                // ✅ ALSO HANDLE SELECTION HERE - this is the main selection event in v6
                console.log('🔄 Calling handleObjectSelected from selection:created');
                this.handleObjectSelected({ target: obj, selected: e.selected });
            }
            
            // Update selection count in footer
            this.updateSelectionCount();
        });
        
        this.canvas.on('selection:updated', (e) => {
            console.log('🎯 SELECTION UPDATED:', e);
            console.log('  Selected objects:', e.selected);
            if (e.selected && e.selected.length > 0) {
                const obj = e.selected[0];
                console.log('  Updated selected object properties:', {
                    type: obj.type,
                    lightObject: obj.lightObject,
                    entityId: obj.entityId
                });
                
                // ✅ ALSO HANDLE SELECTION UPDATES
                console.log('🔄 Calling handleObjectSelected from selection:updated');
                this.handleObjectSelected({ target: obj, selected: e.selected });
            }
            
            // Update selection count in footer
            this.updateSelectionCount();
        });
        
        this.canvas.on('selection:cleared', (e) => {
            console.log('🎯 SELECTION CLEARED:', e);
            this.handleSelectionCleared();
            
            // Update selection count in footer
            this.updateSelectionCount();
        });
        
        // Movement events
        this.canvas.on('object:moving', (e) => {
            console.log('🚀 OBJECT MOVING:', e.target?.type, e.target?.lightObject);
            this.handleObjectMoving(e);
        });
        
        this.canvas.on('object:moved', (e) => {
            console.log('🚀 OBJECT MOVED:', e.target?.type, e.target?.lightObject);
            this.handleObjectMoved(e);
        });
        
        // Resize/Scale events
        this.canvas.on('object:scaling', (e) => {
            console.log('📏 OBJECT SCALING:', e.target?.type);
            this.handleObjectScaling(e);
        });
        
        this.canvas.on('object:scaled', (e) => {
            console.log('📏 OBJECT SCALED:', e.target?.type);
            this.handleObjectScaled(e);
        });
        
        this.canvas.on('object:modified', (e) => {
            console.log('✏️ OBJECT MODIFIED:', e.target?.type);
            this.handleObjectModified(e);
        });
        
        // Object events
        this.canvas.on('object:added', (e) => {
            console.log('➕ OBJECT ADDED:', e.target?.type, e.target?.lightObject);
        });
        
        this.canvas.on('object:removed', (e) => {
            console.log('➖ OBJECT REMOVED:', e.target?.type, e.target?.lightObject);
        });
        
        // Path events
        this.canvas.on('path:created', (e) => {
            console.log('🎨 PATH CREATED:', e);
        });
        
        console.log('✅ Canvas events attached with debugging');
        
        // Initialize layer control button states
        this.updateLayerControlButtons();
        
        // Handle window resize
        window.addEventListener('resize', this.resizeCanvas.bind(this));
        
        // Add global debug functions for console access
        window.floorplanDebug = {
            forceGridRefresh: () => this.forceGridRefresh(),
            drawGrid: () => this.drawGrid(),
            toggleGrid: () => this.toggleGrid(),
            testSelection: () => {
                console.log('🧪 TESTING SELECTION:');
                console.log('  Canvas objects:', this.canvas.getObjects().length);
                console.log('  Light objects:', this.canvas.getObjects().filter(obj => obj.lightObject).length);
                console.log('  Current tool:', this.currentTool);
                console.log('  Canvas selection enabled:', this.canvas.selection);
                
                // List all light objects
                const lightObjects = this.canvas.getObjects().filter(obj => obj.lightObject);
                lightObjects.forEach((light, index) => {
                    console.log(`  Light ${index}:`, {
                        type: light.type,
                        selectable: light.selectable,
                        evented: light.evented,
                        entityId: light.entityId,
                        iconStyle: light.iconStyle,
                        position: { x: light.left, y: light.top }
                    });
                });
            },
            getCanvasInfo: () => {
                return {
                    canvas: this.canvas,
                    gridVisible: this.gridVisible,
                    gridSize: this.gridSize,
                    isDarkTheme: this.isDarkTheme,
                    objects: this.canvas.getObjects().length,
                    gridObjects: this.canvas.getObjects().filter(obj => obj.gridLine).length,
                    lightObjects: this.canvas.getObjects().filter(obj => obj.lightObject).length,
                    currentTool: this.currentTool,
                    selectionEnabled: this.canvas.selection
                };
            }
        };
        
        console.log('  Debug functions added to window.floorplanDebug');
        console.log('  Type "floorplanDebug.testSelection()" in console to test selection');
        console.log('🎨 Canvas setup complete');
    }
    
    setupEventListeners() {
        console.log('🔧 Setting up CAD interface event listeners...');
        
        // Tool buttons (now in ribbon interface)
        this.setupRibbonToolButtons();
        
        // Long-hold functionality for light style selection
        this.setupLongHoldLightTool();
        
        // Set up drag and drop for entities
        this.setupEntityDragAndDrop();
        this.setupLongHoldRoomTool();
        
        // Initialize room tool tooltip
        this.updateRoomToolTooltip();
        
        // Setup room fill controls (now in properties panel)
        this.setupRoomFillControls();
        
        // Add rectangle tool button setup
        const roomTool = document.getElementById('room-tool');
        if (roomTool) {
            roomTool.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                console.log('📐 Rectangle tool (right-click) activated');
                this.setTool('rectangle');
            });
        }
        
        // Keyboard shortcuts (handled by CAD interface, but keep local ones)
        document.addEventListener('keydown', (e) => {
            // Always handle ESC key for drawing tools, regardless of focus
            if (e.key === 'Escape' && this.isDrawing) {
                console.log('⌨️ ESC pressed during drawing - canceling');
                this.handleKeyDown(e);
                return;
            }
            
            if (document.activeElement === this.canvas.upperCanvasEl || 
                document.querySelector('.drawing-area:hover')) {
                console.log('⌨️ Keyboard event:', e.key);
                this.handleKeyDown(e);
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (document.activeElement === this.canvas.upperCanvasEl || 
                document.querySelector('.drawing-area:hover')) {
                this.handleKeyUp(e);
            }
        });
        
        // Setup advanced canvas navigation
        this.setupCanvasNavigation();
        
        console.log('✅ CAD interface event listeners setup complete');
    }
    
    setupRibbonToolButtons() {
        // Tool buttons in ribbon interface
        const selectTool = document.getElementById('select-tool');
        if (selectTool) {
            selectTool.addEventListener('click', () => {
                console.log('🎯 Select tool button clicked');
                this.setTool('select');
            });
        }
        
        const roomTool = document.getElementById('room-tool');
        if (roomTool) {
            roomTool.addEventListener('click', () => {
                console.log('🏠 Room tool button clicked');
                this.setTool('room');
            });
        }
        
        const lightTool = document.getElementById('light-tool');
        if (lightTool) {
            lightTool.addEventListener('click', () => {
                console.log('💡 Light tool button clicked');
                this.setTool('light');
            });
        }
        
        const lineTool = document.getElementById('line-tool');
        if (lineTool) {
            lineTool.addEventListener('click', () => {
                console.log('📏 Line tool button clicked');
                this.setTool('line');
            });
        }
        
        const textTool = document.getElementById('text-tool');
        if (textTool) {
            textTool.addEventListener('click', () => {
                console.log('📝 Text tool button clicked');
                this.setTool('text');
            });
        }
        
        // Import buttons
        const importSvgBg = document.getElementById('import-svg-bg');
        if (importSvgBg) {
            importSvgBg.addEventListener('click', () => {
                console.log('🖼️ Import SVG as background clicked');
                this.importSVGBackground();
            });
        }
        
        const importSvgRooms = document.getElementById('import-svg-rooms');
        if (importSvgRooms) {
            importSvgRooms.addEventListener('click', () => {
                console.log('🏠 Import SVG as rooms clicked');
                this.importSVGAsRooms();
            });
        }
        
        const importObj3D = document.getElementById('import-obj-3d');
        if (importObj3D) {
            importObj3D.addEventListener('click', () => {
                console.log('📦 Import OBJ 3D model clicked');
                this.importOBJ3DModel();
            });
        }
        
        const backgroundTool = document.getElementById('background-tool');
        if (backgroundTool) {
            backgroundTool.addEventListener('click', () => this.importBackground());
        }
        
        // Zoom and view controls
        const zoomInBtn = document.getElementById('zoom-in-btn');
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => this.zoomIn());
        }
        
        const zoomOutBtn = document.getElementById('zoom-out-btn');
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => this.zoomOut());
        }
        
        const fitScreenBtn = document.getElementById('fit-screen-btn');
        if (fitScreenBtn) {
            fitScreenBtn.addEventListener('click', () => this.fitToScreen());
        }
        
        // Modify tools
        const bringToFrontBtn = document.getElementById('bring-to-front-btn');
        if (bringToFrontBtn) {
            bringToFrontBtn.addEventListener('click', () => this.bringToFront());
        }
        
        const sendToBackBtn = document.getElementById('send-to-back-btn');
        if (sendToBackBtn) {
            sendToBackBtn.addEventListener('click', () => this.sendToBack());
        }
        
        const bringForwardBtn = document.getElementById('bring-forward-btn');
        if (bringForwardBtn) {
            bringForwardBtn.addEventListener('click', () => this.bringForward());
        }
        
        const sendBackwardBtn = document.getElementById('send-backward-btn');
        if (sendBackwardBtn) {
            sendBackwardBtn.addEventListener('click', () => this.sendBackward());
        }
        
        const rotateBtn = document.getElementById('rotate-btn');
        if (rotateBtn) {
            rotateBtn.addEventListener('click', () => this.rotateSelected());
        }
        
        const deleteBtn = document.getElementById('delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteSelected());
        }
        
        const clearCanvasBtn = document.getElementById('clear-canvas-btn');
        if (clearCanvasBtn) {
            clearCanvasBtn.addEventListener('click', () => this.clearCanvas());
        }
        
        // View controls
        const gridToggleBtn = document.getElementById('grid-toggle-btn');
        if (gridToggleBtn) {
            gridToggleBtn.addEventListener('click', () => this.toggleGrid());
        }
        
        const snapToggleBtn = document.getElementById('snap-toggle-btn');
        if (snapToggleBtn) {
            snapToggleBtn.addEventListener('click', () => this.toggleSnap());
        }
        
        const themeToggleBtn = document.getElementById('theme-toggle-btn');
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => this.toggleTheme());
        }
        
        const preview3dToggleBtn = document.getElementById('preview3d-toggle-btn');
        if (preview3dToggleBtn) {
            preview3dToggleBtn.addEventListener('click', () => this.toggle3DPreview());
        }
        
        const unitsToggleBtn = document.getElementById('units-toggle-btn');
        if (unitsToggleBtn) {
            unitsToggleBtn.addEventListener('click', () => this.toggleUnits());
        }
        
        const labelsToggleBtn = document.getElementById('labels-toggle-btn');
        if (labelsToggleBtn) {
            labelsToggleBtn.addEventListener('click', () => this.toggleLabels());
        }
        
        const stateModeToggleBtn = document.getElementById('state-mode-toggle-btn');
        if (stateModeToggleBtn) {
            stateModeToggleBtn.addEventListener('click', () => this.toggleStateMode());
        }
        
        // Layout controls
        const saveLayoutBtn = document.getElementById('save-layout-btn');
        if (saveLayoutBtn) {
            saveLayoutBtn.addEventListener('click', () => this.saveLayoutToFile());
        }
        
        const loadLayoutBtn = document.getElementById('load-layout-btn');
        if (loadLayoutBtn) {
            loadLayoutBtn.addEventListener('click', () => this.loadLayoutFromFile());
        }
        
        // Label buttons (Insert tab)
        const ipLabelsBtn = document.getElementById('ip-labels-btn');
        if (ipLabelsBtn) {
            ipLabelsBtn.addEventListener('click', () => this.showIPLabels());
        }
        
        const hostnameLabelsBtn = document.getElementById('hostname-labels-btn');
        if (hostnameLabelsBtn) {
            hostnameLabelsBtn.addEventListener('click', () => this.showHostnameLabels());
        }
        
        const macLabelsBtn = document.getElementById('mac-labels-btn');
        if (macLabelsBtn) {
            macLabelsBtn.addEventListener('click', () => this.showMACLabels());
        }
        
        console.log('🎀 Ribbon tool buttons setup complete');
    }
    
    setupLongHoldLightTool() {
        const lightTool = document.getElementById('light-tool');
        const lightStyleBtn = document.getElementById('light-style-btn');
        
        // Replace light-style-btn with regular light tool activation
        lightTool.addEventListener('mousedown', (e) => {
            this.longHoldTimer = setTimeout(() => {
                this.showLightStyleMenu(e);
                this.longHoldActive = true;
            }, 500);
        });
        
        lightTool.addEventListener('mouseup', () => {
            if (this.longHoldTimer) {
                clearTimeout(this.longHoldTimer);
                if (!this.longHoldActive) {
                    this.setTool('light');
                }
                this.longHoldActive = false;
            }
        });
        
        lightTool.addEventListener('mouseleave', () => {
            if (this.longHoldTimer) {
                clearTimeout(this.longHoldTimer);
                this.longHoldActive = false;
            }
        });
        
        // Hide the old light style button
        lightStyleBtn.style.display = 'none';
    }
    
    setupEntityDragAndDrop() {
        console.log('🎯 Setting up entity drag and drop on canvas...');
        
        if (!this.canvas) {
            console.error('❌ Canvas not initialized for drag and drop setup');
            return;
        }
        
        const canvasElement = this.canvas.getElement();
        const drawingArea = document.querySelector('.drawing-area');
        
        // Use drawing area as the primary drop zone, fallback to canvas element
        const dropZone = drawingArea || canvasElement;
        
        console.log('🎯 Using drop zone:', dropZone.className || 'canvas-element');
        
        // Prevent default drag over to allow dropping
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
            dropZone.classList.add('drag-over');
        });
        
        // Handle drag enter for visual feedback
        dropZone.addEventListener('dragenter', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('drag-over');
        });
        
        // Handle drag leave
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Only remove class if we're leaving the drop zone entirely
            if (!dropZone.contains(e.relatedTarget)) {
                dropZone.classList.remove('drag-over');
            }
        });
        
        // Handle drop
        const handleDrop = (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('drag-over');
            
            console.log('🎯 Drop event triggered on:', e.target.className || e.target.tagName);
            
            // Get entity ID
            const entityId = e.dataTransfer.getData('application/x-home-assistant-entity') || 
                            e.dataTransfer.getData('text/plain');
            
            if (!entityId) {
                console.warn('⚠️ No entity ID in drop data');
                return;
            }
            
            console.log('✅ Dropped entity:', entityId);
            window.panelManager?.getPanel('debug')?.log(`Dropped entity: ${entityId}`, 'event');
            
            // Calculate drop position on canvas
            const rect = canvasElement.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Convert to canvas coordinates accounting for viewport transform
            const vpt = this.canvas.viewportTransform;
            const canvasX = (x - vpt[4]) / vpt[0];
            const canvasY = (y - vpt[5]) / vpt[3];
            
            const pointer = { x: canvasX, y: canvasY };
            
            console.log('📍 Drop position:', pointer);
            
            // Create light at drop position
            this.createLightFromEntityDrop(pointer, entityId);
        };
        
        // Attach drop handler to both elements for maximum compatibility
        dropZone.addEventListener('drop', handleDrop);
        if (dropZone !== canvasElement) {
            canvasElement.addEventListener('drop', handleDrop);
        }
        
        console.log('✅ Entity drag and drop handlers setup complete');
    }
    
    createLightFromEntityDrop(position, entityId) {
        console.log('💡 Creating light from entity drop:', entityId, 'at position:', position);
        
        // Snap position to grid
        const snappedPosition = this.snapToGrid(position);
        console.log('💡 Snapped position:', snappedPosition);
        
        // Create the light using addLight
        const light = this.addLight(snappedPosition);
        
        if (light) {
            // Assign the entity to the newly created light
            light.entityId = entityId;
            
            // Update the light's visual state if we have entity data
            if (window.lightEntities && window.lightEntities[entityId]) {
                this.updateLightVisualState(light, window.lightEntities[entityId]);
            }
            
            // Create label if labels are enabled
            if (this.showLabels) {
                const label = this.createLabelForLight(light);
                if (label) {
                    this.canvas.add(label);
                    if (!this.labels) {
                        this.labels = [];
                    }
                    this.labels.push(label);
                    
                    // Store the label reference on the light for easy updates
                    light.labelObject = label;
                    label.lightRef = light;
                    
                    // Ensure label is rendered
                    this.canvas.renderAll();
                }
            }
            
            // Show success message
            window.sceneManager?.showStatus(`Light created and assigned to ${entityId}`, 'success');
            
            // Log to debug panel
            window.panelManager?.getPanel('debug')?.log(`Light created and assigned: ${entityId}`, 'success');
            
            // Refresh panels
            window.panelManager?.refreshPanel('lights');
            window.panelManager?.refreshPanel('entities');
            
            // Trigger auto-save
            this.triggerAutoSave();
        } else {
            console.error('❌ Failed to create light');
            window.panelManager?.getPanel('debug')?.log('Failed to create light', 'error');
        }
    }
    
    setupLongHoldRoomTool() {
        const roomTool = document.getElementById('room-tool');
        let longHoldTimer = null;
        let longHoldTriggered = false;
        let menuActive = false;
        
        const startLongHold = (e) => {
            longHoldTriggered = false;
            menuActive = false;
            longHoldTimer = setTimeout(() => {
                console.log('🏠 Long-hold detected on room tool');
                longHoldTriggered = true;
                menuActive = true;
                this.showRoomModeMenu(e);
            }, 500); // 500ms for long hold
        };
        
        const cancelLongHold = () => {
            if (longHoldTimer && !menuActive) {
                clearTimeout(longHoldTimer);
                longHoldTimer = null;
            }
        };
        
        const handleMouseUp = (e) => {
            // Only cancel if menu isn't active
            if (!menuActive) {
                cancelLongHold();
            }
        };
        
        roomTool.addEventListener('mousedown', startLongHold);
        roomTool.addEventListener('mouseup', handleMouseUp);
        roomTool.addEventListener('mouseleave', (e) => {
            // Only cancel if we're not hovering over a menu
            if (!menuActive) {
                cancelLongHold();
            }
        });
        roomTool.addEventListener('touchstart', startLongHold);
        roomTool.addEventListener('touchend', handleMouseUp);
        
        // Store menu state for cleanup
        this.roomMenuActive = () => menuActive;
        this.setRoomMenuActive = (state) => { menuActive = state; };
        
        // Regular click for normal tool selection
        roomTool.addEventListener('click', (e) => {
            // Give long-hold a chance to trigger first
            setTimeout(() => {
                if (!longHoldTriggered && !menuActive) {
                    console.log('🏠 Regular click on room tool');
                    this.setTool('room');
                }
                // Reset flags after a longer delay to allow menu interactions
                setTimeout(() => {
                    longHoldTriggered = false;
                }, 100);
            }, 50);
        });
    }
    
    showRoomModeMenu(event) {
        // Remove any existing menu
        const existingMenu = document.querySelector('.room-mode-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
        
        const menu = document.createElement('div');
        menu.className = 'room-mode-menu';
        menu.style.position = 'fixed';
        menu.style.left = event.clientX + 'px';
        menu.style.top = event.clientY + 'px';
        menu.style.zIndex = '10000';
        menu.style.background = 'var(--card-background-color)';
        menu.style.border = '1px solid var(--border-color)';
        menu.style.borderRadius = '8px';
        menu.style.padding = '8px';
        menu.style.boxShadow = 'var(--material-shadow-elevation-2dp)';
        menu.style.minWidth = '160px';
        
        const rectangleOption = document.createElement('div');
        rectangleOption.className = 'room-mode-option';
        rectangleOption.innerHTML = `
            <i class="fas fa-square" style="margin-right: 8px; color: ${this.roomDrawingMode === 'rectangle' ? 'var(--primary-color)' : 'var(--text-muted)'};"></i>
            Rectangle Mode
            ${this.roomDrawingMode === 'rectangle' ? '<span style="color: var(--primary-color); margin-left: auto;">✓</span>' : ''}
        `;
        rectangleOption.style.padding = '8px 12px';
        rectangleOption.style.cursor = 'pointer';
        rectangleOption.style.display = 'flex';
        rectangleOption.style.alignItems = 'center';
        rectangleOption.style.borderRadius = '4px';
        rectangleOption.style.transition = 'background-color 0.2s';
        
        const polygonOption = document.createElement('div');
        polygonOption.className = 'room-mode-option';
        polygonOption.innerHTML = `
            <i class="fas fa-draw-polygon" style="margin-right: 8px; color: ${this.roomDrawingMode === 'polygon' ? 'var(--primary-color)' : 'var(--text-muted)'};"></i>
            Polygon Mode
            ${this.roomDrawingMode === 'polygon' ? '<span style="color: var(--primary-color); margin-left: auto;">✓</span>' : ''}
        `;
        polygonOption.style.padding = '8px 12px';
        polygonOption.style.cursor = 'pointer';
        polygonOption.style.display = 'flex';
        polygonOption.style.alignItems = 'center';
        polygonOption.style.borderRadius = '4px';
        polygonOption.style.transition = 'background-color 0.2s';
        
        // Add hover effects
        [rectangleOption, polygonOption].forEach(option => {
            option.addEventListener('mouseenter', () => {
                option.style.backgroundColor = 'color-mix(in srgb, var(--primary-color) 10%, transparent)';
            });
            option.addEventListener('mouseleave', () => {
                option.style.backgroundColor = 'transparent';
            });
        });
        
        // Function to clean up menu and reset state
        const cleanupMenu = () => {
            if (menu.parentNode) {
                menu.remove();
            }
            if (this.setRoomMenuActive) {
                this.setRoomMenuActive(false);
            }
            document.removeEventListener('click', outsideClickHandler);
            document.removeEventListener('mousedown', outsideClickHandler);
        };
        
        // Handle mode selection
        const selectRectangleMode = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🏠 Rectangle mode selected');
            this.roomDrawingMode = 'rectangle';
            this.updateRoomToolTooltip();
            window.sceneManager?.showStatus('Room tool set to Rectangle mode', 'success');
            cleanupMenu();
        };
        
        const selectPolygonMode = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🏠 Polygon mode selected');
            this.roomDrawingMode = 'polygon';
            this.updateRoomToolTooltip();
            window.sceneManager?.showStatus('Room tool set to Polygon mode', 'success');
            cleanupMenu();
        };
        
        // Use both mousedown and mouseup for better drag-and-release support
        rectangleOption.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        rectangleOption.addEventListener('mouseup', selectRectangleMode);
        rectangleOption.addEventListener('click', selectRectangleMode);
        
        polygonOption.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        polygonOption.addEventListener('mouseup', selectPolygonMode);
        polygonOption.addEventListener('click', selectPolygonMode);
        
        menu.appendChild(rectangleOption);
        menu.appendChild(polygonOption);
        document.body.appendChild(menu);
        
        // Handle clicking outside menu
        const outsideClickHandler = (e) => {
            if (!menu.contains(e.target)) {
                console.log('🏠 Clicking outside menu, closing');
                cleanupMenu();
            }
        };
        
        // Add outside click detection with a small delay
        setTimeout(() => {
            document.addEventListener('click', outsideClickHandler);
            document.addEventListener('mousedown', outsideClickHandler);
        }, 150);
        
        console.log('🏠 Room mode menu shown');
    }
    
    updateRoomToolTooltip() {
        const roomTool = document.getElementById('room-tool');
        if (this.roomDrawingMode === 'rectangle') {
            roomTool.title = 'Draw Room Outline - Rectangle Mode (Long-click to change)';
        } else {
            roomTool.title = 'Draw Room Outline - Polygon Mode (Long-click to change)';
        }
    }
    
    setupRoomFillControls() {
        console.log('🎨 Setting up room fill controls...');
        
        const colorPicker = document.getElementById('room-fill-color');
        const opacitySlider = document.getElementById('room-fill-opacity');
        
        if (!colorPicker || !opacitySlider) {
            console.warn('⚠️ Room fill controls not found in DOM');
            return;
        }
        
        // Initialize values
        colorPicker.value = this.roomFillColor;
        opacitySlider.value = this.roomFillOpacity * 100;
        this.updateOpacitySliderBackground();
        
        // Color picker change handler
        colorPicker.addEventListener('input', (e) => {
            this.roomFillColor = e.target.value;
            this.updateOpacitySliderBackground();
            this.updateSelectedRoomFill();
            console.log('🎨 Room fill color changed to:', this.roomFillColor);
        });
        
        // Opacity slider change handler
        opacitySlider.addEventListener('input', (e) => {
            this.roomFillOpacity = e.target.value / 100;
            this.updateSelectedRoomFill();
            console.log('🎨 Room fill opacity changed to:', this.roomFillOpacity);
        });
        
        console.log('✅ Room fill controls setup complete');
    }
    
    updateOpacitySliderBackground() {
        const opacitySlider = document.getElementById('room-fill-opacity');
        if (opacitySlider) {
            opacitySlider.style.setProperty('--fill-color', this.roomFillColor);
        }
    }
    
    updateSelectedRoomFill() {
        const selectedObjects = this.canvas.getActiveObjects();
        if (selectedObjects.length === 0) return;
        
        selectedObjects.forEach(obj => {
            if (obj.roomObject || obj.roomOutline) {
                const fillColor = this.hexToRgba(this.roomFillColor, this.roomFillOpacity);
                obj.set('fill', fillColor);
                console.log('🎨 Updated room object fill to:', fillColor);
            }
        });
        
        this.canvas.renderAll();
    }
    
    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    getCurrentRoomFill() {
        return this.hexToRgba(this.roomFillColor, this.roomFillOpacity);
    }
    
    showLightStyleMenu(event) {
        // Create popup menu for light style selection
        const menu = document.createElement('div');
        menu.className = 'light-style-menu';
        menu.style.cssText = `
            position: absolute;
            background: var(--darker-bg);
            border: 2px solid var(--primary-color);
            border-radius: 8px;
            padding: 10px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 5px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;
        
        const styles = [
            { name: 'Circle', icon: '○', value: 'circle' },
            { name: 'Bulb', icon: '●', value: 'bulb' },
            { name: 'Recessed', icon: '◐', value: 'recessed' }
        ];
        
        styles.forEach(style => {
            const btn = document.createElement('button');
            btn.innerHTML = `${style.icon} ${style.name}`;
            btn.style.cssText = `
                background: var(--card-bg);
                border: 1px solid var(--border-color);
                color: var(--text-color);
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
                transition: var(--transition);
            `;
            btn.addEventListener('click', () => {
                this.lightIconStyle = style.value;
                this.setTool('light');
                document.body.removeChild(menu);
                window.sceneManager?.showStatus(`Light style changed to ${style.name}`, 'info');
            });
            btn.addEventListener('mouseenter', () => {
                btn.style.background = 'var(--primary-color)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.background = 'var(--card-bg)';
            });
            menu.appendChild(btn);
        });
        
        // Position menu near the click
        const rect = event.target.getBoundingClientRect();
        menu.style.left = (rect.right + 10) + 'px';
        menu.style.top = rect.top + 'px';
        
        document.body.appendChild(menu);
        
        // Remove menu when clicking elsewhere
        setTimeout(() => {
            const removeMenu = (e) => {
                if (!menu.contains(e.target)) {
                    document.body.removeChild(menu);
                    document.removeEventListener('click', removeMenu);
                }
            };
            document.addEventListener('click', removeMenu);
        }, 100);
    }
    
    setTool(tool) {
        console.log(`🛠️ Setting tool to: ${tool}`);
        this.currentTool = tool;
        
        // Update tool button states (both old and new interface)
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.ribbon-tool').forEach(btn => btn.classList.remove('active'));
        
        // Update the specific tool button
        if (tool === 'rectangle') {
            const roomTool = document.getElementById('room-tool');
            if (roomTool) roomTool.classList.add('active');
        } else {
            const toolBtn = document.getElementById(tool + '-tool');
            if (toolBtn) toolBtn.classList.add('active');
        }
        
        // Update canvas interaction mode
        if (tool === 'select') {
            console.log('🎯 Enabling selection mode');
            this.canvas.selection = true;
            this.canvas.defaultCursor = 'default';
            this.canvas.hoverCursor = 'move';
            this.canvas.forEachObject(obj => {
                if (!obj.gridLine) {
                    obj.selectable = true;
                    obj.evented = true;
                    console.log(`  Making object selectable: ${obj.type}, lightObject: ${obj.lightObject}`);
                }
            });
        } else {
            console.log('🚫 Disabling selection mode');
            this.canvas.selection = false;
            this.canvas.defaultCursor = 'crosshair';
            this.canvas.hoverCursor = 'crosshair';
            this.canvas.discardActiveObject();
            this.canvas.forEachObject(obj => {
                obj.selectable = false;
                obj.evented = false;
            });
        }
        
        // Update command status in CAD interface
        if (window.cadInterface) {
            window.cadInterface.updateCommandStatus(`Tool: ${tool}`);
        }
        
        this.canvas.renderAll();
        console.log(`✅ Tool set to: ${tool}, selection enabled: ${this.canvas.selection}`);
    }
    
    drawGrid() {
        if (!this.gridVisible || !this.canvas) {
            console.log('❌ Grid not visible or canvas not ready');
            return;
        }
        
        // Skip grid redraw if we're in the middle of panel resizing
        if (this.isResizing) {
            return;
        }

        // Create grid pattern using canvas background
        this.createGridPattern();
        return; // Skip the old line-based approach
    }

    createGridPattern() {
        if (!this.canvas) {
            console.log('❌ Cannot create grid pattern - canvas not ready');
            return;
        }
        
        // Skip grid pattern creation if we're in the middle of panel resizing
        if (this.isResizing) {
            return;
        }

        try {
            // Create a small canvas for the grid pattern
            const patternCanvas = document.createElement('canvas');
            const patternCtx = patternCanvas.getContext('2d');
            
            // Set pattern size to grid size
            const gridSize = this.gridSize || 20;
            patternCanvas.width = gridSize;
            patternCanvas.height = gridSize;
            
            // Get grid color
            const gridColor = this.getGridColor();
            
            // Draw grid lines on pattern canvas
            patternCtx.strokeStyle = gridColor;
            patternCtx.lineWidth = 1;
            patternCtx.beginPath();
            
            // Vertical line
            patternCtx.moveTo(gridSize - 0.5, 0);
            patternCtx.lineTo(gridSize - 0.5, gridSize);
            
            // Horizontal line
            patternCtx.moveTo(0, gridSize - 0.5);
            patternCtx.lineTo(gridSize, gridSize - 0.5);
            
            patternCtx.stroke();
            
            // Create pattern and apply to canvas
            const pattern = this.canvas.contextContainer.createPattern(patternCanvas, 'repeat');
            
            // Apply pattern as canvas background
            if (this.canvas) {
                this.canvas.backgroundColor = pattern;
                this.canvas.renderAll();
            }
            
            console.log('✅ Grid pattern applied as background');
        } catch (error) {
            console.error('❌ Error creating grid pattern:', error);
            // Fallback to transparent background
            if (this.canvas) {
                this.canvas.backgroundColor = 'transparent';
                if (this.canvas.renderAll) {
                    this.canvas.renderAll();
                }
            }
        }
    }

    getGridColor() {
        // Return custom grid color if set, otherwise use theme-based default
        if (this.customGridColor) {
            return this.customGridColor;
        }
        return this.isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    }
    
    setupGridColorPicker() {
        const gridButton = document.getElementById('gridStatus');
        if (!gridButton) return;
        
        let longClickTimer = null;
        let isLongClick = false;
        
        const handleMouseDown = (e) => {
            isLongClick = false;
            longClickTimer = setTimeout(() => {
                isLongClick = true;
                this.showGridColorPicker();
            }, 500); // 500ms for long click
        };
        
        const handleMouseUp = () => {
            clearTimeout(longClickTimer);
            // Don't trigger normal click if it was a long click
            if (isLongClick) {
                return;
            }
        };
        
        const handleClick = (e) => {
            if (isLongClick) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            // Normal grid toggle will be handled by existing code
        };
        
        gridButton.addEventListener('mousedown', handleMouseDown);
        gridButton.addEventListener('mouseup', handleMouseUp);
        gridButton.addEventListener('mouseleave', () => clearTimeout(longClickTimer));
        gridButton.addEventListener('click', handleClick);
    }
    
    showGridColorPicker() {
        // Create color picker popup
        const popup = document.createElement('div');
        popup.style.position = 'fixed';
        popup.style.bottom = '40px';
        popup.style.right = '20px';
        popup.style.backgroundColor = '#2b2b2b';
        popup.style.border = '1px solid #666';
        popup.style.borderRadius = '4px';
        popup.style.padding = '12px';
        popup.style.zIndex = '10000';
        popup.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
        
        const title = document.createElement('div');
        title.textContent = 'Grid Color';
        title.style.color = '#fff';
        title.style.fontSize = '12px';
        title.style.marginBottom = '8px';
        title.style.fontWeight = 'bold';
        
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = this.customGridColor || '#ffffff';
        colorInput.style.width = '100%';
        colorInput.style.height = '30px';
        colorInput.style.border = 'none';
        colorInput.style.borderRadius = '2px';
        colorInput.style.cursor = 'pointer';
        
        const opacityContainer = document.createElement('div');
        opacityContainer.style.marginTop = '8px';
        
        const opacityLabel = document.createElement('label');
        opacityLabel.textContent = 'Opacity: ';
        opacityLabel.style.color = '#fff';
        opacityLabel.style.fontSize = '11px';
        
        const opacitySlider = document.createElement('input');
        opacitySlider.type = 'range';
        opacitySlider.min = '0.05';
        opacitySlider.max = '1';
        opacitySlider.step = '0.05';
        opacitySlider.value = '0.1';
        opacitySlider.style.width = '80px';
        opacitySlider.style.marginLeft = '8px';
        
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.marginTop = '8px';
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.gap = '8px';
        
        const resetButton = document.createElement('button');
        resetButton.textContent = 'Reset';
        resetButton.style.padding = '4px 8px';
        resetButton.style.fontSize = '11px';
        resetButton.style.backgroundColor = '#666';
        resetButton.style.color = '#fff';
        resetButton.style.border = 'none';
        resetButton.style.borderRadius = '2px';
        resetButton.style.cursor = 'pointer';
        
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.style.padding = '4px 8px';
        closeButton.style.fontSize = '11px';
        closeButton.style.backgroundColor = '#0078d4';
        closeButton.style.color = '#fff';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '2px';
        closeButton.style.cursor = 'pointer';
        
        // Update grid color in real-time
        const updateGridColor = () => {
            const color = colorInput.value;
            const opacity = parseFloat(opacitySlider.value);
            
            // Convert hex to rgba
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            
            this.customGridColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
            this.drawGrid();
        };
        
        colorInput.addEventListener('input', updateGridColor);
        opacitySlider.addEventListener('input', updateGridColor);
        
        resetButton.addEventListener('click', () => {
            this.customGridColor = null;
            this.drawGrid();
            document.body.removeChild(popup);
        });
        
        closeButton.addEventListener('click', () => {
            document.body.removeChild(popup);
        });
        
        // Close on click outside
        const handleClickOutside = (e) => {
            if (!popup.contains(e.target)) {
                document.body.removeChild(popup);
                document.removeEventListener('click', handleClickOutside);
            }
        };
        
        opacityContainer.appendChild(opacityLabel);
        opacityContainer.appendChild(opacitySlider);
        
        buttonsContainer.appendChild(resetButton);
        buttonsContainer.appendChild(closeButton);
        
        popup.appendChild(title);
        popup.appendChild(colorInput);
        popup.appendChild(opacityContainer);
        popup.appendChild(buttonsContainer);
        
        document.body.appendChild(popup);
        
        // Add click outside handler after a short delay to prevent immediate closing
        setTimeout(() => {
            document.addEventListener('click', handleClickOutside);
        }, 100);
    }
    
    // Utility functions for measurement conversion
    pixelsToFeet(pixels) {
        return (pixels / this.pixelsPerFoot).toFixed(1);
    }
    
    feetToPixels(feet) {
        return feet * this.pixelsPerFoot;
    }
    
    pixelsToMeters(pixels) {
        return (pixels / this.pixelsPerMeter).toFixed(2);
    }
    
    metersToPixels(meters) {
        return meters * this.pixelsPerMeter;
    }
    
    formatDistance(pixels) {
        if (this.useMetric) {
            const meters = this.pixelsToMeters(pixels);
            return `${meters}m`;
        } else {
            const feet = this.pixelsToFeet(pixels);
            return `${feet}'`;
        }
    }
    
    snapToGrid(point, forceOrtho = false) {
        if (!this.snapEnabled && !forceOrtho) return point;
        
        // Check if SHIFT is held for orthogonal (90-degree) constraints
        if (forceOrtho || this.shiftPressed) {
            // For orthogonal constraint, we need a reference point (last placed point)
            if (this.isDrawing && this.currentTool === 'line' && this.lineStartPoint) {
                return this.constrainToOrtho(point, this.lineStartPoint);
            } else if (this.isDrawing && this.currentTool === 'room' && this.drawingPoints.length > 0) {
                const lastPoint = this.drawingPoints[this.drawingPoints.length - 1];
                return this.constrainToOrtho(point, lastPoint);
            }
        }
        
        // Regular grid snapping
        return {
            x: Math.round(point.x / this.gridSize) * this.gridSize,
            y: Math.round(point.y / this.gridSize) * this.gridSize
        };
    }
    
    constrainToOrtho(point, referencePoint) {
        const deltaX = Math.abs(point.x - referencePoint.x);
        const deltaY = Math.abs(point.y - referencePoint.y);
        
        if (deltaX > deltaY) {
            // Horizontal constraint
            return {
                x: Math.round(point.x / this.gridSize) * this.gridSize,
                y: referencePoint.y
            };
        } else {
            // Vertical constraint
            return {
                x: referencePoint.x,
                y: Math.round(point.y / this.gridSize) * this.gridSize
            };
        }
    }
    
    // Enhanced snapping to objects with visual feedback
    snapToObjects(movingObject, targetPoint) {
        if (!this.snapEnabled) return targetPoint;
        
        console.log('📐 snapToObjects called with:', {
            movingObject: movingObject?.type,
            targetPoint,
            snapEnabled: this.snapEnabled
        });
        
        let snappedPoint = { ...targetPoint };
        let hasSnap = false;
        
        // Clear existing snap guides
        this.clearSnapGuides();
        
        // Get all objects except the one being moved and grid lines
        const otherObjects = this.canvas.getObjects().filter(obj => 
            obj !== movingObject && 
            !obj.gridLine && 
            !obj.snapGuide && 
            !obj.roomPreview &&
            obj !== null && 
            obj !== undefined
        );
        
        console.log('📐 Found other objects for snapping:', otherObjects.length);
        
        // For line tool, we snap to the target point directly
        const isLineDrawing = this.currentTool === 'line';
        let movingCenter = targetPoint;
        
        // Safety check for movingObject (only needed for non-line tools)
        if (!isLineDrawing && (!movingObject || typeof movingObject.left !== 'number' || typeof movingObject.top !== 'number')) {
            console.warn('⚠️ movingObject is invalid:', movingObject);
            return targetPoint;
        }
        
        // Calculate moving center for non-line tools
        if (!isLineDrawing) {
            movingCenter = {
                x: targetPoint.x + (movingObject.width || movingObject.radius || 0) / 2,
                y: targetPoint.y + (movingObject.height || movingObject.radius || 0) / 2
            };
        }
        
        console.log('📐 Moving target:', isLineDrawing ? 'line point' : 'object center', movingCenter);
        
        // Check for horizontal and vertical alignment with object centers
        otherObjects.forEach((obj, index) => {
            // Enhanced safety checks for null objects and required properties
            if (!obj || 
                typeof obj.left !== 'number' || 
                typeof obj.top !== 'number' ||
                obj.left === null || 
                obj.top === null ||
                isNaN(obj.left) || 
                isNaN(obj.top)) {
                console.warn(`⚠️ Object ${index} has invalid position:`, obj);
                return;
            }
            
            // Special handling for line objects - snap to endpoints
            if (obj.type === 'line' && obj.x1 !== undefined && obj.y1 !== undefined && obj.x2 !== undefined && obj.y2 !== undefined) {
                // Calculate absolute endpoint positions
                const endpoint1 = {
                    x: obj.left + obj.x1,
                    y: obj.top + obj.y1
                };
                const endpoint2 = {
                    x: obj.left + obj.x2,
                    y: obj.top + obj.y2
                };
                
                // Check snap to endpoint 1
                if (Math.abs(targetPoint.x - endpoint1.x) < this.snapTolerance && 
                    Math.abs(targetPoint.y - endpoint1.y) < this.snapTolerance) {
                    snappedPoint.x = endpoint1.x;
                    snappedPoint.y = endpoint1.y;
                    hasSnap = true;
                    console.log('📐 Line endpoint 1 snap applied:', endpoint1);
                    
                    // Create snap guide at endpoint
                    this.createSnapGuide(endpoint1.x - 10, endpoint1.y, endpoint1.x + 10, endpoint1.y, 'endpoint');
                    this.createSnapGuide(endpoint1.x, endpoint1.y - 10, endpoint1.x, endpoint1.y + 10, 'endpoint');
                }
                
                // Check snap to endpoint 2
                if (Math.abs(targetPoint.x - endpoint2.x) < this.snapTolerance && 
                    Math.abs(targetPoint.y - endpoint2.y) < this.snapTolerance) {
                    snappedPoint.x = endpoint2.x;
                    snappedPoint.y = endpoint2.y;
                    hasSnap = true;
                    console.log('📐 Line endpoint 2 snap applied:', endpoint2);
                    
                    // Create snap guide at endpoint
                    this.createSnapGuide(endpoint2.x - 10, endpoint2.y, endpoint2.x + 10, endpoint2.y, 'endpoint');
                    this.createSnapGuide(endpoint2.x, endpoint2.y - 10, endpoint2.x, endpoint2.y + 10, 'endpoint');
                }
            }
            
            // Additional safety checks for dimensions
            const objWidth = (typeof obj.width === 'number' && !isNaN(obj.width)) ? obj.width : 0;
            const objHeight = (typeof obj.height === 'number' && !isNaN(obj.height)) ? obj.height : 0;
            const objRadius = (typeof obj.radius === 'number' && !isNaN(obj.radius)) ? obj.radius : 0;
            
            const objCenter = {
                x: obj.left + (objWidth || objRadius) / 2,
                y: obj.top + (objHeight || objRadius) / 2
            };
            
            console.log(`📐 Object ${index} center:`, objCenter);
            
            // Vertical alignment (snap X coordinate)
            if (Math.abs(movingCenter.x - objCenter.x) < this.snapTolerance) {
                const snapX = isLineDrawing ? objCenter.x : objCenter.x - (movingObject.width || movingObject.radius || 0) / 2;
                snappedPoint.x = snapX;
                hasSnap = true;
                console.log('📐 Vertical snap applied:', snapX);
                
                // Create vertical guide line
                this.createSnapGuide(objCenter.x, 0, objCenter.x, this.canvas.height, 'vertical');
            }
            
            // Horizontal alignment (snap Y coordinate)
            if (Math.abs(movingCenter.y - objCenter.y) < this.snapTolerance) {
                const snapY = isLineDrawing ? objCenter.y : objCenter.y - (movingObject.height || movingObject.radius || 0) / 2;
                snappedPoint.y = snapY;
                hasSnap = true;
                console.log('📐 Horizontal snap applied:', snapY);
                
                // Create horizontal guide line
                this.createSnapGuide(0, objCenter.y, this.canvas.width, objCenter.y, 'horizontal');
            }
        });
        
        console.log('📐 Snap result:', { hasSnap, snappedPoint });
        return snappedPoint;
    }
    
    createSnapGuide(x1, y1, x2, y2, type) {
        const color = this.isDarkTheme ? 'rgba(255, 0, 0, 0.8)' : 'rgba(255, 0, 0, 0.8)';
        
        const line = new fabric.Line([x1, y1, x2, y2], {
            stroke: color,
            strokeWidth: 1,
            strokeDashArray: [5, 5],
            selectable: false,
            evented: false,
            snapGuide: true,
            snapType: type
        });
        
        this.canvas.add(line);
        this.canvas.bringObjectToFront(line);
        this.snapGuides.push(line);
        this.canvas.renderAll();
    }
    
    clearSnapGuides() {
        this.snapGuides.forEach(guide => this.canvas.remove(guide));
        this.snapGuides = [];
    }
    
    // Distance measurement display functions
    createMeasurementDisplay(startPoint, endPoint, showBoth = true) {
        if (!this.showMeasurements) return;
        
        this.clearMeasurementDisplay();
        
        const deltaX = Math.abs(endPoint.x - startPoint.x);
        const deltaY = Math.abs(endPoint.y - startPoint.y);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        const zoom = this.canvas.getZoom();
        const textColor = this.isDarkTheme ? '#ffffff' : '#000000';
        const bgColor = this.isDarkTheme ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)';
        const fontSize = Math.max(12, 14 / zoom); // Scale font with zoom
        
        this.measurementDisplay = [];
        
        if (showBoth) {
            // X distance (horizontal)
            if (deltaX > 10) {
                const xMidPoint = {
                    x: Math.min(startPoint.x, endPoint.x) + deltaX / 2,
                    y: Math.min(startPoint.y, endPoint.y) - 20 / zoom
                };
                
                const xText = new fabric.Text(`${this.formatDistance(deltaX)}`, {
                    left: xMidPoint.x,
                    top: xMidPoint.y,
                    fontSize: fontSize,
                    fill: textColor,
                    backgroundColor: bgColor,
                    textAlign: 'center',
                    originX: 'center',
                    originY: 'center',
                    selectable: false,
                    evented: false,
                    measurementOverlay: true
                });
                
                this.canvas.add(xText);
                this.measurementDisplay.push(xText);
            }
            
            // Y distance (vertical)
            if (deltaY > 10) {
                const yMidPoint = {
                    x: Math.max(startPoint.x, endPoint.x) + 20 / zoom,
                    y: Math.min(startPoint.y, endPoint.y) + deltaY / 2
                };
                
                const yText = new fabric.Text(`${this.formatDistance(deltaY)}`, {
                    left: yMidPoint.x,
                    top: yMidPoint.y,
                    fontSize: fontSize,
                    fill: textColor,
                    backgroundColor: bgColor,
                    textAlign: 'center',
                    originX: 'center',
                    originY: 'center',
                    angle: 90, // Vertical text
                    selectable: false,
                    evented: false,
                    measurementOverlay: true
                });
                
                this.canvas.add(yText);
                this.measurementDisplay.push(yText);
            }
        }
        
        // Total distance (diagonal for lines)
        if (distance > 10) {
            const midPoint = {
                x: (startPoint.x + endPoint.x) / 2,
                y: (startPoint.y + endPoint.y) / 2 + 15 / zoom
            };
            
            const totalText = new fabric.Text(`${this.formatDistance(distance)}`, {
                left: midPoint.x,
                top: midPoint.y,
                fontSize: fontSize,
                fill: textColor,
                backgroundColor: bgColor,
                textAlign: 'center',
                originX: 'center',
                originY: 'center',
                selectable: false,
                evented: false,
                measurementOverlay: true
            });
            
            this.canvas.add(totalText);
            this.measurementDisplay.push(totalText);
        }
        
        this.canvas.renderAll();
    }
    
    clearMeasurementDisplay() {
        if (this.measurementDisplay) {
            this.measurementDisplay.forEach(text => this.canvas.remove(text));
            this.measurementDisplay = [];
        }
        
        // Also clear any orphaned measurement overlays
        const objectsToRemove = [];
        this.canvas.forEachObject(obj => {
            if (obj.measurementOverlay) {
                objectsToRemove.push(obj);
            }
        });
        objectsToRemove.forEach(obj => this.canvas.remove(obj));
    }
    
    toggleMeasuring() {
        this.showMeasurements = !this.showMeasurements;
        const status = this.showMeasurements ? 'enabled' : 'disabled';
        
        if (!this.showMeasurements) {
            // Clear any existing measurements when disabled
            this.clearMeasurementDisplay();
        }
        
        window.sceneManager?.showStatus(`Measurements ${status}`, 'info');
        console.log(`📏 Measurements ${status}`);
        
        return this.showMeasurements;
    }
    
    handleMouseDown(e) {
        const pointer = this.canvas.getPointer(e.e);
        const snappedPoint = this.snapToGrid(pointer);
        
        // Check for panning: middle mouse button, right mouse button in select mode, or spacebar + left click
        const isMiddleButton = e.e.button === 1;
        const isRightButton = e.e.button === 2;
        const shouldPan = isMiddleButton || (isRightButton && this.currentTool === 'select') || (this.spacebarPressed && e.e.button === 0);
        
        if (shouldPan) {
            console.log('🖱️ Starting pan mode');
            this.isPanning = true;
            this.panStart = { x: e.e.clientX, y: e.e.clientY };
            this.canvas.selection = false; // Disable selection during panning
            document.body.style.cursor = 'grabbing';
            e.e.preventDefault();
            return;
        }
        
        if (this.currentTool === 'light') {
            this.addLight(snappedPoint);
        } else if (this.currentTool === 'text') {
            this.addText(snappedPoint);
        } else if (this.currentTool === 'line') {
            this.handleLineDrawing(snappedPoint, 'down');
        } else if (this.currentTool === 'room') {
            if (this.roomDrawingMode === 'rectangle') {
                this.handleRectangleDrawing(snappedPoint, 'down');
            } else {
                this.handleRoomDrawing(snappedPoint, 'down');
            }
        } else if (this.currentTool === 'rectangle') {
            this.handleRectangleDrawing(snappedPoint, 'down');
        }
    }
    
    handleMouseMove(e) {
        // Always update mouse coordinates in status bar
        if (window.cadInterface && e.e) {
            const rect = this.canvas.getElement().getBoundingClientRect();
            const x = e.e.clientX - rect.left;
            const y = e.e.clientY - rect.top;
            
            // Convert to canvas coordinates accounting for viewport transform
            const vpt = this.canvas.viewportTransform;
            const displayX = Math.round((x - vpt[4]) / vpt[0]);
            const displayY = Math.round((y - vpt[5]) / vpt[3]);
            
            window.cadInterface.updateMouseCoordinates(displayX, displayY);
        }
        
        // Handle panning
        if (this.isPanning && this.panStart) {
            const deltaX = e.e.clientX - this.panStart.x;
            const deltaY = e.e.clientY - this.panStart.y;
            
            // Update the viewport transform
            const vpt = this.canvas.viewportTransform;
            vpt[4] += deltaX;
            vpt[5] += deltaY;
            
            this.canvas.setViewportTransform(vpt);
            this.canvas.renderAll();
            
            // Update grid after panning
            this.drawGrid();
            
            // Update pan start for next movement
            this.panStart = { x: e.e.clientX, y: e.e.clientY };
            return;
        }
        
        if (this.currentTool === 'line' && this.isDrawing) {
            const pointer = this.canvas.getPointer(e.e);
            // Apply orthogonal constraint if SHIFT is held
            const gridSnapped = this.snapToGrid(pointer, this.shiftPressed);
            const snappedPoint = this.snapToObjects(null, gridSnapped);
            this.handleLineDrawing(snappedPoint, 'move');
        } else if (this.currentTool === 'room' && this.isDrawing) {
            const pointer = this.canvas.getPointer(e.e);
            const snappedPoint = this.snapToGrid(pointer, this.shiftPressed);
            if (this.roomDrawingMode === 'rectangle') {
                this.handleRectangleDrawing(snappedPoint, 'move');
            } else {
                this.handleRoomDrawing(snappedPoint, 'move');
            }
        } else if (this.currentTool === 'rectangle' && this.isDrawing) {
            const pointer = this.canvas.getPointer(e.e);
            const snappedPoint = this.snapToGrid(pointer, this.shiftPressed);
            this.handleRectangleDrawing(snappedPoint, 'move');
        }
    }
    
    handleMouseUp(e) {
        // End panning
        if (this.isPanning) {
            console.log('🖱️ Ending pan mode');
            this.isPanning = false;
            this.panStart = null;
            this.canvas.selection = true; // Re-enable selection
            document.body.style.cursor = this.spacebarPressed ? 'grab' : 'default';
            return;
        }
        
        // Note: Line tool doesn't use mouse up anymore, it uses mouse down for continuous drawing
        if (this.currentTool === 'room' && this.isDrawing) {
            const pointer = this.canvas.getPointer(e.e);
            const snappedPoint = this.snapToGrid(pointer);
            if (this.roomDrawingMode === 'rectangle') {
                this.handleRectangleDrawing(snappedPoint, 'up');
            } else {
                this.handleRoomDrawing(snappedPoint, 'up');
            }
        } else if (this.currentTool === 'rectangle' && this.isDrawing) {
            const pointer = this.canvas.getPointer(e.e);
            const snappedPoint = this.snapToGrid(pointer);
            this.handleRectangleDrawing(snappedPoint, 'up');
        }
    }

    // Polygon editing methods removed - feature disabled
    
    handleRectangleDrawing(point, action) {
        if (action === 'down') {
            this.isDrawing = true;
            this.drawingPoints = [point];
        } else if (action === 'move' && this.isDrawing) {
            // Remove existing preview
            this.canvas.getObjects().forEach(obj => {
                if (obj.rectanglePreview) {
                    this.canvas.remove(obj);
                }
            });
            
            const startPoint = this.drawingPoints[0];
            const width = Math.abs(point.x - startPoint.x);
            const height = Math.abs(point.y - startPoint.y);
            const left = Math.min(startPoint.x, point.x);
            const top = Math.min(startPoint.y, point.y);
            
            // Theme-aware drawing colors
            const strokeColor = this.isDarkTheme ? '#00ff00' : '#0066cc';
            
            const preview = new fabric.Rect({
                left: left,
                top: top,
                width: width,
                height: height,
                fill: this.hexToRgba(this.roomFillColor, this.roomFillOpacity * 0.5), // Preview with lower opacity
                stroke: strokeColor,
                strokeWidth: 2,
                strokeDashArray: [5, 5],
                selectable: false,
                evented: false,
                rectanglePreview: true
            });
            
            this.canvas.add(preview);
            
            // Show measurement display for width and height
            this.createMeasurementDisplay(startPoint, point, true);
            
            this.canvas.renderAll();
        } else if (action === 'up' && this.isDrawing) {
            // Remove preview and measurements
            this.canvas.getObjects().forEach(obj => {
                if (obj.rectanglePreview) {
                    this.canvas.remove(obj);
                }
            });
            this.clearMeasurementDisplay();
            
            const startPoint = this.drawingPoints[0];
            const width = Math.abs(point.x - startPoint.x);
            const height = Math.abs(point.y - startPoint.y);
            
            if (width > 10 && height > 10) {
                const left = Math.min(startPoint.x, point.x);
                const top = Math.min(startPoint.y, point.y);
                
                // Theme-aware drawing colors
                const strokeColor = this.isDarkTheme ? '#00ff00' : '#0066cc';
                
                const rectangle = new fabric.Rect({
                    left: left,
                    top: top,
                    width: width,
                    height: height,
                    fill: this.getCurrentRoomFill(),
                    stroke: strokeColor,
                    strokeWidth: 2,
                    roomObject: true,
                    wallHeight: 10 // Default 10 feet wall height
                });
                
                this.canvas.add(rectangle);
                window.sceneManager?.showStatus(`Rectangle added: ${this.formatDistance(width)} × ${this.formatDistance(height)}`, 'success');
            }
            
            this.isDrawing = false;
            this.drawingPoints = [];
            this.canvas.renderAll();
        }
    }
    
    handleLineDrawing(point, action) {
        if (action === 'down') {
            if (!this.isDrawing) {
                // Start continuous line drawing mode
                this.isDrawing = true;
                this.lineStartPoint = point;
                this.linePreview = null;
                window.sceneManager?.showStatus('Line tool: click to place points, ESC to cancel', 'info');
            } else {
                // Safety check - if we're not drawing or don't have a start point, don't create line
                if (!this.isDrawing || !this.lineStartPoint) {
                    console.log('⚠️ Line drawing cancelled - not creating line');
                    return;
                }
                
                // Place line segment and continue drawing
                // Remove preview
                if (this.linePreview) {
                    this.canvas.remove(this.linePreview);
                }
                this.clearMeasurementDisplay();
                
                // Calculate line length
                const length = Math.sqrt(
                    Math.pow(point.x - this.lineStartPoint.x, 2) + 
                    Math.pow(point.y - this.lineStartPoint.y, 2)
                );
                
                // Only create line if it's long enough
                if (length > 10) {
                    const strokeColor = this.isDarkTheme ? '#ffffff' : '#000000';
                    
                    const line = new fabric.Line([
                        this.lineStartPoint.x, this.lineStartPoint.y,
                        point.x, point.y
                    ], {
                        stroke: strokeColor,
                        strokeWidth: 2,
                        selectable: true,
                        evented: true,
                        lineObject: true
                    });
                    
                    this.canvas.add(line);
                    window.sceneManager?.showStatus(`Line added: ${this.formatDistance(length)}`, 'success');
                    this.triggerAutoSave();
                }
                
                // Continue drawing from the end point
                this.lineStartPoint = point;
                this.linePreview = null;
            }
        } else if (action === 'move' && this.isDrawing) {
            // Safety check - if we don't have a start point, don't create preview
            if (!this.lineStartPoint) {
                console.log('⚠️ Line preview cancelled - no start point');
                return;
            }
            
            // Remove existing preview
            if (this.linePreview) {
                this.canvas.remove(this.linePreview);
            }
            
            // Create preview line
            const strokeColor = this.isDarkTheme ? '#00ff00' : '#0066cc';
            
            this.linePreview = new fabric.Line([
                this.lineStartPoint.x, this.lineStartPoint.y,
                point.x, point.y
            ], {
                stroke: strokeColor,
                strokeWidth: 2,
                strokeDashArray: [5, 5],
                selectable: false,
                evented: false,
                linePreview: true
            });
            
            this.canvas.add(this.linePreview);
            
            // Show measurement display for line length and x/y distances
            this.createMeasurementDisplay(this.lineStartPoint, point, true);
            
            this.canvas.renderAll();
        }
    }
    
    cancelLineDrawing() {
        // Remove preview line and measurements
        if (this.linePreview) {
            this.canvas.remove(this.linePreview);
        }
        this.clearMeasurementDisplay();
        
        // Reset all drawing state
        this.isDrawing = false;
        this.lineStartPoint = null;
        this.linePreview = null;
        
        // Ensure canvas is refreshed
        this.canvas.renderAll();
        
        // Switch back to select tool
        this.setTool('select');
        window.sceneManager?.showStatus('Line drawing cancelled', 'info');
        
        console.log('✅ Line drawing cancelled - all state reset');
    }
    
    addLight(position) {
        console.log('💡 Adding light at position:', position);
        
        let light;
        
        // Generate unique ID for this object
        const objectId = Date.now() + Math.random();
        
        if (this.lightIconStyle === 'bulb') {
            // Create bulb icon using fabric.Text with FontAwesome
            light = new fabric.Text('\uf0eb', { // FontAwesome lightbulb
                left: position.x - 12,
                top: position.y - 12,
                fontSize: 24,
                fontFamily: 'FontAwesome',
                fill: '#ffa500',
                stroke: this.isDarkTheme ? '#ffffff' : '#000000',
                strokeWidth: 1,
                shadow: new fabric.Shadow({
                    color: '#ffa500',
                    blur: 8,
                    offsetX: 0,
                    offsetY: 0
                }),
                hasControls: false,
                hasBorders: false,
                selectable: true,
                evented: true,
                lightObject: true,
                entityId: null,
                iconStyle: 'bulb',
                id: objectId
            });
        } else if (this.lightIconStyle === 'recessed') {
            // Create recessed light icon
            light = new fabric.Circle({
                left: position.x - 8,
                top: position.y - 8,
                radius: 8,
                fill: 'transparent',
                stroke: '#ffa500',
                strokeWidth: 3,
                shadow: new fabric.Shadow({
                    color: '#ffa500',
                    blur: 6,
                    offsetX: 0,
                    offsetY: 0
                }),
                hasControls: false,
                hasBorders: false,
                selectable: true,
                evented: true,
                lightObject: true,
                entityId: null,
                iconStyle: 'recessed'
            });
        } else {
            // Default circle style
            light = new fabric.Circle({
                left: position.x - 10,
                top: position.y - 10,
                radius: 10,
                fill: '#ffa500',
                stroke: this.isDarkTheme ? '#ffffff' : '#000000',
                strokeWidth: 2,
                shadow: new fabric.Shadow({
                    color: '#ffa500',
                    blur: 10,
                    offsetX: 0,
                    offsetY: 0
                }),
                hasControls: false,
                hasBorders: false,
                selectable: true,
                evented: true,
                lightObject: true,
                entityId: null,
                iconStyle: 'circle'
            });
        }
        
        console.log('💡 Created light object:', {
            type: light.type,
            selectable: light.selectable,
            evented: light.evented,
            lightObject: light.lightObject,
            iconStyle: light.iconStyle,
            position: { x: light.left, y: light.top }
        });
        
        // Add comprehensive event handlers for selection debugging
        light.on('selected', (e) => {
            console.log('💡 Light object SELECTED event:', e);
            console.log('  Light properties:', {
                type: light.type,
                entityId: light.entityId,
                iconStyle: light.iconStyle
            });
            this.selectedLight = light;
            this.updateControlsFromLight(light);
        });
        
        light.on('deselected', (e) => {
            console.log('💡 Light object DESELECTED event:', e);
        });
        
        light.on('mousedown', (e) => {
            console.log('💡 Light object MOUSE DOWN:', e);
            console.log('  Button:', e.e?.button);
            console.log('  Target:', e.target);
            
            // Right-click context menu
            if (e.e && e.e.button === 2) { // Right click
                e.e.preventDefault();
                this.showLightContextMenu(light, e.e);
            }
        });
        
        light.on('mouseup', (e) => {
            console.log('💡 Light object MOUSE UP:', e);
        });
        
        light.on('mousedblclick', (e) => {
            console.log('💡 Light object DOUBLE CLICK:', e);
            this.assignEntityToLight(light);
        });
        
        light.on('moving', (e) => {
            console.log('💡 Light object MOVING:', e);
        });
        
        light.on('moved', (e) => {
            console.log('💡 Light object MOVED:', e);
        });
        
        this.canvas.add(light);
        this.lights.push(light);
        this.canvas.renderAll();
        
        console.log('💡 Light added to canvas. Total lights:', this.lights.length);
        console.log('💡 Canvas objects after adding light:', this.canvas.getObjects().length);
        
        // Show instructions
        window.sceneManager?.showStatus('Light added! Double-click to assign entity, right-click for options', 'info');
        
        // Trigger auto-save
        this.triggerAutoSave();
        
        return light;
    }
    
    addText(position) {
        // Prompt for text content
        const textContent = prompt('Enter text label:', 'Label');
        if (!textContent) return;
        
        // Theme-aware text colors
        const textColor = this.isDarkTheme ? '#ffffff' : '#000000';
        const strokeColor = this.isDarkTheme ? '#000000' : '#ffffff';
        const shadowColor = this.isDarkTheme ? '#000000' : '#ffffff';
        
        const text = new fabric.Text(textContent, {
            left: position.x,
            top: position.y,
            fontSize: 16,
            fontFamily: 'Arial, sans-serif',
            fill: textColor,
            stroke: strokeColor,
            strokeWidth: 0.5,
            shadow: new fabric.Shadow({
                color: shadowColor,
                blur: 2,
                offsetX: 1,
                offsetY: 1
            }),
            hasControls: true,
            hasBorders: true,
            textObject: true
        });
        
        // Add double-click handler for editing
        text.on('mousedblclick', () => {
            const newText = prompt('Edit text:', text.text);
            if (newText !== null) {
                text.set('text', newText);
                this.canvas.renderAll();
                this.triggerAutoSave();
            }
        });
        
        this.canvas.add(text);
        this.texts.push(text);
        this.canvas.renderAll();
        
        this.triggerAutoSave();
    }
    
    showLightContextMenu(light, event) {
        // Remove any existing context menu
        const existingMenu = document.getElementById('lightContextMenu');
        if (existingMenu) {
            existingMenu.remove();
        }

        // Create context menu
        const menu = document.createElement('div');
        menu.id = 'lightContextMenu';
        menu.className = 'light-context-menu';
        
        // Position the menu near the click point
        const rect = this.canvas.getElement().getBoundingClientRect();
        const x = event.clientX || (rect.left + light.left);
        const y = event.clientY || (rect.top + light.top);
        
        menu.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            background: rgba(255, 255, 255, 0.98);
            border: 2px solid #667eea;
            border-radius: 8px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
            z-index: 10000;
            min-width: 200px;
            backdrop-filter: blur(10px);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        // Dark theme adjustments
        if (this.isDarkTheme) {
            menu.style.background = 'rgba(42, 42, 42, 0.98)';
            menu.style.color = '#ffffff';
        }
        
        // Menu items
        const menuItems = [
            {
                icon: 'fas fa-link',
                text: 'Assign Entity',
                action: () => {
                    // Use the new entity panel instead of old popup
                    if (window.entityPanel) {
                        window.entityPanel.setSelectedLight(light);
                        window.sceneManager?.showStatus('Light selected. Choose an entity below to assign.', 'info');
                    } else {
                        // Fallback to old method if entity panel not available
                        this.assignEntityToLight(light);
                    }
                    menu.remove();
                }
            },
            {
                icon: 'fas fa-palette', 
                text: `Change Style (${light.iconStyle === 'circle' ? 'to bulb' : 'to circle'})`,
                action: () => {
                    const newStyle = light.iconStyle === 'circle' ? 'bulb' : 'circle';
                    this.changeLightStyle(light, newStyle);
                    menu.remove();
                }
            },
            {
                icon: 'fas fa-copy',
                text: 'Duplicate Light',
                action: () => {
                    const newPosition = {
                        x: light.left + 30,
                        y: light.top + 30
                    };
                    const newLight = this.addLight(newPosition);
                    if (light.entityId) {
                        newLight.entityId = light.entityId;
                        this.updateLightVisualState(newLight, window.lightEntities[light.entityId]);
                    }
                    window.sceneManager?.showStatus('Light duplicated', 'success');
                    menu.remove();
                }
            },
            {
                icon: 'fas fa-info-circle',
                text: 'Light Properties',
                action: () => {
                    const entity = light.entityId ? window.lightEntities[light.entityId] : null;
                    const friendlyName = entity?.friendlyName || entity?.friendly_name || 'Not assigned';
                    const status = entity?.state || 'Unknown';
                    
                    alert(`Light Information:\n\nStyle: ${light.iconStyle}\nEntity: ${light.entityId || 'Not assigned'}\nFriendly Name: ${friendlyName}\nStatus: ${status}\nPosition: (${Math.round(light.left)}, ${Math.round(light.top)})`);
                    menu.remove();
                }
            },
            {
                icon: 'fas fa-trash',
                text: 'Delete Light',
                className: 'danger',
                action: () => {
                    if (confirm('Are you sure you want to delete this light?')) {
                        this.canvas.remove(light);
                        const index = this.lights.indexOf(light);
                        if (index > -1) {
                            this.lights.splice(index, 1);
                        }
                        this.triggerAutoSave();
                        window.sceneManager?.showStatus('Light deleted', 'success');
                    }
                    menu.remove();
                }
            }
        ];
        
        // Create menu HTML
        menu.innerHTML = menuItems.map(item => `
            <div class="context-menu-item ${item.className || ''}" data-action="${menuItems.indexOf(item)}">
                <i class="${item.icon}"></i>
                <span>${item.text}</span>
            </div>
        `).join('');
        
        // Add CSS styles
        const style = document.createElement('style');
        style.textContent = `
            .light-context-menu {
                font-size: 14px;
                user-select: none;
            }
            
            .context-menu-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 16px;
                cursor: pointer;
                transition: background-color 0.2s;
                border-bottom: 1px solid rgba(0, 0, 0, 0.1);
            }
            
            .context-menu-item:last-child {
                border-bottom: none;
            }
            
            .context-menu-item:hover {
                background: rgba(102, 126, 234, 0.1);
            }
            
            .context-menu-item.danger {
                color: #dc3545;
            }
            
            .context-menu-item.danger:hover {
                background: rgba(220, 53, 69, 0.1);
            }
            
            .context-menu-item i {
                width: 16px;
                text-align: center;
                flex-shrink: 0;
            }
            
            .context-menu-item span {
                flex: 1;
            }
            
            /* Dark theme */
            [data-theme="dark"] .context-menu-item {
                border-bottom-color: rgba(255, 255, 255, 0.1);
            }
        `;
        
        // Add event listeners
        menu.addEventListener('click', (e) => {
            const item = e.target.closest('.context-menu-item');
            if (item) {
                const actionIndex = parseInt(item.dataset.action);
                menuItems[actionIndex].action();
            }
        });
        
        // Close menu when clicking outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                style.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        
        // Add to DOM
        document.head.appendChild(style);
        document.body.appendChild(menu);
        
        // Set up outside click handler
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 100);
        
        // Adjust position if menu goes off screen
        setTimeout(() => {
            const menuRect = menu.getBoundingClientRect();
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            
            if (menuRect.right > windowWidth) {
                menu.style.left = (windowWidth - menuRect.width - 10) + 'px';
            }
            
            if (menuRect.bottom > windowHeight) {
                menu.style.top = (windowHeight - menuRect.height - 10) + 'px';
            }
        }, 10);
    }
    
    toggleLightStyle() {
        // Toggle between circle and bulb styles
        this.lightIconStyle = this.lightIconStyle === 'circle' ? 'bulb' : 'circle';
        
        // Update button to show current style
        const styleBtn = document.getElementById('light-style-btn');
        if (this.lightIconStyle === 'bulb') {
            styleBtn.classList.add('active');
            styleBtn.title = 'Light Style: Bulb Icon (Click for Circle)';
        } else {
            styleBtn.classList.remove('active');
            styleBtn.title = 'Light Style: Circle (Click for Bulb Icon)';
        }
        
        window.sceneManager?.showStatus(`Light style set to: ${this.lightIconStyle}`, 'info');
    }
    
    toggle3DPreview() {
        const accordion = document.querySelector('.panel-accordion-header[data-panel="preview3d"]');
        const content = document.getElementById('preview3dPanel');
        const btn = document.getElementById('preview3d-toggle-btn');
        
        if (accordion && content) {
            const isExpanded = content.classList.contains('expanded');
            
            if (isExpanded) {
                // Collapse
                accordion.classList.remove('active');
                content.classList.remove('expanded');
                accordion.querySelector('.accordion-chevron').classList.remove('fa-chevron-up');
                accordion.querySelector('.accordion-chevron').classList.add('fa-chevron-down');
                if (btn) btn.classList.remove('active');
            } else {
                // Expand
                accordion.classList.add('active');
                content.classList.add('expanded');
                accordion.querySelector('.accordion-chevron').classList.add('fa-chevron-up');
                accordion.querySelector('.accordion-chevron').classList.remove('fa-chevron-down');
                if (btn) btn.classList.add('active');
                
                // Trigger panel refresh when opened
                window.panelManager?.getPanel('preview3d')?.refresh();
            }
        }
    }
    
    toggleTheme() {
        this.isDarkTheme = !this.isDarkTheme;
        const themeBtn = document.getElementById('theme-toggle-btn');
        const themeIcon = themeBtn.querySelector('i');
        const themeText = themeBtn.querySelector('span');
        
        if (this.isDarkTheme) {
            this.canvas.backgroundColor = '#1a1a1a';
            themeIcon.className = 'fas fa-sun';
            themeText.textContent = 'Light';
        } else {
            this.canvas.backgroundColor = '#ffffff';
            themeIcon.className = 'fas fa-moon';
            themeText.textContent = 'Dark';
        }
        
        // Update grid pattern with new theme colors
        if (this.gridVisible) {
            this.createGridPattern();
        }
        
        // Update text colors
        this.canvas.forEachObject(obj => {
            if (obj.textObject || obj.labelObject) {
                obj.set({
                    fill: this.isDarkTheme ? '#ffffff' : '#000000',
                    backgroundColor: obj.labelObject ? 
                        (this.isDarkTheme ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)') : 
                        obj.backgroundColor
                });
            }
            if (obj.lightObject) {
                obj.set({
                    stroke: this.isDarkTheme ? '#ffffff' : '#000000'
                });
            }
        });
        
        this.canvas.renderAll();
        this.triggerAutoSave();
    }
    
    toggleUnits() {
        this.useMetric = !this.useMetric;
        
        // Update button visual state
        const unitsBtn = document.getElementById('units-toggle-btn');
        const unitsText = unitsBtn.querySelector('span');
        
        unitsText.textContent = this.useMetric ? 'Metric' : 'Imperial';
        unitsBtn.title = this.useMetric ? 'Switch to Imperial (feet)' : 'Switch to Metric (meters)';
        
        // Redraw grid with new units
        this.drawGrid();
        
        // Clear and redraw any measurement displays
        this.clearMeasurementDisplay();
        
        // Update grid tooltip info
        const gridBtn = document.getElementById('grid-toggle-btn');
        if (gridBtn) {
            const unitText = this.useMetric ? 'meters' : 'feet';
            const gridSize = this.useMetric ? this.metersPerGrid.toFixed(2) : this.feetPerGrid;
            gridBtn.title = `Toggle Grid (${gridSize} ${unitText} per square)`;
        }
        
        // Save preference
        this.triggerAutoSave();
        
        // Show status message
        const unitName = this.useMetric ? 'metric (meters)' : 'imperial (feet)';
        window.sceneManager?.showStatus(`Measurement units changed to ${unitName}`, 'info');
        
        console.log('📏 Units toggled to:', this.useMetric ? 'metric' : 'imperial');
    }
    
    toggleLabels() {
        this.showLabels = !this.showLabels;
        const labelsBtn = document.getElementById('labels-toggle-btn');
        
        if (this.showLabels) {
            labelsBtn.classList.add('active');
            labelsBtn.title = 'Hide Entity Labels';
            this.createLabels();
        } else {
            labelsBtn.classList.remove('active');
            labelsBtn.title = 'Show Entity Labels';
            this.removeLabels();
        }
        
        window.sceneManager?.showStatus(`Entity labels ${this.showLabels ? 'shown' : 'hidden'}`, 'info');
    }
    
    async toggleStateMode() {
        this.showCurrentState = !this.showCurrentState;
        const stateModeBtn = document.getElementById('state-mode-toggle-btn');
        const icon = stateModeBtn.querySelector('i');
        const text = stateModeBtn.querySelector('span');
        
        // Add switching animation
        stateModeBtn.classList.add('switching');
        setTimeout(() => stateModeBtn.classList.remove('switching'), 400);
        
        if (this.showCurrentState) {
            stateModeBtn.classList.add('active');
            icon.className = 'fas fa-home';
            text.textContent = 'Current';
            stateModeBtn.title = 'Showing: Current Home Assistant State (Click to show Scene Preview)';
        } else {
            stateModeBtn.classList.remove('active');
            icon.className = 'fas fa-palette';
            text.textContent = 'Scene';
            stateModeBtn.title = 'Showing: Scene Preview (Click to show Current State)';
        }
        
        // Update all light visuals based on new mode
        await this.refreshAllLightStates();
        
        // Update the lights tab header text
        if (window.lightController) {
            window.lightController.updateLightsTabHeader();
            // Also refresh the lights list display to show current values
            window.lightController.renderFloorplanLightsList();
        }
        
        if (window.sceneManager) {
            const modeText = this.showCurrentState ? 'Current State' : 'Scene Preview';
            window.sceneManager.showStatus(`Display Mode: ${modeText}`, 'info');
        }
        
        this.triggerAutoSave();
    }
    
    // toggleLabelMode function removed - always use entity names
    
    createLabels() {
        this.removeLabels(); // Clear existing labels first
        
        this.lights.forEach(light => {
            if (light.entityId && window.lightEntities[light.entityId]) {
                const label = this.createLabelForLight(light);
                if (label) {
                    this.labels.push(label);
                    this.canvas.add(label);
                }
            }
        });
        
        this.canvas.renderAll();
    }
    
    createLabelForLight(light) {
        if (!light.entityId || !window.lightEntities) return null;
        
        const entity = window.lightEntities[light.entityId];
        if (!entity) return null;
        
        // Always use entity_id, but format it nicely
        let labelText = light.entityId;
        if (entity.entity_id) {
            // Extract readable name from entity_id (remove domain prefix and convert underscores)
            labelText = entity.entity_id.replace(/^[^.]+\./, '').replace(/_/g, ' ');
        }
        
        const centerX = light.left + (light.width || light.radius || 10);
        const centerY = light.top - 25; // Position label above the light
        
        const label = new fabric.Text(labelText, {
            left: centerX - 50, // Approximate center, will be adjusted after measuring
            top: centerY,
            fontSize: 12,
            fontFamily: 'Arial, sans-serif',
            fill: this.isDarkTheme ? '#ffffff' : '#000000',
            backgroundColor: this.isDarkTheme ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
            padding: 2,
            selectable: false,
            evented: false,
            labelObject: true,
            lightRef: light, // Reference to the associated light
            excludeFromLayerSystem: true // Don't create a separate layer for this
        });
        
        // Center the label text
        label.set('left', centerX - (label.width / 2));
        
        return label;
    }
    
    removeLabels() {
        this.labels.forEach(label => {
            this.canvas.remove(label);
        });
        this.labels = [];
        this.canvas.renderAll();
    }
    
    updateLabels() {
        if (this.showLabels) {
            this.createLabels();
        }
    }

    changeLightStyle(light, newStyle) {
        const position = { x: light.left + 10, y: light.top + 10 };
        const entityId = light.entityId;
        
        // Remove old light
        this.canvas.remove(light);
        const index = this.lights.indexOf(light);
        if (index > -1) {
            this.lights.splice(index, 1);
        }
        
        // Set new style and create new light
        this.lightIconStyle = newStyle;
        this.addLight(position);
        
        // Restore entity assignment
        if (entityId && this.lights.length > 0) {
            const newLight = this.lights[this.lights.length - 1];
            newLight.entityId = entityId;
            const entity = window.lightEntities[entityId];
            if (entity) {
                newLight.set('fill', entity.state === 'on' ? '#ffff00' : '#ffa500');
            }
        }
        
        this.canvas.renderAll();
        window.sceneManager?.showStatus(`Light icon changed to ${newStyle}`, 'info');
    }
    
    handleRoomDrawing(point, action) {
        if (action === 'down') {
            if (!this.isDrawing) {
                // Start drawing polygon
                this.isDrawing = true;
                this.drawingPoints = [point];
                this.polygonPreview = null;
                window.sceneManager?.showStatus('Polygon tool: click to place points, click near start to close, ESC to cancel', 'info');
            } else {
                // Add point or close room
                const firstPoint = this.drawingPoints[0];
                const distance = Math.sqrt(
                    Math.pow(point.x - firstPoint.x, 2) + 
                    Math.pow(point.y - firstPoint.y, 2)
                );
                
                if (distance < this.snapTolerance && this.drawingPoints.length > 2) {
                    // Close the room
                    this.completeRoom();
                } else {
                    // Add new point
                    this.drawingPoints.push(point);
                }
            }
        } else if (action === 'move' && this.isDrawing) {
            // Update preview with current mouse position
            this.updateRoomPreview(point);
        }
    }
    
    updateRoomPreview(currentPoint) {
        // Remove existing preview
        this.canvas.getObjects().forEach(obj => {
            if (obj.roomPreview || obj.polygonPreview) {
                this.canvas.remove(obj);
            }
        });
        
        if (this.drawingPoints.length < 1) return;
        
        // Theme-aware room preview colors
        const strokeColor = this.isDarkTheme ? '#00ff00' : '#0066cc';
        const placedColor = this.isDarkTheme ? '#ffffff' : '#000000';
        
        // Draw placed segments
        for (let i = 0; i < this.drawingPoints.length - 1; i++) {
            const p1 = this.drawingPoints[i];
            const p2 = this.drawingPoints[i + 1];
            
            const line = new fabric.Line([p1.x, p1.y, p2.x, p2.y], {
                stroke: placedColor,
                strokeWidth: 2,
                selectable: false,
                evented: false,
                roomPreview: true
            });
            
            this.canvas.add(line);
        }
        
        // Draw preview segment from last point to current mouse position
        if (currentPoint && this.drawingPoints.length > 0) {
            const lastPoint = this.drawingPoints[this.drawingPoints.length - 1];
            
            // Preview line to current position
            const previewLine = new fabric.Line([
                lastPoint.x, lastPoint.y,
                currentPoint.x, currentPoint.y
            ], {
                stroke: strokeColor,
                strokeWidth: 2,
                strokeDashArray: [5, 5],
                selectable: false,
                evented: false,
                polygonPreview: true
            });
            
            this.canvas.add(previewLine);
            
            // If we have more than 2 points, also show closing line preview
            if (this.drawingPoints.length > 2) {
                const firstPoint = this.drawingPoints[0];
                const closeDistance = Math.sqrt(
                    Math.pow(currentPoint.x - firstPoint.x, 2) + 
                    Math.pow(currentPoint.y - firstPoint.y, 2)
                );
                
                // Show closing preview if close to start
                if (closeDistance < this.snapTolerance * 2) {
                    const closingLine = new fabric.Line([
                        currentPoint.x, currentPoint.y,
                        firstPoint.x, firstPoint.y
                    ], {
                        stroke: '#ff0000',
                        strokeWidth: 2,
                        strokeDashArray: [5, 5],
                        selectable: false,
                        evented: false,
                        polygonPreview: true
                    });
                    
                    this.canvas.add(closingLine);
                }
            }
            
            // Show measurement display for current segment
            this.createMeasurementDisplay(lastPoint, currentPoint, true);
        }
        
        this.canvas.renderAll();
    }
    
    completeRoom() {
        // Remove preview lines and measurements
        this.canvas.getObjects().forEach(obj => {
            if (obj.roomPreview || obj.polygonPreview) {
                this.canvas.remove(obj);
            }
        });
        this.clearMeasurementDisplay();
        
        // Create room polygon
        if (this.roomOutline) {
            this.canvas.remove(this.roomOutline);
        }
        
        const points = this.drawingPoints.map(p => ({ x: p.x, y: p.y }));
        
        // Calculate perimeter for status message
        let perimeter = 0;
        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length]; // Wrap to first point for last segment
            const segmentLength = Math.sqrt(
                Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
            );
            perimeter += segmentLength;
        }
        
        // Use selected room fill color
        const fillColor = this.getCurrentRoomFill();
        const strokeColor = this.isDarkTheme ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
        
        const polygon = new fabric.Polygon(points, {
            fill: fillColor,
            stroke: strokeColor,
            strokeWidth: 2,
            selectable: true,
            evented: true,
            roomObject: true,
            wallHeight: 10, // Default 10 feet wall height
            perPixelTargetFind: true,
            hasControls: true,
            hasBorders: true,
            objectCaching: false
        });
        
        // Enable polygon editing
        this.makePolygonEditable(polygon);
        
        this.canvas.add(polygon);
        this.canvas.sendObjectToBack(polygon);
        
        window.sceneManager?.showStatus(`Room added: ${points.length} points, ${this.formatDistance(perimeter)} perimeter`, 'success');
        
        // Reset drawing state
        this.isDrawing = false;
        this.drawingPoints = [];
        
        this.canvas.renderAll();
    }
    
    makePolygonEditable(polygon) {
        // Add custom controls for each point of the polygon
        const points = polygon.points;
        
        polygon.controls = {};
        
        // Create a control for each polygon point
        points.forEach((point, index) => {
            polygon.controls[`p${index}`] = new fabric.Control({
                x: 0,
                y: 0,
                offsetX: 0,
                offsetY: 0,
                cursorStyle: 'pointer',
                mouseUpHandler: () => {},
                render: function(ctx, left, top, styleOverride, fabricObject) {
                    const size = 8;
                    ctx.save();
                    ctx.fillStyle = styleOverride.cornerColor;
                    ctx.strokeStyle = styleOverride.cornerStrokeColor;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(left, top, size / 2, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.stroke();
                    ctx.restore();
                },
                positionHandler: function(dim, finalMatrix, fabricObject) {
                    const points = fabricObject.points;
                    const point = points[index];
                    
                    return fabric.util.transformPoint(
                        { x: point.x - fabricObject.pathOffset.x, y: point.y - fabricObject.pathOffset.y },
                        finalMatrix
                    );
                },
                actionHandler: function(eventData, transformData, x, y) {
                    const polygon = transformData.target;
                    const currentControl = polygon.controls[transformData.corner];
                    const mouseLocalPosition = polygon.toLocalPoint(new fabric.Point(x, y), 'center', 'center');
                    const size = polygon._getTransformedDimensions();
                    const finalPointPosition = {
                        x: (mouseLocalPosition.x / size.x + 0.5) * polygon.width,
                        y: (mouseLocalPosition.y / size.y + 0.5) * polygon.height
                    };
                    
                    polygon.points[index] = finalPointPosition;
                    polygon.setCoords();
                    
                    return true;
                },
                actionName: 'modifyPolygon'
            });
        });
        
        // Override the object's render method to ensure proper updates
        const originalRender = polygon._render;
        polygon._render = function(ctx) {
            // Update dimensions based on current points
            const bounds = this._calcDimensions();
            this.width = bounds.width;
            this.height = bounds.height;
            this.pathOffset = new fabric.Point(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
            
            originalRender.call(this, ctx);
        };
        
        // Add double-click handler to add/remove points
        polygon.on('mousedblclick', (options) => {
            if (!options.e.shiftKey) return;
            
            const pointer = this.canvas.getPointer(options.e);
            const localPoint = polygon.toLocalPoint(pointer, 'center', 'center');
            
            // Find the closest edge to insert a new point
            let minDistance = Infinity;
            let insertIndex = -1;
            
            for (let i = 0; i < polygon.points.length; i++) {
                const p1 = polygon.points[i];
                const p2 = polygon.points[(i + 1) % polygon.points.length];
                
                // Calculate distance from point to line segment
                const dist = this.pointToLineDistance(localPoint, p1, p2);
                
                if (dist < minDistance) {
                    minDistance = dist;
                    insertIndex = i + 1;
                }
            }
            
            if (minDistance < 20) { // Within 20 pixels of an edge
                // Insert new point
                const newPoint = {
                    x: localPoint.x + polygon.width / 2,
                    y: localPoint.y + polygon.height / 2
                };
                
                polygon.points.splice(insertIndex, 0, newPoint);
                
                // Recreate the polygon with new points
                this.recreatePolygon(polygon);
            }
        });
    }
    
    pointToLineDistance(point, lineStart, lineEnd) {
        const A = point.x - lineStart.x;
        const B = point.y - lineStart.y;
        const C = lineEnd.x - lineStart.x;
        const D = lineEnd.y - lineStart.y;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) {
            param = dot / lenSq;
        }
        
        let xx, yy;
        
        if (param < 0) {
            xx = lineStart.x;
            yy = lineStart.y;
        } else if (param > 1) {
            xx = lineEnd.x;
            yy = lineEnd.y;
        } else {
            xx = lineStart.x + param * C;
            yy = lineStart.y + param * D;
        }
        
        const dx = point.x - xx;
        const dy = point.y - yy;
        
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    recreatePolygon(oldPolygon) {
        const points = oldPolygon.points.slice();
        const options = {
            fill: oldPolygon.fill,
            stroke: oldPolygon.stroke,
            strokeWidth: oldPolygon.strokeWidth,
            selectable: oldPolygon.selectable,
            evented: oldPolygon.evented,
            roomObject: oldPolygon.roomObject,
            perPixelTargetFind: oldPolygon.perPixelTargetFind,
            hasControls: oldPolygon.hasControls,
            hasBorders: oldPolygon.hasBorders,
            objectCaching: false,
            left: oldPolygon.left,
            top: oldPolygon.top,
            scaleX: oldPolygon.scaleX,
            scaleY: oldPolygon.scaleY,
            angle: oldPolygon.angle
        };
        
        const newPolygon = new fabric.Polygon(points, options);
        
        // Remove old polygon
        this.canvas.remove(oldPolygon);
        
        // Add new polygon with editing enabled
        this.makePolygonEditable(newPolygon);
        this.canvas.add(newPolygon);
        this.canvas.sendObjectToBack(newPolygon);
        this.canvas.setActiveObject(newPolygon);
        this.canvas.renderAll();
    }
    
    assignEntityToLight(light) {
        // Get available entities and sort alphabetically by friendly name
        const availableEntities = Object.keys(window.lightEntities || {});
        
        if (availableEntities.length === 0) {
            window.sceneManager?.showStatus('No light entities available. Please check your Home Assistant connection.', 'warning');
            return;
        }

        // Calculate light position on canvas and screen coordinates
        const canvasElement = this.canvas.getElement();
        const canvasRect = canvasElement.getBoundingClientRect();
        const zoom = this.canvas.getZoom();
        const vpt = this.canvas.viewportTransform;
        
        // Transform light coordinates to screen coordinates
        const lightScreenX = (light.left * zoom) + vpt[4] + canvasRect.left;
        const lightScreenY = (light.top * zoom) + vpt[5] + canvasRect.top;
        
        // Determine popup position (left or right of light)
        const popupWidth = 500;
        const popupHeight = 600;
        const margin = 30;
        
        const spaceOnRight = window.innerWidth - lightScreenX - margin;
        const spaceOnLeft = lightScreenX - margin;
        
        let popupLeft, popupTop;
        let showOnRight = spaceOnRight >= popupWidth;
        let showOnLeft = spaceOnLeft >= popupWidth;
        
        if (showOnRight) {
            // Position to the right of the light
            popupLeft = lightScreenX + margin;
        } else if (showOnLeft) {
            // Position to the left of the light
            popupLeft = lightScreenX - popupWidth - margin;
        } else {
            // Center on screen if no space on either side
            popupLeft = (window.innerWidth - popupWidth) / 2;
        }
        
        // Vertical positioning - center on light, but keep within viewport
        popupTop = lightScreenY - (popupHeight / 2);
        popupTop = Math.max(20, Math.min(popupTop, window.innerHeight - popupHeight - 20));

        // Get current area for filtering
        const currentArea = window.sceneManager?.selectedArea;
        const currentAreaName = currentArea ? window.sceneManager?.getAreaName(currentArea) : 'No Area Selected';
        
        // Prepare entity data with area information
        const entityData = availableEntities.map(entityId => {
            const entity = window.lightEntities[entityId];
            const friendlyName = entity.friendlyName || entity.friendly_name || entityId;
            const areaId = entity.area_id || null;
            const areaName = areaId ? window.sceneManager?.getAreaName(areaId) : 'No Area';
            const isInCurrentArea = areaId === currentArea;
            
            return {
                entityId,
                entity,
                friendlyName,
                areaId,
                areaName,
                isInCurrentArea
            };
        });

        // Sort entities alphabetically by friendly name
        const sortedEntities = entityData.sort((a, b) => a.friendlyName.localeCompare(b.friendlyName));
        
        // Create positioned popup instead of modal
        const popup = document.createElement('div');
        popup.className = 'light-entity-popup';
        popup.style.cssText = `
            position: fixed;
            left: ${popupLeft}px;
            top: ${popupTop}px;
            width: ${popupWidth}px;
            height: ${popupHeight}px;
            z-index: 10000;
            opacity: 0;
            transform: scale(0.9);
            transition: all 0.3s ease;
        `;
        
        popup.innerHTML = `
            <div class="popup-content entity-assignment-popup-enhanced">
                <div class="popup-header">
                    <div class="popup-title">
                        <i class="fas fa-link"></i> 
                        <span>Assign Light Entity</span>
                        <div class="light-indicator">
                            <i class="fas fa-lightbulb"></i>
                            <span>Light on Canvas</span>
                        </div>
                    </div>
                    <button class="popup-close-btn" id="closePopup">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="entity-filter-bar">
                    <div class="filter-controls">
                        <div class="search-container">
                            <i class="fas fa-search search-icon"></i>
                            <input type="text" id="entitySearchInput" placeholder="Search entities..." class="entity-search-input-enhanced">
                            <button class="clear-search-btn" id="clearSearch" style="display: none;">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <button class="area-filter-btn" id="areaFilterBtn" data-active="false" title="Show only entities in current area">
                            <i class="fas fa-home"></i>
                            <span class="area-filter-text">${currentAreaName}</span>
                        </button>
                    </div>
                    <div class="entity-count">
                        <span id="entityCount">${sortedEntities.length}</span> entities
                    </div>
                </div>
                
                <div class="entity-list-container">
                    <div class="entity-list" id="entityList">
                        <div class="entity-option no-selection" data-value="">
                            <div class="entity-main">
                                <div class="entity-name">No Entity Selected</div>
                                <div class="entity-description">Click an entity below to assign it to this light</div>
                            </div>
                            <div class="entity-status">
                                <span class="status-indicator unassigned">Unassigned</span>
                            </div>
                        </div>
                        ${sortedEntities.map(({entityId, entity, friendlyName, areaName, isInCurrentArea}) => {
                            const state = entity.state || 'unknown';
                            const isOn = state === 'on';
                            const brightness = entity.attributes?.brightness || 0;
                            const brightnessPercent = Math.round((brightness / 255) * 100);
                            
                            return `
                                <div class="entity-option" data-value="${entityId}" data-area="${areaName}" data-in-current-area="${isInCurrentArea}">
                                    <div class="entity-main">
                                        <div class="entity-name">${friendlyName}</div>
                                        <div class="entity-id">${entityId}</div>
                                        <div class="entity-area">
                                            <i class="fas fa-home"></i>
                                            <span>${areaName}</span>
                                        </div>
                                    </div>
                                    <div class="entity-status">
                                        <div class="status-indicator ${isOn ? 'on' : 'off'}">
                                            ${isOn ? `ON ${brightness > 0 ? brightnessPercent + '%' : ''}` : 'OFF'}
                                        </div>
                                        ${isInCurrentArea ? '<div class="current-area-badge">Current Area</div>' : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                
                <div class="popup-footer">
                    <div class="selected-entity-info" id="selectedEntityInfo" style="display: none;">
                        <i class="fas fa-check-circle"></i>
                        <span id="selectedEntityText">No entity selected</span>
                    </div>
                    <div class="popup-actions">
                        <button id="assignEntity" class="btn btn-primary" disabled>
                            <i class="fas fa-link"></i>
                            Assign Entity
                        </button>
                        <button id="cancelAssign" class="btn btn-secondary">
                            <i class="fas fa-times"></i>
                            Cancel
                        </button>
                    </div>
                </div>
                
                <!-- Arrow pointing to light -->
                <div class="popup-arrow ${showOnRight ? 'arrow-left' : (showOnLeft ? 'arrow-right' : 'arrow-hidden')}"></div>
            </div>
        `;
        
        // Add enhanced CSS styles for positioned popup
        const style = document.createElement('style');
        style.textContent = `
            .entity-assignment-popup-enhanced {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                background: var(--bg-color, #ffffff);
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.1);
                position: relative;
                border: 2px solid #667eea;
            }
            
            .popup-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .popup-title {
                display: flex;
                align-items: center;
                gap: 12px;
                font-size: 16px;
                font-weight: 600;
            }
            
            .light-indicator {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 12px;
                background: rgba(255, 255, 255, 0.2);
                padding: 4px 8px;
                border-radius: 20px;
                font-weight: 500;
            }
            
            .popup-close-btn {
                background: none;
                border: none;
                color: white;
                font-size: 16px;
                cursor: pointer;
                padding: 8px;
                border-radius: 6px;
                transition: background-color 0.2s;
            }
            
            .popup-close-btn:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            
            .entity-filter-bar {
                padding: 12px 16px;
                background: var(--header-bg, #f8f9fa);
                border-bottom: 1px solid var(--border-color, #dee2e6);
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 12px;
            }
            
            .filter-controls {
                display: flex;
                align-items: center;
                gap: 8px;
                flex: 1;
            }
            
            .search-container {
                position: relative;
                flex: 1;
                max-width: 250px;
            }
            
            .search-icon {
                position: absolute;
                left: 10px;
                top: 50%;
                transform: translateY(-50%);
                color: var(--text-secondary, #6c757d);
                font-size: 12px;
            }
            
            .entity-search-input-enhanced {
                width: 100%;
                padding: 8px 32px 8px 28px;
                border: 2px solid var(--border-color, #dee2e6);
                border-radius: 6px;
                font-size: 13px;
                transition: border-color 0.2s, box-shadow 0.2s;
            }
            
            .entity-search-input-enhanced:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
            }
            
            .clear-search-btn {
                position: absolute;
                right: 6px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                color: var(--text-secondary, #6c757d);
                cursor: pointer;
                padding: 3px;
                border-radius: 3px;
                transition: background-color 0.2s;
            }
            
            .clear-search-btn:hover {
                background: var(--hover-bg, rgba(0, 0, 0, 0.05));
            }
            
            .area-filter-btn {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px 12px;
                background: var(--bg-color, #ffffff);
                border: 2px solid var(--border-color, #dee2e6);
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 12px;
                color: var(--text-color, #333);
                white-space: nowrap;
            }
            
            .area-filter-btn:hover {
                background: var(--hover-bg, #f8f9fa);
            }
            
            .area-filter-btn[data-active="true"] {
                background: #667eea;
                border-color: #667eea;
                color: white;
            }
            
            .area-filter-text {
                max-width: 100px;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .entity-count {
                font-size: 12px;
                color: var(--text-secondary, #6c757d);
                font-weight: 500;
                white-space: nowrap;
            }
            
            .entity-list-container {
                flex: 1;
                overflow: hidden;
                background: var(--bg-color, #ffffff);
            }
            
            .entity-list {
                height: 100%;
                overflow-y: auto;
                padding: 6px;
            }
            
            .entity-option {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px;
                margin-bottom: 6px;
                border: 2px solid var(--border-light, #e9ecef);
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                background: var(--bg-color, #ffffff);
            }
            
            .entity-option:hover {
                border-color: #667eea;
                background: rgba(102, 126, 234, 0.05);
                transform: translateY(-1px);
                box-shadow: 0 3px 8px rgba(102, 126, 234, 0.15);
            }
            
            .entity-option.selected {
                border-color: #667eea;
                background: rgba(102, 126, 234, 0.1);
                box-shadow: 0 3px 8px rgba(102, 126, 234, 0.2);
            }
            
            .entity-option.no-selection {
                border-style: dashed;
                border-color: var(--border-color, #dee2e6);
            }
            
            .entity-option.no-selection:hover {
                border-color: #667eea;
                border-style: solid;
            }
            
            .entity-main {
                flex: 1;
                min-width: 0;
            }
            
            .entity-name {
                font-size: 14px;
                font-weight: 600;
                color: var(--text-color, #333);
                margin-bottom: 3px;
                line-height: 1.3;
            }
            
            .entity-id {
                font-size: 11px;
                color: var(--text-secondary, #6c757d);
                font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
                margin-bottom: 4px;
                line-height: 1.2;
            }
            
            .entity-area {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 10px;
                color: var(--text-secondary, #6c757d);
            }
            
            .entity-status {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 4px;
            }
            
            .status-indicator {
                padding: 3px 8px;
                border-radius: 16px;
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.3px;
            }
            
            .status-indicator.on {
                background: #28a745;
                color: white;
            }
            
            .status-indicator.off {
                background: #6c757d;
                color: white;
            }
            
            .status-indicator.unassigned {
                background: var(--border-color, #dee2e6);
                color: var(--text-secondary, #6c757d);
            }
            
            .current-area-badge {
                background: #17a2b8;
                color: white;
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 9px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.2px;
            }
            
            .popup-footer {
                padding: 12px 16px;
                background: var(--header-bg, #f8f9fa);
                border-top: 1px solid var(--border-color, #dee2e6);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .selected-entity-info {
                display: flex;
                align-items: center;
                gap: 6px;
                color: #28a745;
                font-weight: 500;
                font-size: 12px;
            }
            
            .popup-actions {
                display: flex;
                gap: 8px;
            }
            
            .btn {
                padding: 8px 16px;
                border: none;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .btn-primary {
                background: #667eea;
                color: white;
            }
            
            .btn-primary:hover:not(:disabled) {
                background: #5a6fd8;
                transform: translateY(-1px);
                box-shadow: 0 3px 8px rgba(102, 126, 234, 0.3);
            }
            
            .btn-primary:disabled {
                background: #ccc;
                color: #999;
                cursor: not-allowed;
                transform: none;
                box-shadow: none;
            }
            
            .btn-secondary {
                background: var(--bg-color, #ffffff);
                color: var(--text-color, #333);
                border: 2px solid var(--border-color, #dee2e6);
            }
            
            .btn-secondary:hover {
                background: var(--hover-bg, #f8f9fa);
                transform: translateY(-1px);
            }
            
            .entity-list::-webkit-scrollbar {
                width: 6px;
            }
            
            .entity-list::-webkit-scrollbar-track {
                background: var(--bg-color, #f1f1f1);
                border-radius: 3px;
            }
            
            .entity-list::-webkit-scrollbar-thumb {
                background: var(--border-color, #c1c1c1);
                border-radius: 3px;
            }
            
            .entity-list::-webkit-scrollbar-thumb:hover {
                background: var(--text-secondary, #a1a1a1);
            }
            
            /* Arrow pointing to light */
            .popup-arrow {
                position: absolute;
                width: 0;
                height: 0;
                z-index: 1;
            }
            
            .popup-arrow.arrow-left {
                left: -12px;
                top: 50%;
                transform: translateY(-50%);
                border-top: 12px solid transparent;
                border-bottom: 12px solid transparent;
                border-right: 12px solid #667eea;
            }
            
            .popup-arrow.arrow-right {
                right: -12px;
                top: 50%;
                transform: translateY(-50%);
                border-top: 12px solid transparent;
                border-bottom: 12px solid transparent;
                border-left: 12px solid #667eea;
            }
            
            .popup-arrow.arrow-hidden {
                display: none;
            }
            
            /* Dark theme support */
            [data-theme="dark"] .entity-assignment-popup-enhanced {
                --bg-color: #2a2a2a;
                --header-bg: #333;
                --border-color: #555;
                --border-light: #444;
                --text-color: #ffffff;
                --text-secondary: #aaa;
                --hover-bg: rgba(255, 255, 255, 0.1);
            }
            
            /* Entry animation */
            .light-entity-popup.show {
                opacity: 1;
                transform: scale(1);
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(popup);
        
        // Animate popup in
        requestAnimationFrame(() => {
            popup.classList.add('show');
        });
        
        // Setup enhanced functionality
        const entityList = document.getElementById('entityList');
        const searchInput = document.getElementById('entitySearchInput');
        const clearSearchBtn = document.getElementById('clearSearch');
        const areaFilterBtn = document.getElementById('areaFilterBtn');
        const entityCount = document.getElementById('entityCount');
        const assignButton = document.getElementById('assignEntity');
        const selectedEntityInfo = document.getElementById('selectedEntityInfo');
        const selectedEntityText = document.getElementById('selectedEntityText');
        
        let selectedEntityId = null;
        let isAreaFilterActive = false;
        let currentSearchTerm = '';
        
        // Filter and display functions
        const filterAndDisplayEntities = () => {
            const options = entityList.querySelectorAll('.entity-option:not(.no-selection)');
            let visibleCount = 0;
            
            options.forEach(option => {
                const entityId = option.dataset.value;
                const entityInfo = sortedEntities.find(e => e.entityId === entityId);
                const isInCurrentArea = option.dataset.inCurrentArea === 'true';
                
                // Text search
                const searchMatch = !currentSearchTerm || 
                    entityInfo.friendlyName.toLowerCase().includes(currentSearchTerm) ||
                    entityInfo.entityId.toLowerCase().includes(currentSearchTerm) ||
                    entityInfo.areaName.toLowerCase().includes(currentSearchTerm);
                
                // Area filter
                const areaMatch = !isAreaFilterActive || isInCurrentArea;
                
                const shouldShow = searchMatch && areaMatch;
                option.style.display = shouldShow ? 'flex' : 'none';
                
                if (shouldShow) visibleCount++;
            });
            
            entityCount.textContent = visibleCount;
        };
        
        // Search functionality
        searchInput.addEventListener('input', (e) => {
            currentSearchTerm = e.target.value.toLowerCase();
            clearSearchBtn.style.display = currentSearchTerm ? 'block' : 'none';
            filterAndDisplayEntities();
        });
        
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            currentSearchTerm = '';
            clearSearchBtn.style.display = 'none';
            filterAndDisplayEntities();
            searchInput.focus();
        });
        
        // Area filter functionality
        areaFilterBtn.addEventListener('click', () => {
            isAreaFilterActive = !isAreaFilterActive;
            areaFilterBtn.dataset.active = isAreaFilterActive;
            filterAndDisplayEntities();
        });
        
        // Entity selection
        entityList.addEventListener('click', (e) => {
            const option = e.target.closest('.entity-option');
            if (!option || option.style.display === 'none') return;
            
            // Remove previous selection
            entityList.querySelectorAll('.entity-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // Add selection to clicked option
            option.classList.add('selected');
            
            selectedEntityId = option.dataset.value;
            const entityInfo = selectedEntityId ? sortedEntities.find(e => e.entityId === selectedEntityId) : null;
            
            if (selectedEntityId && entityInfo) {
                assignButton.disabled = false;
                selectedEntityInfo.style.display = 'flex';
                selectedEntityText.textContent = `${entityInfo.friendlyName} (${entityInfo.areaName})`;
            } else {
                assignButton.disabled = true;
                selectedEntityInfo.style.display = 'none';
                selectedEntityId = null;
            }
        });
        
        // Handle assignment
        assignButton.addEventListener('click', () => {
            if (selectedEntityId) {
                light.entityId = selectedEntityId;
                const entity = window.lightEntities[selectedEntityId];
                
                // Update visual state based on current entity state
                this.updateLightVisualState(light, entity);
                
                // Update labels if they're visible
                if (this.showLabels) {
                    this.updateLabels();
                }
                
                // If this light is selected, update controls
                if (this.selectedLight === light) {
                    this.updateControlsFromLight(light);
                }
                
                const entityInfo = sortedEntities.find(e => e.entityId === selectedEntityId);
                window.sceneManager?.showStatus(`Light assigned to ${entityInfo.friendlyName}`, 'success');
                
                // Refresh the floorplan lights list since we have a new assigned entity
                if (window.sceneManager) {
                    window.sceneManager.renderFloorplanLightsList();
                }
                
                closePopup();
                this.triggerAutoSave();
            }
        });
        
        // Close handlers
        const closePopup = () => {
            popup.style.opacity = '0';
            popup.style.transform = 'scale(0.9)';
            setTimeout(() => {
                if (popup.parentNode) {
                    document.body.removeChild(popup);
                }
                if (style.parentNode) {
                    document.head.removeChild(style);
                }
            }, 300);
        };
        
        document.getElementById('closePopup').addEventListener('click', closePopup);
        document.getElementById('cancelAssign').addEventListener('click', closePopup);
        
        // Handle clicking outside popup to close
        document.addEventListener('click', function outsideClickHandler(e) {
            if (!popup.contains(e.target)) {
                closePopup();
                document.removeEventListener('click', outsideClickHandler);
            }
        });
        
        // Handle Escape key to close popup
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closePopup();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        // Focus the search input
        setTimeout(() => {
            searchInput.focus();
        }, 100);
        
        // Initial filter display
        filterAndDisplayEntities();
    }
    
    setupEntitySearchableSelect(selectElement, onSelect) {
        const input = selectElement.querySelector('input');
        const dropdown = selectElement.querySelector('.dropdown-options');
        let isOpen = false;
        let selectedValue = '';
        
        // Open dropdown when input is focused or clicked
        const openDropdown = () => {
            if (!isOpen) {
                dropdown.classList.add('show');
                isOpen = true;
                input.removeAttribute('readonly');
                
                // Reset search filter when opening
                this.filterEntityDropdownOptions(dropdown, '');
            }
        };
        
        const closeDropdown = () => {
            if (isOpen) {
                dropdown.classList.remove('show');
                isOpen = false;
                input.setAttribute('readonly', true);
            }
        };
        
        // Handle input focus and click
        input.addEventListener('focus', openDropdown);
        input.addEventListener('click', (e) => {
            e.stopPropagation();
            openDropdown();
        });
        
        // Search functionality
        input.addEventListener('input', () => {
            if (!isOpen) openDropdown();
            
            const searchTerm = input.value.toLowerCase();
            this.filterEntityDropdownOptions(dropdown, searchTerm);
        });
        
        // Option selection with improved click handling
        dropdown.addEventListener('click', (e) => {
            // Use event delegation to handle clicks anywhere within dropdown options
            const option = e.target.closest('.dropdown-option');
            if (!option || option.classList.contains('no-results')) return;
            
            e.stopPropagation();
            e.preventDefault();
            
            const entityId = option.dataset.value;
            const friendlyName = option.querySelector('.entity-name')?.textContent || '';
            
            // Ensure we have a valid entity ID for selection
            if (entityId && entityId.trim() !== '') {
                input.value = friendlyName;
                selectedValue = entityId;
                selectElement.dataset.selectedValue = entityId;
                closeDropdown();
                
                // Call the onSelect callback to update the assignment logic
                if (onSelect) onSelect(entityId, friendlyName);
                
                console.log('🔗 Entity selected:', { entityId, friendlyName });
            }
        });
        
        // Keyboard navigation
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeDropdown();
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateEntityDropdownOptions(dropdown, e.key === 'ArrowDown' ? 1 : -1);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const highlighted = dropdown.querySelector('.dropdown-option.highlighted');
                if (highlighted) {
                    highlighted.click();
                }
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!selectElement.contains(e.target)) {
                closeDropdown();
            }
        });
    }
    
    filterEntityDropdownOptions(dropdown, searchTerm) {
        const options = dropdown.querySelectorAll('.dropdown-option');
        let hasVisibleOptions = false;
        
        options.forEach(option => {
            const friendlyName = option.querySelector('.entity-name')?.textContent.toLowerCase() || '';
            const entityId = option.querySelector('.entity-id')?.textContent.toLowerCase() || '';
            const isMatch = !searchTerm || friendlyName.includes(searchTerm) || entityId.includes(searchTerm);
            
            option.style.display = isMatch ? 'block' : 'none';
            if (isMatch) hasVisibleOptions = true;
            
            // Remove any existing highlighting
            option.classList.remove('highlighted');
        });
        
        // Show/hide no results message
        let noResults = dropdown.querySelector('.no-results');
        if (!hasVisibleOptions && searchTerm) {
            if (!noResults) {
                noResults = document.createElement('div');
                noResults.className = 'no-results dropdown-option';
                noResults.innerHTML = `
                    <div class="entity-name">No matching entities found</div>
                    <div class="entity-id">Try a different search term</div>
                `;
                dropdown.appendChild(noResults);
            }
            noResults.style.display = 'block';
        } else if (noResults) {
            noResults.style.display = 'none';
        }
    }
    
    navigateEntityDropdownOptions(dropdown, direction) {
        const visibleOptions = Array.from(dropdown.querySelectorAll('.dropdown-option'))
            .filter(option => option.style.display !== 'none' && !option.classList.contains('no-results'));
        
        if (visibleOptions.length === 0) return;
        
        const currentHighlighted = dropdown.querySelector('.dropdown-option.highlighted');
        let newIndex = 0;
        
        if (currentHighlighted) {
            const currentIndex = visibleOptions.indexOf(currentHighlighted);
            newIndex = currentIndex + direction;
            currentHighlighted.classList.remove('highlighted');
        }
        
        // Wrap around
        if (newIndex < 0) newIndex = visibleOptions.length - 1;
        if (newIndex >= visibleOptions.length) newIndex = 0;
        
        visibleOptions[newIndex].classList.add('highlighted');
        visibleOptions[newIndex].scrollIntoView({ block: 'nearest' });
    }
    
    importBackground() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                console.log('📷 Loading background image:', file.name);
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        console.log('✅ Image loaded, creating fabric object');
                        
                        // Remove existing background
                        if (this.backgroundImage) {
                            this.canvas.remove(this.backgroundImage);
                        }
                        
                        const fabricImg = new fabric.Image(img);
                        
                        // Scale image to fit canvas
                        const scaleX = this.canvas.width / img.width;
                        const scaleY = this.canvas.height / img.height;
                        const scale = Math.min(scaleX, scaleY) * 0.8;
                        
                        fabricImg.scale(scale);
                        
                        // Center the image manually
                        fabricImg.set({
                            left: this.canvas.width / 2,
                            top: this.canvas.height / 2,
                            originX: 'center',
                            originY: 'center',
                            opacity: 0.6,
                            selectable: true,
                            evented: true,
                            backgroundImage: true,
                            layerType: 'background'
                        });
                        
                        this.backgroundImage = fabricImg;
                        this.canvas.add(fabricImg);
                        this.canvas.sendObjectToBack(fabricImg);
                        
                        // Ensure the background is on the correct layer
                        if (this.layerManager) {
                            console.log('📋 Creating layer for background image');
                            const layerId = this.layerManager.createLayerForObject(fabricImg);
                            console.log('✅ Background layer created:', layerId);
                        } else {
                            console.warn('⚠️ LayerManager not available for background image');
                        }
                        
                        // Broadcast the addition to panels
                        window.panelManager?.broadcast('onObjectAdded', { object: fabricImg });
                        
                        // Make sure grid stays behind everything but above background
                        this.canvas.forEachObject(obj => {
                            if (obj.gridLine) {
                                this.canvas.bringForward(obj);
                            }
                        });
                        
                        this.canvas.renderAll();
                        this.triggerAutoSave();
                        
                        window.sceneManager?.showStatus('Background image imported successfully', 'success');
                    };
                    img.onerror = () => {
                        console.error('❌ Failed to load image');
                        window.sceneManager?.showStatus('Failed to load background image', 'error');
                    };
                    img.src = event.target.result;
                };
                reader.onerror = () => {
                    console.error('❌ Failed to read file');
                    window.sceneManager?.showStatus('Failed to read image file', 'error');
                };
                reader.readAsDataURL(file);
            }
        };
        
        input.click();
    }
    
    zoomIn() {
        // Ensure zoomLevel is properly initialized
        if (!this.zoomLevel || isNaN(this.zoomLevel)) {
            this.zoomLevel = this.canvas ? this.canvas.getZoom() : 1.0;
        }
        
        this.zoomLevel = Math.min(this.zoomLevel * 1.2, 5);
        this.canvas.setZoom(this.zoomLevel);
        this.updateZoomDisplay();
        this.drawGrid(); // Redraw grid after zoom
        this.canvas.renderAll();
    }
    
    zoomOut() {
        // Ensure zoomLevel is properly initialized
        if (!this.zoomLevel || isNaN(this.zoomLevel)) {
            this.zoomLevel = this.canvas ? this.canvas.getZoom() : 1.0;
        }
        
        this.zoomLevel = Math.max(this.zoomLevel / 1.2, 0.1);
        this.canvas.setZoom(this.zoomLevel);
        this.updateZoomDisplay();
        this.drawGrid(); // Redraw grid after zoom
        this.canvas.renderAll();
    }
    
    fitToScreen() {
        this.zoomLevel = 1;
        this.canvas.setZoom(1);
        this.canvas.absolutePan(new fabric.Point(0, 0));
        this.updateZoomDisplay();
        this.drawGrid(); // Redraw grid after zoom
        this.canvas.renderAll();
    }
    
    setupCanvasNavigation() {
        console.log('🎮 Setting up advanced canvas navigation...');
        
        const canvasElement = this.canvas.upperCanvasEl;
        const drawingArea = document.querySelector('.drawing-area');
        
        // Track touch/gesture state
        let isPanning = false;
        let lastPosX = 0;
        let lastPosY = 0;
        let lastTouchDistance = 0;
        let isGesturing = false;
        
        // Mouse wheel zoom
        const handleWheel = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const delta = e.deltaY;
            let zoom = this.canvas.getZoom();
            zoom *= 0.999 ** delta;
            
            // Limit zoom
            if (zoom > 5) zoom = 5;
            if (zoom < 0.1) zoom = 0.1;
            
            // Zoom to mouse pointer
            this.canvas.zoomToPoint(new fabric.Point(e.offsetX, e.offsetY), zoom);
            this.zoomLevel = zoom;
            this.updateZoomDisplay();
            this.drawGrid();
            this.canvas.renderAll();
        };
        
        // Trackpad two-finger pan
        const handleMouseDown = (e) => {
            // Middle mouse button or left mouse with space key for panning
            if (e.button === 1 || (e.button === 0 && this.isSpacePressed)) {
                isPanning = true;
                lastPosX = e.clientX;
                lastPosY = e.clientY;
                canvasElement.style.cursor = 'grabbing';
                e.preventDefault();
            }
        };
        
        const handleMouseMove = (e) => {
            if (isPanning) {
                const deltaX = e.clientX - lastPosX;
                const deltaY = e.clientY - lastPosY;
                
                const vpt = this.canvas.viewportTransform;
                vpt[4] += deltaX;
                vpt[5] += deltaY;
                
                this.canvas.requestRenderAll();
                this.drawGrid();
                
                lastPosX = e.clientX;
                lastPosY = e.clientY;
            }
        };
        
        const handleMouseUp = (e) => {
            if (isPanning) {
                isPanning = false;
                canvasElement.style.cursor = 'default';
            }
        };
        
        // Touch events for pinch zoom and pan
        const getTouchDistance = (touches) => {
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            return Math.sqrt(dx * dx + dy * dy);
        };
        
        const getTouchCenter = (touches) => {
            const x = (touches[0].clientX + touches[1].clientX) / 2;
            const y = (touches[0].clientY + touches[1].clientY) / 2;
            return { x, y };
        };
        
        const handleTouchStart = (e) => {
            if (e.touches.length === 2) {
                isGesturing = true;
                lastTouchDistance = getTouchDistance(e.touches);
                const center = getTouchCenter(e.touches);
                lastPosX = center.x;
                lastPosY = center.y;
                e.preventDefault();
            }
        };
        
        const handleTouchMove = (e) => {
            if (e.touches.length === 2 && isGesturing) {
                e.preventDefault();
                
                const center = getTouchCenter(e.touches);
                const currentDistance = getTouchDistance(e.touches);
                
                // Calculate distance change for zoom detection
                const distanceChange = Math.abs(currentDistance - lastTouchDistance);
                const centerChange = Math.abs(center.x - lastPosX) + Math.abs(center.y - lastPosY);
                
                // Determine if this is primarily a zoom or pan gesture
                const isZoomGesture = distanceChange > centerChange * 0.5;
                
                if (isZoomGesture) {
                    // Pinch zoom with 3x sensitivity
                    const scale = currentDistance / lastTouchDistance;
                    const zoomChange = (scale - 1) * 3; // 3x sensitivity
                    let zoom = this.canvas.getZoom() * (1 + zoomChange);
                    if (zoom > 5) zoom = 5;
                    if (zoom < 0.1) zoom = 0.1;
                    
                    // Apply zoom to center point
                    const rect = canvasElement.getBoundingClientRect();
                    const centerPoint = new fabric.Point(
                        center.x - rect.left,
                        center.y - rect.top
                    );
                    this.canvas.zoomToPoint(centerPoint, zoom);
                    
                    this.zoomLevel = zoom;
                    this.updateZoomDisplay();
                    this.drawGrid();
                    this.canvas.requestRenderAll();
                } else {
                    // Two-finger pan
                    const deltaX = center.x - lastPosX;
                    const deltaY = center.y - lastPosY;
                    
                    const vpt = this.canvas.viewportTransform;
                    vpt[4] += deltaX;
                    vpt[5] += deltaY;
                    
                    this.canvas.requestRenderAll();
                    this.drawGrid();
                }
                
                lastTouchDistance = currentDistance;
                lastPosX = center.x;
                lastPosY = center.y;
            }
        };
        
        const handleTouchEnd = (e) => {
            if (e.touches.length < 2) {
                isGesturing = false;
            }
        };
        
        // Space key for pan mode
        this.isSpacePressed = false;
        const handleSpaceKey = (e) => {
            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault();
                this.isSpacePressed = true;
                canvasElement.style.cursor = 'grab';
            }
        };
        
        const handleSpaceKeyUp = (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.isSpacePressed = false;
                canvasElement.style.cursor = 'default';
                isPanning = false;
            }
        };
        
        // Add zoom percentage click handler
        const zoomDisplay = document.getElementById('zoom-level');
        if (zoomDisplay) {
            zoomDisplay.style.cursor = 'pointer';
            zoomDisplay.addEventListener('click', () => this.showZoomInput());
        }
        
        // Add long-click grid color picker
        this.setupGridColorPicker();
        
        // Attach event listeners
        canvasElement.addEventListener('wheel', handleWheel, { passive: false });
        canvasElement.addEventListener('mousedown', handleMouseDown);
        canvasElement.addEventListener('mousemove', handleMouseMove);
        canvasElement.addEventListener('mouseup', handleMouseUp);
        canvasElement.addEventListener('mouseleave', handleMouseUp);
        
        // Touch events
        canvasElement.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvasElement.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvasElement.addEventListener('touchend', handleTouchEnd);
        
        // Keyboard events
        document.addEventListener('keydown', handleSpaceKey);
        document.addEventListener('keyup', handleSpaceKeyUp);
        
        console.log('✅ Canvas navigation setup complete');
    }
    
    showZoomInput() {
        const zoomElement = document.getElementById('zoom-level');
        if (!zoomElement) return;
        
        const currentZoom = Math.round(this.zoomLevel * 100);
        const currentText = zoomElement.textContent;
        
        // Create input element
        const input = document.createElement('input');
        input.type = 'number';
        input.value = currentZoom;
        input.min = 10;
        input.max = 500;
        input.style.width = '60px';
        input.style.height = '20px';
        input.style.padding = '0 4px';
        input.style.border = '1px solid #666';
        input.style.borderRadius = '2px';
        input.style.backgroundColor = '#2b2b2b';
        input.style.color = '#fff';
        input.style.fontSize = '12px';
        input.style.textAlign = 'center';
        
        // Replace text with input
        zoomElement.textContent = '';
        zoomElement.appendChild(input);
        input.focus();
        input.select();
        
        const applyZoom = () => {
            const zoomPercent = parseInt(input.value);
            if (!isNaN(zoomPercent) && zoomPercent >= 10 && zoomPercent <= 500) {
                this.zoomLevel = zoomPercent / 100;
                this.canvas.setZoom(this.zoomLevel);
                this.updateZoomDisplay();
                this.drawGrid();
                this.canvas.renderAll();
            } else {
                window.sceneManager?.showStatus('Please enter a value between 10 and 500', 'warning');
                zoomElement.textContent = currentText;
            }
        };
        
        const cancelEdit = () => {
            zoomElement.textContent = currentText;
        };
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                applyZoom();
            } else if (e.key === 'Escape') {
                cancelEdit();
            }
        });
        
        input.addEventListener('blur', () => {
            applyZoom();
        });
    }
    
    rotateSelected() {
        const activeObject = this.canvas.getActiveObject();
        if (activeObject) {
            activeObject.rotate(activeObject.angle + 15);
            this.canvas.renderAll();
        }
    }
    
    deleteSelected() {
        const activeObjects = this.canvas.getActiveObjects();
        activeObjects.forEach(obj => {
            if (obj.lightObject) {
                const index = this.lights.indexOf(obj);
                if (index > -1) {
                    this.lights.splice(index, 1);
                }
            } else if (obj.textObject) {
                const index = this.texts.indexOf(obj);
                if (index > -1) {
                    this.texts.splice(index, 1);
                }
            }
            this.canvas.remove(obj);
        });
        
        // Update labels after deleting lights
        if (this.showLabels) {
            this.updateLabels();
        }
        
        this.canvas.discardActiveObject();
        this.canvas.renderAll();
        
        // Trigger auto-save to update localStorage immediately after deletion
        this.triggerAutoSave();
    }

    clearCanvas() {
        // Confirm with user before clearing everything
        if (!confirm('Are you sure you want to clear the entire canvas? This will remove all objects and layers.')) {
            return;
        }
        
        // Clear all objects from canvas (except grid lines)
        const objectsToRemove = this.canvas.getObjects().filter(obj => !obj.gridLine);
        objectsToRemove.forEach(obj => this.canvas.remove(obj));
        
        // Clear all internal arrays
        this.lights = [];
        this.texts = [];
        this.labels = [];
        this.roomOutline = null;
        this.backgroundImage = null;
        
        // Clear layer manager
        if (this.layerManager) {
            this.layerManager.layers = {};
            this.layerManager.layerOrder = [];
            this.layerManager.layerCounters = {
                room: 0,
                light: 0,
                text: 0,
                object: 0
            };
            
            // Refresh layers panel
            const layersPanel = window.panelManager?.getPanel('layers');
            if (layersPanel) {
                layersPanel.refresh();
            }
        }
        
        // Clear canvas selection
        this.canvas.discardActiveObject();
        this.canvas.renderAll();
        
        // Broadcast clear event to all panels
        window.panelManager?.broadcast('onCanvasCleared', {});
        
        // Show success message
        window.sceneManager?.showStatus('Canvas cleared successfully', 'success');
        
        // Trigger auto-save to update localStorage
        this.triggerAutoSave();
        
        console.log('🧹 Canvas cleared successfully');
    }

    bringToFront() {
        const activeObjects = this.canvas.getActiveObjects();
        if (activeObjects.length > 0) {
            // Only manipulate user-created objects, not grid lines or system elements
            const objectsToManipulate = activeObjects.filter(obj => 
                !obj.gridLine && 
                !obj.snapGuide && 
                !obj.roomPreview && 
                !obj.selectionRing &&
                obj.selectable !== false
            );
            
            if (objectsToManipulate.length > 0) {
                objectsToManipulate.forEach(obj => {
                    this.canvas.bringObjectToFront(obj);
                    // Also bring associated label to front if it exists
                    if (obj.lightObject && obj.labelObject) {
                        this.canvas.bringObjectToFront(obj.labelObject);
                    }
                });
                this.canvas.renderAll();
                this.triggerAutoSave();
                console.log('📤 Brought objects to front:', objectsToManipulate.length);
            }
        }
    }

    sendToBack() {
        const activeObjects = this.canvas.getActiveObjects();
        if (activeObjects.length > 0) {
            // Only manipulate user-created objects, not grid lines or system elements
            const objectsToManipulate = activeObjects.filter(obj => 
                !obj.gridLine && 
                !obj.snapGuide && 
                !obj.roomPreview && 
                !obj.selectionRing &&
                obj.selectable !== false
            );
            
            if (objectsToManipulate.length > 0) {
                objectsToManipulate.forEach(obj => {
                    this.canvas.sendObjectToBack(obj);
                    // Also send associated label to back if it exists
                    if (obj.lightObject && obj.labelObject) {
                        this.canvas.sendObjectToBack(obj.labelObject);
                    }
                });
                this.canvas.renderAll();
                this.triggerAutoSave();
                console.log('📥 Sent objects to back:', objectsToManipulate.length);
            }
        }
    }

    bringForward() {
        const activeObjects = this.canvas.getActiveObjects();
        if (activeObjects.length > 0) {
            // Only manipulate user-created objects, not grid lines or system elements
            const objectsToManipulate = activeObjects.filter(obj => 
                !obj.gridLine && 
                !obj.snapGuide && 
                !obj.roomPreview && 
                !obj.selectionRing &&
                obj.selectable !== false
            );
            
            if (objectsToManipulate.length > 0) {
                objectsToManipulate.forEach(obj => {
                    this.canvas.bringForward(obj);
                    // Also bring associated label forward if it exists
                    if (obj.lightObject && obj.labelObject) {
                        this.canvas.bringForward(obj.labelObject);
                    }
                });
                this.canvas.renderAll();
                this.triggerAutoSave();
                console.log('⬆️ Brought objects forward:', objectsToManipulate.length);
            }
        }
    }

    sendBackward() {
        const activeObjects = this.canvas.getActiveObjects();
        if (activeObjects.length > 0) {
            // Only manipulate user-created objects, not grid lines or system elements
            const objectsToManipulate = activeObjects.filter(obj => 
                !obj.gridLine && 
                !obj.snapGuide && 
                !obj.roomPreview && 
                !obj.selectionRing &&
                obj.selectable !== false
            );
            
            if (objectsToManipulate.length > 0) {
                objectsToManipulate.forEach(obj => {
                    this.canvas.sendBackward(obj);
                    // Also send associated label backward if it exists
                    if (obj.lightObject && obj.labelObject) {
                        this.canvas.sendBackward(obj.labelObject);
                    }
                });
                this.canvas.renderAll();
                this.triggerAutoSave();
                console.log('⬇️ Sent objects backward:', objectsToManipulate.length);
            }
        }
    }

    updateLayerControlButtons() {
        const activeObjects = this.canvas.getActiveObjects();
        const hasSelectableObjects = activeObjects.some(obj => 
            !obj.gridLine && 
            !obj.snapGuide && 
            !obj.roomPreview && 
            !obj.selectionRing &&
            obj.selectable !== false
        );

        const bringToFrontBtn = document.getElementById('bring-to-front-btn');
        const sendToBackBtn = document.getElementById('send-to-back-btn');
        const bringForwardBtn = document.getElementById('bring-forward-btn');
        const sendBackwardBtn = document.getElementById('send-backward-btn');
        const rotateBtn = document.getElementById('rotate-btn');
        const deleteBtn = document.getElementById('delete-btn');

        // Update all layer control buttons
        const layerButtons = [bringToFrontBtn, sendToBackBtn, bringForwardBtn, sendBackwardBtn];
        layerButtons.forEach(btn => {
            if (btn) {
                if (hasSelectableObjects) {
                    btn.disabled = false;
                    btn.classList.remove('disabled');
                } else {
                    btn.disabled = true;
                    btn.classList.add('disabled');
                }
            }
        });

        // Update rotate and delete buttons
        if (rotateBtn) {
            if (hasSelectableObjects) {
                rotateBtn.disabled = false;
                rotateBtn.classList.remove('disabled');
            } else {
                rotateBtn.disabled = true;
                rotateBtn.classList.add('disabled');
            }
        }

        if (deleteBtn) {
            if (hasSelectableObjects) {
                deleteBtn.disabled = false;
                deleteBtn.classList.remove('disabled');
            } else {
                deleteBtn.disabled = true;
                deleteBtn.classList.add('disabled');
            }
        }
    }
    
    toggleGrid() {
        this.gridVisible = !this.gridVisible;
        const gridBtn = document.getElementById('grid-toggle-btn');
        
        console.log('🔄 Grid toggle clicked, gridVisible now:', this.gridVisible);
        
        if (this.gridVisible) {
            gridBtn.classList.add('active');
            console.log('🎯 Applying grid pattern...');
            this.createGridPattern();
        } else {
            gridBtn.classList.remove('active');
            console.log('🗑️ Removing grid pattern...');
            // Remove any remaining grid objects from old implementation
            const gridObjects = this.canvas.getObjects().filter(obj => obj.gridLine);
            console.log('  Found', gridObjects.length, 'legacy grid objects to remove');
            gridObjects.forEach(obj => this.canvas.remove(obj));
            // Clear background pattern
            if (this.canvas) {
                this.canvas.backgroundColor = 'transparent';
                if (this.canvas.renderAll) {
                    this.canvas.renderAll();
                }
            }
        }
    }
    
    forceGridRefresh() {
        console.log('🔥 FORCE GRID REFRESH - Manual Debug');
        console.log('  Canvas ready:', !!this.canvas);
        console.log('  Grid visible setting:', this.gridVisible);
        
        if (!this.canvas) {
            console.log('  ❌ Canvas not ready for grid refresh');
            return;
        }
        
        // Force remove all grid objects
        const allObjects = this.canvas.getObjects();
        console.log('  Total objects in canvas:', allObjects.length);
        
        const gridObjects = allObjects.filter(obj => obj.gridLine || obj.debugLine || obj.testLine);
        console.log('  Grid/debug objects found:', gridObjects.length);
        gridObjects.forEach(obj => this.canvas.remove(obj));
        
        // Force a simple test to see if we can draw anything
        console.log('  Creating simple test rectangle...');
        const testRect = new fabric.Rect({
            left: 50,
            top: 50,
            width: 100,
            height: 100,
            fill: 'rgba(255, 0, 0, 0.5)',
            stroke: 'red',
            strokeWidth: 2,
            selectable: false,
            evented: false,
            testRect: true
        });
        
        this.canvas.add(testRect);
        this.canvas.renderAll();
        
        console.log('  Test rectangle added, now attempting grid...');
        
        // Now try to draw grid
        if (this.gridVisible) {
            this.drawGrid();
        }
        
        // Remove test rectangle after 3 seconds
        setTimeout(() => {
            this.canvas.remove(testRect);
            this.canvas.renderAll();
            console.log('  Test rectangle removed');
        }, 3000);
    }
    
    toggleSnap() {
        this.snapEnabled = !this.snapEnabled;
        const snapBtn = document.getElementById('snap-toggle-btn');
        
        if (this.snapEnabled) {
            snapBtn.classList.add('active');
        } else {
            snapBtn.classList.remove('active');
        }
    }
    
    updateZoomDisplay() {
        // Use canvas zoom level if available, otherwise fall back to this.zoomLevel
        const currentZoom = this.canvas ? this.canvas.getZoom() : this.zoomLevel;
        const zoomPercent = Math.round((currentZoom || 1.0) * 100);
        document.getElementById('zoom-level').textContent = zoomPercent + '%';
        
        // Update CAD interface zoom level
        if (window.cadInterface) {
            window.cadInterface.updateZoomLevel(currentZoom || 1.0);
        }
        
        // Update footer zoom display
        if (window.footerComponent) {
            window.footerComponent.updateZoom(currentZoom || 1.0);
        }
        
        // Dispatch zoom event
        window.dispatchEvent(new CustomEvent('canvas:zoom', {
            detail: { zoom: currentZoom || 1.0 }
        }));
    }
    
    handleObjectSelected(e) {
        console.log('🔍 handleObjectSelected triggered:', e);
        console.log('  Event type:', e.type);
        console.log('  Event target:', e.target);
        console.log('  Event selected array:', e.selected);
        
        const obj = e.selected ? e.selected[0] : e.target;
        console.log('🔍 Selected object:', obj);
        console.log('🔍 Object details:', {
            type: obj?.type,
            lightObject: obj?.lightObject,
            entityId: obj?.entityId,
            iconStyle: obj?.iconStyle,
            selectable: obj?.selectable,
            evented: obj?.evented,
            position: obj ? { x: obj.left, y: obj.top } : null
        });

        // Update layer control button states
        this.updateLayerControlButtons();
        
        // Update selection count based on total selected objects
        const selectedObjects = this.canvas.getActiveObjects();
        const selectedCount = selectedObjects.length;
        console.log('📊 Total selected objects:', selectedCount);
        
        if (obj && obj.lightObject) {
            console.log('🎯 Light object detected! Entity ID:', obj.entityId);
            
            // Clear any previous selection first
            if (this.selectedLight && this.selectedLight !== obj) {
                console.log('🔄 Clearing previous selection');
                this.removeHighlightFromLight(this.selectedLight);
            }
            
            this.selectedLight = obj;
            this.updateControlsFromLight(obj);
            this.highlightSelectedLight(obj);
            
            // Update CAD interface selection indicators
            this.updateSelectedObjectIndicator(obj);
            if (window.cadInterface) {
                window.cadInterface.updateSelectedCount(selectedCount);
            }
            
            // If the light has an entity assigned, add it to the scene manager's selection
            if (obj.entityId && window.sceneManager) {
                console.log('🔗 Integrating with scene manager');
                
                // Clear other selections when clicking a light
                window.sceneManager.selectedFloorplanLights.clear();
                document.querySelectorAll('.light-btn').forEach(btn => {
                    btn.classList.remove('selected');
                });
                
                // Add this light to the selection
                window.sceneManager.selectedFloorplanLights.add(obj.entityId);
                const lightBtn = document.querySelector(`[data-entity-id="${obj.entityId}"]`);
                if (lightBtn) {
                    lightBtn.classList.add('selected');
                }
                
                // Highlight the corresponding light card in Scene Lights
                document.querySelectorAll('.light-card').forEach(card => {
                    card.classList.remove('selected-from-floorplan');
                });
                const lightCard = document.querySelector(`[data-entity-id="${obj.entityId}"]`);
                if (lightCard) {
                    lightCard.classList.add('selected-from-floorplan');
                    console.log('🎯 Added highlighting to Scene Lights card:', obj.entityId);
                } else {
                    console.log('⚠️ Light card not found for:', obj.entityId);
                }
                
                // Switch to individual mode if not already
                if (!window.sceneManager.individualMode) {
                    console.log('🔄 Switching to individual mode');
                    const individualModeToggle = document.getElementById('individualMode');
                    if (individualModeToggle) {
                        individualModeToggle.checked = true;
                        window.sceneManager.toggleControlMode();
                    }
                }
                
                // Update the individual controls
                window.sceneManager.updateSelectionUI();
                
                // ✅ Refresh floorplan lights list when a light is selected
                console.log('🔄 Refreshing floorplan lights list due to light selection');
                window.sceneManager.renderFloorplanLightsList();
            } else {
                console.log('⚠️ Light has no entity assigned');
            }
            
            // Notify the entity panel about the selected light
            if (window.entityPanel) {
                window.entityPanel.setSelectedLight(obj);
            }
        } else {
            console.log('🔍 Non-light object selected:', obj ? obj.type : 'null', obj);
            if (obj) {
                console.log('  Object properties:', {
                    type: obj.type,
                    selectable: obj.selectable,
                    evented: obj.evented,
                    gridLine: obj.gridLine,
                    snapGuide: obj.snapGuide,
                    roomPreview: obj.roomPreview
                });
                
                // Update CAD interface for non-light objects
                this.updateSelectedObjectIndicator(obj);
                if (window.cadInterface) {
                    window.cadInterface.updateSelectedCount(selectedCount);
                }
            } else {
                // No object selected
                this.hideSelectedLightIndicator();
                if (window.cadInterface) {
                    window.cadInterface.updateSelectedCount(selectedCount);
                }
            }
        }
    }
    
    handleSelectionCleared() {
        if (this.selectedLight) {
            this.removeHighlightFromLight(this.selectedLight);
            this.selectedLight = null;
        }
        
        // Update CAD interface selection indicators
        this.hideSelectedLightIndicator();
        if (window.cadInterface) {
            window.cadInterface.updateSelectedCount(0);
        }
        
        // Clear highlighting from Scene Lights cards
        document.querySelectorAll('.light-card').forEach(card => {
            card.classList.remove('selected-from-floorplan');
        });
        
        // Remove any orphaned selection rings
        this.clearAllSelectionRings();
        this.clearSnapGuides();

        // Update layer control button states
        this.updateLayerControlButtons();
    }
    
    clearAllSelectionRings() {
        const objectsToRemove = [];
        this.canvas.forEachObject(obj => {
            if (obj.selectionRing) {
                objectsToRemove.push(obj);
            }
        });
        objectsToRemove.forEach(obj => this.canvas.remove(obj));
        
        if (objectsToRemove.length > 0) {
            this.canvas.renderAll();
        }
    }
    
    handleKeyDown(e) {
        // Note: SHIFT key is automatically handled by fabric.js for:
        // - Proportional scaling (hold SHIFT while resizing objects)
        // - Constrained rotation (hold SHIFT while rotating - snaps to 15° increments)
        // - Constrained movement (hold SHIFT while moving - locks to horizontal/vertical)
        // - Uniform scaling (prevents aspect ratio distortion)
        
        // Track shift key state for orthogonal constraints
        if (e.key === 'Shift') {
            this.shiftPressed = true;
        }
        
        switch(e.key) {
            case ' ': // Spacebar for pan mode
                if (!this.spacebarPressed) {
                    e.preventDefault();
                    this.spacebarPressed = true;
                    document.body.style.cursor = 'grab';
                    console.log('🖱️ Spacebar pressed - pan mode enabled');
                }
                break;
            case 'Delete':
            case 'Backspace':
                e.preventDefault();
                this.deleteSelected();
                break;
            case 'Escape':
                if (this.isDrawing) {
                    if (this.currentTool === 'line') {
                        this.cancelLineDrawing();
                    } else {
                        this.cancelRoomDrawing();
                    }
                }
                break;
            case 's':
            case 'S':
                // Toggle snap on/off during operations
                if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    this.snapEnabled = !this.snapEnabled;
                    const status = this.snapEnabled ? 'enabled' : 'disabled';
                    window.sceneManager?.showStatus(`Snap ${status}`, 'info');
                    console.log(`📐 Snap toggled ${status}`);
                }
                break;
            case '+':
            case '=':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.zoomIn();
                }
                break;
            case '-':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.zoomOut();
                }
                break;
            case 'g':
            case 'G':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    console.log('🔥 Manual grid refresh triggered by Ctrl+G');
                    this.forceGridRefresh();
                }
                break;
        }
    }
    
    handleKeyUp(e) {
        switch(e.key) {
            case ' ': // Spacebar release
                this.spacebarPressed = false;
                document.body.style.cursor = 'default';
                console.log('🖱️ Spacebar released - pan mode disabled');
                break;
            case 'Shift':
                this.shiftPressed = false;
                break;
        }
    }
    
    cancelRoomDrawing() {
        // Remove preview lines and measurements
        this.canvas.getObjects().forEach(obj => {
            if (obj.roomPreview) {
                this.canvas.remove(obj);
            }
        });
        this.clearMeasurementDisplay();
        
        this.isDrawing = false;
        this.drawingPoints = [];
        this.canvas.renderAll();
    }
    
    resizeCanvas() {
        // Skip canvas resize if we're in the middle of panel resizing
        if (this.isResizing) {
            console.log('⏭️ Skipping canvas resize during panel drag');
            return;
        }
        
        const workspace = document.querySelector('.drawing-area');
        const canvasElement = document.getElementById('floorplan-canvas');
        
        if (!workspace || !canvasElement) {
            console.warn('⚠️ Workspace or canvas element not found during resize');
            return;
        }
        
        if (!workspace.clientWidth || !workspace.clientHeight) {
            console.warn('⚠️ Workspace dimensions not available yet, skipping resize');
            return;
        }
        
        const width = workspace.clientWidth;
        const height = workspace.clientHeight;
        
        canvasElement.width = width;
        canvasElement.height = height;
        
        if (this.canvas) {
            this.canvas.setDimensions({
                width: width,
                height: height
            });
            
            this.drawGrid();
            this.canvas.renderAll();
        }
    }
    
    saveLayoutToFile() {
        const data = this.saveLayout();
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `floorplan-${new Date().toISOString().slice(0,10)}.json`;
        link.click();
        
        window.sceneManager?.showStatus('Layout saved to file', 'success');
    }
    
    loadLayoutFromFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        // Call the data-parameter version of loadLayout directly (not the localStorage one)
                        this.loadLayout(data);
                        window.sceneManager?.showStatus('Layout loaded successfully', 'success');
                    } catch (error) {
                        window.sceneManager?.showStatus('Error loading layout file', 'error');
                        console.error('Layout load error:', error);
                    }
                };
                reader.readAsText(file);
            }
        };
        
        input.click();
    }

    saveLayout() {
        // Get all objects and classify them
        const allObjects = this.canvas.getObjects();
        const data = {
            version: '3.0.1',
            timestamp: new Date().toISOString(),
            canvas: {
                width: this.canvas.width,
                height: this.canvas.height,
                backgroundColor: this.canvas.backgroundColor
            },
            settings: {
                isDarkTheme: this.isDarkTheme,
                showLabels: this.showLabels,
                useFriendlyNames: this.useFriendlyNames,
                gridSize: this.gridSize,
                lightIconStyle: this.lightIconStyle,
                gridVisible: this.gridVisible,
                snapEnabled: this.snapEnabled,
                roomFillColor: this.roomFillColor,
                roomFillOpacity: this.roomFillOpacity,
                roomDrawingMode: this.roomDrawingMode
            },
            objects: []
        };
        
        // Save all objects (except UI elements like grid lines, snap guides, labels)
        allObjects.forEach(obj => {
            // Skip UI elements and temporary objects
            if (obj.gridLine || obj.snapGuide || obj.roomPreview || obj.rectanglePreview || obj.linePreview || obj.entityLabel || obj.measurementOverlay) {
                return;
            }
            
            // Get only the essential properties for recreation (exclude internal fabric.js properties)
            const objectData = obj.toObject([
                'left', 'top', 'width', 'height', 'angle', 'scaleX', 'scaleY', 'skewX', 'skewY', 'flipX', 'flipY',
                'fill', 'stroke', 'strokeWidth', 'opacity', 'visible', 'selectable', 'evented',
                'text', 'fontSize', 'fontFamily', 'fontWeight', 'fontStyle', 'textAlign', 'underline',
                'x1', 'y1', 'x2', 'y2', 'radius', 'points', 'rx', 'ry',
                'customLayer'
            ]);
            
            // Add custom properties
            if (obj.lightObject) {
                objectData.lightObject = true;
                objectData.entityId = obj.entityId;
                objectData.iconStyle = obj.iconStyle;
            }
            
            if (obj.textObject) {
                objectData.textObject = true;
            }
            
            if (obj.roomOutline) {
                objectData.roomOutline = true;
            }
            
            if (obj.roomObject) {
                objectData.roomObject = true;
            }
            
            if (obj.lineObject) {
                objectData.lineObject = true;
            }
            
            if (obj.backgroundImage) {
                objectData.backgroundImage = true;
            }
            
            // Ensure all transformation properties are preserved
            objectData.left = obj.left;
            objectData.top = obj.top;
            objectData.angle = obj.angle || 0;
            objectData.scaleX = obj.scaleX || 1;
            objectData.scaleY = obj.scaleY || 1;
            objectData.skewX = obj.skewX || 0;
            objectData.skewY = obj.skewY || 0;
            objectData.flipX = obj.flipX || false;
            objectData.flipY = obj.flipY || false;
            
            data.objects.push(objectData);
        });
        
        // Also save separate arrays for backward compatibility
        data.lights = this.lights.map(light => ({
            ...light.toObject(),
            entityId: light.entityId,
            iconStyle: light.iconStyle
        }));
        
        data.texts = this.texts.map(text => text.toObject());
        
        data.roomOutline = this.roomOutline ? this.roomOutline.toObject() : null;
        
        data.backgroundImage = this.backgroundImage ? this.backgroundImage.toObject() : null;
        
        // Save layer information
        data.layers = this.layerManager ? {
            layers: this.layerManager.layers,
            layerOrder: this.layerManager.layerOrder,
            layerCounters: this.layerManager.layerCounters
        } : null;
        
        return data;
    }
    
    loadLayout(data, onComplete) {
        // Set loading flag to prevent auto-save during loading
        this.isLoadingLayout = true;
        
        console.log('🔄 DEBUG - Starting loadLayout process...');
        console.log('   Data has objects array:', !!(data.objects && data.objects.length > 0));
        console.log('   Data has legacy lights:', !!(data.lights && data.lights.length > 0));
        
        // Clear canvas and reset arrays
        this.canvas.clear();
        this.lights = [];
        this.texts = [];
        this.labels = [];
        this.roomOutline = null;
        this.backgroundImage = null;
        
        // Load settings
        if (data.settings) {
            this.isDarkTheme = data.settings.isDarkTheme !== undefined ? data.settings.isDarkTheme : true;
            this.showLabels = data.settings.showLabels || false;
            this.useFriendlyNames = data.settings.useFriendlyNames !== undefined ? data.settings.useFriendlyNames : true;
            this.gridSize = data.settings.gridSize || 20;
            this.lightIconStyle = data.settings.lightIconStyle || 'circle';
            this.gridVisible = data.settings.gridVisible !== undefined ? data.settings.gridVisible : true;
            this.snapEnabled = data.settings.snapEnabled !== undefined ? data.settings.snapEnabled : true;
            this.roomFillColor = data.settings.roomFillColor || '#cccccc';
            this.roomFillOpacity = data.settings.roomFillOpacity !== undefined ? data.settings.roomFillOpacity : 0.3;
            this.roomDrawingMode = data.settings.roomDrawingMode || 'rectangle';
            
            // Update UI buttons to match settings
            this.updateUIFromSettings();
        }
        
        // Restore canvas properties
        if (data.canvas) {
            this.canvas.setWidth(data.canvas.width || this.canvas.width);
            this.canvas.setHeight(data.canvas.height || this.canvas.height);
            this.canvas.backgroundColor = data.canvas.backgroundColor || (this.isDarkTheme ? '#1a1a1a' : '#f5f5f5');
        } else {
            this.canvas.backgroundColor = this.isDarkTheme ? '#1a1a1a' : '#f5f5f5';
        }
        
        this.drawGrid();
        
        // Restore layer information
        if (data.layers && this.layerManager) {
            console.log('🗂️ Restoring layer information...');
            this.layerManager.layers = data.layers.layers || {};
            this.layerManager.layerOrder = data.layers.layerOrder || [];
            this.layerManager.layerCounters = data.layers.layerCounters || {
                room: 0,
                light: 0,
                text: 0,
                object: 0
            };
            console.log(`✅ Restored ${Object.keys(this.layerManager.layers).length} layers`);
        }
        
        // Load all objects from the comprehensive objects array (new format)
        if (data.objects && data.objects.length > 0) {
            console.log(`🔄 Loading ${data.objects.length} objects using direct manual restoration...`);
            console.log('ℹ️ Skipping fabric.util.enlivenObjects due to known compatibility issues');
            
            // Use manual restoration directly (more reliable than fabric.util.enlivenObjects)
            this.manualObjectRestoration(data.objects, onComplete);
                        return;
        } else {
            // Fallback to old format for backward compatibility
            console.log('🔄 Using legacy format loader...');
            this.loadLegacyFormat(data, onComplete);
        }
    }

    // Manual object restoration method to bypass fabric.util.enlivenObjects issues
    manualObjectRestoration(objectsData, onComplete) {
        console.log('🔧 Manual object restoration starting...');
        
        let lightsRestored = 0;
        let objectsProcessed = 0;
        
        objectsData.forEach((objData, index) => {
            console.log(`🔍 Manually processing object ${index + 1}:`, {
                type: objData.type,
                lightObject: objData.lightObject,
                textObject: objData.textObject,
                roomObject: objData.roomObject,
                lineObject: objData.lineObject
            });
            
            try {
                let fabricObject = null;
                
                // Normalize type to lowercase for comparison
                const objType = objData.type.toLowerCase();
                console.log(`   🔧 Processing type: "${objData.type}" (normalized: "${objType}")`);
                
                // Create objects based on type
                if (objType === 'line') {
                    console.log(`   ➡️ Creating Line with points: [${objData.x1}, ${objData.y1}, ${objData.x2}, ${objData.y2}]`);
                    fabricObject = new fabric.Line([objData.x1, objData.y1, objData.x2, objData.y2], {
                        left: objData.left,
                        top: objData.top,
                        stroke: objData.stroke,
                        strokeWidth: objData.strokeWidth || 1
                    });
                } else if (objType === 'text' || objType === 'i-text') {
                    console.log(`   📝 Creating Text: "${objData.text}" at (${objData.left}, ${objData.top})`);
                    fabricObject = new fabric.Text(objData.text || '', {
                        left: objData.left,
                        top: objData.top,
                        fontSize: objData.fontSize || 16,
                        fill: objData.fill || '#000000'
                    });
                } else if (objType === 'circle') {
                    console.log(`   ⭕ Creating Circle with radius ${objData.radius} at (${objData.left}, ${objData.top})`);
                    fabricObject = new fabric.Circle({
                        left: objData.left,
                        top: objData.top,
                        radius: objData.radius || 10,
                        fill: objData.fill,
                        stroke: objData.stroke
                    });
                } else if (objType === 'rect') {
                    console.log(`   ⬜ Creating Rect ${objData.width}x${objData.height} at (${objData.left}, ${objData.top})`);
                    fabricObject = new fabric.Rect({
                        left: objData.left,
                        top: objData.top,
                        width: objData.width,
                        height: objData.height,
                        fill: objData.fill,
                        stroke: objData.stroke
                    });
                } else if (objType === 'polygon') {
                    console.log(`   🔺 Creating Polygon with ${objData.points?.length || 0} points`);
                    fabricObject = new fabric.Polygon(objData.points || [], {
                        left: objData.left,
                        top: objData.top,
                        fill: objData.fill,
                        stroke: objData.stroke
                    });
                } else {
                    console.log(`   ❓ Unknown object type: "${objData.type}"`);
                }
                
                if (fabricObject) {
                    console.log(`   ✅ Successfully created fabric object of type: ${fabricObject.type}`);
                    
                    // Set common properties
                    try {
                        fabricObject.set({
                            angle: objData.angle || 0,
                            scaleX: objData.scaleX || 1,
                            scaleY: objData.scaleY || 1,
                            flipX: objData.flipX || false,
                            flipY: objData.flipY || false
                        });
                        console.log(`   ⚙️ Set common properties for object`);
                    } catch (error) {
                        console.error(`   ❌ Error setting common properties:`, error);
                    }
                    
                    // Set custom properties
                    if (objData.lightObject) {
                        fabricObject.lightObject = true;
                        fabricObject.entityId = objData.entityId;
                        fabricObject.iconStyle = objData.iconStyle || 'circle';
                        
                        // Add event handlers
                        fabricObject.on('mousedblclick', () => {
                            this.assignEntityToLight(fabricObject);
                        });
                        
                        fabricObject.on('mousedown', (e) => {
                            if (e.e.button === 2) { // Right click
                                e.e.preventDefault();
                                this.showLightContextMenu(fabricObject, e.e);
                            }
                        });
                        
                        this.lights.push(fabricObject);
                        lightsRestored++;
                        console.log(`   🔆 Manually restored light ${lightsRestored}: ${fabricObject.entityId || 'unassigned'}`);
                    }
                    
                    if (objData.textObject) {
                        fabricObject.textObject = true;
                        fabricObject.on('mousedblclick', () => {
                            const newText = prompt('Edit text:', fabricObject.text);
                            if (newText !== null) {
                                fabricObject.set('text', newText);
                                this.canvas.renderAll();
                            }
                        });
                        this.texts.push(fabricObject);
                    }
                    
                    if (objData.roomOutline) {
                        fabricObject.roomOutline = true;
                        this.roomOutline = fabricObject;
                    }
                    
                    if (objData.roomObject) {
                        fabricObject.roomObject = true;
                    }
                    
                    if (objData.lineObject) {
                        fabricObject.lineObject = true;
                    }
                    
                    if (objData.backgroundImage) {
                        fabricObject.backgroundImage = true;
                        fabricObject.set({
                            selectable: false,
                            evented: false
                        });
                        this.backgroundImage = fabricObject;
                    }
                    
                    this.canvas.add(fabricObject);
                    objectsProcessed++;
                    console.log(`   ➕ Manually added object ${objectsProcessed} to canvas (type: ${fabricObject.type})`);
                    
                    // Send background elements to back
                    if (objData.backgroundImage) {
                        this.canvas.sendObjectToBack(fabricObject);
                        console.log(`   ⬇️ Sent background image to back`);
                    } else if (objData.roomOutline) {
                        this.canvas.sendObjectToBack(fabricObject);
                        console.log(`   ⬇️ Sent room outline to back`);
                    }
                } else {
                    console.warn(`⚠️ Could not create object for type: ${objData.type}`);
                }
            } catch (error) {
                console.error(`❌ Error manually creating object ${index + 1}:`, error);
            }
        });
        
        console.log(`✅ Manual restoration complete: ${objectsProcessed} objects processed, ${lightsRestored} lights restored`);
        
        // Create labels if they should be shown
        if (this.showLabels) {
            console.log('🏷️ Creating labels...');
            this.createLabels();
        }
        
        console.log('🎨 Rendering canvas...');
        this.canvas.renderAll();
        
        // Debug: Check final canvas state
        const finalObjectCount = this.canvas.getObjects().length;
        const visibleObjects = this.canvas.getObjects().filter(obj => obj.visible !== false).length;
        console.log(`📊 Final canvas state: ${finalObjectCount} total objects, ${visibleObjects} visible`);
        console.log('📊 Lights array length:', this.lights.length);
        console.log('📊 Texts array length:', this.texts.length);
        
        // Clear loading flag
        console.log('🏁 Clearing isLoadingLayout flag...');
        this.isLoadingLayout = false;
        
        // Call completion callback if provided
        if (onComplete && typeof onComplete === 'function') {
            console.log('🎯 Calling manual restoration completion callback...');
            try {
                onComplete();
                console.log('✅ Manual restoration completion callback executed successfully');
            } catch (error) {
                console.error('❌ Error in manual restoration completion callback:', error);
            }
        } else {
            console.log('⚠️ No completion callback provided or not a function:', typeof onComplete);
        }
    }
    
    loadLegacyFormat(data, onComplete) {
        console.log('🔄 Loading legacy format data...');
        
        let pendingOperations = 0;
        let completedOperations = 0;
        
        const checkCompletion = () => {
            completedOperations++;
            console.log(`Legacy loading progress: ${completedOperations}/${pendingOperations}`);
            
            if (completedOperations >= pendingOperations) {
                // Clear loading flag
                this.isLoadingLayout = false;
                
                console.log('✅ Legacy format loading complete');
                
                // Call completion callback if provided
                if (onComplete && typeof onComplete === 'function') {
                    console.log('🎯 Calling legacy loadLayout completion callback...');
                    onComplete();
                }
            }
        };
        
        // Count operations that need to complete
        if (data.backgroundImage) pendingOperations++;
        if (data.roomOutline) pendingOperations++;
        if (data.texts && data.texts.length > 0) pendingOperations++;
        if (data.lights && data.lights.length > 0) pendingOperations++;
        
        // If no async operations, call completion immediately
        if (pendingOperations === 0) {
            this.isLoadingLayout = false;
            if (onComplete && typeof onComplete === 'function') {
                console.log('🎯 No legacy operations needed, calling completion callback...');
                onComplete();
            }
            return;
        }
        
        // Load background image
        if (data.backgroundImage) {
            fabric.util.enlivenObjects([data.backgroundImage], (objects) => {
                const img = objects[0];
                img.set({
                    selectable: false,
                    evented: false,
                    backgroundImage: true
                });
                this.backgroundImage = img;
                this.canvas.add(img);
                this.canvas.sendObjectToBack(img);
                checkCompletion();
            });
        }
        
        // Load room outline
        if (data.roomOutline) {
            fabric.util.enlivenObjects([data.roomOutline], (objects) => {
                this.roomOutline = objects[0];
                this.roomOutline.set('roomOutline', true);
                this.canvas.add(this.roomOutline);
                this.canvas.sendObjectToBack(this.roomOutline);
                checkCompletion();
            });
        }
        
        // Load texts
        if (data.texts && data.texts.length > 0) {
            fabric.util.enlivenObjects(data.texts, (objects) => {
                objects.forEach((text) => {
                    text.textObject = true;
                    text.on('mousedblclick', () => {
                        const newText = prompt('Edit text:', text.text);
                        if (newText !== null) {
                            text.set('text', newText);
                            this.canvas.renderAll();
                        }
                    });
                    this.texts.push(text);
                    this.canvas.add(text);
                });
                checkCompletion();
            });
        }
        
        // Load lights
        if (data.lights && data.lights.length > 0) {
            fabric.util.enlivenObjects(data.lights, (objects) => {
                console.log(`✅ Legacy lights callback received ${objects.length} lights`);
                
                objects.forEach((light, index) => {
                    light.entityId = data.lights[index].entityId;
                    light.iconStyle = data.lights[index].iconStyle || 'circle';
                    light.lightObject = true;
                    
                    // Add event handlers
                    light.on('mousedblclick', () => {
                        this.assignEntityToLight(light);
                    });
                    
                    light.on('mousedown', (e) => {
                        if (e.e.button === 2) { // Right click
                            e.e.preventDefault();
                            this.showLightContextMenu(light, e.e);
                        }
                    });
                    
                    this.lights.push(light);
                    this.canvas.add(light);
                    console.log(`   🔆 Restored legacy light: ${light.entityId || 'unassigned'}`);
                });
                
                // Create labels if they should be shown
                if (this.showLabels) {
                    this.createLabels();
                }
                
                this.canvas.renderAll();
                checkCompletion();
            });
        }
    }
    
    updateUIFromSettings() {
        // Update theme button
        const themeBtn = document.getElementById('theme-toggle-btn');
        if (this.isDarkTheme) {
            themeBtn.innerHTML = '<i class="fas fa-sun"></i><span>Light</span>';
            themeBtn.classList.remove('active');
        } else {
            themeBtn.innerHTML = '<i class="fas fa-moon"></i><span>Dark</span>';
            themeBtn.classList.add('active');
        }
        
        // Update labels button
        const labelsBtn = document.getElementById('labels-toggle-btn');
        if (this.showLabels) {
            labelsBtn.classList.add('active');
        } else {
            labelsBtn.classList.remove('active');
        }
        
        // Update room fill controls
        const colorPicker = document.getElementById('room-fill-color');
        const opacitySlider = document.getElementById('room-fill-opacity');
        if (colorPicker && opacitySlider) {
            colorPicker.value = this.roomFillColor;
            opacitySlider.value = this.roomFillOpacity * 100;
            this.updateOpacitySliderBackground();
        }
        
        // Update room tool tooltip
        this.updateRoomToolTooltip();
        
        // Label mode button removed - always use entity names
    }
    
    // Auto-save functionality
    startAutoSave() {
        this.autoSaveTimer = setInterval(() => {
            this.autoSaveLayout();
        }, this.autoSaveInterval); // Auto-save every 30 seconds
    }
    
    triggerAutoSave() {
        // Don't auto-save if we're currently loading a layout
        if (this.isLoadingLayout) {
            console.log('⏸️ Skipping auto-save during layout loading (isLoadingLayout = true)');
            return;
        }
        
        console.log('🔄 triggerAutoSave called - scheduling auto-save in', this.saveDelay, 'ms');
        
        // Debounced auto-save - save 2 seconds after last change
        clearTimeout(this.autoSaveDebounce);
        this.autoSaveDebounce = setTimeout(() => {
            console.log('⏰ Auto-save timer fired');
            this.autoSaveLayout();
        }, this.saveDelay);
    }
    
    autoSaveLayout() {
        try {
            const data = {
                version: '1.2.15',
                timestamp: new Date().toISOString(),
                canvas: {
                    width: this.canvas.width,
                    height: this.canvas.height,
                    backgroundColor: this.canvas.backgroundColor
                },
                settings: {
                    gridSize: this.gridSize,
                    gridVisible: this.gridVisible,
                    snapEnabled: this.snapEnabled,
                    isDarkTheme: this.isDarkTheme,
                    showLabels: this.showLabels,
                    useFriendlyNames: this.useFriendlyNames,
                    lightIconStyle: this.lightIconStyle
                },
                lights: this.lights.map(light => ({
                    left: light.left,
                    top: light.top,
                    entityId: light.entityId,
                    iconStyle: light.iconStyle,
                    radius: light.radius,
                    fontSize: light.fontSize,
                    fill: light.fill,
                    stroke: light.stroke,
                    customLayer: light.customLayer
                })),
                texts: this.texts.map(text => ({
                    left: text.left,
                    top: text.top,
                    text: text.text,
                    fontSize: text.fontSize,
                    fill: text.fill,
                    customLayer: text.customLayer
                })),
                backgroundImage: this.backgroundImage ? {
                    src: this.backgroundImage.getSrc(),
                    left: this.backgroundImage.left,
                    top: this.backgroundImage.top,
                    scaleX: this.backgroundImage.scaleX,
                    scaleY: this.backgroundImage.scaleY,
                    opacity: this.backgroundImage.opacity
                } : null,
                rooms: this.canvas.getObjects().filter(obj => obj.roomObject).map(room => ({
                    left: room.left,
                    top: room.top,
                    width: room.width,
                    height: room.height,
                    points: room.points,
                    stroke: room.stroke,
                    fill: room.fill,
                    type: room.type,
                    customLayer: room.customLayer
                })),
                lines: this.canvas.getObjects().filter(obj => obj.type === 'line' && !obj.gridLine && !obj.snapGuide).map(line => ({
                    x1: line.x1,
                    y1: line.y1,
                    x2: line.x2,
                    y2: line.y2,
                    left: line.left,
                    top: line.top,
                    stroke: line.stroke,
                    strokeWidth: line.strokeWidth,
                    customLayer: line.customLayer
                })),
                // Save layer information
                layers: this.layerManager ? {
                    layers: this.layerManager.layers,
                    layerOrder: this.layerManager.layerOrder,
                    layerCounters: this.layerManager.layerCounters
                } : null
            };
            
            localStorage.setItem('floorplan_layout', JSON.stringify(data));
            console.log('💾 Layout auto-saved');
        } catch (error) {
            console.error('❌ Failed to auto-save layout:', error);
        }
    }
    
    loadLayoutFromAutoSave() {
        // Legacy auto-load method for backward compatibility
        console.log('🔍 loadLayoutFromAutoSave() called for legacy auto-loading');
        
        // Prevent automatic loading after initial load (except for manual file loading)
        if (this.initialLoadComplete) {
            console.log('⏸️ Skipping automatic layout loading - initial load already complete');
            return;
        }
        
        try {
            const savedData = localStorage.getItem('floorplan_layout');
            if (!savedData) {
                console.log('📄 No saved layout found');
                this.initialLoadComplete = true;
                return;
            }
            
            const data = JSON.parse(savedData);
            console.log('📂 Loading layout version:', data.version);
            
            // Set loading flag to prevent auto-save conflicts
            this.isLoadingLayout = true;
            
            // Clear existing objects (except grid)
            const objectsToRemove = [];
            this.canvas.forEachObject(obj => {
                if (!obj.gridLine) {
                    objectsToRemove.push(obj);
                }
            });
            objectsToRemove.forEach(obj => this.canvas.remove(obj));
            
            this.lights = [];
            this.texts = [];
            this.labels = [];
            
            // Restore settings
            if (data.settings) {
                this.gridSize = data.settings.gridSize || 20;
                this.gridVisible = data.settings.gridVisible !== false;
                this.snapEnabled = data.settings.snapEnabled !== false;
                this.isDarkTheme = data.settings.isDarkTheme !== false;
                this.showLabels = data.settings.showLabels || false;
                this.useFriendlyNames = data.settings.useFriendlyNames !== false;
                this.lightIconStyle = data.settings.lightIconStyle || 'circle';
            }
            
            // Restore layer information
            if (data.layers && this.layerManager) {
                console.log('🗂️ Restoring layer information from autosave...');
                this.layerManager.layers = data.layers.layers || {};
                this.layerManager.layerOrder = data.layers.layerOrder || [];
                this.layerManager.layerCounters = data.layers.layerCounters || {
                    room: 0,
                    light: 0,
                    text: 0,
                    object: 0
                };
                console.log(`✅ Restored ${Object.keys(this.layerManager.layers).length} layers from autosave`);
            }
            
            // Restore canvas settings
            if (data.canvas) {
                this.canvas.backgroundColor = data.canvas.backgroundColor || (this.isDarkTheme ? '#1a1a1a' : '#ffffff');
            }
            
            // Restore background image
            if (data.backgroundImage) {
                const img = new Image();
                img.onload = () => {
                    const fabricImg = new fabric.Image(img);
                    fabricImg.set({
                        left: data.backgroundImage.left,
                        top: data.backgroundImage.top,
                        scaleX: data.backgroundImage.scaleX,
                        scaleY: data.backgroundImage.scaleY,
                        opacity: data.backgroundImage.opacity,
                        selectable: false,
                        evented: false,
                        backgroundImage: true
                    });
                                         this.backgroundImage = fabricImg;
                     this.canvas.add(fabricImg);
                     this.canvas.sendObjectToBack(fabricImg);
                    this.canvas.renderAll();
                };
                img.src = data.backgroundImage.src;
            }
            
            // Restore rooms
            if (data.rooms) {
                data.rooms.forEach(roomData => {
                    let room;
                    if (roomData.points) {
                        // Polygon room
                        room = new fabric.Polygon(roomData.points, {
                            left: roomData.left,
                            top: roomData.top,
                            fill: roomData.fill || 'transparent',
                            stroke: roomData.stroke || (this.isDarkTheme ? '#00ff00' : '#0066cc'),
                            strokeWidth: 2,
                            roomObject: true,
                            wallHeight: roomData.wallHeight || 10
                        });
                    } else {
                        // Rectangle room
                        room = new fabric.Rect({
                            left: roomData.left,
                            top: roomData.top,
                            width: roomData.width,
                            height: roomData.height,
                            fill: roomData.fill || 'transparent',
                            stroke: roomData.stroke || (this.isDarkTheme ? '#00ff00' : '#0066cc'),
                            strokeWidth: 2,
                            roomObject: true,
                            wallHeight: roomData.wallHeight || 10
                        });
                    }
                    this.canvas.add(room);
                });
            }
            
            // Restore lights
            if (data.lights) {
                data.lights.forEach(lightData => {
                    let light;
                    if (lightData.iconStyle === 'bulb') {
                        light = new fabric.Text('\uf0eb', {
                            left: lightData.left,
                            top: lightData.top,
                            fontSize: lightData.fontSize || 24,
                            fontFamily: 'FontAwesome',
                            fill: lightData.fill || '#ffa500',
                            stroke: lightData.stroke || (this.isDarkTheme ? '#ffffff' : '#000000'),
                            strokeWidth: 1,
                            hasControls: false,
                            hasBorders: false,
                            lightObject: true,
                            entityId: lightData.entityId,
                            iconStyle: 'bulb'
                        });
                    } else if (lightData.iconStyle === 'recessed') {
                        light = new fabric.Circle({
                            left: lightData.left,
                            top: lightData.top,
                            radius: lightData.radius || 8,
                            fill: 'transparent',
                            stroke: lightData.stroke || '#ffa500',
                            strokeWidth: 3,
                            hasControls: false,
                            hasBorders: false,
                            lightObject: true,
                            entityId: lightData.entityId,
                            iconStyle: 'recessed'
                        });
                    } else {
                        light = new fabric.Circle({
                            left: lightData.left,
                            top: lightData.top,
                            radius: lightData.radius || 10,
                            fill: lightData.fill || '#ffa500',
                            stroke: lightData.stroke || (this.isDarkTheme ? '#ffffff' : '#000000'),
                            strokeWidth: 2,
                            hasControls: false,
                            hasBorders: false,
                            lightObject: true,
                            entityId: lightData.entityId,
                            iconStyle: 'circle'
                        });
                    }
                    
                    // Add event handlers
                    light.on('mousedblclick', () => this.assignEntityToLight(light));
                    light.on('mousedown', (e) => {
                        if (e.e.button === 2) {
                            e.e.preventDefault();
                            this.showLightContextMenu(light, e.e);
                        }
                    });
                    
                    this.canvas.add(light);
                    this.lights.push(light);
                });
            }
            
            // Restore texts
            if (data.texts) {
                data.texts.forEach(textData => {
                    const text = new fabric.Text(textData.text, {
                        left: textData.left,
                        top: textData.top,
                        fontSize: textData.fontSize || 16,
                        fontFamily: 'Arial, sans-serif',
                        fill: textData.fill || (this.isDarkTheme ? '#ffffff' : '#000000'),
                        hasControls: true,
                        hasBorders: true,
                        textObject: true
                    });
                    
                    text.on('mousedblclick', () => {
                        const newText = prompt('Edit text:', text.text);
                        if (newText !== null) {
                            text.set('text', newText);
                            this.canvas.renderAll();
                            this.triggerAutoSave();
                        }
                    });
                    
                    this.canvas.add(text);
                    this.texts.push(text);
                });
            }
            
            // Restore lines
            if (data.lines) {
                data.lines.forEach(lineData => {
                    const line = new fabric.Line([lineData.x1, lineData.y1, lineData.x2, lineData.y2], {
                        left: lineData.left,
                        top: lineData.top,
                        stroke: lineData.stroke || (this.isDarkTheme ? '#00ff00' : '#0066cc'),
                        strokeWidth: lineData.strokeWidth || 2,
                        hasControls: true,
                        hasBorders: true
                    });
                    
                    this.canvas.add(line);
                });
            }
            
            // Update UI from loaded settings
            this.updateUIFromSettings();
            
            // Redraw grid
            this.drawGrid();
            
            // Restore labels if they were shown
            if (this.showLabels) {
                this.createLabels();
            }
            
            this.canvas.renderAll();
            
            // Clear loading flag and mark initial load as complete
            this.isLoadingLayout = false;
            this.initialLoadComplete = true;
            
            console.log('✅ Layout loaded successfully');
            window.sceneManager?.showStatus('Layout loaded automatically', 'success');
            
        } catch (error) {
            console.error('❌ Failed to load layout:', error);
            // Clear loading flag even on error and mark initial load as complete
            this.isLoadingLayout = false;
            this.initialLoadComplete = true;
            window.sceneManager?.showStatus('Failed to load saved layout', 'error');
        }
    }
    
    updateUIFromSettings() {
        // Update grid toggle button
        const gridBtn = document.getElementById('grid-toggle-btn');
        if (this.gridVisible) {
            gridBtn.classList.add('active');
        } else {
            gridBtn.classList.remove('active');
        }
        
        // Update snap toggle button
        const snapBtn = document.getElementById('snap-toggle-btn');
        if (this.snapEnabled) {
            snapBtn.classList.add('active');
        } else {
            snapBtn.classList.remove('active');
        }
        
        // Update theme button
        const themeBtn = document.getElementById('theme-toggle-btn');
        const themeIcon = themeBtn.querySelector('i');
        const themeText = themeBtn.querySelector('span');
        if (this.isDarkTheme) {
            themeIcon.className = 'fas fa-sun';
            themeText.textContent = 'Light';
        } else {
            themeIcon.className = 'fas fa-moon';
            themeText.textContent = 'Dark';
        }
        
        // Update labels button
        const labelsBtn = document.getElementById('labels-toggle-btn');
        if (this.showLabels) {
            labelsBtn.classList.add('active');
        } else {
            labelsBtn.classList.remove('active');
        }
        
        // Label mode button removed - always use entity names
    }
    
    handleObjectMoving(e) {
        const obj = e.target;
        
        // Apply snapping during movement
        if (this.snapEnabled && !obj.gridLine && !obj.snapGuide) {
            const snappedPoint = this.snapToObjects(obj, { x: obj.left, y: obj.top });
            
            obj.set({
                left: snappedPoint.x,
                top: snappedPoint.y
            });
        }
        
        // Update label position in real-time when light is moving
        if (obj.lightObject && this.showLabels) {
            this.updateLabelForLight(obj);
        }
        
        // ✅ Update selection ring position when light is moving
        if (obj.lightObject && this.selectedLight === obj && obj._selectionRing) {
            this.updateSelectionRingPosition(obj);
        }
        
        // ✅ Update brightness effect (glow circle) position when light is moving
        if (obj.lightObject && obj.glowCircle) {
            this.updateGlowCirclePosition(obj);
        }
        
        // Don't update controls during movement - preserve scene colors
    }
    
    handleObjectMoved(e) {
        const obj = e.target;
        
        // Clear snap guides after movement
        this.clearSnapGuides();
        
        // Update label position after light is moved
        if (obj.lightObject && this.showLabels) {
            this.updateLabelForLight(obj);
        }
        
        // ✅ Update selection ring position after light is moved (final position)
        if (obj.lightObject && this.selectedLight === obj && obj._selectionRing) {
            this.updateSelectionRingPosition(obj);
        }
        
        // ✅ Update brightness effect (glow circle) position after light is moved
        if (obj.lightObject && obj.glowCircle) {
            this.updateGlowCirclePosition(obj);
        }
        
        // Update controls if this is the selected light
        if (obj.lightObject && this.selectedLight === obj) {
            this.updateControlsFromLight(obj);
        }
        
        this.triggerAutoSave();
    }
    
    handleObjectScaling(e) {
        const obj = e.target;
        
        // Apply snap to grid while scaling if enabled
        if (this.snapEnabled && obj.roomObject) {
            const gridSize = this.gridSize;
            
            // Snap dimensions to grid
            const width = Math.round(obj.getScaledWidth() / gridSize) * gridSize;
            const height = Math.round(obj.getScaledHeight() / gridSize) * gridSize;
            
            obj.set({
                scaleX: width / obj.width,
                scaleY: height / obj.height
            });
        }
    }
    
    handleObjectScaled(e) {
        const obj = e.target;
        console.log('🎯 handleObjectScaled called for:', obj.type, 'roomObject:', obj.roomObject);
        
        // Apply scale to actual dimensions for rooms
        if (obj.roomObject || obj.type === 'rect') {
            const newWidth = obj.getScaledWidth();
            const newHeight = obj.getScaledHeight();
            
            console.log('📐 Updating room dimensions:', {
                oldWidth: obj.width,
                oldHeight: obj.height,
                newWidth: newWidth,
                newHeight: newHeight,
                scaleX: obj.scaleX,
                scaleY: obj.scaleY
            });
            
            obj.set({
                width: newWidth,
                height: newHeight,
                scaleX: 1,
                scaleY: 1
            });
            
            // Force canvas to update
            obj.setCoords();
            this.canvas.requestRenderAll();
            
            // Force properties panel update
            this.updatePropertiesPanel(obj);
        }
        
        this.triggerAutoSave();
        this.triggerUpdatePreview();
    }
    
    handleObjectModified(e) {
        const obj = e.target;
        console.log('🛠️ handleObjectModified called for:', obj.type, {
            transform: e.transform,
            action: e.action,
            width: obj.width,
            height: obj.height,
            scaleX: obj.scaleX,
            scaleY: obj.scaleY
        });
        
        // Handle scaling for rooms (in case object:scaled doesn't fire)
        if ((obj.roomObject || obj.type === 'rect') && (obj.scaleX !== 1 || obj.scaleY !== 1)) {
            const newWidth = obj.getScaledWidth();
            const newHeight = obj.getScaledHeight();
            
            console.log('📐 Fixing room scale in modified event:', {
                newWidth: newWidth,
                newHeight: newHeight
            });
            
            obj.set({
                width: newWidth,
                height: newHeight,
                scaleX: 1,
                scaleY: 1
            });
            
            obj.setCoords();
            this.canvas.requestRenderAll();
        }
        
        // Update properties panel
        this.updatePropertiesPanel(obj);
        
        // Trigger auto-save
        this.triggerAutoSave();
        
        // Trigger 3D preview update
        this.triggerUpdatePreview();
    }
    
    updatePropertiesPanel(obj) {
        // Update properties panel if this object is selected
        const propertiesPanel = window.panelManager?.getPanel('properties');
        if (propertiesPanel) {
            console.log('🔄 Updating properties panel for:', obj.type, {
                width: obj.width,
                height: obj.height,
                scaleX: obj.scaleX,
                scaleY: obj.scaleY
            });
            
            // Force update even if the same object
            propertiesPanel.setSelectedObject(obj);
        }
    }
    
    triggerUpdatePreview() {
        // Trigger 3D preview update
        const preview3DPanel = window.panelManager?.getPanel('preview3d');
        if (preview3DPanel) {
            preview3DPanel.updateFromCanvas();
        }
    }
    
    updateLabelForLight(light) {
        // Find and update the label for this specific light
        const existingLabel = this.labels.find(label => label.lightRef === light);
        if (existingLabel) {
            const centerX = light.left + (light.width || light.radius || 10);
            const centerY = light.top - 25; // Position label above the light
            
            existingLabel.set({
                left: centerX - (existingLabel.width / 2),
                top: centerY
            });
            this.canvas.renderAll();
        }
    }
    
    updateControlsFromLight(light) {
        if (!light.entityId || !window.lightEntities) return;
        
        const entity = window.lightEntities[light.entityId];
        if (!entity) return;
        
        // Check if there's a scene color set for this light
        const sceneColor = window.sceneManager?.getLastColorForEntity(light.entityId);
        
        if (sceneColor) {
            // Preserve scene color - don't override with HA state
            console.log('🎨 Preserving scene color during light movement for', light.entityId, sceneColor);
            window.sceneManager.updateFloorplanLightColor(light.entityId, sceneColor.hue, sceneColor.saturation);
        } else {
            // No scene color set, update with HA state
            this.updateLightVisualState(light, entity);
        }
        
        // Switch to individual mode and create controls for selected light
        if (window.sceneManager) {
            // Switch to individual mode
            window.sceneManager.individualMode = true;
            const individualModeToggle = document.getElementById('individualMode');
            if (individualModeToggle) {
                individualModeToggle.checked = true;
                window.sceneManager.toggleControlMode();
            }
            
            // Create individual controls for this specific light
            this.createIndividualControlsForLight(light, entity);
        }
    }
    
    createIndividualControlsForLight(light, entity) {
        const container = document.getElementById('individualControlsList');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Generate a friendly display name
        const friendlyName = entity.friendly_name && entity.friendly_name !== light.entityId 
            ? entity.friendly_name 
            : light.entityId.replace(/^light\./, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const brightness = entity.attributes?.brightness || 255;
        const colorTemp = entity.attributes?.color_temp || 3000;
        const hue = entity.attributes?.hs_color ? entity.attributes.hs_color[0] : 60;
        const saturation = entity.attributes?.hs_color ? entity.attributes.hs_color[1] : 100;
        
        const controlDiv = document.createElement('div');
        controlDiv.className = 'individual-light-control selected-light-control';
        controlDiv.innerHTML = `
                            <h4>${friendlyName}</h4>
            <div class="entity-info">
                <small>Entity: ${light.entityId}</small>
            </div>
            <div class="control-group">
                <label>Brightness (%)</label>
                <input type="range" id="selectedLightBrightness" min="0" max="100" value="${Math.round((brightness / 255) * 100)}">
                <span id="selectedLightBrightnessValue">${Math.round((brightness / 255) * 100)}%</span>
            </div>
            <div class="control-group">
                <label>Color Temperature (K)</label>
                <input type="range" id="selectedLightColorTemp" min="2000" max="6500" value="${colorTemp}" step="100">
                <span id="selectedLightColorTempValue">${colorTemp}K</span>
            </div>
            <div class="control-group">
                <label>Hue (°)</label>
                <input type="range" id="selectedLightHue" min="0" max="360" value="${Math.round(hue)}">
                <span id="selectedLightHueValue">${Math.round(hue)}°</span>
            </div>
            <div class="control-group">
                <label>Saturation (%)</label>
                <input type="range" id="selectedLightSaturation" min="0" max="100" value="${Math.round(saturation)}">
                <span id="selectedLightSaturationValue">${Math.round(saturation)}%</span>
            </div>
            <div class="control-group">
                <label>Color Preview</label>
                <div class="color-preview" id="selectedLightColorPreview">
                    <div class="color-preview-box" id="selectedLightColorPreviewBox"></div>
                    <span id="selectedLightColorText">RGB</span>
                </div>
            </div>
        `;
        
        container.appendChild(controlDiv);
        
        // Setup event listeners for real-time updates
        this.setupSelectedLightControlListeners(light);
        
        // Update initial color preview
        this.updateSelectedLightColorPreview(light);
    }
    
    setupSelectedLightControlListeners(light) {
        const brightnessSlider = document.getElementById('selectedLightBrightness');
        const colorTempSlider = document.getElementById('selectedLightColorTemp');
        const hueSlider = document.getElementById('selectedLightHue');
        const saturationSlider = document.getElementById('selectedLightSaturation');
        
        if (brightnessSlider) {
            brightnessSlider.addEventListener('input', (e) => {
                document.getElementById('selectedLightBrightnessValue').textContent = e.target.value + '%';
                this.updateSelectedLightColorPreview(light);
                this.updateLightVisualStateFromSliders(light);
            });
        }
        
        if (colorTempSlider) {
            colorTempSlider.addEventListener('input', (e) => {
                document.getElementById('selectedLightColorTempValue').textContent = e.target.value + 'K';
                this.updateSelectedLightColorPreview(light);
                this.updateLightVisualStateFromSliders(light);
            });
        }
        
        if (hueSlider) {
            hueSlider.addEventListener('input', (e) => {
                document.getElementById('selectedLightHueValue').textContent = e.target.value + '°';
                this.updateSelectedLightColorPreview(light);
                this.updateLightVisualStateFromSliders(light);
            });
        }
        
        if (saturationSlider) {
            saturationSlider.addEventListener('input', (e) => {
                document.getElementById('selectedLightSaturationValue').textContent = e.target.value + '%';
                this.updateSelectedLightColorPreview(light);
                this.updateLightVisualStateFromSliders(light);
            });
        }
    }
    
    updateSelectedLightColorPreview(light) {
        const hue = parseInt(document.getElementById('selectedLightHue')?.value || 60);
        const saturation = parseInt(document.getElementById('selectedLightSaturation')?.value || 100);
        const brightness = parseInt(document.getElementById('selectedLightBrightness')?.value || 100);
        
        const rgb = this.hsvToRgb(hue, saturation, brightness);
        const rgbString = `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`;
        
        const previewBox = document.getElementById('selectedLightColorPreviewBox');
        const colorText = document.getElementById('selectedLightColorText');
        
        if (previewBox) {
            previewBox.style.backgroundColor = rgbString;
        }
        
        if (colorText) {
            colorText.textContent = rgbString;
        }
    }
    
    updateLightVisualStateFromSliders(light) {
        let brightness, hue, saturation;
        
        // Try to get values from selected light controls first
        if (this.selectedLight === light) {
            brightness = parseInt(document.getElementById('selectedLightBrightness')?.value || 100);
            hue = parseInt(document.getElementById('selectedLightHue')?.value || 60);
            saturation = parseInt(document.getElementById('selectedLightSaturation')?.value || 100);
        } else {
            // Fall back to global slider values for preview
            brightness = parseInt(document.getElementById('globalBrightness')?.value || 100);
            hue = parseInt(document.getElementById('globalHue')?.value || 60);
            saturation = parseInt(document.getElementById('globalSaturation')?.value || 100);
        }
        
        // Use HSV values for color representation
        const h = hue / 360;
        const s = saturation / 100;
        const v = brightness / 100;
        
        const rgb = this.hsvToRgb(h, s, v);
        const fillColor = `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`;
        
        // Update the light's visual appearance
        light.set('fill', fillColor);
        this.canvas.renderAll();
    }
    
    updateLightVisualState(light, entity) {
        if (!entity) return;
        
        let fillColor = '#ffa500'; // default orange
        
        if (this.showCurrentState) {
            // Show Home Assistant current state with glow effects
            const isOn = entity.state === 'on';
            const brightness = entity.attributes?.brightness || 255;
            const colorTemp = entity.attributes?.color_temp;
            const hsColor = entity.attributes?.hs_color;
            
            if (isOn) {
                if (hsColor && hsColor.length >= 2) {
                    // Convert HSV to RGB at full brightness for fill color
                    const h = hsColor[0] / 360;
                    const s = hsColor[1] / 100;
                    const rgb = this.hsvToRgb(h, s, 1); // Full brightness for fill color
                    fillColor = `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`;
                } else if (colorTemp) {
                    // Convert color temperature to RGB at full brightness for fill color  
                    const rgb = this.colorTempToRgb(colorTemp);
                    fillColor = `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`;
                } else {
                    // Default warm white at full brightness for fill color
                    fillColor = `rgb(255, 255, 200)`;
                }
                
                // Apply glow effect based on current brightness
                const brightnessPct = Math.round((brightness / 255) * 100); // Convert to percentage
                const glowIntensity = brightnessPct / 100; // 0.0 to 1.0
                const glowSize = Math.max(5, brightnessPct * 0.4); // Glow radius extension (5px to 40px)
                const glowOpacity = Math.max(0.1, 0.4 - (glowIntensity * 0.3)); // 0.4 at 0% brightness, 0.1 at 100% brightness
                
                // Remove any existing glow circle
                if (light.glowCircle) {
                    this.canvas.remove(light.glowCircle);
                    light.glowCircle = null;
                }
                
                // Create a separate larger circle behind the main light for glow effect
                const glowCircle = new fabric.Circle({
                    left: light.left + light.radius - (light.radius + glowSize),
                    top: light.top + light.radius - (light.radius + glowSize),
                    radius: light.radius + glowSize,
                    fill: fillColor,
                    opacity: glowOpacity,
                    selectable: false,
                    evented: false,
                    excludeFromExport: true,
                    glowCircle: true,
                    brightnessEffect: true,
                    parentLightId: light.entityId || light.id || `light_${Date.now()}`,
                    name: `Glow Effect - ${light.entityId || 'Light'}`
                });
                
                // Add glow circle behind the main light
                this.canvas.add(glowCircle);
                this.canvas.sendObjectToBack(glowCircle);
                this.canvas.bringObjectToFront(light);
                
                // Store reference to glow circle for cleanup
                light.glowCircle = glowCircle;
                
                // Add outline to main light and set fill
                light.set({
                    fill: fillColor,
                    stroke: window.sceneManager?.getContrastingColor(fillColor) || '#000000',
                    strokeWidth: 2,
                    shadow: null
                });
                
                console.log('🌟 Applied current state glow effect - Brightness:', brightnessPct + '%', 'Glow Size:', glowSize, 'Opacity:', glowOpacity);
            } else {
                // Light is off - remove glow and use dim appearance
                if (light.glowCircle) {
                    this.canvas.remove(light.glowCircle);
                    light.glowCircle = null;
                }
                
                fillColor = this.isDarkTheme ? '#333333' : '#cccccc';
                light.set({
                    fill: fillColor,
                    stroke: null,
                    strokeWidth: 0,
                    shadow: null
                });
                
                console.log('🌙 Light is off - removed glow effect');
            }
        } else {
            // Show scene preview from sliders
            this.updateLightVisualStateFromSliders(light);
            return; // updateLightVisualStateFromSliders handles rendering
        }
        
        this.canvas.renderAll();
    }
    
    highlightSelectedLight(light) {
        console.log('🎯 highlightSelectedLight called for light:', {
            type: light.type,
            entityId: light.entityId,
            position: { x: light.left, y: light.top },
            radius: light.radius,
            bounds: light.getBoundingRect()
        });
        
        // Remove any existing selection ring first
        this.removeHighlightFromLight(light);
        
        // Create a highly visible selection ring around the light
        const bounds = light.getBoundingRect();
        const centerX = bounds.left + bounds.width / 2;
        const centerY = bounds.top + bounds.height / 2;
        const radius = Math.max(bounds.width, bounds.height) / 2 + 8; // Add 8px padding
        
        console.log('💍 Creating selection ring:', {
            centerX, centerY, radius,
            bounds: bounds
        });
        
        // Create bright selection ring
        const selectionRing = new fabric.Circle({
            left: centerX,
            top: centerY,
            radius: radius,
            fill: 'transparent',
            stroke: '#00ff00', // Bright green
            strokeWidth: 4,
            strokeDashArray: [8, 4], // Dashed line for extra visibility
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
            excludeFromExport: true,
            selectionRing: true,
            lightId: light.lightObject ? (light.entityId || 'unassigned') : null
        });
        
        console.log('💍 Selection ring created:', selectionRing);
        
        // Add pulsing animation
        console.log('💍 Starting pulsing animation');
        const animate = () => {
            if (selectionRing && this.canvas.getObjects().includes(selectionRing)) {
                selectionRing.animate('strokeWidth', selectionRing.strokeWidth === 4 ? 6 : 4, {
                    duration: 800,
                    onChange: this.canvas.renderAll.bind(this.canvas),
                    onComplete: animate
                });
            }
        };
        animate();
        
        this.canvas.add(selectionRing);
        this.canvas.bringObjectToFront(selectionRing);
        this.canvas.renderAll();
        
        // Store reference for easy removal
        light._selectionRing = selectionRing;
        
        console.log('🎯 Light selected with visible highlight:', light.entityId || 'unassigned');
        console.log('💍 Canvas objects after adding ring:', this.canvas.getObjects().length);
        console.log('💍 Selection rings in canvas:', this.canvas.getObjects().filter(obj => obj.selectionRing).length);
    }
    
    removeHighlightFromLight(light) {
        if (light._selectionRing) {
            this.canvas.remove(light._selectionRing);
            light._selectionRing = null;
            this.canvas.renderAll();
        }
        
        // Also remove any orphaned selection rings for this light
        const lightId = light.entityId || 'unassigned';
        const objectsToRemove = [];
        this.canvas.forEachObject(obj => {
            if (obj.selectionRing && obj.lightId === lightId) {
                objectsToRemove.push(obj);
            }
        });
        objectsToRemove.forEach(obj => this.canvas.remove(obj));
        
        if (objectsToRemove.length > 0) {
            this.canvas.renderAll();
        }
    }
    
    updateSelectionRingPosition(light) {
        console.log('🔄 Updating selection ring position for light:', light.entityId);
        
        if (!light._selectionRing) {
            console.log('❌ No selection ring found on light object');
            return;
        }
        
        const bounds = light.getBoundingRect();
        const centerX = bounds.left + bounds.width / 2;
        const centerY = bounds.top + bounds.height / 2;
        
        console.log('🎯 New ring position:', { centerX, centerY });
        
        light._selectionRing.set({
            left: centerX,
            top: centerY
        });
        
        this.canvas.renderAll();
    }
    
    updateGlowCirclePosition(light) {
        if (!light.glowCircle) return;
        
        console.log('🌟 Updating glow circle position for light:', light.entityId);
        
        // The glow circle needs to be positioned based on the light's position and radius
        const glowRadius = light.glowCircle.radius;
        const lightRadius = light.radius || 10; // Default radius if not set
        
        // Calculate the correct position for the glow circle
        // The glow circle is larger than the light, so we need to offset it
        light.glowCircle.set({
            left: light.left + lightRadius - glowRadius,
            top: light.top + lightRadius - glowRadius
        });
        
        // Make sure glow stays behind the light
        this.canvas.sendObjectToBack(light.glowCircle);
        this.canvas.bringObjectToFront(light);
        
        this.canvas.renderAll();
    }
    
    // HSV to RGB conversion
    hsvToRgb(h, s, v) {
        let r, g, b;
        
        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);
        
        switch (i % 6) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            case 5: r = v; g = p; b = q; break;
        }
        
        return {
            r: r * 255,
            g: g * 255,
            b: b * 255
        };
    }
    
    rgbToHsv(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        
        let h = 0;
        const s = max === 0 ? 0 : delta / max;
        const v = max;
        
        if (delta !== 0) {
            if (max === r) {
                h = ((g - b) / delta) % 6;
            } else if (max === g) {
                h = (b - r) / delta + 2;
            } else {
                h = (r - g) / delta + 4;
            }
            h /= 6;
            if (h < 0) h += 1;
        }
        
        return { h, s, v };
    }
    
    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }
    
    // Color temperature to RGB approximation
    colorTempToRgb(colorTemp) {
        // Simplified color temperature to RGB conversion
        const temp = colorTemp / 100;
        let r, g, b;
        
        if (temp <= 66) {
            r = 255;
            g = temp;
            g = 99.4708025861 * Math.log(g) - 161.1195681661;
            
            if (temp >= 19) {
                b = temp - 10;
                b = 138.5177312231 * Math.log(b) - 305.0447927307;
            } else {
                b = 0;
            }
        } else {
            r = temp - 60;
            r = 329.698727446 * Math.pow(r, -0.1332047592);
            
            g = temp - 60;
            g = 288.1221695283 * Math.pow(g, -0.0755148492);
            
            b = 255;
        }
        
        return {
            r: Math.max(0, Math.min(255, r)),
            g: Math.max(0, Math.min(255, g)),
            b: Math.max(0, Math.min(255, b))
        };
    }
    
    // Clean up glow effects for all lights
    cleanupAllGlowEffects() {
        this.lights.forEach(light => {
            if (light.glowCircle) {
                this.canvas.remove(light.glowCircle);
                light.glowCircle = null;
            }
        });
    }
    
    // Refresh all light visual states
    async refreshAllLightStates() {
        // Clean up existing glow effects before applying new ones
        this.cleanupAllGlowEffects();
        
        if (this.showCurrentState) {
            // Fetch fresh current state data from Home Assistant
            await this.fetchCurrentLightStates();
        }
        
        this.lights.forEach(light => {
            if (light.entityId && window.lightEntities[light.entityId]) {
                this.updateLightVisualState(light, window.lightEntities[light.entityId]);
            }
        });
        this.canvas.renderAll();
    }
    
    // Fetch fresh current state data from Home Assistant
    async fetchCurrentLightStates() {
        try {
            console.log('🔄 Fetching fresh light states from Home Assistant...');
            const response = await fetch(`${API_BASE}/api/lights`);
            if (!response.ok) {
                throw new Error(`Lights request failed: ${response.status} ${response.statusText}`);
            }
            const freshLights = await response.json();
            
            // Update window.lightEntities with fresh current state data
            freshLights.forEach(light => {
                if (window.lightEntities[light.entityId]) {
                    // Update the existing entity with fresh state data - map to expected structure
                    window.lightEntities[light.entityId] = {
                        ...window.lightEntities[light.entityId],
                        state: light.state,
                        attributes: {
                            ...window.lightEntities[light.entityId].attributes,
                            brightness: light.brightness,
                            color_temp_kelvin: light.colorTemp,
                            hs_color: light.hsColor
                        }
                    };
                    
                    console.log('🔄 Updated entity:', light.entityId, {
                        state: light.state,
                        brightness: light.brightness,
                        colorTemp: light.colorTemp,
                        hsColor: light.hsColor
                    });
                }
            });
            console.log('✅ Updated light states with fresh data from Home Assistant');
        } catch (error) {
            console.error('❌ Error fetching fresh light states:', error);
        }
    }
    
    updateSelectedObjectIndicator(obj) {
        const indicator = document.getElementById('selectedLightIndicator');
        const objectName = document.getElementById('selectedLightName');
        
        if (indicator && objectName) {
            // Show the indicator
            indicator.style.display = 'flex';
            
            // Generate object info based on type
            let displayText = '';
            
            if (obj.lightObject) {
                // Light object
                if (obj.entityId) {
                    // Get friendly name from Home Assistant entity
                    const entity = window.lightEntities ? window.lightEntities[obj.entityId] : null;
                    let displayName = obj.entityId;
                    
                    if (entity) {
                        // Try multiple ways to get the friendly name
                        displayName = entity.attributes?.friendly_name || 
                                     entity.friendly_name || 
                                     entity.attributes?.friendlyName ||
                                     obj.entityId;
                    }
                    
                    displayText = displayName;
                } else {
                    displayText = 'Unassigned Light';
                }
            } else if (obj.type === 'line') {
                // Line object
                const length = Math.sqrt(
                    Math.pow(obj.x2 - obj.x1, 2) + 
                    Math.pow(obj.y2 - obj.y1, 2)
                );
                const displayLength = this.formatDistance(length);
                displayText = `Line: ${displayLength}`;
            } else if (obj.roomObject) {
                // Room object
                const roomName = obj.roomName || 'Room';
                let dimensions = '';
                
                if (obj.type === 'rect' || obj.type === 'Rect') {
                    // Convert pixels to feet for display
                    const pixelsPerFoot = this.pixelsPerFoot || 48;
                    const widthFt = ((obj.width || 0) / pixelsPerFoot).toFixed(1);
                    const heightFt = ((obj.height || 0) / pixelsPerFoot).toFixed(1);
                    const wallHeight = obj.wallHeight || 10;
                    
                    if (this.useMetric) {
                        const widthM = (widthFt * 0.3048).toFixed(1);
                        const heightM = (heightFt * 0.3048).toFixed(1);
                        const wallHeightM = (wallHeight * 0.3048).toFixed(1);
                        dimensions = `${widthM}m × ${heightM}m × ${wallHeightM}m`;
                    } else {
                        dimensions = `${widthFt}ft × ${heightFt}ft × ${wallHeight}ft`;
                    }
                } else if (obj.points && obj.points.length > 0) {
                    // Calculate polygon area in proper units
                    const areaInPixels = this.calculatePolygonArea(obj.points);
                    const pixelsPerFoot = this.pixelsPerFoot || 48;
                    const areaInFeet = areaInPixels / (pixelsPerFoot * pixelsPerFoot);
                    
                    if (this.useMetric) {
                        const areaInMeters = areaInFeet * 0.092903; // 1 sq ft = 0.092903 sq m
                        dimensions = `~${areaInMeters.toFixed(1)}m²`;
                    } else {
                        dimensions = `~${areaInFeet.toFixed(1)}ft²`;
                    }
                }
                
                displayText = `${roomName}: ${dimensions}`;
            } else if (obj.type === 'text') {
                // Text object
                const text = obj.text || '';
                const truncated = text.length > 20 ? text.substring(0, 20) + '...' : text;
                displayText = `Text: "${truncated}"`;
            } else if (obj.type === 'rect') {
                // Rectangle object
                const width = Math.round(obj.width || 0);
                const height = Math.round(obj.height || 0);
                displayText = `Rectangle: ${width}px × ${height}px`;
            } else if (obj.type === 'circle') {
                // Circle object
                const radius = Math.round(obj.radius || 0);
                displayText = `Circle: ${radius}px radius`;
            } else if (obj.type === 'polygon') {
                // Polygon object
                const pointCount = obj.points ? obj.points.length : 0;
                displayText = `Polygon: ${pointCount} points`;
            } else {
                // Generic object
                displayText = `${obj.type || 'Object'}`;
            }
            
            objectName.textContent = displayText;
        }
    }
    
    calculatePolygonArea(points) {
        if (!points || points.length < 3) return 0;
        
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        return Math.abs(area) / 2;
    }
    
    hideSelectedLightIndicator() {
        const indicator = document.getElementById('selectedLightIndicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    showLoadingState() {
        console.log('📋 Showing loading state on canvas...');
        
        // Clear the canvas immediately
        this.canvas.clear();
        this.lights = [];
        this.texts = [];
        this.labels = [];
        this.roomOutline = null;
        this.backgroundImage = null;
        
        // Set canvas background
        this.canvas.backgroundColor = this.isDarkTheme ? '#1a1a1a' : '#f5f5f5';
        
        // Create loading message
        const loadingText = new fabric.Text('Loading floorplan...', {
            left: this.canvas.width / 2,
            top: this.canvas.height / 2,
            fontSize: 32,
            fill: this.isDarkTheme ? '#ffffff' : '#333333',
            fontFamily: 'Arial, sans-serif',
            textAlign: 'center',
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
            isLoadingMessage: true
        });
        
        // Create spinning indicator
        const spinner = new fabric.Text('⟳', {
            left: this.canvas.width / 2,
            top: this.canvas.height / 2 + 60,
            fontSize: 24,
            fill: this.isDarkTheme ? '#ffffff' : '#333333',
            fontFamily: 'Arial, sans-serif',
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
            isLoadingSpinner: true
        });
        
        this.canvas.add(loadingText);
        this.canvas.add(spinner);
        this.canvas.renderAll();
        
        // Start spinner animation
        this.startSpinnerAnimation(spinner);
    }

    hideLoadingState() {
        console.log('📋 Hiding loading state from canvas...');
        
        // Remove loading message and spinner
        const loadingObjects = this.canvas.getObjects().filter(obj => 
            obj.isLoadingMessage || obj.isLoadingSpinner
        );
        
        loadingObjects.forEach(obj => this.canvas.remove(obj));
        
        // Stop any running spinner animation
        this.stopSpinnerAnimation();
        
        this.canvas.renderAll();
    }

    startSpinnerAnimation(spinner) {
        if (this.spinnerAnimationId) {
            this.stopSpinnerAnimation();
        }
        
        let rotation = 0;
        const animate = () => {
            if (spinner && this.canvas.contains(spinner)) {
                rotation += 30; // 30 degrees per frame
                spinner.set('angle', rotation);
                this.canvas.renderAll();
                this.spinnerAnimationId = requestAnimationFrame(animate);
            }
        };
        
        this.spinnerAnimationId = requestAnimationFrame(animate);
    }

    stopSpinnerAnimation() {
        if (this.spinnerAnimationId) {
            cancelAnimationFrame(this.spinnerAnimationId);
            this.spinnerAnimationId = null;
        }
    }
    
    // Import functionality methods
    importSVGBackground() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.svg,image/svg+xml';
        
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                const svgContent = event.target.result;
                this.addSVGBackground(svgContent);
            };
            reader.readAsText(file);
        });
        
        input.click();
    }
    
    addSVGBackground(svgContent) {
        // Parse the SVG content to create a DOM element
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
        const svgElement = svgDoc.documentElement;
        
        // Check for parsing errors
        if (svgElement.nodeName === 'parsererror') {
            console.error('❌ Invalid SVG content');
            window.sceneManager?.showStatus('Invalid SVG file', 'error');
            return;
        }
        
        // Use Fabric.js v6 parseSVGDocument with the SVG element
        fabric.parseSVGDocument(svgElement, (results, options, elements, allElements) => {
            // Handle empty or invalid SVG
            if (!results || results.length === 0) {
                console.warn('⚠️ No valid elements found in SVG');
                window.sceneManager?.showStatus('No valid shapes found in SVG', 'warning');
                return;
            }
            
            console.log('🎨 Parsed SVG results:', results);
            
            // Create a group from the SVG elements
            let svgGroup;
            if (results.length === 1) {
                svgGroup = results[0];
            } else {
                svgGroup = new fabric.Group(results);
            }
            
            // Scale to fit canvas
            const canvasWidth = this.canvas.getWidth();
            const canvasHeight = this.canvas.getHeight();
            const boundingRect = svgGroup.getBoundingRect();
            const scale = Math.min(
                canvasWidth / boundingRect.width,
                canvasHeight / boundingRect.height
            ) * 0.8;
            
            svgGroup.set({
                left: canvasWidth / 2,
                top: canvasHeight / 2,
                originX: 'center',
                originY: 'center',
                scaleX: scale,
                scaleY: scale,
                selectable: false,
                evented: false,
                opacity: 0.3,
                isBackground: true,
                excludeFromExport: false
            });
            
            // Add to background layer
            this.canvas.add(svgGroup);
            this.canvas.sendToBack(svgGroup);
            
            console.log('✅ SVG background added:', svgGroup);
            window.sceneManager?.showStatus('SVG background imported', 'success');
            this.triggerAutoSave();
        });
    }
    
    importSVGAsRooms() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.svg,image/svg+xml';
        
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                const svgContent = event.target.result;
                this.convertSVGToRooms(svgContent);
            };
            reader.readAsText(file);
        });
        
        input.click();
    }
    
    convertSVGToRooms(svgContent) {
        // For SVG to rooms, we need to use a different approach that avoids the parsing errors
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
        const svgElement = svgDoc.documentElement;
        
        // Check for parsing errors
        if (svgElement.nodeName === 'parsererror') {
            console.error('❌ Invalid SVG content');
            window.sceneManager?.showStatus('Invalid SVG file', 'error');
            return;
        }
        
        let roomCount = 0;
        
        // Process SVG elements directly without using fabric.parseSVGDocument
        const paths = svgElement.querySelectorAll('path');
        const rects = svgElement.querySelectorAll('rect');
        const polygons = svgElement.querySelectorAll('polygon');
        
        // Process rectangles
        rects.forEach(rect => {
            const x = parseFloat(rect.getAttribute('x') || 0);
            const y = parseFloat(rect.getAttribute('y') || 0);
            const width = parseFloat(rect.getAttribute('width') || 0);
            const height = parseFloat(rect.getAttribute('height') || 0);
            
            if (width > 0 && height > 0) {
                const points = [
                    { x: x, y: y },
                    { x: x + width, y: y },
                    { x: x + width, y: y + height },
                    { x: x, y: y + height }
                ];
                
                const room = new fabric.Polygon(points, {
                    fill: 'rgba(200, 200, 200, 0.3)',
                    stroke: 'black',
                    strokeWidth: 2,
                    selectable: true,
                    roomObject: true,
                    roomName: `Room ${this.roomCounter++}`,
                    wallHeight: 10
                });
                
                this.canvas.add(room);
                roomCount++;
            }
        });
        
        // Process polygons
        polygons.forEach(polygon => {
            const pointsAttr = polygon.getAttribute('points');
            if (pointsAttr) {
                const coords = pointsAttr.trim().split(/\s+/);
                const points = [];
                
                for (let i = 0; i < coords.length; i += 2) {
                    if (i + 1 < coords.length) {
                        points.push({
                            x: parseFloat(coords[i]),
                            y: parseFloat(coords[i + 1])
                        });
                    }
                }
                
                if (points.length >= 3) {
                    const room = new fabric.Polygon(points, {
                        fill: 'rgba(200, 200, 200, 0.3)',
                        stroke: 'black',
                        strokeWidth: 2,
                        selectable: true,
                        roomObject: true,
                        roomName: `Room ${this.roomCounter++}`,
                        wallHeight: 10
                    });
                    
                    this.canvas.add(room);
                    roomCount++;
                }
            }
        });
        
        // Process paths (simplified)
        paths.forEach(path => {
            const d = path.getAttribute('d');
            if (d) {
                const points = this.pathToPoints(d);
                if (points.length >= 3) {
                    const room = new fabric.Polygon(points, {
                        fill: 'rgba(200, 200, 200, 0.3)',
                        stroke: 'black',
                        strokeWidth: 2,
                        selectable: true,
                        roomObject: true,
                        roomName: `Room ${this.roomCounter++}`,
                        wallHeight: 10
                    });
                    
                    this.canvas.add(room);
                    roomCount++;
                }
            }
        });
        
        if (roomCount > 0) {
            window.sceneManager?.showStatus(`Imported ${roomCount} rooms from SVG`, 'success');
            this.triggerAutoSave();
        } else {
            window.sceneManager?.showStatus('No convertible shapes found in SVG', 'warning');
        }
    }
    
    pathToPoints(pathData) {
        // Simplified path to points conversion
        // This is a basic implementation - could be enhanced
        const points = [];
        const commands = pathData.match(/[MLHVCSQTAZmlhvcsqtaz][^MLHVCSQTAZmlhvcsqtaz]*/g);
        let currentX = 0, currentY = 0;
        
        commands?.forEach(cmd => {
            const type = cmd[0];
            const coords = cmd.slice(1).trim().split(/[\s,]+/).map(parseFloat);
            
            switch(type.toUpperCase()) {
                case 'M':
                    currentX = coords[0];
                    currentY = coords[1];
                    points.push({ x: currentX, y: currentY });
                    break;
                case 'L':
                    currentX = coords[0];
                    currentY = coords[1];
                    points.push({ x: currentX, y: currentY });
                    break;
                case 'H':
                    currentX = coords[0];
                    points.push({ x: currentX, y: currentY });
                    break;
                case 'V':
                    currentY = coords[0];
                    points.push({ x: currentX, y: currentY });
                    break;
                case 'Z':
                    // Close path - no new point needed
                    break;
            }
        });
        
        return points;
    }
    
    importOBJ3DModel() {
        window.sceneManager?.showStatus('OBJ import requires 3D preview panel to be open', 'info');
        
        // Check if 3D preview panel is available
        const preview3DPanel = window.panelManager?.getPanel('preview3d');
        if (!preview3DPanel) {
            window.sceneManager?.showStatus('Please open 3D Preview panel first', 'warning');
            return;
        }
        
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.obj';
        
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                const objContent = event.target.result;
                preview3DPanel.importOBJModel(objContent, file.name);
            };
            reader.readAsText(file);
        });
        
        input.click();
    }
}

// Setup tertiary panel collapse functionality
function setupTertiaryPanelCollapse() {
    const tertiaryDock = document.getElementById('dockTertiary');
    const collapseToggle = document.getElementById('tertiaryCollapseToggle');
    
    if (!tertiaryDock || !collapseToggle) return;
    
    // Function to toggle the panel
    const togglePanel = () => {
        const isCollapsed = tertiaryDock.classList.contains('collapsed');
        
        if (isCollapsed) {
            // Expand
            tertiaryDock.classList.remove('collapsed');
            localStorage.setItem('tertiaryPanelCollapsed', 'false');
        } else {
            // Collapse
            tertiaryDock.classList.add('collapsed');
            localStorage.setItem('tertiaryPanelCollapsed', 'true');
        }
        
        // Trigger canvas resize after layout change
        setTimeout(() => {
            if (window.floorplanEditor && window.floorplanEditor.resizeCanvas) {
                window.floorplanEditor.resizeCanvas();
            }
        }, 300);
    };
    
    // Toggle button handler - works for both collapse and expand
    collapseToggle.addEventListener('click', togglePanel);
    
    // Make entire collapsed dock clickable
    tertiaryDock.addEventListener('click', (e) => {
        // Only handle clicks when collapsed and not on the button itself
        if (tertiaryDock.classList.contains('collapsed') && !e.target.closest('.tertiary-collapse-btn')) {
            togglePanel();
        }
    });
    
    // Restore collapse state from localStorage
    const wasCollapsed = localStorage.getItem('tertiaryPanelCollapsed') === 'true';
    if (wasCollapsed) {
        tertiaryDock.classList.add('collapsed');
        // Trigger canvas resize after restoring collapsed state
        // Try multiple times to ensure the editor is ready
        const tryResize = () => {
            if (window.floorplanEditor && window.floorplanEditor.resizeCanvas) {
                window.floorplanEditor.resizeCanvas();
                console.log('✅ Canvas resized after restoring collapsed state');
            } else {
                // If editor not ready, try again
                setTimeout(tryResize, 200);
            }
        };
        // Initial attempt after a short delay
        setTimeout(tryResize, 100);
    }
}

// Setup panel resize functionality
function setupPanelResize() {
    const panels = [
        { divider: 'leftDivider', panel: 'dockLeft', side: 'left', storageKey: 'leftPanelWidth' },
        { divider: 'tertiaryDivider', panel: 'dockTertiary', side: 'right', storageKey: 'tertiaryPanelWidth' },
        { divider: 'rightDivider', panel: 'dockRight', side: 'right', storageKey: 'rightPanelWidth' }
    ];
    
    // Global flag to prevent canvas updates during resize
    let isAnyPanelResizing = false;
    
    panels.forEach(({ divider, panel, side, storageKey }) => {
        const dividerEl = document.getElementById(divider);
        const panelEl = document.getElementById(panel);
        
        if (!dividerEl || !panelEl) return;
        
        // Restore saved width
        const savedWidth = localStorage.getItem(storageKey);
        if (savedWidth && !panelEl.classList.contains('collapsed')) {
            panelEl.style.width = savedWidth + 'px';
        }
        
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;
        
        dividerEl.addEventListener('mousedown', (e) => {
            // Don't resize if tertiary panel is collapsed
            if (panel === 'dockTertiary' && panelEl.classList.contains('collapsed')) {
                return;
            }
            
            isResizing = true;
            isAnyPanelResizing = true;
            startX = e.clientX;
            startWidth = panelEl.offsetWidth;
            dividerEl.classList.add('dragging');
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
            document.body.classList.add('resizing'); // Disable CSS transitions
            
            // Set flag on floorplan editor to prevent grid updates
            if (window.floorplanEditor) {
                window.floorplanEditor.isResizing = true;
                console.log('🚫 Panel resize started - grid updates disabled');
            }
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const diff = e.clientX - startX;
            let newWidth;
            
            if (side === 'left') {
                // Left panel grows when dragging right
                newWidth = startWidth + diff;
            } else {
                // Right panels grow when dragging left
                newWidth = startWidth - diff;
            }
            
            // Get constraints from CSS
            const styles = getComputedStyle(document.documentElement);
            const minWidth = parseInt(styles.getPropertyValue('--cad-panel-min-width')) || 240;
            const maxWidth = parseInt(styles.getPropertyValue('--cad-panel-max-width')) || 500;
            
            // Clamp to min/max
            newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
            
            panelEl.style.width = newWidth + 'px';
            
            // Save to localStorage
            localStorage.setItem(storageKey, newWidth);
            
            // Don't trigger canvas resize during drag - wait until mouseup
        });
        
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                isAnyPanelResizing = false;
                dividerEl.classList.remove('dragging');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                document.body.classList.remove('resizing'); // Re-enable CSS transitions
                
                // Clear resize flag and trigger single canvas resize
                if (window.floorplanEditor) {
                    window.floorplanEditor.isResizing = false;
                    console.log('✅ Panel resize complete - triggering canvas update');
                    if (window.floorplanEditor.resizeCanvas) {
                        window.floorplanEditor.resizeCanvas();
                    }
                }
            }
        });
    });
}

// Initialize tertiary panel and resize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setupTertiaryPanelCollapse();
        setupPanelResize();
    });
} else {
    setupTertiaryPanelCollapse();
    setupPanelResize();
}

console.log('✅ LightMapper CAD Interface modules loaded successfully'); 