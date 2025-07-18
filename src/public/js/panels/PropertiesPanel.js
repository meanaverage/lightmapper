import { BasePanel } from './BasePanel.js';

export class PropertiesPanel extends BasePanel {
    constructor() {
        super('properties', 'Properties', 'fa-sliders-h');
        this.selectedObject = null;
        this.propertyGroups = [];
    }
    
    /**
     * Convert rgba color to hex
     */
    rgbaToHex(rgba) {
        // Extract rgba values
        const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
        if (!match) return '#cccccc'; // Default fallback
        
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        
        // Convert to hex
        const toHex = (n) => {
            const hex = n.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        
        return '#' + toHex(r) + toHex(g) + toHex(b);
    }

    render() {
        this.container.innerHTML = `
            <div id="propertiesContent" class="properties-content">
                <div class="properties-empty">
                    <i class="fas fa-mouse-pointer"></i>
                    <p>Select an object to view its properties</p>
                </div>
            </div>
        `;
    }

    setSelectedObject(object) {
        this.selectedObject = object;
        this.updateProperties();
    }

    updateProperties() {
        const content = document.getElementById('propertiesContent');
        if (!content) return;
        
        if (!this.selectedObject) {
            content.innerHTML = `
                <div class="properties-empty">
                    <i class="fas fa-mouse-pointer"></i>
                    <p>Select an object to view its properties</p>
                </div>
            `;
            return;
        }
        
        // Determine object type and build property groups
        this.propertyGroups = this.buildPropertyGroups(this.selectedObject);
        
        // Render property groups
        content.innerHTML = this.propertyGroups.map(group => this.renderPropertyGroup(group)).join('');
        
        // Bind property change handlers
        this.bindPropertyHandlers();
    }

    buildPropertyGroups(obj) {
        const groups = [];
        
        // Basic properties group
        const basicGroup = {
            title: 'Basic Properties',
            icon: 'fa-info-circle',
            properties: []
        };
        
        // Object type
        basicGroup.properties.push({
            name: 'Type',
            key: 'type',
            value: this.getObjectType(obj),
            readonly: true
        });
        
        // Position
        basicGroup.properties.push({
            name: 'X Position',
            key: 'left',
            value: Math.round(obj.left || 0),
            type: 'number',
            unit: 'px'
        });
        
        basicGroup.properties.push({
            name: 'Y Position',
            key: 'top',
            value: Math.round(obj.top || 0),
            type: 'number',
            unit: 'px'
        });
        
        groups.push(basicGroup);
        
        // Type-specific properties
        if (obj.lightObject) {
            groups.push(this.buildLightProperties(obj));
        } else if (obj.roomObject) {
            groups.push(this.buildRoomProperties(obj));
        } else if (obj.type === 'text') {
            groups.push(this.buildTextProperties(obj));
        } else if (obj.type === 'line') {
            groups.push(this.buildLineProperties(obj));
        } else if (obj.type === 'image') {
            groups.push(this.buildImageProperties(obj));
        }
        
        // Appearance properties
        const appearanceGroup = this.buildAppearanceProperties(obj);
        if (appearanceGroup.properties.length > 0) {
            groups.push(appearanceGroup);
        }
        
        return groups;
    }

    buildLightProperties(obj) {
        const group = {
            title: 'Light Properties',
            icon: 'fa-lightbulb',
            properties: []
        };
        
        // Entity assignment
        group.properties.push({
            name: 'Entity ID',
            key: 'entityId',
            value: obj.entityId || 'Not assigned',
            type: 'entity-select',
            placeholder: 'Select entity...'
        });
        
        // Light style
        group.properties.push({
            name: 'Light Style',
            key: 'lightStyle',
            value: obj.lightStyle || 'default',
            type: 'select',
            options: [
                { value: 'default', label: 'Default' },
                { value: 'modern', label: 'Modern' },
                { value: 'classic', label: 'Classic' },
                { value: 'minimal', label: 'Minimal' }
            ]
        });
        
        // Size
        group.properties.push({
            name: 'Size',
            key: 'radius',
            value: obj.radius || 15,
            type: 'range',
            min: 10,
            max: 50,
            step: 5,
            unit: 'px'
        });
        
        return group;
    }

    buildRoomProperties(obj) {
        const group = {
            title: 'Room Properties',
            icon: 'fa-draw-polygon',
            properties: []
        };
        
        // Room name
        group.properties.push({
            name: 'Room Name',
            key: 'roomName',
            value: obj.roomName || '',
            type: 'text',
            placeholder: 'Enter room name...'
        });
        
        // Fill color - convert rgba to hex for color input
        let fillColor = obj.fill || '#cccccc';
        if (fillColor.startsWith('rgba')) {
            fillColor = this.rgbaToHex(fillColor);
        }
        
        group.properties.push({
            name: 'Fill Color',
            key: 'fill',
            value: fillColor,
            type: 'color'
        });
        
        // Fill opacity
        group.properties.push({
            name: 'Fill Opacity',
            key: 'opacity',
            value: obj.opacity || 0.3,
            type: 'range',
            min: 0,
            max: 1,
            step: 0.1
        });
        
        // Room dimensions (for rectangles)
        if (obj.type === 'rect' || obj.type === 'Rect') {
            // Convert pixels to feet (48 pixels = 1 foot)
            const pixelsPerFoot = window.floorplanEditor?.pixelsPerFoot || 48;
            const useMetric = window.floorplanEditor?.useMetric || false;
            
            const widthInFeet = (obj.width || 100) / pixelsPerFoot;
            const heightInFeet = (obj.height || 100) / pixelsPerFoot;
            
            if (useMetric) {
                // Convert feet to meters
                const widthInMeters = widthInFeet * 0.3048;
                const heightInMeters = heightInFeet * 0.3048;
                
                group.properties.push({
                    name: 'Width',
                    key: 'width',
                    value: widthInMeters.toFixed(2),
                    type: 'number',
                    min: 0.5,
                    step: 0.1,
                    unit: 'm',
                    convertToPixels: true,
                    pixelsPerFoot: pixelsPerFoot
                });
                
                group.properties.push({
                    name: 'Height',
                    key: 'height',
                    value: heightInMeters.toFixed(2),
                    type: 'number',
                    min: 0.5,
                    step: 0.1,
                    unit: 'm',
                    convertToPixels: true,
                    pixelsPerFoot: pixelsPerFoot
                });
            } else {
                group.properties.push({
                    name: 'Width',
                    key: 'width',
                    value: widthInFeet.toFixed(1),
                    type: 'number',
                    min: 1,
                    step: 0.5,
                    unit: 'ft',
                    convertToPixels: true,
                    pixelsPerFoot: pixelsPerFoot
                });
                
                group.properties.push({
                    name: 'Height',
                    key: 'height',
                    value: heightInFeet.toFixed(1),
                    type: 'number',
                    min: 1,
                    step: 0.5,
                    unit: 'ft',
                    convertToPixels: true,
                    pixelsPerFoot: pixelsPerFoot
                });
            }
        }
        
        // Wall height (store in custom property)
        group.properties.push({
            name: 'Wall Height',
            key: 'wallHeight',
            value: obj.wallHeight || 10,
            type: 'number',
            min: 6,
            max: 20,
            unit: 'ft'
        });
        
        // Stroke width
        group.properties.push({
            name: 'Border Width',
            key: 'strokeWidth',
            value: obj.strokeWidth || 2,
            type: 'range',
            min: 1,
            max: 10,
            step: 1,
            unit: 'px'
        });
        
        return group;
    }

    buildTextProperties(obj) {
        const group = {
            title: 'Text Properties',
            icon: 'fa-font',
            properties: []
        };
        
        // Text content
        group.properties.push({
            name: 'Text',
            key: 'text',
            value: obj.text || '',
            type: 'text',
            placeholder: 'Enter text...'
        });
        
        // Font size
        group.properties.push({
            name: 'Font Size',
            key: 'fontSize',
            value: obj.fontSize || 16,
            type: 'number',
            min: 8,
            max: 72,
            unit: 'px'
        });
        
        // Font family
        group.properties.push({
            name: 'Font',
            key: 'fontFamily',
            value: obj.fontFamily || 'Arial',
            type: 'select',
            options: [
                { value: 'Arial', label: 'Arial' },
                { value: 'Helvetica', label: 'Helvetica' },
                { value: 'Times New Roman', label: 'Times New Roman' },
                { value: 'Georgia', label: 'Georgia' },
                { value: 'Courier New', label: 'Courier New' },
                { value: 'Verdana', label: 'Verdana' }
            ]
        });
        
        // Text color
        group.properties.push({
            name: 'Color',
            key: 'fill',
            value: obj.fill || '#000000',
            type: 'color'
        });
        
        return group;
    }

    buildLineProperties(obj) {
        const group = {
            title: 'Line Properties',
            icon: 'fa-slash',
            properties: []
        };
        
        // Line width
        group.properties.push({
            name: 'Width',
            key: 'strokeWidth',
            value: obj.strokeWidth || 2,
            type: 'range',
            min: 1,
            max: 20,
            step: 1,
            unit: 'px'
        });
        
        // Line color
        group.properties.push({
            name: 'Color',
            key: 'stroke',
            value: obj.stroke || '#000000',
            type: 'color'
        });
        
        // Line style
        group.properties.push({
            name: 'Style',
            key: 'strokeDashArray',
            value: obj.strokeDashArray ? 'dashed' : 'solid',
            type: 'select',
            options: [
                { value: 'solid', label: 'Solid' },
                { value: 'dashed', label: 'Dashed' },
                { value: 'dotted', label: 'Dotted' }
            ]
        });
        
        return group;
    }

    buildImageProperties(obj) {
        const group = {
            title: 'Image Properties',
            icon: 'fa-image',
            properties: []
        };
        
        // Image opacity
        group.properties.push({
            name: 'Opacity',
            key: 'opacity',
            value: obj.opacity || 1,
            type: 'range',
            min: 0,
            max: 1,
            step: 0.1
        });
        
        // Scale
        group.properties.push({
            name: 'Scale',
            key: 'scaleX',
            value: obj.scaleX || 1,
            type: 'range',
            min: 0.1,
            max: 3,
            step: 0.1
        });
        
        return group;
    }

    buildAppearanceProperties(obj) {
        const group = {
            title: 'Appearance',
            icon: 'fa-palette',
            properties: []
        };
        
        // Rotation
        if (obj.angle !== undefined) {
            group.properties.push({
                name: 'Rotation',
                key: 'angle',
                value: Math.round(obj.angle || 0),
                type: 'range',
                min: -180,
                max: 180,
                step: 5,
                unit: '°'
            });
        }
        
        // Visibility
        group.properties.push({
            name: 'Visible',
            key: 'visible',
            value: obj.visible !== false,
            type: 'checkbox'
        });
        
        // Selectable
        group.properties.push({
            name: 'Selectable',
            key: 'selectable',
            value: obj.selectable !== false,
            type: 'checkbox'
        });
        
        return group;
    }

    renderPropertyGroup(group) {
        return `
            <div class="compact-property-group">
                ${group.properties.map(prop => this.renderProperty(prop)).join('')}
            </div>
        `;
    }

    renderProperty(prop) {
        const inputId = `prop_${prop.key}`;
        
        let inputHtml = '';
        
        switch (prop.type) {
            case 'text':
                inputHtml = `<input type="text" class="inline-input" id="${inputId}" value="${prop.value}" placeholder="${prop.placeholder || ''}" ${prop.readonly ? 'readonly' : ''}>`;
                break;
                
            case 'number':
                // Ensure value is a valid number
                const numValue = isNaN(prop.value) ? 0 : prop.value;
                inputHtml = `
                    <input type="number" class="inline-input" id="${inputId}" value="${numValue}" ${prop.min !== undefined ? `min="${prop.min}"` : ''} ${prop.max !== undefined ? `max="${prop.max}"` : ''} ${prop.readonly ? 'readonly' : ''}>
                    ${prop.unit ? `<span class="inline-label">${prop.unit}</span>` : ''}
                `;
                break;
                
            case 'range':
                inputHtml = `
                    <div class="range-input">
                        <input type="range" id="${inputId}" value="${prop.value}" min="${prop.min}" max="${prop.max}" step="${prop.step || 1}">
                        <span class="range-value">${prop.value}${prop.unit || ''}</span>
                    </div>
                `;
                break;
                
            case 'color':
                inputHtml = `
                    <div class="color-input">
                        <input type="color" id="${inputId}" value="${prop.value}">
                        <span class="color-value">${prop.value}</span>
                    </div>
                `;
                break;
                
            case 'checkbox':
                inputHtml = `
                    <label class="checkbox-label">
                        <input type="checkbox" id="${inputId}" ${prop.value ? 'checked' : ''}>
                        <span class="checkbox-custom"></span>
                    </label>
                `;
                break;
                
            case 'select':
                inputHtml = `
                    <select class="inline-select" id="${inputId}">
                        ${prop.options.map(opt => `
                            <option value="${opt.value}" ${opt.value === prop.value ? 'selected' : ''}>
                                ${opt.label}
                            </option>
                        `).join('')}
                    </select>
                `;
                break;
                
            case 'entity-select':
                inputHtml = `
                    <div class="entity-select">
                        <input type="text" id="${inputId}" value="${prop.value}" placeholder="${prop.placeholder || 'Select entity...'}" readonly>
                        <button class="btn btn-icon-only" onclick="window.panelManager.getPanel('properties').showEntityPicker('${prop.key}')">
                            <i class="fas fa-list"></i>
                        </button>
                    </div>
                `;
                break;
                
            default:
                inputHtml = `<span class="property-value">${prop.value}</span>`;
        }
        
        return `
            <div class="compact-property-row" data-property="${prop.key}">
                <label class="compact-property-label" for="${inputId}">${prop.name}:</label>
                <div class="compact-property-value">
                    ${inputHtml}
                </div>
            </div>
        `;
    }

    bindPropertyHandlers() {
        // Range inputs
        this.container.querySelectorAll('input[type="range"]').forEach(input => {
            input.addEventListener('input', (e) => {
                const valueSpan = e.target.parentElement.querySelector('.range-value');
                const prop = this.findProperty(e.target.id.replace('prop_', ''));
                if (valueSpan && prop) {
                    valueSpan.textContent = e.target.value + (prop.unit || '');
                }
                this.updateObjectProperty(e.target.id.replace('prop_', ''), e.target.value);
            });
        });
        
        // Other inputs
        this.container.querySelectorAll('input[type="text"], input[type="number"], input[type="color"], select').forEach(input => {
            if (!input.readOnly) {
                input.addEventListener('change', (e) => {
                    this.updateObjectProperty(e.target.id.replace('prop_', ''), e.target.value);
                });
            }
        });
        
        // Checkbox inputs
        this.container.querySelectorAll('input[type="checkbox"]').forEach(input => {
            input.addEventListener('change', (e) => {
                this.updateObjectProperty(e.target.id.replace('prop_', ''), e.target.checked);
            });
        });
        
        // Color inputs - update display
        this.container.querySelectorAll('input[type="color"]').forEach(input => {
            input.addEventListener('input', (e) => {
                const valueSpan = e.target.parentElement.querySelector('.color-value');
                if (valueSpan) {
                    valueSpan.textContent = e.target.value;
                }
            });
        });
    }

    updateObjectProperty(key, value) {
        if (!this.selectedObject) return;
        
        // Find the property definition to check if it needs conversion
        const prop = this.findProperty(key);
        
        // Handle unit conversions for room dimensions
        if (prop && prop.convertToPixels) {
            const pixelsPerFoot = window.floorplanEditor?.pixelsPerFoot || 48;
            
            if (key === 'width' || key === 'height') {
                // Convert from feet/meters to pixels
                let pixelValue;
                if (prop.unit === 'm') {
                    // Convert meters to feet, then to pixels
                    const feet = parseFloat(value) / 0.3048;
                    pixelValue = Math.round(feet * pixelsPerFoot);
                } else {
                    // Convert feet to pixels
                    pixelValue = Math.round(parseFloat(value) * pixelsPerFoot);
                }
                value = pixelValue;
            }
        }
        
        // Convert value types as needed
        if (key === 'left' || key === 'top' || key === 'fontSize' || key === 'strokeWidth' || key === 'radius') {
            value = parseInt(value) || 0;
        } else if (key === 'opacity' || key === 'scaleX' || key === 'wallHeight') {
            value = parseFloat(value) || 0;
        } else if (key === 'angle') {
            value = parseInt(value) || 0;
        }
        
        // Special handling for certain properties
        if (key === 'strokeDashArray') {
            if (value === 'dashed') {
                this.selectedObject.set('strokeDashArray', [5, 5]);
            } else if (value === 'dotted') {
                this.selectedObject.set('strokeDashArray', [2, 2]);
            } else {
                this.selectedObject.set('strokeDashArray', null);
            }
        } else {
            this.selectedObject.set(key, value);
        }
        
        // Update canvas
        if (window.floorplanEditor?.canvas) {
            window.floorplanEditor.canvas.renderAll();
            window.floorplanEditor.triggerAutoSave();
        }
        
        // Special handling for entity assignment
        if (key === 'entityId' && this.selectedObject.lightObject) {
            const entity = window.lightEntities?.[value];
            if (entity) {
                window.floorplanEditor?.updateLightVisualState(this.selectedObject, entity);
            }
            window.panelManager?.refreshPanel('lights');
        }
    }

    showEntityPicker(propertyKey) {
        // This would show a modal or expand the entities panel
        // For now, just switch to entities panel
        window.panelManager?.showPanel('entities');
        window.sceneManager?.showStatus('Select an entity from the Entities panel', 'info');
    }

    findProperty(key) {
        for (const group of this.propertyGroups) {
            const prop = group.properties.find(p => p.key === key);
            if (prop) return prop;
        }
        return null;
    }

    getObjectType(obj) {
        if (obj.lightObject) return 'Light';
        if (obj.roomObject) return 'Room';
        if (obj.type === 'text') return 'Text';
        if (obj.type === 'line') return 'Line';
        if (obj.type === 'image') return 'Background Image';
        if (obj.type === 'rect') return 'Rectangle';
        if (obj.type === 'circle') return 'Circle';
        if (obj.type === 'polygon') return 'Polygon';
        return obj.type || 'Object';
    }

    // Called when object selection changes
    onObjectSelected(data) {
        this.setSelectedObject(data.object);
    }

    // Called when object is deselected
    onObjectDeselected() {
        this.setSelectedObject(null);
    }
}