import { BasePanel } from './BasePanel.js';

export class SettingsPanel {
    constructor() {
        this.isVisible = false;
        this.settings = {
            units: 'ft',
            scaleFrom: 3,
            scaleTo: 16,
            gridVisible: true,
            snapEnabled: true,
            showMeasurements: true
        };
        
        this.container = null;
        this.toggleButton = null;
        
        this.init();
    }
    
    init() {
        // Create toggle button
        this.toggleButton = document.createElement('div');
        this.toggleButton.className = 'settings-toggle';
        this.toggleButton.innerHTML = '<i class="fas fa-cog"></i>';
        this.toggleButton.addEventListener('click', () => this.toggle());
        
        // Create settings panel
        this.container = document.createElement('div');
        this.container.className = 'settings-panel';
        
        // Add to body
        document.body.appendChild(this.toggleButton);
        document.body.appendChild(this.container);
        
        // Render panel content
        this.render();
        
        // Load saved settings
        this.loadSettings();
        
        // Setup event handlers
        this.bindEvents();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="settings-label">Units:</div>
            <div class="settings-select">
                <div class="settings-select-wrapper">
                    <div class="settings-select-content">${this.settings.units}</div>
                    <div class="settings-select-button"></div>
                </div>
                <select id="unitsSelect">
                    <option value="ft" ${this.settings.units === 'ft' ? 'selected' : ''}>ft</option>
                    <option value="m" ${this.settings.units === 'm' ? 'selected' : ''}>m</option>
                    <option value="cm" ${this.settings.units === 'cm' ? 'selected' : ''}>cm</option>
                    <option value="in" ${this.settings.units === 'in' ? 'selected' : ''}>in</option>
                </select>
            </div>
            
            <div class="settings-spacer"></div>
            
            <div class="settings-label">Scale:</div>
            <input type="text" class="settings-input" id="scaleFrom" value="${this.settings.scaleFrom}">
            <div class="settings-label">in =</div>
            <input type="text" class="settings-input" id="scaleTo" value="${this.settings.scaleTo}">
            <div class="settings-label">${this.settings.units}</div>
            
            <div class="settings-close"></div>
        `;
    }
    
    bindEvents() {
        // Units select
        const unitsSelect = this.container.querySelector('#unitsSelect');
        const selectContent = this.container.querySelector('.settings-select-content');
        const unitLabel = this.container.querySelectorAll('.settings-label')[3];
        
        unitsSelect.addEventListener('change', (e) => {
            this.settings.units = e.target.value;
            selectContent.textContent = e.target.value;
            unitLabel.textContent = e.target.value;
            this.saveSettings();
            this.notifyChange('units', e.target.value);
        });
        
        // Scale inputs
        const scaleFrom = this.container.querySelector('#scaleFrom');
        const scaleTo = this.container.querySelector('#scaleTo');
        
        scaleFrom.addEventListener('change', (e) => {
            this.settings.scaleFrom = parseFloat(e.target.value) || 1;
            this.saveSettings();
            this.notifyChange('scale', { from: this.settings.scaleFrom, to: this.settings.scaleTo });
        });
        
        scaleTo.addEventListener('change', (e) => {
            this.settings.scaleTo = parseFloat(e.target.value) || 1;
            this.saveSettings();
            this.notifyChange('scale', { from: this.settings.scaleFrom, to: this.settings.scaleTo });
        });
        
        // Close button
        const closeBtn = this.container.querySelector('.settings-close');
        closeBtn.addEventListener('click', () => this.hide());
        
        // Click outside to close
        document.addEventListener('click', (e) => {
            if (this.isVisible && 
                !this.container.contains(e.target) && 
                !this.toggleButton.contains(e.target)) {
                this.hide();
            }
        });
    }
    
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    show() {
        this.container.classList.add('active');
        this.isVisible = true;
    }
    
    hide() {
        this.container.classList.remove('active');
        this.isVisible = false;
    }
    
    loadSettings() {
        const saved = localStorage.getItem('lightmapper_settings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                Object.assign(this.settings, parsed);
                this.render();
            } catch (e) {
                console.error('Failed to load settings:', e);
            }
        }
    }
    
    saveSettings() {
        localStorage.setItem('lightmapper_settings', JSON.stringify(this.settings));
    }
    
    notifyChange(setting, value) {
        // Dispatch event for other components to listen to
        window.dispatchEvent(new CustomEvent('settingsChanged', {
            detail: { setting, value }
        }));
        
        // Update floorplan editor if available
        if (window.floorplanEditor) {
            if (setting === 'units') {
                window.floorplanEditor.options.use_metric = (value === 'm' || value === 'cm');
                window.floorplanEditor.updateGrid();
            } else if (setting === 'scale') {
                // Update grid scale if needed
                const pixelsPerInch = value.from;
                const unitsPerInch = value.to;
                // Calculate new grid size based on scale
                // This would need to be implemented in FloorplanEditor
            }
        }
    }
    
    getSettings() {
        return { ...this.settings };
    }
}

// Create a more compact panel base class
export class CompactPanel extends BasePanel {
    constructor(id, title, icon) {
        super(id, title, icon);
    }
    
    renderHeader() {
        const header = document.createElement('div');
        header.className = 'compact-panel-header';
        header.innerHTML = `
            <h3><i class="fas ${this.icon}"></i> ${this.title}</h3>
            <div class="compact-panel-actions"></div>
        `;
        return header;
    }
    
    createInlineControls(controls) {
        const container = document.createElement('div');
        container.className = 'inline-controls';
        
        controls.forEach(control => {
            const group = document.createElement('div');
            group.className = 'inline-control-group';
            
            if (control.label) {
                const label = document.createElement('span');
                label.className = 'inline-label';
                label.textContent = control.label;
                group.appendChild(label);
            }
            
            if (control.type === 'select') {
                const select = document.createElement('select');
                select.className = 'inline-select';
                select.id = control.id;
                
                control.options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt.value;
                    option.textContent = opt.label;
                    if (opt.selected) option.selected = true;
                    select.appendChild(option);
                });
                
                if (control.onChange) {
                    select.addEventListener('change', control.onChange);
                }
                
                group.appendChild(select);
            } else if (control.type === 'input') {
                const input = document.createElement('input');
                input.className = 'inline-input';
                input.id = control.id;
                input.type = control.inputType || 'text';
                input.value = control.value || '';
                input.placeholder = control.placeholder || '';
                
                if (control.onChange) {
                    input.addEventListener('change', control.onChange);
                }
                
                group.appendChild(input);
            } else if (control.type === 'toggle') {
                const toggle = document.createElement('label');
                toggle.className = 'toggle-switch';
                toggle.innerHTML = `
                    <input type="checkbox" ${control.checked ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                `;
                
                if (control.onChange) {
                    toggle.querySelector('input').addEventListener('change', control.onChange);
                }
                
                group.appendChild(toggle);
            } else if (control.type === 'button-group') {
                const btnGroup = document.createElement('div');
                btnGroup.className = 'btn-group-horizontal';
                
                control.buttons.forEach(btn => {
                    const button = document.createElement('button');
                    button.className = 'compact-btn';
                    if (btn.active) button.classList.add('active');
                    button.innerHTML = btn.icon ? `<i class="fas ${btn.icon}"></i>` : btn.label;
                    button.title = btn.title || '';
                    
                    if (btn.onClick) {
                        button.addEventListener('click', () => {
                            // Update active state
                            btnGroup.querySelectorAll('.compact-btn').forEach(b => {
                                b.classList.remove('active');
                            });
                            button.classList.add('active');
                            btn.onClick();
                        });
                    }
                    
                    btnGroup.appendChild(button);
                });
                
                group.appendChild(btnGroup);
            } else if (control.type === 'spacer') {
                const spacer = document.createElement('div');
                spacer.className = 'settings-spacer';
                group.appendChild(spacer);
            }
            
            container.appendChild(group);
        });
        
        return container;
    }
}