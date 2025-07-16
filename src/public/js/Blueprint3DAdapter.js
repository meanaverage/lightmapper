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
        
        // Setup controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
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
        
        // Add a test cube to verify rendering
        const geometry = new THREE.BoxGeometry(5, 5, 5);
        const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.y = 2.5;
        cube.castShadow = true;
        cube.receiveShadow = true;
        this.scene.add(cube);
        console.log('🟩 Test cube added to scene');
        
        // Add a ground plane
        const planeGeometry = new THREE.PlaneGeometry(50, 50);
        const planeMaterial = new THREE.MeshPhongMaterial({ color: 0xcccccc, side: THREE.DoubleSide });
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotation.x = -Math.PI / 2;
        plane.receiveShadow = true;
        this.scene.add(plane);
        console.log('⬜ Ground plane added to scene');
        
        // Setup resize handler
        window.addEventListener('resize', () => this.onWindowResize(container));
        
        // Setup mouse interaction
        container.addEventListener('mousemove', (e) => this.onMouseMove(e, container));
        container.addEventListener('click', (e) => this.onMouseClick(e, container));
        
        this.isInitialized = true;
        this.animate();
        
        console.log('✅ Blueprint3D Adapter initialized');
    }
    
    /**
     * Convert Fabric.js floorplan data to 3D model
     * @param {Object} fabricData - The Fabric.js canvas data
     */
    loadFromFabric(fabricData) {
        // Clear existing model
        this.clearScene();
        
        // Extract corners from room objects
        const corners = new Map();
        let cornerIndex = 0;
        
        // Process room objects to extract corners and walls
        fabricData.objects.forEach(obj => {
            if (obj.roomObject && obj.points) {
                const roomCorners = [];
                
                obj.points.forEach(point => {
                    const x = obj.left + point.x;
                    const z = obj.top + point.y;
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
                        thickness: this.options.wallThickness
                    });
                }
                
                this.model.rooms.push({
                    corners: roomCorners,
                    name: obj.roomName || `Room ${this.model.rooms.length + 1}`
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
                    x: obj.left,
                    z: obj.top,
                    y: this.options.wallHeight * 0.9, // Near ceiling
                    style: obj.iconStyle || 'spot'
                });
            }
        });
        
        // Build 3D scene
        this.buildScene();
    }
    
    /**
     * Build the 3D scene from the model
     */
    buildScene() {
        if (!this.isInitialized) return;
        
        // Create floor for each room
        this.model.rooms.forEach(room => {
            const shape = new THREE.Shape();
            
            room.corners.forEach((cornerId, index) => {
                const corner = this.model.corners[cornerId];
                const x = this.convertUnits(corner.x);
                const z = this.convertUnits(corner.z);
                
                if (index === 0) {
                    shape.moveTo(x, z);
                } else {
                    shape.lineTo(x, z);
                }
            });
            shape.closePath();
            
            // Create floor
            const geometry = new THREE.ShapeGeometry(shape);
            const material = new THREE.MeshStandardMaterial({ 
                color: 0xcccccc,
                roughness: 0.8,
                metalness: 0.1
            });
            const floor = new THREE.Mesh(geometry, material);
            floor.rotation.x = -Math.PI / 2;
            floor.receiveShadow = true;
            this.scene.add(floor);
            this.floorMeshes.push(floor);
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
            
            const wallMesh = this.createWall(start, end);
            this.scene.add(wallMesh);
            this.wallMeshes.push(wallMesh);
        });
        
        // Create lights
        this.model.lights.forEach(lightData => {
            this.createLight(lightData);
        });
    }
    
    /**
     * Create a wall mesh between two points
     */
    createWall(start, end) {
        const direction = new THREE.Vector3().subVectors(end, start);
        const length = direction.length();
        direction.normalize();
        
        const geometry = new THREE.BoxGeometry(
            length,
            this.convertUnits(this.options.wallHeight),
            this.convertUnits(this.options.wallThickness)
        );
        
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            roughness: 0.6,
            metalness: 0.1
        });
        
        const wall = new THREE.Mesh(geometry, material);
        wall.position.copy(start).add(end).multiplyScalar(0.5);
        wall.position.y = this.convertUnits(this.options.wallHeight) / 2;
        
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
            light = new THREE.SpotLight(0xffffff, 1, 0, Math.PI / 4, 0.5, 2);
            light.target.position.set(
                this.convertUnits(lightData.x),
                0,
                this.convertUnits(lightData.z)
            );
            this.scene.add(light.target);
        } else {
            light = new THREE.PointLight(0xffffff, 1, 0, 2);
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
        const bulbMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 0.5
        });
        const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
        light.add(bulb);
        
        light.name = lightData.entityId;
        this.scene.add(light);
        this.lightObjects.set(lightData.entityId, light);
    }
    
    /**
     * Update light state from Home Assistant
     */
    updateLightState(entityId, state) {
        const light = this.lightObjects.get(entityId);
        if (!light) return;
        
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
        // Assuming Fabric.js uses pixels and we want feet/meters
        // This is a rough conversion - adjust based on your actual scale
        const pixelsPerFoot = 30; // Adjust this based on your grid size
        const pixelsPerMeter = pixelsPerFoot * 3.28084;
        
        if (this.options.units === 'metric') {
            return value / pixelsPerMeter;
        } else {
            return value / pixelsPerFoot;
        }
    }
    
    /**
     * Clear the 3D scene
     */
    clearScene() {
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
        
        // Remove lights
        this.lightObjects.forEach(light => {
            this.scene.remove(light);
        });
        this.lightObjects.clear();
        
        // Clear model
        this.model = {
            corners: [],
            walls: [],
            rooms: [],
            lights: []
        };
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
     * Export scene as GLTF
     */
    exportGLTF(callback) {
        const exporter = new THREE.GLTFExporter();
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
}

// Make available globally
window.Blueprint3DAdapter = Blueprint3DAdapter;