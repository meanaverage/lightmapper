# Panel System API Reference

## Overview
The LightMapper application uses a modular panel system where each UI component extends BasePanel and communicates through a PanelManager. The canvas (Fabric.js floorplan editor) is wrapped in a CanvasPanel that provides a clean API.

## Architecture

```
PanelManager
├── CanvasPanel (wraps FloorplanEditor)
├── LightsPanel (Scene light controls)
├── ScenesPanel (Scene management)
├── LiveStatePanel (Real-time light states)
├── EntitiesPanel (Entity browser)
├── PropertiesPanel (Object properties)
└── SceneEditorPanel (Advanced scene editing)
```

## Panel Communication

### Event Broadcasting
Panels communicate through events broadcast by PanelManager:

```javascript
// Broadcasting an event
window.panelManager.broadcast('eventName', { data });

// Receiving an event (in panel class)
onEventName(data) {
    // Handle event
}
```

### Common Events
- `onObjectSelected` - Canvas object selected
- `onObjectDeselected` - Canvas object deselected
- `onEntitySelected` - Entity selected in EntitiesPanel
- `onLightModified` - Light object modified
- `onLightEntityAssigned` - Entity assigned to light
- `onSceneSelected` - Scene selected

## CanvasPanel API

### Getting the Canvas Panel
```javascript
const canvasPanel = window.panelManager.getPanel('canvas');
```

### Light Management

```javascript
// Get all lights from canvas
const lights = canvasPanel.getLights();

// Get all assigned entities
const entities = canvasPanel.getAssignedEntities();

// Find light by entity ID
const light = canvasPanel.findLightByEntityId('light.kitchen');

// Assign entity to light
canvasPanel.assignEntityToLight(lightObject, 'light.kitchen');

// Update light from scene settings
canvasPanel.updateLightFromSceneSettings('light.kitchen', {
    brightness: 80,
    kelvin: 3000,
    color: { hue: 120, saturation: 50 }
});
```

### Canvas Control

```javascript
// Select object
canvasPanel.selectObject(fabricObject);

// Center view on object
canvasPanel.centerOnObject(fabricObject);

// Set active tool
canvasPanel.setTool('select'); // 'select', 'light', 'room', 'line', 'text'

// Toggle features
canvasPanel.toggleGrid();
canvasPanel.toggleSnap();

// Clear canvas
canvasPanel.clearCanvas();
```

### Display Modes

```javascript
// Switch between current state and scene preview
canvasPanel.setDisplayMode(true); // true = current state, false = scene preview

// Refresh all light states
canvasPanel.refreshLightStates();
```

### Network Labels

```javascript
// Show network information labels
canvasPanel.showIPLabels();
canvasPanel.showHostnameLabels();
canvasPanel.showMACLabels();

// Clear all network labels
canvasPanel.clearNetworkLabels();
```

### Canvas State

```javascript
// Get canvas state for saving
const state = canvasPanel.getCanvasState();

// Load canvas state
canvasPanel.loadLayout(layoutData, callback);

// Save current layout
const layout = canvasPanel.saveLayout();
```

### Direct Access (when needed)

```javascript
// Get Fabric.js canvas instance
const fabricCanvas = canvasPanel.getCanvas();

// Get FloorplanEditor instance
const editor = canvasPanel.getEditor();
```

## Panel Usage Examples

### EntitiesPanel → CanvasPanel
```javascript
// Assign entity to selected light
assignToSelected(entityId) {
    const canvasPanel = window.panelManager.getPanel('canvas');
    const selectedLight = canvasPanel.getEditor()?.selectedLight;
    
    if (selectedLight) {
        canvasPanel.assignEntityToLight(selectedLight, entityId);
    }
}

// Find entity in floorplan
findInFloorplan(entityId) {
    const canvasPanel = window.panelManager.getPanel('canvas');
    const light = canvasPanel.findLightByEntityId(entityId);
    
    if (light) {
        canvasPanel.selectObject(light);
        canvasPanel.centerOnObject(light);
    }
}
```

### LightsPanel → CanvasPanel
```javascript
// Get assigned entities for display
getAssignedFloorplanEntities() {
    const canvasPanel = window.panelManager.getPanel('canvas');
    return canvasPanel ? canvasPanel.getAssignedEntities() : [];
}
```

### PropertiesPanel → CanvasPanel
```javascript
// Update object property
updateObjectProperty(key, value) {
    this.selectedObject.set(key, value);
    
    const canvasPanel = window.panelManager.getPanel('canvas');
    if (canvasPanel) {
        canvasPanel.getCanvas()?.renderAll();
        canvasPanel.getEditor()?.triggerAutoSave();
    }
}
```

## Panel Registration

```javascript
// In app initialization
const panelManager = new PanelManager();

// Register panels
panelManager.register(new CanvasPanel());
panelManager.register(new LightsPanel());
panelManager.register(new ScenesPanel());
panelManager.register(new LiveStatePanel());
panelManager.register(new EntitiesPanel());
panelManager.register(new PropertiesPanel());
panelManager.register(new SceneEditorPanel());

// Initialize all panels
panelManager.init();
```

## Creating a New Panel

```javascript
import { BasePanel } from './BasePanel.js';

export class MyNewPanel extends BasePanel {
    constructor() {
        super('myPanel', 'My Panel', 'fa-icon');
    }
    
    render() {
        this.container.innerHTML = `<!-- Panel HTML -->`;
        this.bindEvents();
    }
    
    bindEvents() {
        // Set up event listeners
    }
    
    // Handle broadcast events
    onObjectSelected(data) {
        // React to canvas selection
    }
    
    // Public methods
    refresh() {
        // Refresh panel content
    }
}
```

## Best Practices

1. **Always use the Canvas API** - Don't access fabric objects directly
2. **Use events for cross-panel communication** - Don't call panel methods directly
3. **Keep panel state minimal** - Derive from canvas/global state when possible
4. **Handle panel visibility** - Pause expensive operations in `onHide()`
5. **Clean up in destroy()** - Remove intervals, listeners, etc.

## Common Patterns

### Getting Canvas Data
```javascript
// Instead of: window.floorplanEditor.canvas.getObjects()
const canvasPanel = window.panelManager.getPanel('canvas');
const lights = canvasPanel.getLights();
```

### Updating Canvas
```javascript
// Instead of: window.floorplanEditor.updateLightFromEntity()
const canvasPanel = window.panelManager.getPanel('canvas');
canvasPanel.assignEntityToLight(light, entityId);
```

### Broadcasting Changes
```javascript
// After making changes
window.panelManager.broadcast('onDataChanged', { type: 'lights' });

// Other panels listen
onDataChanged(data) {
    if (data.type === 'lights') {
        this.refresh();
    }
}
```