import { BasePanel } from './BasePanel.js';
// Blueprint3DAdapter will be loaded as a global script

/**
 * 3D Preview Panel - Provides a Three.js 3D visualization of the floorplan
 * @class Preview3DPanel
 * @extends BasePanel
 */
class Preview3DPanel extends BasePanel {
    constructor() {
        super('preview3d', '3D Preview', 'fa-cube');
        
        console.log('🎬 Preview3DPanel: Constructor called');
        
        this.blueprint3d = null;
        this.isVisible = false;
        this.syncWithCanvas = true;
        this.autoRotate = false;
        this.showLabels = true;
        
        // Debounce timer for canvas updates
        this.updateTimer = null;
        
        // Retry counter for initialization
        this.initRetryCount = 0;
        this.maxRetries = 20; // 10 seconds max wait
        
        // Retry counter for canvas sync
        this.canvasSyncRetryCount = 0;
        this.maxCanvasSyncRetries = 10; // 5 seconds max wait
    }
    
    render() {
        console.log('🎨 Preview3DPanel: Render called, container:', this.container);
        
        if (!this.container) {
            console.error('❌ Preview3DPanel: No container provided to render!');
            return;
        }
        
        this.container.innerHTML = `
            <div class="preview-3d-panel">
                <div class="preview-3d-header">
                    <h3>3D Preview</h3>
                    <div class="preview-3d-controls">
                        <button class="btn btn-icon-only" id="preview3d-sync" title="Sync with Canvas">
                            <i class="fas fa-sync active"></i>
                        </button>
                        <button class="btn btn-icon-only" id="preview3d-rotate" title="Auto Rotate">
                            <i class="fas fa-sync-alt ${this.autoRotate ? 'active' : ''}"></i>
                        </button>
                        <button class="btn btn-icon-only" id="preview3d-labels" title="Toggle Room Labels">
                            <i class="fas fa-tag ${this.showLabels !== false ? 'active' : ''}"></i>
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
                console.log('🔄 Sync button clicked, current state:', this.syncWithCanvas);
                
                this.syncWithCanvas = !this.syncWithCanvas;
                syncBtn.querySelector('i').classList.toggle('active');
                
                console.log('🔄 New sync state:', this.syncWithCanvas);
                
                if (this.syncWithCanvas) {
                    this.updateFromCanvas();
                }
                
                this.saveSettings();
            });
        }
        
        // Auto rotate toggle
        const rotateBtn = document.getElementById('preview3d-rotate');
        if (rotateBtn) {
            // Remove any existing listeners first
            const newRotateBtn = rotateBtn.cloneNode(true);
            rotateBtn.parentNode.replaceChild(newRotateBtn, rotateBtn);
            
            newRotateBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('🔘 Rotate button clicked, current state:', this.autoRotate);
                
                this.autoRotate = !this.autoRotate;
                newRotateBtn.querySelector('i').classList.toggle('active');
                
                if (this.blueprint3d && this.blueprint3d.controls) {
                    this.blueprint3d.controls.autoRotate = this.autoRotate;
                    this.blueprint3d.controls.autoRotateSpeed = 2.0;
                    console.log(`🔄 Auto-rotate ${this.autoRotate ? 'enabled' : 'disabled'}`);
                    console.log('📐 Controls autoRotate is now:', this.blueprint3d.controls.autoRotate);
                } else {
                    console.warn('⚠️ Cannot toggle auto-rotate: controls not available');
                }
                
                this.saveSettings();
            });
        }
        
        // Toggle labels
        const labelsBtn = document.getElementById('preview3d-labels');
        if (labelsBtn) {
            // Remove any existing listeners first
            const newLabelsBtn = labelsBtn.cloneNode(true);
            labelsBtn.parentNode.replaceChild(newLabelsBtn, labelsBtn);
            
            newLabelsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('🔘 Labels button clicked, current state:', this.showLabels);
                
                this.showLabels = !this.showLabels;
                newLabelsBtn.querySelector('i').classList.toggle('active');
                
                if (this.blueprint3d) {
                    this.blueprint3d.setShowRoomLabels(this.showLabels);
                    console.log(`🏷️ Room labels ${this.showLabels ? 'shown' : 'hidden'}`);
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
        console.log('📐 Container dimensions:', container.offsetWidth, 'x', container.offsetHeight);
        
        // Check if container has proper dimensions
        if (container.offsetWidth === 0 || container.offsetHeight === 0) {
            console.warn('⚠️ Container has zero dimensions, waiting for layout...');
            if (this.initRetryCount++ < this.maxRetries) {
                setTimeout(() => this.initializeBlueprint3D(), 500);
            } else {
                console.error('❌ Max retries reached waiting for container dimensions');
            }
            return;
        }
        
        try {
            // Wait for all dependencies to be available
            const missingDeps = [];
            
            if (!window.Blueprint3DAdapter) {
                missingDeps.push('Blueprint3DAdapter');
            }
            
            if (typeof THREE === 'undefined') {
                missingDeps.push('Three.js');
            }
            
            if (typeof OrbitControls === 'undefined') {
                missingDeps.push('OrbitControls');
            }
            
            if (missingDeps.length > 0) {
                console.warn(`⚠️ Waiting for dependencies: ${missingDeps.join(', ')} (retry ${this.initRetryCount}/${this.maxRetries})`);
                
                if (this.initRetryCount++ < this.maxRetries) {
                    setTimeout(() => this.initializeBlueprint3D(), 500);
                } else {
                    throw new Error(`Failed to load dependencies: ${missingDeps.join(', ')}`);
                }
                return;
            }
            
            console.log('✅ All 3D dependencies loaded successfully');
            
            // Initialize Blueprint3D adapter
            this.blueprint3d = new window.Blueprint3DAdapter({
                units: window.floorplanEditor?.useMetric ? 'metric' : 'imperial',
                wallHeight: 10,
                wallThickness: 0.5,
                ambientLight: 0.4,
                enableShadows: true,
                physicallyCorrectLights: true,
                showRoomLabels: this.showLabels
            });
            
            // Clear loading message
            container.innerHTML = '';
            
            // Initialize 3D viewer
            this.blueprint3d.init3DViewer(container);
            
            // Setup auto-rotate if enabled (after controls are created)
            if (this.autoRotate && this.blueprint3d.controls) {
                this.blueprint3d.controls.autoRotate = true;
                this.blueprint3d.controls.autoRotateSpeed = 2.0;
                console.log('🔄 Auto-rotate enabled on initialization');
            }
            
            // Initial sync if enabled
            if (this.syncWithCanvas) {
                console.log('🔄 Initial sync on panel load');
                // Longer delay to ensure canvas is ready
                setTimeout(() => {
                    this.updateFromCanvas();
                }, 1000);
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
        console.log('📐 Preview3DPanel: updateFromCanvas called, sync:', this.syncWithCanvas);
        
        if (!this.blueprint3d || !this.syncWithCanvas) return;
        
        // Try multiple ways to get the canvas
        let canvas = null;
        
        // Method 1: Through CanvasPanel
        const canvasPanel = window.panelManager?.getPanel('canvas');
        if (canvasPanel && canvasPanel.getCanvas) {
            canvas = canvasPanel.getCanvas();
        }
        
        // Method 2: Through global floorplanEditor
        if (!canvas && window.floorplanEditor && window.floorplanEditor.canvas) {
            canvas = window.floorplanEditor.canvas;
            console.log('📐 Got canvas from window.floorplanEditor');
        }
        
        // Method 3: Direct from CanvasPanel's floorplanEditor
        if (!canvas && canvasPanel && canvasPanel.floorplanEditor && canvasPanel.floorplanEditor.canvas) {
            canvas = canvasPanel.floorplanEditor.canvas;
            console.log('📐 Got canvas from canvasPanel.floorplanEditor');
        }
        
        console.log('📐 Canvas panel:', canvasPanel, 'Canvas:', canvas);
        
        if (!canvas) {
            if (this.canvasSyncRetryCount++ < this.maxCanvasSyncRetries) {
                console.warn(`⚠️ No canvas found! Retry ${this.canvasSyncRetryCount}/${this.maxCanvasSyncRetries} in 500ms...`);
                setTimeout(() => this.updateFromCanvas(), 500);
            } else {
                console.error('❌ Failed to find canvas after maximum retries');
                this.canvasSyncRetryCount = 0; // Reset for next attempt
            }
            return;
        }
        
        // Reset retry count on success
        this.canvasSyncRetryCount = 0;
        
        // Get canvas data with custom properties
        const customProperties = [
            'lightObject', 'entityId', 'iconStyle',
            'roomObject', 'roomOutline', 'points',
            'textObject', 'lineObject', 'backgroundImage',
            'customLayer', 'roomName', 'fill'
        ];
        
        const canvasData = canvas.toJSON(customProperties);
        console.log('📐 Canvas data:', canvasData);
        console.log('📐 Number of objects:', canvasData.objects?.length || 0);
        
        // Let's see what's actually in the objects
        if (canvasData.objects && canvasData.objects.length > 0) {
            console.log('🔍 First object details:', canvasData.objects[0]);
            console.log('🔍 Object type:', canvasData.objects[0].type);
            console.log('🔍 Has roomObject property:', canvasData.objects[0].hasOwnProperty('roomObject'));
        }
        
        // Log room objects
        const roomObjects = canvasData.objects?.filter(obj => obj.roomObject === true) || [];
        console.log('🏠 Room objects found:', roomObjects.length, roomObjects);
        
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
            autoRotate: this.autoRotate,
            showLabels: this.showLabels
        }));
    }
    
    loadSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('preview3d_settings') || '{}');
            this.syncWithCanvas = settings.syncWithCanvas !== false;
            this.autoRotate = settings.autoRotate || false;
            this.showLabels = settings.showLabels !== false;
        } catch (e) {
            console.error('Failed to load 3D preview settings:', e);
        }
    }
    
    onLoaded() {
        // Load saved settings
        this.loadSettings();
        
        // Update UI to reflect loaded settings
        const labelsBtn = document.getElementById('preview3d-labels');
        if (labelsBtn) {
            const icon = labelsBtn.querySelector('i');
            if (icon) {
                if (this.showLabels) {
                    icon.classList.add('active');
                } else {
                    icon.classList.remove('active');
                }
            }
        }
    }
    
    importOBJModel(objContent, filename) {
        if (!this.blueprint3d) {
            console.error('❌ 3D viewer not initialized');
            return;
        }
        
        // Check if OBJLoader is available
        if (typeof OBJLoader === 'undefined') {
            console.error('❌ OBJLoader not available. Loading from CDN...');
            this.loadOBJLoader().then(() => {
                this.processOBJImport(objContent, filename);
            });
            return;
        }
        
        this.processOBJImport(objContent, filename);
    }
    
    loadOBJLoader() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/three@0.148.0/examples/js/loaders/OBJLoader.js';
            script.onload = () => {
                console.log('✅ OBJLoader loaded');
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    processOBJImport(objContent, filename) {
        const loader = new OBJLoader();
        const object = loader.parse(objContent);
        
        // Calculate bounding box for scaling
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        // Scale to reasonable size (max 10 units)
        const maxDimension = Math.max(size.x, size.y, size.z);
        const scale = 10 / maxDimension;
        
        object.scale.multiplyScalar(scale);
        
        // Center the object
        object.position.sub(center.multiplyScalar(scale));
        object.position.y = 0; // Place on floor
        
        // Add materials if missing
        object.traverse((child) => {
            if (child.isMesh) {
                if (!child.material) {
                    child.material = new THREE.MeshStandardMaterial({
                        color: 0x808080,
                        roughness: 0.5,
                        metalness: 0.5
                    });
                }
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        // Add to scene
        this.blueprint3d.scene.add(object);
        
        // Store reference for later manipulation
        if (!this.importedModels) {
            this.importedModels = [];
        }
        this.importedModels.push({
            name: filename,
            object: object
        });
        
        console.log(`✅ Imported OBJ model: ${filename}`);
        window.sceneManager?.showStatus(`Imported 3D model: ${filename}`, 'success');
    }
    
    onLayerVisibilityChanged(data) {
        if (!this.blueprint3d || !data.layerId) return;
        
        console.log(`🔄 3D Preview: Layer visibility changed - ${data.layerId}: ${data.visible}`);
        
        // When the main lights layer visibility changes, hide/show everything
        if (data.layerId === 'lights') {
            this.blueprint3d.setLightVisibility(data.visible, data.visible);
            console.log(`🔄 3D Preview: Set all light elements to ${data.visible}`);
        }
        
        // Handle other layers
        const layerMappings = {
            'light-labels': {
                showLabels: data.visible
            },
            'brightness-effects': {
                showBrightnessEffects: data.visible
            }
        };
        
        const mapping = layerMappings[data.layerId];
        if (!mapping) return;
        
        if (mapping.showLabels !== undefined) {
            this.blueprint3d.setShowLightLabels(mapping.showLabels);
        }
        
        if (mapping.showBrightnessEffects !== undefined) {
            this.blueprint3d.setShowBrightnessEffects(mapping.showBrightnessEffects);
        }
    }
    
    onLayerOptionChanged(data) {
        if (!this.blueprint3d || !data.layerId || data.layerId !== 'lights') return;
        
        console.log(`🔄 3D Preview: Layer option changed - ${data.optionId}: ${data.value}`);
        
        // Get the light control app instance
        const lightApp = window.lightControllerApp;
        if (!lightApp || !lightApp.layers) return;
        
        // Find any light layer to get the current state
        const lightLayers = Object.values(lightApp.layers).filter(layer => layer.objectType === 'light');
        if (lightLayers.length === 0) return;
        
        // Use the first light layer as reference (they should all have the same visibility settings)
        const lightLayer = lightLayers[0];
        
        // Determine what should be visible based on the layer options
        const showBulbs = lightLayer.circleVisible !== false;
        const showBrightnessEffects = lightLayer.brightnessVisible !== false;
        const showLabels = lightLayer.labelVisible !== false;
        
        // Apply the visibility settings based on what changed
        if (data.optionId === 'bulbs' || data.optionId === 'brightness') {
            this.blueprint3d.setLightVisibility(showBulbs, showBrightnessEffects);
            console.log(`🔄 3D Preview: Updated light visibility - bulbs: ${showBulbs}, effects: ${showBrightnessEffects}`);
        }
        
        if (data.optionId === 'labels') {
            this.blueprint3d.setShowLightLabels(showLabels);
            console.log(`🔄 3D Preview: Updated light labels visibility: ${showLabels}`);
        }
    }
}

// Export for ES6 modules
export { Preview3DPanel };