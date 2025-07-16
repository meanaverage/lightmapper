/**
 * Floating Layers Panel - Similar to Lucidchart
 * A draggable, resizable floating panel for layer management
 */
export class FloatingLayersPanel {
    constructor() {
        this.container = null;
        this.isVisible = false;
        this.isDragging = false;
        this.isResizing = false;
        this.dragOffset = { x: 0, y: 0 };
        this.minWidth = 264;
        this.minHeight = 300;
        this.position = { x: window.innerWidth - 300, y: 100 };
        this.size = { width: 264, height: 400 };
        
        this.init();
    }
    
    init() {
        // Create the floating panel structure
        this.container = document.createElement('div');
        this.container.className = 'floating-layers-panel';
        this.container.style.cssText = `
            position: fixed;
            left: ${this.position.x}px;
            top: ${this.position.y}px;
            width: ${this.size.width}px;
            height: ${this.size.height}px;
            background: var(--cad-bg-tertiary, #fff);
            border: 1px solid var(--cad-border-primary, #e0e0e0);
            border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
            display: none;
            flex-direction: column;
            z-index: 1000;
            user-select: none;
        `;
        
        // Create header
        const header = document.createElement('div');
        header.className = 'floating-panel-header';
        header.innerHTML = `
            <h3><i class="fas fa-layer-group"></i> Layers</h3>
            <button class="floating-panel-close" title="Close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Create content area
        const content = document.createElement('div');
        content.className = 'floating-panel-content';
        content.innerHTML = `
            <div class="layers-actions">
                <button class="btn btn-sm btn-primary" id="addLayerBtn">
                    <i class="fas fa-plus-circle"></i> Layer
                </button>
                <button class="btn btn-sm btn-secondary" id="syncVisibilityBtn" disabled>
                    Sync visibility
                </button>
            </div>
            <div class="layers-list-container">
                <div id="floatingLayersList" class="layers-list">
                    <!-- Layers will be rendered here -->
                </div>
                <hr>
                <div class="page-layer">
                    <span class="label">Page</span>
                    <span class="page-title">Page 1</span>
                </div>
            </div>
        `;
        
        // Add resize handles
        const resizeHandles = ['top', 'right', 'bottom', 'left', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];
        resizeHandles.forEach(handle => {
            const resizeHandle = document.createElement('div');
            resizeHandle.className = `resize-handle ${handle}`;
            this.container.appendChild(resizeHandle);
        });
        
        // Assemble panel
        this.container.appendChild(header);
        this.container.appendChild(content);
        document.body.appendChild(this.container);
        
        // Bind events
        this.bindEvents();
        
        // Load layers if layer manager exists
        if (window.layerManager) {
            this.refreshLayers();
        }
    }
    
    bindEvents() {
        // Header drag
        const header = this.container.querySelector('.floating-panel-header');
        header.addEventListener('mousedown', (e) => this.startDrag(e));
        
        // Close button
        const closeBtn = this.container.querySelector('.floating-panel-close');
        closeBtn.addEventListener('click', () => this.hide());
        
        // Resize handles
        const resizeHandles = this.container.querySelectorAll('.resize-handle');
        resizeHandles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => this.startResize(e, handle.className.split(' ')[1]));
        });
        
        // Add layer button
        const addLayerBtn = document.getElementById('addLayerBtn');
        addLayerBtn?.addEventListener('click', () => this.addLayer());
        
        // Global mouse events
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', () => this.handleMouseUp());
        
        // Listen for layer changes
        window.addEventListener('layers:changed', () => this.refreshLayers());
    }
    
    startDrag(e) {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'I') return;
        
        this.isDragging = true;
        this.dragOffset = {
            x: e.clientX - this.position.x,
            y: e.clientY - this.position.y
        };
        
        this.container.style.cursor = 'move';
    }
    
    startResize(e, handle) {
        this.isResizing = true;
        this.resizeHandle = handle;
        this.resizeStart = {
            x: e.clientX,
            y: e.clientY,
            width: this.size.width,
            height: this.size.height,
            left: this.position.x,
            top: this.position.y
        };
        
        e.preventDefault();
    }
    
    handleMouseMove(e) {
        if (this.isDragging) {
            this.position.x = e.clientX - this.dragOffset.x;
            this.position.y = e.clientY - this.dragOffset.y;
            
            // Keep panel on screen
            this.position.x = Math.max(0, Math.min(window.innerWidth - this.size.width, this.position.x));
            this.position.y = Math.max(0, Math.min(window.innerHeight - this.size.height, this.position.y));
            
            this.container.style.left = `${this.position.x}px`;
            this.container.style.top = `${this.position.y}px`;
        } else if (this.isResizing) {
            const dx = e.clientX - this.resizeStart.x;
            const dy = e.clientY - this.resizeStart.y;
            
            switch (this.resizeHandle) {
                case 'right':
                    this.size.width = Math.max(this.minWidth, this.resizeStart.width + dx);
                    break;
                case 'bottom':
                    this.size.height = Math.max(this.minHeight, this.resizeStart.height + dy);
                    break;
                case 'left':
                    this.size.width = Math.max(this.minWidth, this.resizeStart.width - dx);
                    this.position.x = this.resizeStart.left + dx;
                    break;
                case 'top':
                    this.size.height = Math.max(this.minHeight, this.resizeStart.height - dy);
                    this.position.y = this.resizeStart.top + dy;
                    break;
                case 'bottom-right':
                    this.size.width = Math.max(this.minWidth, this.resizeStart.width + dx);
                    this.size.height = Math.max(this.minHeight, this.resizeStart.height + dy);
                    break;
                // Add other corner cases as needed
            }
            
            this.container.style.width = `${this.size.width}px`;
            this.container.style.height = `${this.size.height}px`;
            this.container.style.left = `${this.position.x}px`;
            this.container.style.top = `${this.position.y}px`;
        }
    }
    
    handleMouseUp() {
        this.isDragging = false;
        this.isResizing = false;
        this.container.style.cursor = '';
    }
    
    show() {
        this.container.style.display = 'flex';
        this.isVisible = true;
        this.refreshLayers();
    }
    
    hide() {
        this.container.style.display = 'none';
        this.isVisible = false;
    }
    
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    addLayer() {
        if (window.layerManager) {
            const newLayerId = window.layerManager.createLayer({
                name: `Layer ${Object.keys(window.layerManager.layers).length + 1}`,
                visible: true,
                locked: false
            });
            
            this.refreshLayers();
            
            // Notify other panels
            window.dispatchEvent(new CustomEvent('layers:changed'));
        }
    }
    
    refreshLayers() {
        const layersList = document.getElementById('floatingLayersList');
        if (!layersList || !window.layerManager) return;
        
        const layers = Object.values(window.layerManager.layers).sort((a, b) => b.zIndex - a.zIndex);
        
        layersList.innerHTML = layers.map(layer => `
            <div class="floating-layer-item ${layer.selected ? 'selected' : ''}" data-layer-id="${layer.id}">
                <button class="layer-visibility ${layer.visible ? 'active' : ''}" data-layer-id="${layer.id}">
                    <i class="fas fa-eye${layer.visible ? '' : '-slash'}"></i>
                </button>
                <button class="layer-lock ${layer.locked ? 'active' : ''}" data-layer-id="${layer.id}">
                    <i class="fas fa-lock${layer.locked ? '' : '-open'}"></i>
                </button>
                <span class="layer-name">${layer.name}</span>
                <span class="layer-count">${layer.objectCount || 0}</span>
            </div>
        `).join('');
        
        // Bind layer events
        this.bindLayerEvents();
    }
    
    bindLayerEvents() {
        const layersList = document.getElementById('floatingLayersList');
        if (!layersList) return;
        
        // Layer visibility toggle
        layersList.querySelectorAll('.layer-visibility').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const layerId = btn.dataset.layerId;
                if (window.layerManager) {
                    window.layerManager.toggleLayerVisibility(layerId);
                    this.refreshLayers();
                    window.dispatchEvent(new CustomEvent('layers:changed'));
                }
            });
        });
        
        // Layer lock toggle
        layersList.querySelectorAll('.layer-lock').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const layerId = btn.dataset.layerId;
                if (window.layerManager) {
                    window.layerManager.toggleLayerLock(layerId);
                    this.refreshLayers();
                    window.dispatchEvent(new CustomEvent('layers:changed'));
                }
            });
        });
        
        // Layer selection
        layersList.querySelectorAll('.floating-layer-item').forEach(item => {
            item.addEventListener('click', () => {
                const layerId = item.dataset.layerId;
                if (window.layerManager) {
                    window.layerManager.selectLayer(layerId);
                    this.refreshLayers();
                    window.dispatchEvent(new CustomEvent('layers:changed'));
                }
            });
        });
    }
}

// Add styles
const style = document.createElement('style');
style.textContent = `
.floating-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: var(--cad-bg-secondary, #f8f8f8);
    border-bottom: 1px solid var(--cad-border-primary, #e0e0e0);
    border-radius: 8px 8px 0 0;
    cursor: move;
}

.dark-theme .floating-panel-header {
    background: var(--cad-bg-secondary, #2d2d2d);
}

.floating-panel-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--cad-text-primary, #333);
    display: flex;
    align-items: center;
    gap: 8px;
}

.dark-theme .floating-panel-header h3 {
    color: var(--cad-text-primary, #e0e0e0);
}

.floating-panel-close {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--cad-text-secondary, #666);
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s;
}

.floating-panel-close:hover {
    background: rgba(0, 0, 0, 0.05);
}

.dark-theme .floating-panel-close:hover {
    background: rgba(255, 255, 255, 0.05);
}

.floating-panel-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.layers-actions {
    display: flex;
    gap: 8px;
    padding: 12px;
    border-bottom: 1px solid var(--cad-border-primary, #e0e0e0);
}

.layers-list-container {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
}

.floating-layer-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    margin-bottom: 4px;
    background: var(--cad-bg-tertiary, #f5f5f5);
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
}

.dark-theme .floating-layer-item {
    background: var(--cad-bg-tertiary, #1e1e1e);
}

.floating-layer-item:hover {
    background: var(--cad-hover, #ececec);
}

.dark-theme .floating-layer-item:hover {
    background: var(--cad-hover, #3a3a3a);
}

.floating-layer-item.selected {
    background: var(--cad-blue-light, #e3f2ff);
    border-color: var(--cad-blue-primary, #4a9eff);
}

.dark-theme .floating-layer-item.selected {
    background: rgba(74, 158, 255, 0.2);
}

.layer-visibility,
.layer-lock {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--cad-text-secondary, #666);
    cursor: pointer;
    border-radius: 3px;
    transition: all 0.2s;
}

.layer-visibility:hover,
.layer-lock:hover {
    background: rgba(0, 0, 0, 0.05);
}

.layer-visibility.active,
.layer-lock.active {
    color: var(--cad-blue-primary, #4a9eff);
}

.layer-name {
    flex: 1;
    font-size: 13px;
    color: var(--cad-text-primary, #333);
}

.dark-theme .layer-name {
    color: var(--cad-text-primary, #e0e0e0);
}

.layer-count {
    font-size: 11px;
    color: var(--cad-text-secondary, #666);
    background: rgba(0, 0, 0, 0.05);
    padding: 2px 6px;
    border-radius: 10px;
}

.page-layer {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background: var(--cad-bg-secondary, #f0f0f0);
    border-radius: 4px;
    margin-top: 8px;
}

.dark-theme .page-layer {
    background: var(--cad-bg-secondary, #2d2d2d);
}

.page-layer .label {
    font-size: 12px;
    color: var(--cad-text-secondary, #666);
}

.page-layer .page-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--cad-text-primary, #333);
}

.dark-theme .page-layer .page-title {
    color: var(--cad-text-primary, #e0e0e0);
}

/* Resize handles */
.resize-handle {
    position: absolute;
    background: transparent;
}

.resize-handle.top,
.resize-handle.bottom {
    left: 0;
    right: 0;
    height: 4px;
    cursor: ns-resize;
}

.resize-handle.top {
    top: 0;
}

.resize-handle.bottom {
    bottom: 0;
}

.resize-handle.left,
.resize-handle.right {
    top: 0;
    bottom: 0;
    width: 4px;
    cursor: ew-resize;
}

.resize-handle.left {
    left: 0;
}

.resize-handle.right {
    right: 0;
}

.resize-handle.top-left,
.resize-handle.top-right,
.resize-handle.bottom-left,
.resize-handle.bottom-right {
    width: 8px;
    height: 8px;
}

.resize-handle.top-left {
    top: 0;
    left: 0;
    cursor: nw-resize;
}

.resize-handle.top-right {
    top: 0;
    right: 0;
    cursor: ne-resize;
}

.resize-handle.bottom-left {
    bottom: 0;
    left: 0;
    cursor: sw-resize;
}

.resize-handle.bottom-right {
    bottom: 0;
    right: 0;
    cursor: se-resize;
}

/* Button styles */
.btn-sm {
    padding: 4px 12px;
    font-size: 12px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.btn-primary {
    background: var(--cad-blue-primary, #4a9eff);
    color: white;
}

.btn-primary:hover {
    background: var(--cad-blue-dark, #3a8eef);
}

.btn-secondary {
    background: var(--cad-bg-secondary, #e0e0e0);
    color: var(--cad-text-primary, #333);
}

.btn-secondary:hover:not(:disabled) {
    background: var(--cad-bg-tertiary, #d0d0d0);
}

.btn-secondary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
`;
document.head.appendChild(style);