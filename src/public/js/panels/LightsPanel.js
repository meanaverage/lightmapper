import { BasePanel } from './BasePanel.js';

/**
 * Lights Panel - Manages scene light settings and controls
 * @class LightsPanel
 * @extends BasePanel
 * @description Displays lights assigned in the floorplan and allows users to configure
 * scene settings for each light including brightness, color temperature, and color.
 */
export class LightsPanel extends BasePanel {
    /**
     * Creates a new LightsPanel instance
     * @constructor
     */
    constructor() {
        super('lights', 'Scene Lights', 'fa-lightbulb');
        /** @type {Map<string, Object>} Scene settings for each light entity */
        this.sceneLightSettings = new Map();
    }

    init(container) {
        super.init(container);
        this.setupToggleAllButton();
    }

    render() {
        this.container.innerHTML = `
            <div class="panel-header">
                <h3 id="lightsTabHeader">${this.title}</h3>
                <button id="toggleAllCollapse" class="btn btn-icon-only" title="Toggle all lights collapse/expand">
                    <i class="fas fa-chevron-down"></i>
                </button>
            </div>
            <div id="floorplanLightsList" class="lights-list"></div>
        `;
        
        this.renderLightsList();
    }

    setupToggleAllButton() {
        const toggleAllBtn = document.getElementById('toggleAllCollapse');
        if (toggleAllBtn) {
            toggleAllBtn.addEventListener('click', () => {
                this.toggleAllLightsCollapse();
            });
        }
    }

    renderLightsList() {
        const container = document.getElementById('floorplanLightsList');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Get all assigned entities from floorplan lights
        const assignedEntities = this.getAssignedFloorplanEntities();
        
        if (assignedEntities.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">No lights assigned in floorplan yet. Add lights to the floorplan and assign entities to see them here.</p>';
            return;
        }
        
        // Check if we're in current state mode
        const isCurrentStateMode = window.floorplanEditor?.showCurrentState || false;
        
        // Filter out any invalid entities and sort alphabetically by friendly name
        const validEntities = assignedEntities.filter(entity => entity && entity.entity_id);
        validEntities.sort((a, b) => {
            const nameA = this.getDisplayName(a).toLowerCase();
            const nameB = this.getDisplayName(b).toLowerCase();
            return nameA.localeCompare(nameB);
        });
        
        validEntities.forEach(entity => {
            const lightCard = this.createLightCard(entity, isCurrentStateMode);
            container.appendChild(lightCard);
        });
    }

    createLightCard(entity, isCurrentStateMode) {
        if (!entity || !entity.entity_id) {
            console.warn('⚠️ Invalid entity passed to createLightCard:', entity);
            return document.createElement('div'); // Return empty div
        }
        
        const lightCard = document.createElement('div');
        lightCard.className = 'light-card';
        lightCard.dataset.entityId = entity.entity_id;
        
        const displaySettings = this.getDisplaySettings(entity, isCurrentStateMode);
        const isActive = this.isLightActive(displaySettings);
        const safeId = entity.entity_id.replace(/\./g, '_');
        const friendlyName = this.getDisplayName(entity);
        
        lightCard.innerHTML = this.getLightCardHTML(entity, friendlyName, safeId, displaySettings, isCurrentStateMode);
        
        // Setup event handlers after creating the card
        setTimeout(() => {
            this.setupSceneLightControls(entity.entity_id, safeId);
            this.setupLightCollapse(safeId);
        }, 0);
        
        return lightCard;
    }

    getLightCardHTML(entity, friendlyName, safeId, displaySettings, isCurrentStateMode) {
        return `
            <div class="light-header" data-light-toggle="${safeId}">
                <div class="light-icon">•</div>
                <div class="light-info">
                    <div class="light-label">${friendlyName}</div>
                    <div class="light-entity-id">${entity.entity_id}</div>
                </div>
                <button class="light-collapse-toggle collapsed" data-light-toggle="${safeId}" type="button">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
            ${isCurrentStateMode ? this.getCurrentStateContent(displaySettings) : this.getSceneControlsContent(entity, safeId, displaySettings)}
        `;
    }

    getCurrentStateContent(displaySettings) {
        return `
            <div class="light-current-state">
                <div class="current-state-values">
                    ${displaySettings.brightness !== null ? `<span class="state-chip">Brightness: ${displaySettings.brightness}%</span>` : ''}
                    ${displaySettings.kelvin !== null ? `<span class="state-chip">Temperature: ${displaySettings.kelvin}K</span>` : ''}
                    ${displaySettings.color !== null ? `<span class="state-chip">Color: ${this.formatColorValue(displaySettings.color)}</span>` : ''}
                    ${!this.isLightActive(displaySettings) ? '<span class="state-chip inactive">Off</span>' : ''}
                </div>
            </div>
        `;
    }

    getSceneControlsContent(entity, safeId, displaySettings) {
        return `
            <div class="light-controls-container collapsed" id="controls_container_${safeId}">
                <div class="light-controls">
                    <div class="property-chips">
                        <div class="chip ${displaySettings.brightness !== null ? 'active' : ''}" 
                             data-entity="${entity.entity_id}" 
                             data-property="brightness">
                            <i class="fas fa-sun"></i>
                            <span class="chip-label">Brightness</span>
                            <span class="chip-value">${displaySettings.brightness !== null ? displaySettings.brightness + '%' : 'Not Set'}</span>
                        </div>
                        <div class="chip ${displaySettings.kelvin !== null ? 'active' : ''}" 
                             data-entity="${entity.entity_id}" 
                             data-property="kelvin">
                            <i class="fas fa-thermometer-half"></i>
                            <span class="chip-label">Temperature</span>
                            <span class="chip-value">${displaySettings.kelvin !== null ? displaySettings.kelvin + 'K' : 'Not Set'}</span>
                        </div>
                        <div class="chip ${displaySettings.color !== null ? 'active' : ''}" 
                             data-entity="${entity.entity_id}" 
                             data-property="color">
                            <i class="fas fa-palette"></i>
                            <span class="chip-label">Color</span>
                            <span class="chip-value">${displaySettings.color !== null ? 'Set' : 'Not Set'}</span>
                            ${displaySettings.color !== null ? this.getColorPreviewStyle(displaySettings.color) : ''}
                        </div>
                    </div>
                    <div class="inline-controls" id="controls_${safeId}" style="display: none;">
                        <div class="inline-brightness" style="display: none;">
                            <label>Brightness</label>
                            <input type="range" id="brightness_value_${safeId}" min="0" max="100" value="80">
                            <span id="brightness_display_${safeId}">80%</span>
                        </div>
                        <div class="inline-kelvin" style="display: none;">
                            <label>Temperature</label>
                            <input type="range" id="kelvin_value_${safeId}" min="2000" max="6500" value="3000" step="100">
                            <span id="kelvin_display_${safeId}">3000K</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Helper methods
    getAssignedFloorplanEntities() {
        const canvasPanel = window.panelManager?.getPanel('canvas');
        if (!canvasPanel) return [];
        
        return canvasPanel.getAssignedEntities();
    }

    getDisplayName(entity) {
        if (!entity || !entity.entity_id) {
            return 'Unknown Light';
        }
        return entity.friendly_name && entity.friendly_name !== entity.entity_id 
            ? entity.friendly_name 
            : entity.entity_id.replace(/^light\./, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    getDisplaySettings(entity, isCurrentStateMode) {
        if (isCurrentStateMode) {
            const currentEntity = window.lightEntities?.[entity.entity_id];
            if (currentEntity?.state === 'on') {
                return {
                    brightness: currentEntity.attributes?.brightness 
                        ? Math.round((currentEntity.attributes.brightness / 255) * 100) 
                        : null,
                    kelvin: currentEntity.attributes?.color_temp_kelvin || null,
                    color: currentEntity.attributes?.hs_color 
                        ? { hue: currentEntity.attributes.hs_color[0], saturation: currentEntity.attributes.hs_color[1] } 
                        : null
                };
            }
            return { brightness: null, kelvin: null, color: null };
        }
        
        return window.sceneManager?.sceneLightSettings.get(entity.entity_id) || 
               { brightness: null, kelvin: null, color: null };
    }

    isLightActive(displaySettings) {
        return Object.values(displaySettings).some(val => val !== null);
    }

    formatColorValue(color) {
        if (!color) return 'Not Set';
        return `HSV(${Math.round(color.hue)}°,${Math.round(color.saturation)}%)`;
    }

    getColorPreviewStyle(color) {
        if (!color) return '';
        return `<div class="chip-color-preview" style="background-color: hsl(${color.hue}, ${color.saturation}%, 50%)"></div>`;
    }

    // Control methods
    setupSceneLightControls(entityId, safeId) {
        const propertyChips = document.querySelectorAll(`[data-entity="${entityId}"]`);
        
        propertyChips.forEach(chip => {
            chip.addEventListener('click', (e) => {
                const property = chip.dataset.property;
                const isActive = chip.classList.contains('active');
                
                if (property === 'color') {
                    if (isActive) {
                        this.setSceneLightProperty(entityId, 'color', null);
                        this.updateChipDisplay(chip, property, null);
                    } else {
                        window.sceneManager?.showColorPicker(entityId, chip);
                    }
                } else {
                    if (isActive) {
                        this.setSceneLightProperty(entityId, property, null);
                        this.updateChipDisplay(chip, property, null);
                        this.hideInlineControls(safeId, property);
                    } else {
                        const defaultValue = property === 'brightness' ? 80 : 3000;
                        this.setSceneLightProperty(entityId, property, defaultValue);
                        this.updateChipDisplay(chip, property, defaultValue);
                        this.showInlineControls(safeId, property, defaultValue);
                    }
                }
            });
        });
        
        // Setup inline control listeners
        this.setupInlineControlListeners(entityId, safeId);
    }

    setupInlineControlListeners(entityId, safeId) {
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

    setSceneLightProperty(entityId, property, value) {
        window.sceneManager?.setSceneLightProperty(entityId, property, value);
    }

    updateChipDisplay(chip, property, value) {
        const valueSpan = chip.querySelector('.chip-value');
        const colorPreview = chip.querySelector('.chip-color-preview');
        
        if (value === null) {
            chip.classList.remove('active');
            valueSpan.textContent = 'Not Set';
            if (colorPreview) colorPreview.remove();
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
        
        const slider = propertyControl.querySelector('input[type="range"]');
        const display = propertyControl.querySelector('span');
        slider.value = value;
        display.textContent = property === 'brightness' ? value + '%' : value + 'K';
    }

    hideInlineControls(safeId, property) {
        const controls = document.getElementById(`controls_${safeId}`);
        const propertyControl = controls.querySelector(`.inline-${property}`);
        
        propertyControl.style.display = 'none';
        
        const visibleControls = controls.querySelectorAll('.inline-brightness[style*="flex"], .inline-kelvin[style*="flex"]');
        if (visibleControls.length === 0) {
            controls.style.display = 'none';
        }
    }

    // Collapse/Expand methods
    setupLightCollapse(safeId) {
        const toggleElements = document.querySelectorAll(`[data-light-toggle="${safeId}"]`);
        const controlsContainer = document.getElementById(`controls_container_${safeId}`);
        
        if (!controlsContainer || toggleElements.length === 0) return;
        
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
            controlsContainer.classList.remove('expanded');
            controlsContainer.classList.add('collapsed');
            toggleButton.classList.remove('expanded');
            toggleButton.classList.add('collapsed');
            toggleIcon.className = 'fas fa-chevron-right';
        } else {
            controlsContainer.classList.remove('collapsed');
            controlsContainer.classList.add('expanded');
            toggleButton.classList.remove('collapsed');
            toggleButton.classList.add('expanded');
            toggleIcon.className = 'fas fa-chevron-down';
        }
        
        this.updateToggleAllButtonState();
    }

    toggleAllLightsCollapse() {
        const containers = document.querySelectorAll('.light-controls-container');
        const toggleBtn = document.getElementById('toggleAllCollapse');
        const toggleIcon = toggleBtn?.querySelector('i');
        
        if (!toggleIcon || containers.length === 0) return;
        
        const expandedCount = document.querySelectorAll('.light-controls-container.expanded').length;
        const shouldExpand = expandedCount < containers.length / 2;
        
        containers.forEach(container => {
            const safeId = container.id.replace('controls_container_', '');
            if (shouldExpand && container.classList.contains('collapsed')) {
                this.toggleLightCollapse(safeId);
            } else if (!shouldExpand && container.classList.contains('expanded')) {
                this.toggleLightCollapse(safeId);
            }
        });
        
        this.updateToggleAllButtonState();
    }

    updateToggleAllButtonState() {
        const toggleBtn = document.getElementById('toggleAllCollapse');
        const toggleIcon = toggleBtn?.querySelector('i');
        
        if (!toggleIcon) return;
        
        const expandedCount = document.querySelectorAll('.light-controls-container.expanded').length;
        const totalCount = document.querySelectorAll('.light-controls-container').length;
        
        if (expandedCount === 0) {
            toggleIcon.className = 'fas fa-chevron-right';
            toggleBtn.title = 'Expand all lights';
        } else if (expandedCount === totalCount) {
            toggleIcon.className = 'fas fa-chevron-down';
            toggleBtn.title = 'Collapse all lights';
        } else {
            toggleIcon.className = 'fas fa-chevron-down';
            toggleBtn.title = 'Toggle all lights collapse/expand';
        }
    }

    // Public methods for refreshing
    refresh() {
        this.renderLightsList();
    }

    updateHeader(text) {
        const header = document.getElementById('lightsTabHeader');
        if (header) {
            header.textContent = text;
        }
    }
}