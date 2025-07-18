/**
 * Blueprint3D Adapter for LightMapper
 * Provides a translation layer between Fabric.js 2D floorplan and Three.js 3D visualization
 * Based on the blueprint-js architecture but tailored for Home Assistant light control
 */

// Use global THREE object from CDN

class Blueprint3DAdapter {
    constructor(options = {}) {
        this.options = {
            units: 'imperial', // or 'metric'
            wallHeight: 10, // feet or meters based on units
            wallThickness: 0.5,
            ambientLight: 0.4,
            enableShadows: true,
            physicallyCorrectLights: true,
            ...options
        };
        
        this.model = {
            corners: [],
            walls: [],
            rooms: [],
            lights: []
        };
        
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.lightObjects = new Map(); // entityId -> THREE.Light mapping
        this.wallMeshes = [];
        this.floorMeshes = [];
        this.dimensionLabels = [];
        
        this.showDimensions = true; // Toggle for dimension display
        this.showRoomLabels = options.showRoomLabels !== false; // Toggle for room labels
        this.roomLabelSprites = []; // Store room label sprites
        this.isInitialized = false;
    }
    
    /**
     * Initialize the 3D viewer
     * @param {HTMLElement} container - The container element for the 3D view
     */
    init3DViewer(container) {
        console.log('🎬 Initializing 3D viewer...');
        
        if (!container) {
            console.error('Container element required for 3D viewer');
            return;
        }
        
        // Check if Three.js and required components are loaded
        if (typeof THREE === 'undefined') {
            console.error('❌ Three.js not loaded!');
            throw new Error('Three.js library not found');
        }
        
        if (typeof OrbitControls === 'undefined') {
            console.error('❌ OrbitControls not loaded!');
            throw new Error('OrbitControls not found');
        }
        
        console.log('✅ Three.js and controls loaded successfully');
        console.log('📦 Container dimensions:', container.clientWidth, 'x', container.clientHeight);
        
        // Setup scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);
        console.log('🎨 Scene created');
        
        // Setup camera
        const aspect = container.clientWidth / container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
        this.camera.position.set(0, 20, 30);
        
        // Setup renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.shadowMap.enabled = this.options.enableShadows;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Enable physically correct lighting
        if (this.options.physicallyCorrectLights) {
            this.renderer.physicallyCorrectLights = true;
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.0;
        }
        
        container.appendChild(this.renderer.domElement);
        
        // Setup controls - OrbitControls is in global scope when loaded from CDN
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 100;
        this.controls.maxPolarAngle = Math.PI / 2;
        
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, this.options.ambientLight);
        this.scene.add(ambientLight);
        
        // Add directional light for sun
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight.position.set(10, 20, 5);
        directionalLight.castShadow = this.options.enableShadows;
        directionalLight.shadow.camera.left = -20;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.bottom = -20;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        // Add a grid helper for reference
        const gridHelper = new THREE.GridHelper(100, 20, 0x444444, 0x222222);
        this.scene.add(gridHelper);
        
        // Setup resize handler
        window.addEventListener('resize', () => this.onWindowResize(container));
        
        // Setup mouse interaction
        container.addEventListener('mousemove', (e) => this.onMouseMove(e, container));
        container.addEventListener('click', (e) => this.onMouseClick(e, container));
        
        // Listen for layer visibility changes
        window.addEventListener('onLayerVisibilityChanged', (e) => {
            this.onLayerVisibilityChanged(e.detail);
        });
        
        // Listen for WebSocket light state changes
        if (window.haWsClient) {
            window.haWsClient.on('light_state_changed', (data) => {
                this.onLightStateChanged(data);
            });
        }
        
        this.isInitialized = true;
        this.animate();
        
        console.log('✅ Blueprint3D Adapter initialized');
    }
    
    /**
     * Convert Fabric.js floorplan data to 3D model
     * @param {Object} fabricData - The Fabric.js canvas data
     */
    loadFromFabric(fabricData) {
        console.log('🔄 Loading floorplan data into 3D scene...');
        
        // Clear existing model
        this.clearScene();
        
        // Reset model data
        this.model.corners = [];
        this.model.walls = [];
        this.model.rooms = [];
        this.model.lights = [];
        
        // Find canvas bounds for centering
        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;
        
        // First pass - find bounds
        fabricData.objects.forEach(obj => {
            if (obj.roomObject) {
                if (obj.type === 'rect' || obj.type === 'Rect') {
                    // Rectangle room
                    minX = Math.min(minX, obj.left);
                    maxX = Math.max(maxX, obj.left + obj.width);
                    minZ = Math.min(minZ, obj.top);
                    maxZ = Math.max(maxZ, obj.top + obj.height);
                } else if (obj.points) {
                    // Polygon room
                    obj.points.forEach(point => {
                        const x = obj.left + point.x;
                        const z = obj.top + point.y;
                        minX = Math.min(minX, x);
                        maxX = Math.max(maxX, x);
                        minZ = Math.min(minZ, z);
                        maxZ = Math.max(maxZ, z);
                    });
                }
            }
        });
        
        // Calculate center offset
        const centerX = (minX + maxX) / 2;
        const centerZ = (minZ + maxZ) / 2;
        
        // Extract corners from room objects
        const corners = new Map();
        let cornerIndex = 0;
        
        // Process room objects to extract corners and walls
        fabricData.objects.forEach(obj => {
            if (obj.roomObject) {
                const roomCorners = [];
                let points = [];
                
                if (obj.type === 'rect' || obj.type === 'Rect') {
                    // Convert rectangle to points
                    points = [
                        { x: 0, y: 0 },
                        { x: obj.width, y: 0 },
                        { x: obj.width, y: obj.height },
                        { x: 0, y: obj.height }
                    ];
                } else if (obj.points) {
                    // Use existing polygon points
                    points = obj.points;
                } else {
                    console.warn('Unknown room type:', obj.type);
                    return;
                }
                
                points.forEach(point => {
                    // Center the coordinates
                    const x = (obj.left + point.x) - centerX;
                    const z = (obj.top + point.y) - centerZ;
                    const key = `${x.toFixed(2)},${z.toFixed(2)}`;
                    
                    if (!corners.has(key)) {
                        corners.set(key, {
                            id: cornerIndex++,
                            x: x,
                            z: z
                        });
                    }
                    roomCorners.push(corners.get(key).id);
                });
                
                // Create walls from consecutive corners
                for (let i = 0; i < roomCorners.length; i++) {
                    const corner1 = roomCorners[i];
                    const corner2 = roomCorners[(i + 1) % roomCorners.length];
                    
                    this.model.walls.push({
                        corner1: corner1,
                        corner2: corner2,
                        thickness: this.options.wallThickness,
                        height: obj.wallHeight || this.options.wallHeight
                    });
                }
                
                this.model.rooms.push({
                    corners: roomCorners,
                    name: obj.roomName || `Room ${this.model.rooms.length + 1}`,
                    fillColor: obj.fill || '#f0f0f0',
                    wallHeight: obj.wallHeight || this.options.wallHeight
                });
            }
        });
        
        // Convert corners map to array
        this.model.corners = Array.from(corners.values());
        
        // Extract lights
        fabricData.objects.forEach(obj => {
            if (obj.lightObject && obj.entityId) {
                this.model.lights.push({
                    entityId: obj.entityId,
                    x: obj.left - centerX,
                    z: obj.top - centerZ,
                    y: this.options.wallHeight * 0.9, // Near ceiling
                    style: obj.iconStyle || 'spot'
                });
            }
        });
        
        console.log(`📊 Loaded: ${this.model.rooms.length} rooms, ${this.model.walls.length} walls, ${this.model.lights.length} lights`);
        
        // Build 3D scene
        this.buildScene();
    }
    
    /**
     * Build the 3D scene from the model
     */
    buildScene() {
        if (!this.isInitialized) return;
        
        // Create floor for each room with dimension labels
        this.model.rooms.forEach((room, roomIndex) => {
            const shape = new THREE.Shape();
            let minX = Infinity, maxX = -Infinity;
            let minZ = Infinity, maxZ = -Infinity;
            
            room.corners.forEach((cornerId, index) => {
                const corner = this.model.corners[cornerId];
                const x = this.convertUnits(corner.x);
                const z = this.convertUnits(corner.z);
                
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minZ = Math.min(minZ, z);
                maxZ = Math.max(maxZ, z);
                
                if (index === 0) {
                    shape.moveTo(x, z);
                } else {
                    shape.lineTo(x, z);
                }
            });
            shape.closePath();
            
            // Create floor
            const geometry = new THREE.ShapeGeometry(shape);
            
            // Parse room fill color
            let floorColor = 0xf0f0f0; // Default gray
            let opacity = 1.0;
            
            if (room.fillColor) {
                // Handle rgba() format
                if (room.fillColor.startsWith('rgba')) {
                    const rgba = room.fillColor.match(/[\d.]+/g);
                    if (rgba && rgba.length >= 3) {
                        const r = parseInt(rgba[0]);
                        const g = parseInt(rgba[1]);
                        const b = parseInt(rgba[2]);
                        floorColor = (r << 16) + (g << 8) + b;
                        
                        // Get opacity if provided
                        if (rgba.length >= 4) {
                            opacity = parseFloat(rgba[3]);
                        }
                    }
                } 
                // Handle hex format
                else if (room.fillColor.startsWith('#')) {
                    floorColor = parseInt(room.fillColor.replace('#', '0x'));
                }
                // Handle rgb() format
                else if (room.fillColor.startsWith('rgb(')) {
                    const rgb = room.fillColor.match(/\d+/g);
                    if (rgb && rgb.length >= 3) {
                        const r = parseInt(rgb[0]);
                        const g = parseInt(rgb[1]);
                        const b = parseInt(rgb[2]);
                        floorColor = (r << 16) + (g << 8) + b;
                    }
                }
            }
            
            const material = new THREE.MeshStandardMaterial({ 
                color: floorColor,
                opacity: opacity,
                transparent: opacity < 1.0,
                roughness: 0.8,
                metalness: 0.1,
                side: THREE.DoubleSide
            });
            const floor = new THREE.Mesh(geometry, material);
            floor.rotation.x = -Math.PI / 2;
            floor.receiveShadow = true;
            this.scene.add(floor);
            this.floorMeshes.push(floor);
            
            // Add dimension text
            const width = Math.abs(maxX - minX);
            const depth = Math.abs(maxZ - minZ);
            const height = room.wallHeight || this.options.wallHeight;
            
            // Width and depth are already in the correct units from convertUnits
            const widthFt = width;
            const depthFt = depth;
            
            const dimensionText = `${widthFt.toFixed(1)}' × ${depthFt.toFixed(1)}' × ${height}'`;
            this.createDimensionLabel(dimensionText, (minX + maxX) / 2, height / 2, (minZ + maxZ) / 2);
            
            // Add room name label
            if (room.name) {
                this.createRoomLabel(room.name, (minX + maxX) / 2, 0.1, (minZ + maxZ) / 2);
            }
        });
        
        // Create walls
        this.model.walls.forEach(wall => {
            const corner1 = this.model.corners[wall.corner1];
            const corner2 = this.model.corners[wall.corner2];
            
            const start = new THREE.Vector3(
                this.convertUnits(corner1.x), 
                0, 
                this.convertUnits(corner1.z)
            );
            const end = new THREE.Vector3(
                this.convertUnits(corner2.x), 
                0, 
                this.convertUnits(corner2.z)
            );
            
            const wallHeight = wall.height || this.options.wallHeight;
            const wallMesh = this.createWall(start, end, wallHeight);
            this.scene.add(wallMesh);
            this.wallMeshes.push(wallMesh);
        });
        
        // Create lights
        this.model.lights.forEach(lightData => {
            this.createLight(lightData);
        });
    }
    
    /**
     * Create dimension label text
     */
    createDimensionLabel(text, x, y, z) {
        if (!this.showDimensions) return;
        
        // Create a canvas to render text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        // Setup text style
        context.fillStyle = 'rgba(255, 255, 255, 0.8)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#000000';
        context.font = 'bold 20px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Add background stroke for better visibility
        context.strokeStyle = 'white';
        context.lineWidth = 3;
        context.strokeText(text, canvas.width / 2, canvas.height / 2);
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        // Create sprite material
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            color: 0xffffff,
            transparent: true,
            opacity: 0.95
        });
        
        // Create sprite
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.set(x, y, z);
        sprite.scale.set(3, 0.75, 1); // Adjust scale as needed
        
        this.scene.add(sprite);
        this.dimensionLabels.push(sprite);
    }
    
    /**
     * Create room name label
     */
    createRoomLabel(text, x, y, z) {
        // Create a canvas to render text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;
        
        // Setup text style
        context.fillStyle = 'rgba(255, 255, 255, 0.9)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#000000';
        context.font = 'bold 36px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Add background stroke for better visibility
        context.strokeStyle = 'white';
        context.lineWidth = 4;
        context.strokeText(text, canvas.width / 2, canvas.height / 2);
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        // Create sprite
        const material = new THREE.SpriteMaterial({ 
            map: texture,
            opacity: 0.9
        });
        const sprite = new THREE.Sprite(material);
        sprite.position.set(x, y, z);
        sprite.scale.set(2, 0.5, 1);
        sprite.visible = this.showRoomLabels;
        
        // Add sprite to scene
        this.scene.add(sprite);
        this.roomLabelSprites.push(sprite);
    }
    
    /**
     * Create a wall mesh between two points
     */
    createWall(start, end, wallHeight) {
        const direction = new THREE.Vector3().subVectors(end, start);
        const length = direction.length();
        direction.normalize();
        
        // Wall height is already in feet, don't convert from pixels
        let heightInUnits = wallHeight;
        if (this.options.units === 'metric') {
            heightInUnits = wallHeight * 0.3048; // Convert feet to meters
        }
        
        const geometry = new THREE.BoxGeometry(
            length,
            heightInUnits,
            this.convertUnits(this.options.wallThickness * 8) // Convert thickness from feet to pixels first
        );
        
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            roughness: 0.6,
            metalness: 0.1
        });
        
        const wall = new THREE.Mesh(geometry, material);
        wall.position.copy(start).add(end).multiplyScalar(0.5);
        wall.position.y = heightInUnits / 2;
        
        // Rotate wall to align with direction
        const angle = Math.atan2(direction.z, direction.x);
        wall.rotation.y = -angle;
        
        wall.castShadow = true;
        wall.receiveShadow = true;
        
        return wall;
    }
    
    /**
     * Create a light in the 3D scene
     */
    createLight(lightData) {
        let light;
        
        if (lightData.style === 'spot') {
            light = new THREE.SpotLight(0xffffff, 1, 20, Math.PI / 4, 0.5, 2);
            light.target.position.set(
                this.convertUnits(lightData.x),
                0,
                this.convertUnits(lightData.z)
            );
            this.scene.add(light.target);
        } else {
            light = new THREE.PointLight(0xffffff, 1, 20, 2);
        }
        
        light.position.set(
            this.convertUnits(lightData.x),
            this.convertUnits(lightData.y),
            this.convertUnits(lightData.z)
        );
        
        light.castShadow = this.options.enableShadows;
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
        
        // Add a visual indicator for the light
        const bulbGeometry = new THREE.SphereGeometry(0.2, 16, 8);
        // Use MeshStandardMaterial which supports emissive
        const bulbMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 0.8,
            metalness: 0.3,
            roughness: 0.4
        });
        const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
        light.add(bulb);
        
        light.name = lightData.entityId;
        this.scene.add(light);
        
        // Check if the light's layer is visible
        const layerManager = window.layerManager;
        if (layerManager) {
            const canvasPanel = window.panelManager?.getPanel('canvas');
            if (canvasPanel && canvasPanel.floorplanEditor?.canvas) {
                const lightObject = canvasPanel.floorplanEditor.canvas.getObjects().find(obj => 
                    obj.entityId === lightData.entityId && obj.lightObject
                );
                
                if (lightObject && lightObject.customLayer) {
                    const layer = layerManager.layers[lightObject.customLayer];
                    if (layer && layer.visible === false) {
                        bulb.visible = false;
                        console.log(`🔦 3D bulb hidden for ${lightData.entityId} (layer not visible)`);
                    }
                }
            }
        }
        
        // Store both light and bulb references
        this.lightObjects.set(lightData.entityId, {
            light: light,
            bulb: bulb
        });
    }
    
    /**
     * Update light state from Home Assistant
     */
    updateLightState(entityId, state) {
        const lightData = this.lightObjects.get(entityId);
        if (!lightData || !lightData.light) return;
        
        const light = lightData.light;
        const bulb = lightData.bulb;
        
        // Update on/off
        light.visible = state.state === 'on';
        
        if (state.state === 'on' && state.attributes) {
            // Update brightness
            if (state.attributes.brightness !== undefined) {
                light.intensity = (state.attributes.brightness / 255) * 2;
            }
            
            // Update color
            if (state.attributes.hs_color) {
                const [h, s] = state.attributes.hs_color;
                light.color.setHSL(h / 360, s / 100, 0.5);
                
                // Update bulb color
                const bulb = light.children[0];
                if (bulb) {
                    bulb.material.color.copy(light.color);
                    bulb.material.emissive.copy(light.color);
                }
            } else if (state.attributes.color_temp_kelvin) {
                // Convert Kelvin to RGB
                const temp = state.attributes.color_temp_kelvin;
                const color = this.kelvinToRGB(temp);
                light.color.copy(color);
                
                // Update bulb color
                const bulb = light.children[0];
                if (bulb) {
                    bulb.material.color.copy(color);
                    bulb.material.emissive.copy(color);
                }
            }
            
            // Update spot light angle if applicable
            if (light.isSpotLight && state.attributes.angle !== undefined) {
                light.angle = THREE.MathUtils.degToRad(state.attributes.angle);
            }
        }
    }
    
    /**
     * Convert Kelvin temperature to RGB color
     */
    kelvinToRGB(kelvin) {
        const temp = kelvin / 100;
        let red, green, blue;
        
        if (temp <= 66) {
            red = 255;
            green = temp;
            green = 99.4708025861 * Math.log(green) - 161.1195681661;
            
            if (temp <= 19) {
                blue = 0;
            } else {
                blue = temp - 10;
                blue = 138.5177312231 * Math.log(blue) - 305.0447927307;
            }
        } else {
            red = temp - 60;
            red = 329.698727446 * Math.pow(red, -0.1332047592);
            
            green = temp - 60;
            green = 288.1221695283 * Math.pow(green, -0.0755148492);
            
            blue = 255;
        }
        
        return new THREE.Color(
            Math.max(0, Math.min(255, red)) / 255,
            Math.max(0, Math.min(255, green)) / 255,
            Math.max(0, Math.min(255, blue)) / 255
        );
    }
    
    /**
     * Convert units based on settings
     */
    convertUnits(value) {
        // Convert from pixels to 3D units
        // Get scale from settings or FloorplanEditor
        let pixelsPerFoot = 48; // Default
        
        // Try to get from settings first
        if (window.settingsBar && window.settingsBar.settings.scaleFrom) {
            pixelsPerFoot = window.settingsBar.settings.scaleFrom;
        } 
        // Fall back to FloorplanEditor
        else if (window.floorplanEditor && window.floorplanEditor.pixelsPerFoot) {
            pixelsPerFoot = window.floorplanEditor.pixelsPerFoot;
        }
        
        const feet = value / pixelsPerFoot;
        
        if (this.options.units === 'metric') {
            // Convert feet to meters
            return feet * 0.3048;
        } else {
            // Keep in feet
            return feet;
        }
    }
    
    /**
     * Clear the 3D scene
     */
    clearScene() {
        // Remove dimension labels
        this.dimensionLabels.forEach(label => {
            this.scene.remove(label);
            if (label.material.map) {
                label.material.map.dispose();
            }
            label.material.dispose();
        });
        this.dimensionLabels = [];
        
        // Remove room labels
        this.roomLabelSprites.forEach(sprite => {
            this.scene.remove(sprite);
            if (sprite.material.map) {
                sprite.material.map.dispose();
            }
            sprite.material.dispose();
        });
        this.roomLabelSprites = [];
        
        // Remove walls
        this.wallMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
        });
        this.wallMeshes = [];
        
        // Remove floors
        this.floorMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
        });
        this.floorMeshes = [];
        
        // Remove lights and their bulbs
        this.lightObjects.forEach((lightData, entityId) => {
            if (lightData.light) {
                // Remove bulb first
                if (lightData.bulb) {
                    lightData.light.remove(lightData.bulb);
                    if (lightData.bulb.geometry) lightData.bulb.geometry.dispose();
                    if (lightData.bulb.material) lightData.bulb.material.dispose();
                }
                
                // Remove light
                this.scene.remove(lightData.light);
                if (lightData.light.target) {
                    this.scene.remove(lightData.light.target);
                }
                
                // Dispose of shadow map
                if (lightData.light.shadow && lightData.light.shadow.map) {
                    lightData.light.shadow.map.dispose();
                }
                
                lightData.light.dispose();
            }
        });
        this.lightObjects.clear();
        
        // Clear model
        this.model = {
            corners: [],
            walls: [],
            rooms: [],
            lights: []
        };
        
        // Force renderer to clean up
        if (this.renderer) {
            this.renderer.renderLists.dispose();
        }
    }
    
    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.controls) {
            this.controls.update();
        }
        
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    /**
     * Handle window resize
     */
    onWindowResize(container) {
        if (!container || !this.camera || !this.renderer) return;
        
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }
    
    /**
     * Handle mouse move
     */
    onMouseMove(event, container) {
        const rect = container.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;
    }
    
    /**
     * Handle mouse click
     */
    onMouseClick(event, container) {
        this.onMouseMove(event, container);
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Check for light intersections
        const lights = Array.from(this.lightObjects.values());
        const intersects = this.raycaster.intersectObjects(lights, true);
        
        if (intersects.length > 0) {
            const clickedLight = intersects[0].object.parent;
            if (clickedLight && clickedLight.name) {
                // Dispatch event for light selection
                window.dispatchEvent(new CustomEvent('blueprint3d:lightSelected', {
                    detail: { entityId: clickedLight.name }
                }));
            }
        }
    }
    
    /**
     * Handle layer visibility changes
     * @param {Object} detail - The layer visibility change details
     */
    onLayerVisibilityChanged(detail) {
        if (!detail || !detail.layerId) return;
        
        const layerId = detail.layerId;
        const isVisible = detail.visible;
        
        // Get the layer from the layer manager
        const layerManager = window.layerManager;
        if (!layerManager) return;
        
        const layer = layerManager.layers[layerId];
        if (!layer || layer.objectType !== 'light') return;
        
        // Find the light object by its entity ID
        const canvasPanel = window.panelManager?.getPanel('canvas');
        if (!canvasPanel || !canvasPanel.floorplanEditor?.canvas) return;
        
        const lightObject = canvasPanel.floorplanEditor.canvas.getObjects().find(obj => 
            obj.customLayer === layerId && obj.lightObject
        );
        
        if (lightObject && lightObject.entityId) {
            // Update the 3D bulb visibility
            const lightData = this.lightObjects.get(lightObject.entityId);
            if (lightData && lightData.bulb) {
                lightData.bulb.visible = isVisible;
                console.log(`🔦 3D bulb visibility updated for ${lightObject.entityId}: ${isVisible}`);
            }
        }
    }
    
    /**
     * Handle light state changes from WebSocket
     * @param {Object} data - The light state change data
     */
    onLightStateChanged(data) {
        if (!data || !data.entityId || !data.state) return;
        
        const entityId = data.entityId;
        const state = data.state;
        
        // Update the 3D light state
        this.updateLightState(entityId, state);
        
        console.log(`💡 3D light state updated via WebSocket: ${entityId} (${state.state})`);
    }
    
    /**
     * Export scene as GLTF
     */
    exportGLTF(callback) {
        // GLTFExporter is in global scope when loaded from CDN
        const exporter = new GLTFExporter();
        exporter.parse(this.scene, callback, { binary: false });
    }
    
    /**
     * Switch to first person view
     */
    switchToFirstPerson() {
        // Implementation for first person navigation
        // This would require additional controls setup
    }
    
    /**
     * Get screenshot of current view
     */
    getScreenshot() {
        if (!this.renderer) return null;
        return this.renderer.domElement.toDataURL('image/png');
    }
    
    /**
     * Toggle dimension label visibility
     */
    toggleDimensions() {
        this.showDimensions = !this.showDimensions;
        this.dimensionLabels.forEach(label => {
            label.visible = this.showDimensions;
        });
        if (this.renderer) {
            this.renderer.render(this.scene, this.camera);
        }
        return this.showDimensions;
    }
    
    /**
     * Set room label visibility
     * @param {boolean} show - Whether to show room labels
     */
    setShowRoomLabels(show) {
        this.showRoomLabels = show;
        this.roomLabelSprites.forEach(sprite => {
            sprite.visible = this.showRoomLabels;
        });
        if (this.renderer) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    /**
     * Set light visibility (bulbs and light effects)
     * @param {boolean} showBulbs - Whether to show light bulbs
     * @param {boolean} showLights - Whether to show light effects
     */
    setLightVisibility(showBulbs, showLights) {
        this.lightObjects.forEach((lightData, entityId) => {
            if (lightData.bulb) {
                lightData.bulb.visible = showBulbs;
            }
            if (lightData.light) {
                lightData.light.visible = showLights;
            }
        });
        
        if (this.renderer) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    /**
     * Set light label visibility
     * @param {boolean} show - Whether to show light labels
     */
    setShowLightLabels(show) {
        // TODO: Implement light labels in 3D
        console.log('🏷️ Light labels in 3D not yet implemented');
    }
    
    /**
     * Set brightness effect visibility
     * @param {boolean} show - Whether to show brightness effects
     */
    setShowBrightnessEffects(show) {
        // In 3D, brightness effects are the actual lights
        this.lightObjects.forEach((lightData, entityId) => {
            if (lightData.light) {
                lightData.light.visible = show;
            }
        });
        
        if (this.renderer) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    /**
     * Set visibility for a single light
     * @param {string} entityId - The light entity ID
     * @param {boolean} visible - Whether to show the light
     */
    setSingleLightVisibility(entityId, visible) {
        const lightData = this.lightObjects.get(entityId);
        if (!lightData) {
            console.warn(`⚠️ Light not found in 3D: ${entityId}`);
            return;
        }
        
        // Hide/show both bulb and light effect
        if (lightData.bulb) {
            lightData.bulb.visible = visible;
        }
        if (lightData.light) {
            lightData.light.visible = visible;
        }
        
        console.log(`💡 3D: Set light ${entityId} visibility to ${visible}`);
        
        if (this.renderer) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

// Make available globally
window.Blueprint3DAdapter = Blueprint3DAdapter;