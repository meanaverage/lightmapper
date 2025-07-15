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
            const response = await this.fetchData(`${window.API_BASE}/api/lights`);
            this.entities = response;
            
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
        
        if (window.floorplanEditor?.canvas) {
            window.floorplanEditor.canvas.getObjects().forEach(obj => {
                if (obj.lightObject && obj.entityId) {
                    assignedIds.add(obj.entityId);
                }
            });
        }
        
        return assignedIds;
    }

    applyFilters() {
        const showLightsOnly = document.getElementById('showLightsOnly')?.checked;
        const showAssignedOnly = document.getElementById('showAssignedOnly')?.checked;
        
        this.filteredEntities = this.entities.filter(entity => {
            // Type filter
            if (showLightsOnly && !entity.entity_id.startsWith('light.')) {
                return false;
            }
            
            // Assignment filter
            if (showAssignedOnly && !entity.isAssigned) {
                return false;
            }
            
            // Search filter
            if (this.currentFilter) {
                const searchStr = this.currentFilter;
                const entityStr = (entity.entity_id + ' ' + (entity.attributes?.friendly_name || '')).toLowerCase();
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
                 data-entity-id="${entity.entity_id}">
                <div class="entity-header">
                    <div class="entity-icon">
                        <i class="fas ${this.getEntityIcon(domain, entity)}"></i>
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

    getEntityIcon(domain, entity) {
        if (domain === 'light') {
            return entity.state === 'on' ? 'fa-lightbulb' : 'fa-lightbulb';
        }
        
        const iconMap = {
            'switch': 'fa-toggle-on',
            'sensor': 'fa-chart-line',
            'binary_sensor': 'fa-shield-alt',
            'climate': 'fa-thermometer-half',
            'cover': 'fa-window-maximize',
            'fan': 'fa-fan',
            'lock': 'fa-lock',
            'media_player': 'fa-play-circle',
            'scene': 'fa-image',
            'script': 'fa-file-code',
            'automation': 'fa-robot'
        };
        
        return iconMap[domain] || 'fa-cube';
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
        // Find the currently selected light in the floorplan
        const selectedLight = window.floorplanEditor?.selectedLight;
        
        if (!selectedLight) {
            window.sceneManager?.showStatus('Please select a light in the floorplan first', 'warning');
            return;
        }
        
        // Assign the entity to the selected light
        selectedLight.entityId = entityId;
        
        // Update the light's appearance
        window.floorplanEditor?.updateLightFromEntity(selectedLight, entityId);
        
        // Refresh displays
        this.loadEntities();
        window.panelManager?.refreshPanel('lights');
        
        window.sceneManager?.showStatus(`Assigned ${entityId} to light`, 'success');
    }

    findInFloorplan(entityId) {
        if (!window.floorplanEditor?.canvas) return;
        
        // Find the light object with this entity
        let found = false;
        window.floorplanEditor.canvas.getObjects().forEach(obj => {
            if (obj.lightObject && obj.entityId === entityId) {
                // Select the object
                window.floorplanEditor.canvas.setActiveObject(obj);
                window.floorplanEditor.canvas.renderAll();
                
                // Center the view on the object
                const zoom = window.floorplanEditor.canvas.getZoom();
                const center = obj.getCenterPoint();
                window.floorplanEditor.canvas.setViewportTransform([
                    zoom, 0, 0, zoom,
                    -center.x * zoom + window.floorplanEditor.canvas.getWidth() / 2,
                    -center.y * zoom + window.floorplanEditor.canvas.getHeight() / 2
                ]);
                
                found = true;
                window.sceneManager?.showStatus(`Found ${entityId} in floorplan`, 'success');
            }
        });
        
        if (!found) {
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
}