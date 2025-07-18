/**
 * Settings Bar Component - Lucidchart Style
 * A floating settings bar that appears at the bottom left
 */
export class SettingsBarComponent {
    constructor() {
        this.container = null;
        this.isVisible = false;
        this.settings = {
            units: 'ft',
            scaleFrom: 48,  // 48 pixels = 1 foot (matches FloorplanEditor)
            scaleTo: 1,
            gridSize: 24    // Grid square size in pixels
        };
        
        this.init();
    }
    
    init() {
        // Create container
        this.container = document.createElement('div');
        this.container.className = 'plugin-settings';
        
        // Create toggle button
        const toggleButton = document.createElement('button');
        toggleButton.className = 'plugin-settings-button';
        toggleButton.title = 'Settings';
        toggleButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16">
                <path d="M13.5 8.5C13.776 8.5 14 8.276 14 8C14 7.724 13.776 7.5 13.5 7.5L10.5 7.5C10.224 7.5 10 7.724 10 8C10 8.276 10.224 8.5 10.5 8.5L13.5 8.5Z"></path>
                <path d="M8.5 2.5C8.5 2.224 8.276 2 8 2C7.724 2 7.5 2.224 7.5 2.5L7.5 5.5C7.5 5.776 7.724 6 8 6C8.276 6 8.5 5.776 8.5 5.5L8.5 2.5Z"></path>
                <path d="M5.5 7.5C5.776 7.5 6 7.724 6 8C6 8.276 5.776 8.5 5.5 8.5L2.5 8.5C2.224 8.5 2 8.276 2 8C2 7.724 2.224 7.5 2.5 7.5L5.5 7.5Z"></path>
                <path d="M7.5 13.5C7.5 13.776 7.724 14 8 14C8.276 14 8.5 13.776 8.5 13.5L8.5 10.5C8.5 10.224 8.276 10 8 10C7.724 10 7.5 10.224 7.5 10.5L7.5 13.5Z"></path>
                <circle cx="8" cy="8" r="1.5"></circle>
            </svg>
        `;
        
        // Create content panel
        const content = document.createElement('div');
        content.className = 'content';
        content.innerHTML = this.renderContent();
        
        // Assemble
        this.container.appendChild(toggleButton);
        this.container.appendChild(content);
        
        // Add to body
        document.body.appendChild(this.container);
        
        // Bind events
        toggleButton.addEventListener('click', () => this.toggle());
        this.bindContentEvents(content);
        
        // Initialize measurement button state
        this.initializeMeasurementButton(content);
        
        // Click outside to close
        document.addEventListener('click', (e) => {
            if (this.isVisible && 
                !this.container.contains(e.target)) {
                this.hide();
            }
        });
        
        // Load saved settings
        this.loadSettings();
    }
    
    renderContent() {
        return `
            <div class="plugin-settings-item">
                <span class="label">Units:</span>
                <div class="settings-select" id="unitsSelect">
                    <button class="settings-select-button">
                        <span>${this.settings.units}</span>
                        <svg width="8" height="8" viewBox="0 0 8 8">
                            <path d="M1 3L4 6L7 3" stroke="currentColor" fill="none" stroke-width="1.5"/>
                        </svg>
                    </button>
                    <div class="settings-select-menu">
                        <div class="settings-select-option" data-value="ft">ft</div>
                        <div class="settings-select-option" data-value="m">m</div>
                        <div class="settings-select-option" data-value="cm">cm</div>
                        <div class="settings-select-option" data-value="in">in</div>
                    </div>
                </div>
            </div>
            
            <div class="settings-spacer"></div>
            
            <div class="plugin-settings-item">
                <span class="label">Scale:</span>
                <input type="text" class="settings-input" id="scaleFrom" value="${this.settings.scaleFrom}">
                <span class="label">px =</span>
                <input type="text" class="settings-input" id="scaleTo" value="${this.settings.scaleTo}">
                <span class="label">${this.settings.units}</span>
            </div>
            
            <div class="settings-spacer"></div>
            
            <div class="plugin-settings-item">
                <button class="settings-button" id="measuringToggle">
                    <svg width="12" height="12" viewBox="0 0 16 16">
                        <path d="M1 3L1 13L3 13L3 11L5 11L5 13L7 13L7 11L9 11L9 13L11 13L11 11L13 11L13 13L15 13L15 3L13 3L13 5L11 5L11 3L9 3L9 5L7 5L7 3L5 3L5 5L3 5L3 3L1 3Z" fill="currentColor"/>
                    </svg>
                    <span>Show measurements</span>
                </button>
            </div>
            
            <div class="settings-spacer"></div>
            
            <div class="plugin-settings-item">
                <button class="settings-button" id="plannerToggle">
                    <svg width="12" height="12" viewBox="0 0 16 16">
                        <path d="M2 2L2 14L14 14L14 2L2 2ZM3 3L13 3L13 13L3 13L3 3Z" fill="currentColor"/>
                        <path d="M5 5L11 5L11 6L5 6L5 5Z" fill="currentColor"/>
                        <path d="M5 8L11 8L11 9L5 9L5 8Z" fill="currentColor"/>
                        <path d="M5 11L8 11L8 12L5 12L5 11Z" fill="currentColor"/>
                    </svg>
                    <span>Open Floor Planner</span>
                </button>
            </div>
            
            <button class="settings-close"></button>
        `;
    }
    
    bindContentEvents(content) {
        // Units dropdown
        const unitsSelect = content.querySelector('#unitsSelect');
        const unitsButton = unitsSelect.querySelector('.settings-select-button');
        const unitsMenu = unitsSelect.querySelector('.settings-select-menu');
        const unitsOptions = unitsMenu.querySelectorAll('.settings-select-option');
        
        unitsButton.addEventListener('click', (e) => {
            e.stopPropagation();
            unitsSelect.classList.toggle('open');
        });
        
        unitsOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = option.dataset.value;
                this.settings.units = value;
                unitsButton.querySelector('span').textContent = value;
                
                // Update all unit labels
                content.querySelectorAll('.label').forEach(label => {
                    if (label.textContent === 'ft' || label.textContent === 'm' || 
                        label.textContent === 'cm' || label.textContent === 'in') {
                        label.textContent = value;
                    }
                });
                
                // Update selected state
                unitsOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                
                unitsSelect.classList.remove('open');
                this.saveSettings();
                this.notifyChange('units', value);
            });
        });
        
        // Scale inputs
        const scaleFrom = content.querySelector('#scaleFrom');
        const scaleTo = content.querySelector('#scaleTo');
        
        scaleFrom.addEventListener('change', (e) => {
            this.settings.scaleFrom = parseFloat(e.target.value) || 48;
            this.saveSettings();
            this.notifyChange('scale', { from: this.settings.scaleFrom, to: this.settings.scaleTo });
        });
        
        scaleTo.addEventListener('change', (e) => {
            this.settings.scaleTo = parseFloat(e.target.value) || 1;
            this.saveSettings();
            this.notifyChange('scale', { from: this.settings.scaleFrom, to: this.settings.scaleTo });
        });
        
        // Measuring toggle
        const measuringToggle = content.querySelector('#measuringToggle');
        measuringToggle.addEventListener('click', () => {
            // Toggle measuring mode
            if (window.floorplanEditor) {
                const isEnabled = window.floorplanEditor.toggleMeasuring();
                
                // Update button visual state
                if (isEnabled) {
                    measuringToggle.classList.add('active');
                    measuringToggle.style.backgroundColor = '#0066cc';
                    measuringToggle.style.color = 'white';
                } else {
                    measuringToggle.classList.remove('active');
                    measuringToggle.style.backgroundColor = '';
                    measuringToggle.style.color = '';
                }
            }
        });
        
        // Planner toggle
        const plannerToggle = content.querySelector('#plannerToggle');
        plannerToggle.addEventListener('click', () => {
            // Get the base path for ingress support
            const basePath = window.location.pathname.replace(/\/$/, '').replace(/\/index\.html$/, '');
            const plannerUrl = basePath ? `${basePath}/planner` : '/planner';
            
            // Open planner in new tab
            window.open(plannerUrl, '_blank');
            // Close settings panel
            this.hide();
        });
        
        // Close button
        const closeBtn = content.querySelector('.settings-close');
        closeBtn.addEventListener('click', () => this.hide());
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
        
        // Close any open dropdowns
        this.container.querySelectorAll('.settings-select').forEach(select => {
            select.classList.remove('open');
        });
    }
    
    loadSettings() {
        const saved = localStorage.getItem('lightmapper_settings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                
                // MIGRATION: Fix old scale values (8 -> 48)
                if (parsed.scaleFrom === 8) {
                    console.log('🔄 Migrating old scale setting from 8 to 48 pixels per foot');
                    parsed.scaleFrom = 48;
                    // Save the migrated settings
                    localStorage.setItem('lightmapper_settings', JSON.stringify(parsed));
                }
                
                Object.assign(this.settings, parsed);
                
                // Update UI
                const content = this.container.querySelector('.content');
                content.innerHTML = this.renderContent();
                this.bindContentEvents(content);
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
                window.floorplanEditor.useMetric = (value === 'm' || value === 'cm');
                window.floorplanEditor.drawGrid();
                
                // Update properties panel
                if (window.panelManager) {
                    const propertiesPanel = window.panelManager.getPanel('properties');
                    if (propertiesPanel) {
                        propertiesPanel.refresh();
                    }
                }
            } else if (setting === 'scale') {
                // Update grid scale
                window.floorplanEditor.gridSize = value.from;
                window.floorplanEditor.drawGrid();
            }
        }
    }
    
    initializeMeasurementButton(content) {
        const measuringToggle = content.querySelector('#measuringToggle');
        if (measuringToggle && window.floorplanEditor) {
            // Set initial button state based on current measurement setting
            const isEnabled = window.floorplanEditor.showMeasurements;
            if (isEnabled) {
                measuringToggle.classList.add('active');
                measuringToggle.style.backgroundColor = '#0066cc';
                measuringToggle.style.color = 'white';
            } else {
                measuringToggle.classList.remove('active');
                measuringToggle.style.backgroundColor = '';
                measuringToggle.style.color = '';
            }
        }
    }
    
    getSettings() {
        return { ...this.settings };
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.settingsBar = new SettingsBarComponent();
    });
} else {
    window.settingsBar = new SettingsBarComponent();
}