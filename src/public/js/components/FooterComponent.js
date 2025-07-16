/**
 * Footer Component - Similar to Lucidchart
 * Provides zoom controls, page tabs, selection counter, and quick toggles
 */
export class FooterComponent {
    constructor() {
        this.container = null;
        this.zoomLevel = 100;
        this.selectedCount = 0;
        this.pages = [{ id: 'page1', name: 'Page 1', active: true }];
        this.currentPageId = 'page1';
        
        this.init();
    }
    
    init() {
        // Create footer container
        this.container = document.createElement('footer');
        this.container.className = 'app-footer';
        
        // Render initial content
        this.render();
        
        // Add to body
        document.body.appendChild(this.container);
        
        // Setup event handlers
        this.bindEvents();
        
        // Listen for canvas events
        this.setupCanvasListeners();
    }
    
    render() {
        this.container.innerHTML = `
            <!-- Left Section -->
            <div class="footer-section left">
                <!-- Page Tabs -->
                <div class="page-tabs-section">
                    <button class="footer-btn" id="pageListBtn" title="Page List">
                        <i class="fas fa-list"></i>
                    </button>
                    <button class="footer-btn" id="pageThumbnailsBtn" title="Page Thumbnails">
                        <i class="fas fa-th"></i>
                    </button>
                    <div class="tab-list" id="tabList">
                        ${this.renderTabs()}
                    </div>
                    <button class="footer-btn" id="addPageBtn" title="Add Page">
                        <i class="fas fa-plus-circle"></i>
                    </button>
                </div>
            </div>
            
            <!-- Center Section -->
            <div class="footer-section center">
                <!-- Selection Counter -->
                <div class="selection-counter" id="selectionCounter">
                    <i class="fas fa-mouse-pointer"></i>
                    <span>Selected objects</span>
                    <span class="selection-count" id="selectionCount">${this.selectedCount}</span>
                </div>
            </div>
            
            <!-- Right Section -->
            <div class="footer-section right">
                <!-- Layers Toggle -->
                <button class="footer-btn" id="layersToggleBtn" title="Layers">
                    <i class="fas fa-layer-group"></i>
                </button>
                
                <div class="footer-divider"></div>
                
                <!-- Mini Map Toggle -->
                <button class="footer-btn" id="minimapToggleBtn" title="Mini Map">
                    <i class="fas fa-map"></i>
                </button>
                
                <!-- Zoom Controls -->
                <div class="zoom-controls">
                    <button class="zoom-btn" id="zoomOutBtn" title="Zoom Out">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <rect x="5" y="11.25" width="14" height="1.5" rx=".75"></rect>
                        </svg>
                    </button>
                    <input type="text" class="zoom-input" id="zoomInput" value="${this.zoomLevel}%">
                    <button class="zoom-btn" id="zoomInBtn" title="Zoom In">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M11.25 18.25a.75.75 0 001.5 0v-5.5h5.5a.75.75 0 000-1.5h-5.5v-5.5a.75.75 0 00-1.5 0v5.5h-5.5a.75.75 0 000 1.5h5.5v5.5z"></path>
                        </svg>
                    </button>
                </div>
                
                <!-- Additional Controls -->
                <button class="footer-btn" id="fitToScreenBtn" title="Fit to Screen">
                    <i class="fas fa-expand"></i>
                </button>
            </div>
        `;
    }
    
    renderTabs() {
        return this.pages.map(page => `
            <div class="page-tab ${page.active ? 'selected' : ''}" data-page-id="${page.id}">
                ${page.name}
            </div>
        `).join('');
    }
    
    bindEvents() {
        // Zoom controls
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomInput = document.getElementById('zoomInput');
        
        zoomOutBtn?.addEventListener('click', () => this.zoomOut());
        zoomInBtn?.addEventListener('click', () => this.zoomIn());
        
        // Zoom input
        zoomInput?.addEventListener('click', (e) => {
            e.target.select();
        });
        
        zoomInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.setZoom(e.target.value);
                e.target.blur();
            }
        });
        
        zoomInput?.addEventListener('blur', (e) => {
            this.setZoom(e.target.value);
        });
        
        // Page tabs
        const tabList = document.getElementById('tabList');
        tabList?.addEventListener('click', (e) => {
            const tab = e.target.closest('.page-tab');
            if (tab) {
                this.selectPage(tab.dataset.pageId);
            }
        });
        
        // Add page button
        const addPageBtn = document.getElementById('addPageBtn');
        addPageBtn?.addEventListener('click', () => this.addPage());
        
        // Selection counter click
        const selectionCounter = document.getElementById('selectionCounter');
        selectionCounter?.addEventListener('click', () => this.showSelectionDetails());
        
        // Toggle buttons
        const layersToggle = document.getElementById('layersToggleBtn');
        layersToggle?.addEventListener('click', () => this.toggleLayers());
        
        const minimapToggle = document.getElementById('minimapToggleBtn');
        minimapToggle?.addEventListener('click', () => this.toggleMinimap());
        
        const fitToScreen = document.getElementById('fitToScreenBtn');
        fitToScreen?.addEventListener('click', () => this.fitToScreen());
    }
    
    setupCanvasListeners() {
        // Listen for zoom changes from canvas
        window.addEventListener('canvas:zoom', (e) => {
            this.updateZoom(e.detail.zoom);
        });
        
        // Listen for selection changes
        window.addEventListener('selection:changed', (e) => {
            this.updateSelectionCount(e.detail.count);
        });
    }
    
    // Zoom Methods
    zoomIn() {
        const newZoom = Math.min(500, this.zoomLevel + 25);
        this.applyZoom(newZoom);
    }
    
    zoomOut() {
        const newZoom = Math.max(10, this.zoomLevel - 25);
        this.applyZoom(newZoom);
    }
    
    setZoom(value) {
        const numValue = parseInt(value);
        if (!isNaN(numValue)) {
            const clampedZoom = Math.max(10, Math.min(500, numValue));
            this.applyZoom(clampedZoom);
        } else {
            // Reset to current value if invalid
            const zoomInput = document.getElementById('zoomInput');
            if (zoomInput) {
                zoomInput.value = `${this.zoomLevel}%`;
            }
        }
    }
    
    applyZoom(zoomLevel) {
        this.zoomLevel = zoomLevel;
        
        // Update input
        const zoomInput = document.getElementById('zoomInput');
        if (zoomInput) {
            zoomInput.value = `${this.zoomLevel}%`;
        }
        
        // Apply to canvas
        const canvas = window.floorplanEditor?.canvas;
        if (canvas) {
            const zoom = this.zoomLevel / 100;
            canvas.setZoom(zoom);
            canvas.renderAll();
            
            // Update floorplan editor zoom display
            if (window.floorplanEditor) {
                window.floorplanEditor.zoomLevel = zoom;
                window.floorplanEditor.updateZoomDisplay();
                window.floorplanEditor.drawGrid();
            }
        }
    }
    
    updateZoom(zoom) {
        this.zoomLevel = Math.round(zoom * 100);
        const zoomInput = document.getElementById('zoomInput');
        if (zoomInput) {
            zoomInput.value = `${this.zoomLevel}%`;
        }
    }
    
    fitToScreen() {
        const canvas = window.floorplanEditor?.canvas;
        if (!canvas) return;
        
        // Calculate bounds of all objects
        const objects = canvas.getObjects().filter(obj => 
            !obj.gridLine && !obj.snapGuide && !obj.selectionRing
        );
        
        if (objects.length === 0) {
            this.applyZoom(100);
            return;
        }
        
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        objects.forEach(obj => {
            const bounds = obj.getBoundingRect();
            minX = Math.min(minX, bounds.left);
            minY = Math.min(minY, bounds.top);
            maxX = Math.max(maxX, bounds.left + bounds.width);
            maxY = Math.max(maxY, bounds.top + bounds.height);
        });
        
        const objectsWidth = maxX - minX;
        const objectsHeight = maxY - minY;
        
        const canvasWidth = canvas.getWidth();
        const canvasHeight = canvas.getHeight();
        
        const scaleX = canvasWidth / (objectsWidth + 100); // Add padding
        const scaleY = canvasHeight / (objectsHeight + 100);
        const scale = Math.min(scaleX, scaleY, 2); // Max 200%
        
        // Center and zoom
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        canvas.setZoom(scale);
        
        const vpCenter = {
            x: canvasWidth / 2,
            y: canvasHeight / 2
        };
        
        const offset = {
            x: vpCenter.x - centerX * scale,
            y: vpCenter.y - centerY * scale
        };
        
        canvas.absolutePan(new fabric.Point(-offset.x, -offset.y));
        
        this.updateZoom(scale);
        
        if (window.floorplanEditor) {
            window.floorplanEditor.zoomLevel = scale;
            window.floorplanEditor.updateZoomDisplay();
            window.floorplanEditor.drawGrid();
        }
    }
    
    // Selection Methods
    updateSelectionCount(count) {
        this.selectedCount = count;
        const selectionCount = document.getElementById('selectionCount');
        if (selectionCount) {
            selectionCount.textContent = count;
        }
    }
    
    showSelectionDetails() {
        // Could show a popup with selected objects details
        console.log(`${this.selectedCount} objects selected`);
    }
    
    // Page Methods
    addPage() {
        const newId = `page${this.pages.length + 1}`;
        const newPage = {
            id: newId,
            name: `Page ${this.pages.length + 1}`,
            active: false
        };
        
        this.pages.push(newPage);
        this.renderTabs();
        this.bindTabEvents();
    }
    
    selectPage(pageId) {
        this.pages.forEach(page => {
            page.active = page.id === pageId;
        });
        
        this.currentPageId = pageId;
        this.renderTabs();
        this.bindTabEvents();
        
        // Emit page change event
        window.dispatchEvent(new CustomEvent('page:changed', {
            detail: { pageId }
        }));
    }
    
    renderTabs() {
        const tabList = document.getElementById('tabList');
        if (tabList) {
            tabList.innerHTML = this.pages.map(page => `
                <div class="page-tab ${page.active ? 'selected' : ''}" data-page-id="${page.id}">
                    ${page.name}
                </div>
            `).join('');
        }
    }
    
    bindTabEvents() {
        // Re-bind after rendering tabs
        const tabList = document.getElementById('tabList');
        const tabs = tabList?.querySelectorAll('.page-tab');
        
        tabs?.forEach(tab => {
            tab.addEventListener('click', () => {
                this.selectPage(tab.dataset.pageId);
            });
        });
    }
    
    // Toggle Methods
    toggleLayers() {
        const btn = document.getElementById('layersToggleBtn');
        btn?.classList.toggle('active');
        
        // Toggle layers panel
        const layersPanel = window.panelManager?.getPanel('layers');
        if (layersPanel) {
            const isVisible = btn?.classList.contains('active');
            window.panelManager.togglePanel('layers', isVisible);
        }
    }
    
    toggleMinimap() {
        const btn = document.getElementById('minimapToggleBtn');
        btn?.classList.toggle('active');
        
        // Future: implement minimap
        console.log('Minimap toggle:', btn?.classList.contains('active'));
    }
    
    // Utility Methods
    destroy() {
        this.container?.remove();
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.footerComponent = new FooterComponent();
    });
} else {
    window.footerComponent = new FooterComponent();
}