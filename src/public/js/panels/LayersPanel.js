import { BasePanel } from './BasePanel.js';

/**
 * Layers Panel - Photoshop-style layer management
 * @class LayersPanel
 * @extends BasePanel
 * @description Provides an interface for managing individual object layers with
 * drag-and-drop reordering, visibility controls, and z-index management.
 */
export class LayersPanel extends BasePanel {
    constructor() {
        super('layers', 'Layers', 'fa-layer-group');
        this.layerManager = null;
        this.selectedLayerId = null;
    }

    render() {
        console.log('🔧 LayersPanel.render() called');
        if (!this.layerManager) {
            console.warn('⚠️ LayersPanel rendering without LayerManager');
        }
        const actionsHtml = `
            <button class="btn btn-icon-only" title="Add Layer" onclick="window.panelManager.getPanel('layers').addNewLayer()">
                <i class="fas fa-plus"></i>
            </button>
            <button class="btn btn-icon-only" title="Delete Layer" onclick="window.panelManager.getPanel('layers').deleteSelectedLayer()">
                <i class="fas fa-trash"></i>
            </button>
            <button class="btn btn-icon-only" title="Bring to Front" onclick="window.panelManager.getPanel('layers').bringToFront()">
                <i class="fas fa-angle-double-up"></i>
            </button>
            <button class="btn btn-icon-only" title="Bring Forward" onclick="window.panelManager.getPanel('layers').bringForward()">
                <i class="fas fa-angle-up"></i>
            </button>
            <button class="btn btn-icon-only" title="Send Backward" onclick="window.panelManager.getPanel('layers').sendBackward()">
                <i class="fas fa-angle-down"></i>
            </button>
            <button class="btn btn-icon-only" title="Send to Back" onclick="window.panelManager.getPanel('layers').sendToBack()">
                <i class="fas fa-angle-double-down"></i>
            </button>
        `;

        const contentHtml = `
            <div class="layers-container" id="layersContainer">
                <!-- Layer items will be rendered here -->
            </div>
        `;

        this.container.innerHTML = this.renderAccordionContent(contentHtml, actionsHtml);
    }

    /**
     * Set the layer manager instance
     * @param {LayerManager} layerManager - The layer manager to use
     */
    setLayerManager(layerManager) {
        console.log('📋 LayersPanel.setLayerManager() called');
        this.layerManager = layerManager;
        // Re-render the panel to ensure container is set up
        if (this.container) {
            this.render();
        }
        this.refresh();
    }

    /**
     * Refresh the layers display
     */
    refresh() {
        console.log('🔄 LayersPanel.refresh() called');
        if (!this.layerManager) {
            console.warn('⚠️ Cannot refresh - no LayerManager');
            return;
        }
        
        const container = document.getElementById('layersContainer');
        if (!container) {
            console.warn('⚠️ Cannot refresh - layersContainer not found');
            return;
        }

        // Clear existing content
        container.innerHTML = '';

        // Get layers in display order (top to bottom in UI = high to low z-index)
        const layerIds = [...this.layerManager.layerOrder];
        
        layerIds.forEach(layerId => {
            const layer = this.layerManager.layers[layerId];
            if (!layer) return;

            const layerElement = this.createLayerElement(layerId, layer);
            container.appendChild(layerElement);
        });

        // Re-setup drag and drop
        this.setupLayerDragAndDrop();
    }

    /**
     * Create a DOM element for a layer
     * @param {string} layerId - The layer ID
     * @param {Object} layer - The layer data
     * @returns {HTMLElement} The layer element
     */
    createLayerElement(layerId, layer) {
        const div = document.createElement('div');
        div.className = `layer-item ${layer.visible ? 'active' : ''} ${this.selectedLayerId === layerId ? 'selected-layer' : ''}`;
        div.dataset.layer = layerId;
        div.draggable = !this.isFixedLayer(layer);

        // Build controls based on layer type
        let additionalControls = '';
        if (layer.objectType === 'light') {
            additionalControls = `
                <div class="layer-light-controls">
                    <button class="layer-circle-toggle ${layer.circleVisible !== false ? 'active' : ''}" 
                            data-layer-toggle="circle" 
                            data-layer-id="${layerId}" 
                            title="Toggle Light Circle">
                        <i class="fas fa-circle"></i>
                    </button>
                    <button class="layer-brightness-toggle ${layer.brightnessVisible !== false ? 'active' : ''}" 
                            data-layer-toggle="brightness" 
                            data-layer-id="${layerId}" 
                            title="Toggle Brightness Effect">
                        <i class="fas fa-sun"></i>
                    </button>
                    <button class="layer-label-toggle ${layer.labelVisible !== false ? 'active' : ''}" 
                            data-layer-toggle="label" 
                            data-layer-id="${layerId}" 
                            title="Toggle Label">
                        <i class="fas fa-tag"></i>
                    </button>
                </div>
            `;
        }

        div.innerHTML = `
            ${!this.isFixedLayer(layer) ? '<div class="layer-drag-handle"><i class="fas fa-grip-vertical"></i></div>' : ''}
            <button class="layer-visibility ${layer.visible ? 'active' : ''}" 
                    data-layer-toggle="visibility" 
                    data-layer-id="${layerId}">
                <i class="fas ${layer.visible ? 'fa-eye' : 'fa-eye-slash'}"></i>
            </button>
            <div class="layer-name" ${layer.objectType === 'room' ? 'contenteditable="true"' : ''}>${layer.name}</div>
            <div class="layer-zindex" title="Z-Index">z:${layer.zIndex}</div>
            ${additionalControls}
            <button class="layer-lock ${layer.locked ? 'active' : ''}" 
                    data-layer-toggle="lock" 
                    data-layer-id="${layerId}">
                <i class="fas ${layer.locked ? 'fa-lock' : 'fa-unlock'}"></i>
            </button>
        `;

        // Add click handler for selection
        div.addEventListener('click', (e) => {
            if (!e.target.closest('button') && !e.target.closest('.layer-name[contenteditable]')) {
                this.selectLayer(layerId);
            }
        });

        // Add event handlers for controls
        this.setupLayerControlHandlers(div, layerId);

        return div;
    }

    /**
     * Check if a layer is fixed (cannot be reordered)
     * @param {Object} layer - The layer to check
     * @returns {boolean} True if the layer is fixed
     */
    isFixedLayer(layer) {
        // Background and grid layers are typically fixed
        return layer.objectType === 'background' || layer.objectType === 'grid';
    }

    /**
     * Set up event handlers for layer controls
     * @param {HTMLElement} element - The layer element
     * @param {string} layerId - The layer ID
     */
    setupLayerControlHandlers(element, layerId) {
        // Visibility toggle
        const visibilityBtn = element.querySelector('[data-layer-toggle="visibility"]');
        if (visibilityBtn) {
            visibilityBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleLayerVisibility(layerId);
            });
        }

        // Lock toggle
        const lockBtn = element.querySelector('[data-layer-toggle="lock"]');
        if (lockBtn) {
            lockBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleLayerLock(layerId);
            });
        }

        // Light-specific controls
        const circleBtn = element.querySelector('[data-layer-toggle="circle"]');
        if (circleBtn) {
            circleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleLightCircle(layerId);
            });
        }

        const brightnessBtn = element.querySelector('[data-layer-toggle="brightness"]');
        if (brightnessBtn) {
            brightnessBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleLightBrightness(layerId);
            });
        }

        const labelBtn = element.querySelector('[data-layer-toggle="label"]');
        if (labelBtn) {
            labelBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleLightLabel(layerId);
            });
        }

        // Editable layer name
        const nameElement = element.querySelector('.layer-name[contenteditable]');
        if (nameElement) {
            nameElement.addEventListener('blur', () => {
                this.updateLayerName(layerId, nameElement.textContent);
            });
            nameElement.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    nameElement.blur();
                }
            });
        }
    }

    /**
     * Set up drag and drop for layer reordering
     */
    setupLayerDragAndDrop() {
        const layerItems = document.querySelectorAll('.layer-item[draggable="true"]');
        
        layerItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', item.dataset.layer);
                item.classList.add('dragging');
                document.querySelector('.layers-container').classList.add('drag-active');
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                document.querySelector('.layers-container').classList.remove('drag-active');
                document.querySelectorAll('.layer-item').forEach(el => {
                    el.classList.remove('drag-over');
                });
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                const draggingItem = document.querySelector('.dragging');
                if (draggingItem && draggingItem !== item) {
                    e.dataTransfer.dropEffect = 'move';
                    item.classList.add('drag-over');
                }
            });

            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over');
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                const draggedLayerId = e.dataTransfer.getData('text/plain');
                const targetLayerId = item.dataset.layer;
                
                if (draggedLayerId && targetLayerId && draggedLayerId !== targetLayerId) {
                    this.reorderLayers(draggedLayerId, targetLayerId);
                }
            });
        });
    }

    /**
     * Select a layer
     * @param {string} layerId - The layer ID to select
     */
    selectLayer(layerId) {
        this.selectedLayerId = layerId;
        
        // Update UI
        document.querySelectorAll('.layer-item').forEach(item => {
            item.classList.toggle('selected-layer', item.dataset.layer === layerId);
        });

        // Get the canvas object for this layer - but only if we're not responding to a canvas selection
        if (!this._respondingToSelection) {
            const canvasPanel = window.panelManager?.getPanel('canvas');
            if (canvasPanel && this.layerManager) {
                const layer = this.layerManager.layers[layerId];
                if (layer) {
                    const object = canvasPanel.findObjectById(layer.objectId);
                    if (object) {
                        canvasPanel.selectObject(object);
                    }
                }
            }
        }
    }

    /**
     * Toggle layer visibility
     * @param {string} layerId - The layer ID
     */
    toggleLayerVisibility(layerId) {
        if (!this.layerManager) return;
        
        const layer = this.layerManager.layers[layerId];
        if (!layer) return;

        layer.visible = !layer.visible;
        
        // Update canvas object
        const canvasPanel = window.panelManager?.getPanel('canvas');
        if (canvasPanel) {
            const object = canvasPanel.findObjectById(layer.objectId);
            if (object) {
                canvasPanel.setObjectVisibility(object, layer.visible);
            }
        }

        // Update UI
        const layerElement = document.querySelector(`[data-layer="${layerId}"]`);
        if (layerElement) {
            layerElement.classList.toggle('active', layer.visible);
            const icon = layerElement.querySelector('[data-layer-toggle="visibility"] i');
            if (icon) {
                icon.className = layer.visible ? 'fas fa-eye' : 'fas fa-eye-slash';
            }
        }

        // Broadcast change
        window.panelManager?.broadcast('onLayerVisibilityChanged', { layerId, visible: layer.visible });
    }

    /**
     * Toggle layer lock
     * @param {string} layerId - The layer ID
     */
    toggleLayerLock(layerId) {
        if (!this.layerManager) return;
        
        const layer = this.layerManager.layers[layerId];
        if (!layer) return;

        layer.locked = !layer.locked;
        
        // Update canvas object
        const canvasPanel = window.panelManager?.getPanel('canvas');
        if (canvasPanel) {
            const object = canvasPanel.findObjectById(layer.objectId);
            if (object) {
                canvasPanel.setObjectLocked(object, layer.locked);
            }
        }

        // Update UI
        const lockBtn = document.querySelector(`[data-layer="${layerId}"] [data-layer-toggle="lock"]`);
        if (lockBtn) {
            lockBtn.classList.toggle('active', layer.locked);
            const icon = lockBtn.querySelector('i');
            if (icon) {
                icon.className = layer.locked ? 'fas fa-lock' : 'fas fa-unlock';
            }
        }

        // Broadcast change
        window.panelManager?.broadcast('onLayerLockChanged', { layerId, locked: layer.locked });
    }

    /**
     * Toggle light circle visibility
     * @param {string} layerId - The layer ID
     */
    toggleLightCircle(layerId) {
        // Delegate to layer manager for complex light-specific logic
        if (this.layerManager?.toggleLightCircle) {
            this.layerManager.toggleLightCircle(layerId);
            this.refresh();
        }
    }

    /**
     * Toggle light brightness effect
     * @param {string} layerId - The layer ID
     */
    toggleLightBrightness(layerId) {
        // Delegate to layer manager for complex light-specific logic
        if (this.layerManager?.toggleLightBrightness) {
            this.layerManager.toggleLightBrightness(layerId);
            this.refresh();
        }
    }

    /**
     * Toggle light label
     * @param {string} layerId - The layer ID
     */
    toggleLightLabel(layerId) {
        // Delegate to layer manager for complex light-specific logic
        if (this.layerManager?.toggleLightLabel) {
            this.layerManager.toggleLightLabel(layerId);
            this.refresh();
        }
    }

    /**
     * Update layer name
     * @param {string} layerId - The layer ID
     * @param {string} newName - The new name
     */
    updateLayerName(layerId, newName) {
        if (!this.layerManager) return;
        
        const layer = this.layerManager.layers[layerId];
        if (layer && newName.trim()) {
            layer.name = newName.trim();
            window.panelManager?.broadcast('onLayerRenamed', { layerId, name: layer.name });
        }
    }

    /**
     * Reorder layers
     * @param {string} draggedLayerId - The ID of the dragged layer
     * @param {string} targetLayerId - The ID of the target layer
     */
    reorderLayers(draggedLayerId, targetLayerId) {
        if (!this.layerManager) return;
        
        this.layerManager.reorderLayers(draggedLayerId, targetLayerId);
        this.refresh();
        
        window.panelManager?.broadcast('onLayersReordered', { 
            draggedLayerId, 
            targetLayerId,
            newOrder: this.layerManager.layerOrder 
        });
    }

    /**
     * Add a new layer
     */
    addNewLayer() {
        // This would typically create a new object on the canvas
        // For now, just show a message
        window.sceneManager?.showStatus('Select a tool to create a new object', 'info');
    }

    /**
     * Delete the selected layer
     */
    deleteSelectedLayer() {
        if (!this.selectedLayerId || !this.layerManager) return;
        
        const layer = this.layerManager.layers[this.selectedLayerId];
        if (!layer) return;

        // Confirm deletion
        if (!confirm(`Delete layer "${layer.name}"?`)) return;

        // Delete the canvas object
        const canvasPanel = window.panelManager?.getPanel('canvas');
        if (canvasPanel) {
            const object = canvasPanel.findObjectById(layer.objectId);
            if (object) {
                canvasPanel.deleteObject(object);
            }
        }

        // Remove the layer
        this.layerManager.removeLayer(this.selectedLayerId);
        this.selectedLayerId = null;
        this.refresh();
        
        window.panelManager?.broadcast('onLayerDeleted', { layerId: this.selectedLayerId });
    }

    /**
     * Bring selected layer to front
     */
    async bringToFront() {
        if (!this.selectedLayerId || !this.layerManager) return;
        
        // Call API endpoint
        try {
            await this.fetchData(`${window.API_BASE}/api/layers/${this.selectedLayerId}/bring-to-front`, {
                method: 'POST'
            });
        } catch (error) {
            console.warn('API call failed, continuing with local operation:', error);
        }
        
        // Move to front of layer order
        const index = this.layerManager.layerOrder.indexOf(this.selectedLayerId);
        if (index > -1 && index > 0) {
            this.layerManager.layerOrder.splice(index, 1);
            this.layerManager.layerOrder.unshift(this.selectedLayerId);
            this.layerManager.updateAllZIndices();
            this.layerManager.updateCanvasObjectOrder(this.layerManager.layerOrder);
            this.refresh();
        }
    }

    /**
     * Send selected layer to back
     */
    async sendToBack() {
        if (!this.selectedLayerId || !this.layerManager) return;
        
        // Call API endpoint
        try {
            await this.fetchData(`${window.API_BASE}/api/layers/${this.selectedLayerId}/send-to-back`, {
                method: 'POST'
            });
        } catch (error) {
            console.warn('API call failed, continuing with local operation:', error);
        }
        
        // Move to back of layer order
        const index = this.layerManager.layerOrder.indexOf(this.selectedLayerId);
        if (index > -1 && index < this.layerManager.layerOrder.length - 1) {
            this.layerManager.layerOrder.splice(index, 1);
            this.layerManager.layerOrder.push(this.selectedLayerId);
            this.layerManager.updateAllZIndices();
            this.layerManager.updateCanvasObjectOrder(this.layerManager.layerOrder);
            this.refresh();
        }
    }

    /**
     * Bring selected layer forward one position
     */
    async bringForward() {
        if (!this.selectedLayerId || !this.layerManager) return;
        
        console.log('🔍 LayersPanel: bringForward called for layer:', this.selectedLayerId);
        
        // Call API endpoint
        try {
            await this.fetchData(`${window.API_BASE}/api/layers/${this.selectedLayerId}/bring-forward`, {
                method: 'POST'
            });
        } catch (error) {
            console.warn('API call failed, continuing with local operation:', error);
        }
        
        const canvasPanel = window.panelManager?.getPanel('canvas');
        if (!canvasPanel) {
            console.error('❌ CanvasPanel not found');
            return;
        }
        
        const layer = this.layerManager.layers[this.selectedLayerId];
        if (!layer) {
            console.error('❌ Layer not found:', this.selectedLayerId);
            return;
        }
        
        console.log('🔍 Looking for object with ID:', layer.objectId);
        const object = canvasPanel.findObjectById(layer.objectId);
        if (object) {
            console.log('✅ Found object:', object.type, 'ID:', object.id);
            const editor = canvasPanel.getEditor();
            if (editor) {
                editor.canvas.setActiveObject(object);
                editor.bringForward();
                this.refresh();
                console.log('✅ Brought object forward');
            } else {
                console.error('❌ Editor not found');
            }
        } else {
            console.error('❌ Object not found with ID:', layer.objectId);
            console.log('Available objects:', canvasPanel.getEditor()?.canvas.getObjects().map(obj => ({type: obj.type, id: obj.id})));
        }
    }

    /**
     * Send selected layer backward one position
     */
    async sendBackward() {
        if (!this.selectedLayerId || !this.layerManager) return;
        
        console.log('🔍 LayersPanel: sendBackward called for layer:', this.selectedLayerId);
        
        // Call API endpoint
        try {
            await this.fetchData(`${window.API_BASE}/api/layers/${this.selectedLayerId}/send-backward`, {
                method: 'POST'
            });
        } catch (error) {
            console.warn('API call failed, continuing with local operation:', error);
        }
        
        const canvasPanel = window.panelManager?.getPanel('canvas');
        if (!canvasPanel) {
            console.error('❌ CanvasPanel not found');
            return;
        }
        
        const layer = this.layerManager.layers[this.selectedLayerId];
        if (!layer) {
            console.error('❌ Layer not found:', this.selectedLayerId);
            return;
        }
        
        console.log('🔍 Looking for object with ID:', layer.objectId);
        const object = canvasPanel.findObjectById(layer.objectId);
        if (object) {
            console.log('✅ Found object:', object.type, 'ID:', object.id);
            const editor = canvasPanel.getEditor();
            if (editor) {
                editor.canvas.setActiveObject(object);
                editor.sendBackward();
                this.refresh();
                console.log('✅ Sent object backward');
            } else {
                console.error('❌ Editor not found');
            }
        } else {
            console.error('❌ Object not found with ID:', layer.objectId);
            console.log('Available objects:', canvasPanel.getEditor()?.canvas.getObjects().map(obj => ({type: obj.type, id: obj.id})));
        }
    }

    /**
     * Handle object selection from canvas
     * @param {Object} data - Event data containing the selected object
     */
    onObjectSelected(data) {
        if (!data?.object || !this.layerManager) return;
        
        const layerId = data.object.customLayer;
        if (layerId && this.layerManager.layers[layerId]) {
            // Set flag to prevent circular selection
            this._respondingToSelection = true;
            this.selectLayer(layerId);
            this._respondingToSelection = false;
        }
    }

    /**
     * Handle object addition to canvas
     * @param {Object} data - Event data containing the added object
     */
    onObjectAdded(data) {
        if (!data?.object || !this.layerManager) return;
        
        // Create a layer for the new object if it doesn't have one
        if (!data.object.customLayer) {
            this.layerManager.createLayerForObject(data.object);
            this.refresh();
        }
    }

    /**
     * Handle object removal from canvas
     * @param {Object} data - Event data containing the removed object
     */
    onObjectRemoved(data) {
        if (!data?.object || !this.layerManager) return;
        
        const layerId = data.object.customLayer;
        if (layerId) {
            this.layerManager.removeLayer(layerId);
            this.refresh();
        }
    }
}