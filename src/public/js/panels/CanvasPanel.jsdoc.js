/**
 * @typedef {Object} LightObject
 * @property {string} entityId - The Home Assistant entity ID
 * @property {boolean} lightObject - Flag indicating this is a light
 * @property {string} lightStyle - Visual style of the light
 * @property {number} left - X position
 * @property {number} top - Y position
 * @property {number} radius - Light radius
 */

/**
 * @typedef {Object} SceneSettings
 * @property {number} [brightness] - Brightness percentage (0-100)
 * @property {number} [kelvin] - Color temperature in Kelvin
 * @property {Object} [color] - Color settings
 * @property {number} color.hue - Hue value (0-360)
 * @property {number} color.saturation - Saturation percentage (0-100)
 */

/**
 * Canvas Panel API
 * @class CanvasPanel
 * @extends BasePanel
 * 
 * @example
 * // Get the canvas panel instance
 * const canvasPanel = window.panelManager.getPanel('canvas');
 * 
 * @example
 * // Find and select a light
 * const light = canvasPanel.findLightByEntityId('light.kitchen');
 * if (light) {
 *   canvasPanel.selectObject(light);
 *   canvasPanel.centerOnObject(light);
 * }
 * 
 * @example
 * // Assign entity to selected light
 * const selectedLight = canvasPanel.getEditor()?.selectedLight;
 * if (selectedLight) {
 *   canvasPanel.assignEntityToLight(selectedLight, 'light.bedroom');
 * }
 */

// METHOD DOCUMENTATION

/**
 * Get all light objects from the canvas
 * @method getLights
 * @returns {LightObject[]} Array of light objects
 * @example
 * const lights = canvasPanel.getLights();
 * console.log(`Found ${lights.length} lights on canvas`);
 */

/**
 * Get all assigned entities from floorplan lights
 * @method getAssignedEntities
 * @returns {Object[]} Array of entity objects with their Home Assistant data
 * @example
 * const entities = canvasPanel.getAssignedEntities();
 * entities.forEach(entity => {
 *   console.log(entity.entity_id, entity.friendly_name);
 * });
 */

/**
 * Find a light by its entity ID
 * @method findLightByEntityId
 * @param {string} entityId - The Home Assistant entity ID
 * @returns {LightObject|undefined} The light object if found
 * @example
 * const kitchenLight = canvasPanel.findLightByEntityId('light.kitchen');
 */

/**
 * Select an object on the canvas
 * @method selectObject
 * @param {fabric.Object} object - The Fabric.js object to select
 * @fires CanvasPanel#onObjectSelected
 * @example
 * canvasPanel.selectObject(lightObject);
 */

/**
 * Center the viewport on an object
 * @method centerOnObject
 * @param {fabric.Object} object - The object to center on
 * @example
 * const light = canvasPanel.findLightByEntityId('light.bedroom');
 * canvasPanel.centerOnObject(light);
 */

/**
 * Assign a Home Assistant entity to a light object
 * @method assignEntityToLight
 * @param {LightObject} light - The light object
 * @param {string} entityId - The Home Assistant entity ID
 * @returns {boolean} True if assignment was successful
 * @fires CanvasPanel#onLightEntityAssigned
 * @example
 * const success = canvasPanel.assignEntityToLight(lightObj, 'light.kitchen');
 * if (success) {
 *   console.log('Entity assigned successfully');
 * }
 */

/**
 * Update light appearance based on scene settings
 * @method updateLightFromSceneSettings
 * @param {string} entityId - The entity ID of the light
 * @param {SceneSettings} settings - The scene settings to apply
 * @example
 * canvasPanel.updateLightFromSceneSettings('light.kitchen', {
 *   brightness: 80,
 *   kelvin: 3000,
 *   color: { hue: 120, saturation: 50 }
 * });
 */

/**
 * Set the active drawing tool
 * @method setTool
 * @param {string} toolName - Tool name: 'select', 'light', 'room', 'line', 'text'
 * @example
 * canvasPanel.setTool('light'); // Switch to light placement tool
 */

/**
 * Get the current canvas state for saving
 * @method getCanvasState
 * @returns {Object|null} Canvas state object with objects, viewport, and zoom
 * @example
 * const state = canvasPanel.getCanvasState();
 * localStorage.setItem('canvasState', JSON.stringify(state));
 */

/**
 * Load a canvas layout
 * @method loadLayout
 * @param {Object} layoutData - The layout data to load
 * @param {Function} [callback] - Optional callback when loading is complete
 * @example
 * const savedLayout = JSON.parse(localStorage.getItem('canvasState'));
 * canvasPanel.loadLayout(savedLayout, () => {
 *   console.log('Layout loaded successfully');
 * });
 */

// EVENTS DOCUMENTATION

/**
 * Fired when an object is selected on the canvas
 * @event CanvasPanel#onObjectSelected
 * @type {Object}
 * @property {fabric.Object} object - The selected object
 * @example
 * // In another panel
 * onObjectSelected(data) {
 *   console.log('Object selected:', data.object);
 *   this.displayObjectProperties(data.object);
 * }
 */

/**
 * Fired when an object is deselected
 * @event CanvasPanel#onObjectDeselected
 * @example
 * // In another panel
 * onObjectDeselected() {
 *   this.clearPropertyDisplay();
 * }
 */

/**
 * Fired when a light is modified
 * @event CanvasPanel#onLightModified
 * @type {Object}
 * @property {LightObject} light - The modified light object
 */

/**
 * Fired when an entity is assigned to a light
 * @event CanvasPanel#onLightEntityAssigned
 * @type {Object}
 * @property {LightObject} light - The light object
 * @property {string} entityId - The assigned entity ID
 */