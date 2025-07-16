import { BasePanel } from './BasePanel.js';
import Blueprint3DAdapter from '../Blueprint3DAdapter.js';

/**
 * 3D Preview Panel - Provides a Three.js 3D visualization of the floorplan
 * @class Preview3DPanel
 * @extends BasePanel
 */
export class Preview3DPanel extends BasePanel {
    constructor() {
        super('preview3d', '3D Preview', 'fa-cube');
        
        this.blueprint3d = null;
        this.isVisible = false;
        this.syncWithCanvas = true;
        this.autoRotate = false;
        
        // Debounce timer for canvas updates
        this.updateTimer = null;
    }
    
    render() {
        this.container.innerHTML = `
            <div class="preview-3d-panel">
                <div class="preview-3d-header">
                    <h3>3D Preview</h3>
                    <div class="preview-3d-controls">
                        <button class="btn btn-icon-only" id="preview3d-sync" title="Sync with Canvas">
                            <i class="fas fa-sync ${this.syncWithCanvas ? 'active' : ''}"></i>
                        </button>
                        <button class="btn btn-icon-only" id="preview3d-rotate" title="Auto Rotate">
                            <i class="fas fa-sync-alt ${this.autoRotate ? 'active' : ''}"></i>
                        </button>
                        <button class="btn btn-icon-only" id="preview3d-screenshot" title="Take Screenshot">
                            <i class="fas fa-camera"></i>
                        </button>
                        <button class="btn btn-icon-only" id="preview3d-export" title="Export GLTF">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="btn btn-icon-only" id="preview3d-fullscreen" title="Fullscreen">
                            <i class="fas fa-expand"></i>
                        </button>
                    </div>
                </div>
                <div class="preview-3d-container" id="preview3d-container">
                    <div class="preview-3d-loading">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Initializing 3D view...</p>
                    </div>
                </div>
                <div class="preview-3d-stats">
                    <span class="stat-item">
                        <i class="fas fa-vector-square"></i>
                        <span id="preview3d-walls">0</span> walls
                    </span>
                    <span class="stat-item">
                        <i class="fas fa-lightbulb"></i>
                        <span id="preview3d-lights">0</span> lights
                    </span>
                    <span class="stat-item">
                        <i class="fas fa-home"></i>
                        <span id="preview3d-rooms">0</span> rooms
                    </span>
                </div>
            </div>
        `;
        
        this.bindEvents();
        this.initializeBlueprint3D();
    }
    
    bindEvents() {
        // Sync toggle
        const syncBtn = document.getElementById('preview3d-sync');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => {
                this.syncWithCanvas = !this.syncWithCanvas;
                syncBtn.querySelector('i').classList.toggle('active');
                
                if (this.syncWithCanvas) {
                    this.updateFromCanvas();
                }
                
                this.saveSettings();
            });
        }
        
        // Auto rotate toggle
        const rotateBtn = document.getElementById('preview3d-rotate');
        if (rotateBtn) {
            rotateBtn.addEventListener('click', () => {
                this.autoRotate = !this.autoRotate;
                rotateBtn.querySelector('i').classList.toggle('active');
                
                if (this.blueprint3d && this.blueprint3d.controls) {
                    this.blueprint3d.controls.autoRotate = this.autoRotate;
                    this.blueprint3d.controls.autoRotateSpeed = 2.0;
                }
                
                this.saveSettings();
            });
        }
        
        // Screenshot
        const screenshotBtn = document.getElementById('preview3d-screenshot');
        if (screenshotBtn) {
            screenshotBtn.addEventListener('click', () => {
                this.takeScreenshot();
            });
        }
        
        // Export GLTF
        const exportBtn = document.getElementById('preview3d-export');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportGLTF();
            });
        }
        
        // Fullscreen
        const fullscreenBtn = document.getElementById('preview3d-fullscreen');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                this.toggleFullscreen();
            });
        }
        
        // Listen for light selection in 3D view
        window.addEventListener('blueprint3d:lightSelected', (e) => {
            window.panelManager?.broadcast('onEntitySelected', { 
                entityId: e.detail.entityId 
            });
        });
    }
    
    initializeBlueprint3D() {
        console.log('🚀 Preview3DPanel: Initializing Blueprint3D...');
        
        const container = document.getElementById('preview3d-container');
        if (!container) {
            console.error('❌ Preview3DPanel: Container not found!');
            return;
        }
        
        console.log('📦 Preview3DPanel: Container found:', container);
        
        try {
            // Initialize Blueprint3D adapter
            this.blueprint3d = new Blueprint3DAdapter({
                units: window.floorplanEditor?.useMetric ? 'metric' : 'imperial',
                wallHeight: 10,
                wallThickness: 0.5,
                ambientLight: 0.4,
                enableShadows: true,
                physicallyCorrectLights: true
            });
            
            // Clear loading message
            container.innerHTML = '';
            
            // Initialize 3D viewer
            this.blueprint3d.init3DViewer(container);
            
            // Initial sync if enabled
            if (this.syncWithCanvas) {
                this.updateFromCanvas();
            }
            
            // Setup auto-rotate if enabled
            if (this.autoRotate && this.blueprint3d.controls) {
                this.blueprint3d.controls.autoRotate = true;
                this.blueprint3d.controls.autoRotateSpeed = 2.0;
            }
            
            console.log('✅ 3D Preview initialized');
            
        } catch (error) {
            console.error('Failed to initialize 3D preview:', error);
            container.innerHTML = `
                <div class="preview-3d-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to initialize 3D view</p>
                    <small>${error.message}</small>
                </div>
            `;
        }
    }
    
    updateFromCanvas() {
        if (!this.blueprint3d || !this.syncWithCanvas) return;
        
        const canvasPanel = window.panelManager?.getPanel('canvas');
        const canvas = canvasPanel?.getCanvas();
        
        if (!canvas) return;
        
        // Get canvas data
        const canvasData = canvas.toJSON([
            'lightObject', 'entityId', 'iconStyle',
            'roomObject', 'roomOutline', 'points',
            'textObject', 'lineObject', 'backgroundImage'
        ]);
        
        // Convert and load into 3D
        this.blueprint3d.loadFromFabric(canvasData);
        
        // Update stats
        this.updateStats();
        
        // Update all light states
        this.updateAllLightStates();
    }
    
    updateStats() {
        if (!this.blueprint3d) return;
        
        const wallsCount = document.getElementById('preview3d-walls');
        const lightsCount = document.getElementById('preview3d-lights');
        const roomsCount = document.getElementById('preview3d-rooms');
        
        if (wallsCount) wallsCount.textContent = this.blueprint3d.model.walls.length;
        if (lightsCount) lightsCount.textContent = this.blueprint3d.model.lights.length;
        if (roomsCount) roomsCount.textContent = this.blueprint3d.model.rooms.length;
    }
    
    updateAllLightStates() {
        if (!this.blueprint3d) return;
        
        // Get all light entities from Home Assistant
        const lights = window.lightEntities;
        if (!lights) return;
        
        // Update each light in the 3D scene
        Object.entries(lights).forEach(([entityId, entity]) => {
            this.blueprint3d.updateLightState(entityId, entity);
        });
    }
    
    takeScreenshot() {
        if (!this.blueprint3d) return;
        
        const dataURL = this.blueprint3d.getScreenshot();
        if (!dataURL) return;
        
        // Create download link
        const link = document.createElement('a');
        link.download = `lightmapper-3d-${new Date().toISOString()}.png`;
        link.href = dataURL;
        link.click();
        
        window.sceneManager?.showStatus('Screenshot saved', 'success');
    }
    
    exportGLTF() {
        if (!this.blueprint3d) return;
        
        this.blueprint3d.exportGLTF((gltf) => {
            const output = JSON.stringify(gltf, null, 2);
            const blob = new Blob([output], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.download = `lightmapper-3d-${new Date().toISOString()}.gltf`;
            link.href = url;
            link.click();
            
            URL.revokeObjectURL(url);
            window.sceneManager?.showStatus('3D model exported', 'success');
        });
    }
    
    toggleFullscreen() {
        const container = document.getElementById('preview3d-container');
        if (!container) return;
        
        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(err => {
                console.error('Error attempting to enable fullscreen:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }
    
    // Panel event handlers
    onObjectModified(data) {
        if (!this.syncWithCanvas) return;
        
        // Debounce updates to avoid overwhelming the 3D view
        clearTimeout(this.updateTimer);
        this.updateTimer = setTimeout(() => {
            this.updateFromCanvas();
        }, 500);
    }
    
    onObjectAdded(data) {
        if (!this.syncWithCanvas) return;
        this.onObjectModified(data);
    }
    
    onObjectRemoved(data) {
        if (!this.syncWithCanvas) return;
        this.onObjectModified(data);
    }
    
    onCanvasCleared(data) {
        if (!this.syncWithCanvas) return;
        
        if (this.blueprint3d) {
            this.blueprint3d.clearScene();
            this.updateStats();
        }
    }
    
    onLightStateChanged(data) {
        if (!this.blueprint3d || !data.entityId) return;
        
        // Update the specific light state
        const entity = window.lightEntities?.[data.entityId];
        if (entity) {
            this.blueprint3d.updateLightState(data.entityId, entity);
        }
    }
    
    refresh() {
        if (this.syncWithCanvas) {
            this.updateFromCanvas();
        }
    }
    
    saveSettings() {
        localStorage.setItem('preview3d_settings', JSON.stringify({
            syncWithCanvas: this.syncWithCanvas,
            autoRotate: this.autoRotate
        }));
    }
    
    loadSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('preview3d_settings') || '{}');
            this.syncWithCanvas = settings.syncWithCanvas !== false;
            this.autoRotate = settings.autoRotate || false;
        } catch (e) {
            console.error('Failed to load 3D preview settings:', e);
        }
    }
}

export default Preview3DPanel;