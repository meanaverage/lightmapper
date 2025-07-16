import { CompactPanel } from './SettingsPanel.js';

export class CompactLayersPanel extends CompactPanel {
    constructor() {
        super('layers', 'Layers', 'fa-layer-group');
        this.layers = {};
        this.selectedLayerId = null;
    }
    
    render() {
        this.container.innerHTML = '';
        this.container.className = 'compact-panel';
        
        // Header with inline controls
        const header = this.renderHeader();
        const actions = header.querySelector('.compact-panel-actions');
        
        // Add layer controls
        actions.innerHTML = `
            <button class="icon-btn" title="Add Layer" id="addLayerBtn">
                <i class="fas fa-plus"></i>
            </button>
            <button class="icon-btn" title="Delete Layer" id="deleteLayerBtn">
                <i class="fas fa-trash"></i>
            </button>
            <button class="icon-btn" title="Merge Layers" id="mergeLayersBtn">
                <i class="fas fa-object-group"></i>
            </button>
        `;
        
        this.container.appendChild(header);
        
        // Inline controls for layer options
        const controls = this.createInlineControls([
            {
                type: 'button-group',
                buttons: [
                    { icon: 'fa-eye', title: 'Show All', onClick: () => this.showAllLayers() },
                    { icon: 'fa-eye-slash', title: 'Hide All', onClick: () => this.hideAllLayers() },
                    { icon: 'fa-lock', title: 'Lock All', onClick: () => this.lockAllLayers() }
                ]
            },
            { type: 'spacer' },
            {
                type: 'select',
                id: 'blendMode',
                label: 'Blend:',
                options: [
                    { value: 'normal', label: 'Normal' },
                    { value: 'multiply', label: 'Multiply' },
                    { value: 'screen', label: 'Screen' },
                    { value: 'overlay', label: 'Overlay' }
                ],
                onChange: (e) => this.updateBlendMode(e.target.value)
            }
        ]);
        
        this.container.appendChild(controls);
        
        // Layers list with compact styling
        const layersList = document.createElement('div');
        layersList.className = 'compact-layers-list';
        layersList.id = 'layersList';
        
        this.container.appendChild(layersList);
        
        // Bind events
        this.bindEvents();
    }
    
    renderLayers() {
        const layersList = document.getElementById('layersList');
        if (!layersList) return;
        
        const sortedLayers = Object.values(this.layers).sort((a, b) => b.zIndex - a.zIndex);
        
        layersList.innerHTML = sortedLayers.map(layer => `
            <div class="compact-layer-item ${layer.id === this.selectedLayerId ? 'selected' : ''}" 
                 data-layer-id="${layer.id}"
                 draggable="true">
                <div class="layer-drag-handle">
                    <i class="fas fa-grip-vertical"></i>
                </div>
                
                <button class="icon-btn small ${layer.visible ? 'active' : ''}" 
                        data-action="visibility" 
                        data-layer-id="${layer.id}">
                    <i class="fas fa-eye${layer.visible ? '' : '-slash'}"></i>
                </button>
                
                <button class="icon-btn small ${layer.locked ? 'active' : ''}" 
                        data-action="lock" 
                        data-layer-id="${layer.id}">
                    <i class="fas fa-lock${layer.locked ? '' : '-open'}"></i>
                </button>
                
                <span class="layer-name" 
                      contenteditable="${!layer.locked}"
                      data-layer-id="${layer.id}">
                    ${this.escapeHtml(layer.name)}
                </span>
                
                <span class="layer-count">
                    ${layer.objectCount || 0}
                </span>
                
                ${layer.objectType === 'light' ? this.renderLightControls(layer) : ''}
            </div>
        `).join('');
        
        this.bindLayerEvents();
    }
    
    renderLightControls(layer) {
        return `
            <div class="layer-light-controls">
                <button class="icon-btn tiny ${layer.showCircles !== false ? 'active' : ''}" 
                        data-action="circles" 
                        data-layer-id="${layer.id}"
                        title="Toggle circles">
                    <i class="fas fa-circle"></i>
                </button>
                <button class="icon-btn tiny ${layer.showBrightness !== false ? 'active' : ''}" 
                        data-action="brightness" 
                        data-layer-id="${layer.id}"
                        title="Toggle brightness">
                    <i class="fas fa-sun"></i>
                </button>
                <button class="icon-btn tiny ${layer.showLabels !== false ? 'active' : ''}" 
                        data-action="labels" 
                        data-layer-id="${layer.id}"
                        title="Toggle labels">
                    <i class="fas fa-tag"></i>
                </button>
            </div>
        `;
    }
    
    bindEvents() {
        // Add layer button
        document.getElementById('addLayerBtn')?.addEventListener('click', () => {
            this.createNewLayer();
        });
        
        // Delete layer button
        document.getElementById('deleteLayerBtn')?.addEventListener('click', () => {
            if (this.selectedLayerId) {
                this.deleteLayer(this.selectedLayerId);
            }
        });
        
        // Merge layers button
        document.getElementById('mergeLayersBtn')?.addEventListener('click', () => {
            this.mergeLayers();
        });
    }
    
    bindLayerEvents() {
        const layersList = document.getElementById('layersList');
        if (!layersList) return;
        
        // Layer item clicks
        layersList.addEventListener('click', (e) => {
            const layerItem = e.target.closest('.compact-layer-item');
            if (layerItem) {
                const layerId = layerItem.dataset.layerId;
                
                // Check for action buttons
                if (e.target.closest('[data-action]')) {
                    const action = e.target.closest('[data-action]').dataset.action;
                    this.handleLayerAction(action, layerId);
                } else {
                    // Select layer
                    this.selectLayer(layerId);
                }
            }
        });
        
        // Layer name editing
        layersList.addEventListener('blur', (e) => {
            if (e.target.classList.contains('layer-name')) {
                const layerId = e.target.dataset.layerId;
                const newName = e.target.textContent.trim();
                this.renameLayer(layerId, newName);
            }
        }, true);
        
        // Prevent enter key in contenteditable
        layersList.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('layer-name') && e.key === 'Enter') {
                e.preventDefault();
                e.target.blur();
            }
        });
    }
    
    handleLayerAction(action, layerId) {
        const layer = this.layers[layerId];
        if (!layer) return;
        
        switch (action) {
            case 'visibility':
                this.toggleLayerVisibility(layerId);
                break;
            case 'lock':
                this.toggleLayerLock(layerId);
                break;
            case 'circles':
                layer.showCircles = !layer.showCircles;
                this.updateLayer(layerId, layer);
                break;
            case 'brightness':
                layer.showBrightness = !layer.showBrightness;
                this.updateLayer(layerId, layer);
                break;
            case 'labels':
                layer.showLabels = !layer.showLabels;
                this.updateLayer(layerId, layer);
                break;
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Compact layer styles
const style = document.createElement('style');
style.textContent = `
.compact-layers-list {
    padding: 8px;
    overflow-y: auto;
    max-height: calc(100vh - 200px);
    background: var(--cad-bg-secondary, #2d2d2d);
}

.compact-layer-item {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 6px;
    margin: 2px 0;
    background: var(--cad-bg-tertiary, #1e1e1e);
    border: 1px solid var(--cad-border-primary, #3a3a3a);
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
}

.compact-layer-item:hover {
    background: var(--cad-hover, #3a3a3a);
}

.compact-layer-item.selected {
    background: var(--cad-blue-primary, #4a9eff);
    border-color: var(--cad-blue-primary, #4a9eff);
}

.compact-layer-item.selected .layer-name,
.compact-layer-item.selected .layer-count {
    color: white;
}

.layer-count {
    font-size: 10px;
    color: var(--cad-text-secondary, #999);
    background: var(--cad-bg-primary, #262626);
    padding: 0 4px;
    border-radius: 2px;
    margin-left: auto;
}

.icon-btn.small {
    width: 20px;
    height: 20px;
    font-size: 10px;
}

.icon-btn.tiny {
    width: 16px;
    height: 16px;
    font-size: 9px;
    padding: 0;
}

.layer-light-controls {
    display: flex;
    gap: 2px;
    margin-left: 4px;
}
`;
document.head.appendChild(style);