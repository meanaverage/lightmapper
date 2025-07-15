import { BasePanel } from './BasePanel.js';

export class EntitiesPanel extends BasePanel {
    constructor() {
        super('entities', 'Entities', 'fa-th-list');
        this.entities = [];
        this.filteredEntities = [];
        this.currentFilter = '';
        this.selectedEntity = null;
    }

    render() {
        this.container.innerHTML = `
            <div class="entities-panel-wrapper">
                <div class="panel-header">
                    <h3>${this.title}</h3>
                    <button id="refreshEntities" class="btn btn-icon-only" title="Refresh Entities">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
                <div class="entities-controls">
                    <div class="search-box">
                        <i class="fas fa-search"></i>
                        <input type="text" id="entitySearch" placeholder="Search entities..." class="entity-search">
                    </div>
                    <div class="entity-filters">
                        <label>
                            <input type="checkbox" id="showLightsOnly" checked>
                            <span>Lights Only</span>
                        </label>
                        <label>
                            <input type="checkbox" id="showAssignedOnly">
                            <span>Assigned Only</span>
                        </label>
                    </div>
                </div>
                <div id="entityStats" class="entity-stats"></div>
                <div id="entitiesList" class="entities-list"></div>
            </div>
        `;
        
        this.bindEvents();
        this.loadEntities();
    }

    bindEvents() {
        // Refresh button
        const refreshBtn = document.getElementById('refreshEntities');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadEntities();
            });
        }

        // Search input
        const searchInput = document.getElementById('entitySearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentFilter = e.target.value.toLowerCase();
                this.applyFilters();
            });
        }

        // Filter checkboxes
        const lightsOnlyCheck = document.getElementById('showLightsOnly');
        const assignedOnlyCheck = document.getElementById('showAssignedOnly');
        
        if (lightsOnlyCheck) {
            lightsOnlyCheck.addEventListener('change', () => this.applyFilters());
        }
        
        if (assignedOnlyCheck) {
            assignedOnlyCheck.addEventListener('change', () => this.applyFilters());
        }
    }

    async loadEntities() {
        try {
            // Try enhanced endpoint first for better icon support
            let response;
            let useEnhanced = false;
            
            try {
                response = await this.fetchData(`${window.API_BASE}/api/lights/enhanced`);
                useEnhanced = true;
                console.log('✅ Using enhanced lights endpoint with full metadata');
            } catch (error) {
                console.log('⚠️ Enhanced endpoint not available, using standard endpoint');
                response = await this.fetchData(`${window.API_BASE}/api/lights`);
            }
            
            // Map the response to match expected format
            this.entities = response.map(light => ({
                entity_id: light.entityId,
                state: light.state,
                attributes: {
                    friendly_name: light.friendlyName,
                    brightness: light.brightness,
                    color_temp_kelvin: light.colorTemp,
                    hs_color: light.hsColor,
                    rgb_color: light.hsColor ? this.hsToRgb(light.hsColor[0], light.hsColor[1]) : null,
                    supported_features: this.inferSupportedFeatures(light),
                    icon: useEnhanced ? light.attributes?.icon : null // Get icon from enhanced endpoint
                },
                area: light.area,
                device: useEnhanced ? light.device : null,
                platform: useEnhanced ? light.platform : null
            }));
            
            // Also get device registry info if available
            await this.enrichEntitiesWithDeviceInfo();
            
            this.applyFilters();
            this.updateStats();
            
        } catch (error) {
            console.error('Error loading entities:', error);
            this.showError('Failed to load entities');
        }
    }

    async enrichEntitiesWithDeviceInfo() {
        // This would fetch additional device registry information
        // For now, we'll just mark which entities are assigned
        const assignedEntityIds = this.getAssignedEntityIds();
        
        this.entities.forEach(entity => {
            entity.isAssigned = assignedEntityIds.has(entity.entity_id);
        });
    }

    getAssignedEntityIds() {
        const assignedIds = new Set();
        const canvasPanel = window.panelManager?.getPanel('canvas');
        
        if (canvasPanel) {
            const entities = canvasPanel.getAssignedEntities();
            entities.forEach(entity => {
                assignedIds.add(entity.entity_id);
            });
        }
        
        return assignedIds;
    }

    applyFilters() {
        const showLightsOnly = document.getElementById('showLightsOnly')?.checked;
        const showAssignedOnly = document.getElementById('showAssignedOnly')?.checked;
        
        this.filteredEntities = this.entities.filter(entity => {
            // Type filter
            if (showLightsOnly && entity.entity_id && !entity.entity_id.startsWith('light.')) {
                return false;
            }
            
            // Assignment filter
            if (showAssignedOnly && !entity.isAssigned) {
                return false;
            }
            
            // Search filter
            if (this.currentFilter) {
                const searchStr = this.currentFilter;
                const entityStr = ((entity.entity_id || '') + ' ' + (entity.attributes?.friendly_name || '')).toLowerCase();
                if (!entityStr.includes(searchStr)) {
                    return false;
                }
            }
            
            return true;
        });
        
        this.renderEntities();
        this.updateStats();
    }

    renderEntities() {
        const container = document.getElementById('entitiesList');
        if (!container) return;
        
        if (this.filteredEntities.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">No entities found matching filters</p>';
            return;
        }
        
        container.innerHTML = this.filteredEntities.map(entity => this.createEntityCard(entity)).join('');
        
        // Add click handlers
        container.querySelectorAll('.entity-card').forEach(card => {
            card.addEventListener('click', () => {
                const entityId = card.dataset.entityId;
                this.selectEntity(entityId);
            });
        });
    }

    createEntityCard(entity) {
        const friendlyName = entity.attributes?.friendly_name || entity.entity_id;
        const isOn = entity.state === 'on';
        const domain = entity.entity_id.split('.')[0];
        
        return `
            <div class="entity-card ${entity.isAssigned ? 'assigned' : ''} ${this.selectedEntity === entity.entity_id ? 'selected' : ''}" 
                 data-entity-id="${entity.entity_id}"
                 draggable="true"
                 ondragstart="window.panelManager.getPanel('entities').handleDragStart(event, '${entity.entity_id}')">
                <div class="entity-header">
                    <div class="entity-icon">
                        ${this.renderEntityIcon(entity)}
                    </div>
                    <div class="entity-info">
                        <div class="entity-name">${friendlyName}</div>
                        <div class="entity-id">${entity.entity_id}</div>
                    </div>
                    <div class="entity-state">
                        <span class="state-indicator ${isOn ? 'on' : 'off'}"></span>
                        ${entity.isAssigned ? '<i class="fas fa-link assigned-indicator" title="Assigned to floorplan"></i>' : ''}
                    </div>
                </div>
                <div class="entity-attributes">
                    ${this.renderEntityAttributes(entity)}
                </div>
                <div class="entity-actions">
                    ${!entity.isAssigned ? `
                        <button class="btn btn-small btn-primary" onclick="window.panelManager.getPanel('entities').assignToSelected('${entity.entity_id}')">
                            <i class="fas fa-plus"></i> Assign to Selected
                        </button>
                    ` : `
                        <button class="btn btn-small btn-secondary" onclick="window.panelManager.getPanel('entities').findInFloorplan('${entity.entity_id}')">
                            <i class="fas fa-search"></i> Find in Floorplan
                        </button>
                    `}
                </div>
            </div>
        `;
    }

    renderEntityAttributes(entity) {
        const attrs = [];
        
        if (entity.attributes?.brightness !== undefined) {
            const brightness = Math.round((entity.attributes.brightness / 255) * 100);
            attrs.push(`<span class="attr-chip"><i class="fas fa-sun"></i> ${brightness}%</span>`);
        }
        
        if (entity.attributes?.color_temp_kelvin) {
            attrs.push(`<span class="attr-chip"><i class="fas fa-thermometer-half"></i> ${entity.attributes.color_temp_kelvin}K</span>`);
        }
        
        if (entity.attributes?.rgb_color) {
            const [r, g, b] = entity.attributes.rgb_color;
            attrs.push(`<span class="attr-chip"><i class="fas fa-palette"></i> RGB(${r},${g},${b})</span>`);
        }
        
        if (entity.attributes?.supported_features) {
            const features = this.decodeSupportedFeatures(entity.attributes.supported_features);
            if (features.length > 0) {
                attrs.push(`<span class="attr-chip features"><i class="fas fa-cog"></i> ${features.join(', ')}</span>`);
            }
        }
        
        return attrs.join('');
    }

    decodeSupportedFeatures(features) {
        const SUPPORT_BRIGHTNESS = 1;
        const SUPPORT_COLOR_TEMP = 2;
        const SUPPORT_EFFECT = 4;
        const SUPPORT_COLOR = 16;
        const SUPPORT_WHITE_VALUE = 128;
        
        const supported = [];
        if (features & SUPPORT_BRIGHTNESS) supported.push('Brightness');
        if (features & SUPPORT_COLOR_TEMP) supported.push('Temperature');
        if (features & SUPPORT_COLOR) supported.push('Color');
        if (features & SUPPORT_EFFECT) supported.push('Effects');
        if (features & SUPPORT_WHITE_VALUE) supported.push('White');
        
        return supported;
    }

    hsToRgb(h, s) {
        h = h / 360;
        s = s / 100;
        const l = 0.5; // Assume 50% lightness
        let r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    inferSupportedFeatures(light) {
        let features = 0;
        const SUPPORT_BRIGHTNESS = 1;
        const SUPPORT_COLOR_TEMP = 2;
        const SUPPORT_COLOR = 16;
        
        if (light.brightness !== undefined) features |= SUPPORT_BRIGHTNESS;
        if (light.colorTemp !== undefined) features |= SUPPORT_COLOR_TEMP;
        if (light.hsColor !== undefined) features |= SUPPORT_COLOR;
        
        return features;
    }

    renderEntityIcon(entity) {
        const domain = entity.entity_id.split('.')[0];
        const isOn = entity.state === 'on';
        
        // If entity has a custom icon from Home Assistant, use it
        if (entity.attributes?.icon) {
            const iconName = entity.attributes.icon;
            if (iconName.startsWith('mdi:')) {
                const mdiIcon = iconName.replace('mdi:', '');
                return `<i class="mdi mdi-${mdiIcon}" style="color: ${isOn ? '#ffb347' : '#888'}"></i>`;
            }
        }
        
        // Otherwise use our default mapping
        const iconInfo = this.getEntityIcon(domain, entity);
        if (iconInfo.type === 'mdi') {
            return `<i class="mdi mdi-${iconInfo.icon}" style="color: ${isOn ? '#ffb347' : '#888'}"></i>`;
        } else {
            return `<i class="fas ${iconInfo.icon}" style="color: ${isOn ? '#ffb347' : '#888'}"></i>`;
        }
    }

    getEntityIcon(domain, entity) {
        const isOn = entity.state === 'on';
        
        if (domain === 'light') {
            return {
                type: 'mdi',
                icon: isOn ? 'lightbulb-on' : 'lightbulb-outline'
            };
        }
        
        const iconMap = {
            'switch': { type: 'mdi', icon: isOn ? 'toggle-switch' : 'toggle-switch-off' },
            'sensor': { type: 'mdi', icon: 'chart-line' },
            'binary_sensor': { type: 'mdi', icon: 'shield-check' },
            'climate': { type: 'mdi', icon: 'thermostat' },
            'cover': { type: 'mdi', icon: 'window-shutter' },
            'fan': { type: 'mdi', icon: 'fan' },
            'lock': { type: 'mdi', icon: isOn ? 'lock-open' : 'lock' },
            'media_player': { type: 'mdi', icon: 'play-circle' },
            'scene': { type: 'mdi', icon: 'image-multiple' },
            'script': { type: 'mdi', icon: 'script-text' },
            'automation': { type: 'mdi', icon: 'robot' }
        };
        
        return iconMap[domain] || { type: 'mdi', icon: 'help-circle' };
    }

    selectEntity(entityId) {
        this.selectedEntity = entityId;
        
        // Update UI
        document.querySelectorAll('.entity-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.entityId === entityId);
        });
        
        // Broadcast selection event
        window.panelManager?.broadcast('onEntitySelected', { entityId });
    }

    assignToSelected(entityId) {
        const canvasPanel = window.panelManager?.getPanel('canvas');
        const selectedLight = canvasPanel?.getEditor()?.selectedLight;
        
        if (!selectedLight) {
            window.sceneManager?.showStatus('Please select a light in the floorplan first', 'warning');
            return;
        }
        
        // Use canvas API to assign entity
        if (canvasPanel.assignEntityToLight(selectedLight, entityId)) {
            // Refresh displays
            this.loadEntities();
            window.panelManager?.refreshPanel('lights');
            
            window.sceneManager?.showStatus(`Assigned ${entityId} to light`, 'success');
        }
    }

    findInFloorplan(entityId) {
        const canvasPanel = window.panelManager?.getPanel('canvas');
        if (!canvasPanel) return;
        
        // Use canvas API to find and select the light
        const light = canvasPanel.findLightByEntityId(entityId);
        
        if (light) {
            canvasPanel.selectObject(light);
            canvasPanel.centerOnObject(light);
            window.sceneManager?.showStatus(`Found ${entityId} in floorplan`, 'success');
        } else {
            window.sceneManager?.showStatus(`Entity ${entityId} not found in floorplan`, 'warning');
        }
    }

    updateStats() {
        const statsContainer = document.getElementById('entityStats');
        if (!statsContainer) return;
        
        const totalEntities = this.entities.length;
        const assignedCount = this.entities.filter(e => e.isAssigned).length;
        const onCount = this.entities.filter(e => e.state === 'on').length;
        
        statsContainer.innerHTML = `
            <div class="stat-item">
                <span class="stat-value">${totalEntities}</span>
                <span class="stat-label">Total</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${assignedCount}</span>
                <span class="stat-label">Assigned</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${onCount}</span>
                <span class="stat-label">On</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${this.filteredEntities.length}</span>
                <span class="stat-label">Shown</span>
            </div>
        `;
    }

    showError(message) {
        const container = document.getElementById('entitiesList');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>${message}</span>
                </div>
            `;
        }
    }

    refresh() {
        this.loadEntities();
    }
    
    // Drag and Drop Methods
    handleDragStart(event, entityId) {
        console.log('🎯 Drag started for entity:', entityId);
        event.dataTransfer.effectAllowed = 'copy';
        event.dataTransfer.setData('text/plain', entityId);
        event.dataTransfer.setData('application/x-home-assistant-entity', entityId);
        
        // Find the entity data
        const entity = this.entities.find(e => e.entity_id === entityId);
        if (entity) {
            // Store entity data for the drop handler
            event.dataTransfer.setData('application/json', JSON.stringify({
                entityId: entityId,
                friendlyName: entity.attributes?.friendly_name || entityId,
                domain: entityId.split('.')[0]
            }));
        }
        
        // Visual feedback
        event.target.style.opacity = '0.5';
        
        // Log to debug panel
        window.panelManager?.getPanel('debug')?.log(`Drag started: ${entityId}`, 'event');
        
        // Canvas drop zone is now set up in FloorplanEditor
        // No need to set it up here anymore
    }
    
    setupCanvasDropZone() {
        const canvasPanel = window.panelManager?.getPanel('canvas');
        const canvas = canvasPanel?.getCanvas();
        
        if (!canvas) {
            console.warn('⚠️ Canvas not found for drop zone setup, retrying...');
            window.panelManager?.getPanel('debug')?.log('Canvas not found, retrying in 500ms', 'warning');
            
            // Retry after a delay to allow canvas to initialize
            setTimeout(() => {
                const retryCanvas = canvasPanel?.getCanvas();
                if (retryCanvas) {
                    console.log('✅ Canvas found on retry, setting up drop zone');
                    this.setupCanvasDropZone();
                } else {
                    console.error('❌ Canvas still not available after retry');
                    window.panelManager?.getPanel('debug')?.log('Canvas not available after retry', 'error');
                }
            }, 500);
            return;
        }
        
        console.log('📌 Setting up canvas drop zone');
        
        const canvasElement = canvas.getElement();
        const drawingArea = document.querySelector('.drawing-area');
        
        // Use drawing area as the primary drop zone, fallback to canvas element
        const dropZone = drawingArea || canvasElement;
        
        console.log('🎯 Using drop zone:', dropZone.className || 'canvas-element');
        
        // Remove any existing listeners
        if (this._dropHandlers) {
            this._dropHandlers.forEach(({ element, event, handler }) => {
                element.removeEventListener(event, handler);
            });
        }
        
        this._dropHandlers = [];
        
        // Drag over handler
        const handleDragOver = (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
            dropZone.classList.add('drag-over');
        };
        
        // Drag enter handler for visual feedback
        const handleDragEnter = (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('drag-over');
            console.log('🎯 Drag entered drop zone:', e.target.className || e.target.tagName);
        };
        
        // Drag leave handler
        const handleDragLeave = (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Only remove class if we're leaving the drop zone entirely
            if (!dropZone.contains(e.relatedTarget)) {
                dropZone.classList.remove('drag-over');
                console.log('🎯 Drag left drop zone');
            }
        };
        
        // Drop handler
        const handleDrop = (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('drag-over');
            
            console.log('💧 Drop event triggered');
            
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
            const vpt = canvas.viewportTransform;
            const canvasX = (x - vpt[4]) / vpt[0];
            const canvasY = (y - vpt[5]) / vpt[3];
            
            console.log(`📍 Drop position: canvas(${Math.round(canvasX)}, ${Math.round(canvasY)})`);
            
            // Create light at drop position through canvas API
            this.createLightAtPosition(entityId, canvasX, canvasY);
        };
        
        // Drag end handler to reset opacity
        const handleDragEnd = (e) => {
            // Find all entity cards and reset their opacity
            document.querySelectorAll('.entity-card').forEach(card => {
                card.style.opacity = '';
            });
            
            dropZone.classList.remove('drag-over');
            
            // Clean up drop handlers
            if (this._dropHandlers) {
                this._dropHandlers.forEach(({ element, event, handler }) => {
                    element.removeEventListener(event, handler);
                });
                this._dropHandlers = [];
            }
        };
        
        // Add event listeners to drop zone
        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('dragenter', handleDragEnter);
        dropZone.addEventListener('dragleave', handleDragLeave);
        dropZone.addEventListener('drop', handleDrop);
        
        // Also attach drop handler to canvas element for redundancy if different from drop zone
        if (dropZone !== canvasElement) {
            canvasElement.addEventListener('dragover', handleDragOver);
            canvasElement.addEventListener('dragenter', handleDragEnter);
            canvasElement.addEventListener('drop', handleDrop);
        }
        
        document.addEventListener('dragend', handleDragEnd, { once: true });
        
        // Store for cleanup
        this._dropHandlers = [
            { element: dropZone, event: 'dragover', handler: handleDragOver },
            { element: dropZone, event: 'dragenter', handler: handleDragEnter },
            { element: dropZone, event: 'dragleave', handler: handleDragLeave },
            { element: dropZone, event: 'drop', handler: handleDrop }
        ];
        
        // Add canvas element handlers if different
        if (dropZone !== canvasElement) {
            this._dropHandlers.push(
                { element: canvasElement, event: 'dragover', handler: handleDragOver },
                { element: canvasElement, event: 'dragenter', handler: handleDragEnter },
                { element: canvasElement, event: 'drop', handler: handleDrop }
            );
        }
        
        this._dropHandlers.push({ element: document, event: 'dragend', handler: handleDragEnd });
        
        console.log('✅ Drag and drop handlers setup complete on:', dropZone.className || 'canvas-element');
    }
    
    createLightAtPosition(entityId, x, y) {
        console.log(`🏗️ Creating light at position (${x}, ${y}) for entity: ${entityId}`);
        window.panelManager?.getPanel('debug')?.log(`Creating light at (${Math.round(x)}, ${Math.round(y)}) for ${entityId}`, 'event');
        
        const canvasPanel = window.panelManager?.getPanel('canvas');
        const editor = canvasPanel?.getEditor();
        
        if (!editor) {
            console.error('❌ Floorplan editor not available');
            window.panelManager?.getPanel('debug')?.log('Floorplan editor not available', 'error');
            return;
        }
        
        // Use the editor's addLight method to create a light
        const light = editor.addLight({ x, y });
        
        if (light) {
            // Assign the entity to the newly created light
            canvasPanel.assignEntityToLight(light, entityId);
            
            // Show success message
            window.sceneManager?.showStatus(`Light created and assigned to ${entityId}`, 'success');
            
            // Log to debug panel
            window.panelManager?.getPanel('debug')?.log(`Light created and assigned: ${entityId}`, 'success');
            
            // Refresh the lights panel
            window.panelManager?.refreshPanel('lights');
            
            // Refresh our entity list to update assignment status
            this.loadEntities();
        } else {
            console.error('❌ Failed to create light');
            window.panelManager?.getPanel('debug')?.log('Failed to create light', 'error');
        }
    }
}