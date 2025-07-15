import { BasePanel } from './BasePanel.js';

export class LiveStatePanel extends BasePanel {
    constructor() {
        super('liveState', 'Live State', 'fa-broadcast-tower');
        this.updateInterval = null;
        this.refreshRate = 30000; // 30 seconds - more reasonable default
    }

    render() {
        this.container.innerHTML = `
            <div class="live-state-header-actions">
                <button id="liveStateRefresh" class="btn btn-icon-only" title="Refresh Now">
                    <i class="fas fa-sync-alt"></i>
                </button>
                <label class="auto-refresh-toggle">
                    <input type="checkbox" id="autoRefreshToggle">
                    <span>Auto Refresh</span>
                </label>
            </div>
            <div class="live-state-controls">
                <label class="refresh-rate-control">
                    <span>Refresh Rate:</span>
                    <select id="refreshRateSelect">
                        <option value="1000">1 second</option>
                        <option value="2000">2 seconds</option>
                        <option value="5000">5 seconds</option>
                        <option value="10000">10 seconds</option>
                        <option value="30000" selected>30 seconds</option>
                        <option value="60000">1 minute</option>
                    </select>
                </label>
            </div>
            <div id="liveStateList" class="live-state-list"></div>
        `;
        
        this.bindEvents();
        // Load initial data once
        this.refreshStates();
        
        // Set up WebSocket listeners for real-time updates
        this.setupWebSocketListeners();
    }

    bindEvents() {
        // Manual refresh button
        const refreshBtn = document.getElementById('liveStateRefresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshStates();
            });
        }

        // Auto refresh toggle
        const autoRefreshToggle = document.getElementById('autoRefreshToggle');
        if (autoRefreshToggle) {
            autoRefreshToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.startAutoRefresh();
                } else {
                    this.stopAutoRefresh();
                }
            });
        }

        // Refresh rate selector
        const refreshRateSelect = document.getElementById('refreshRateSelect');
        if (refreshRateSelect) {
            refreshRateSelect.addEventListener('change', (e) => {
                this.refreshRate = parseInt(e.target.value);
                if (document.getElementById('autoRefreshToggle').checked) {
                    this.stopAutoRefresh();
                    this.startAutoRefresh();
                }
            });
        }
    }
    
    setupWebSocketListeners() {
        // Wait for WebSocket client to be available
        if (!window.haWsClient) {
            setTimeout(() => this.setupWebSocketListeners(), 100);
            return;
        }
        
        // Listen for real-time light state changes
        window.haWsClient.on('light_state_changed', (data) => {
            this.updateLightState(data.entityId, data.state);
        });
        
        // Listen for connection status
        window.haWsClient.on('connected', () => {
            console.log('🔌 LiveStatePanel: WebSocket connected');
            this.updateConnectionStatus(true);
        });
        
        window.haWsClient.on('disconnected', () => {
            console.log('🔌 LiveStatePanel: WebSocket disconnected');
            this.updateConnectionStatus(false);
        });
        
        console.log('✅ LiveStatePanel: WebSocket listeners set up');
    }
    
    updateLightState(entityId, newState) {
        console.log(`💡 LiveStatePanel: Updating ${entityId} state`, newState);
        
        // Find the light item in the DOM and update it
        const lightItem = document.querySelector(`[data-entity-id="${entityId}"]`);
        if (lightItem) {
            // Update the visual state
            const stateIndicator = lightItem.querySelector('.state-indicator');
            const stateBadge = lightItem.querySelector('.state-badge');
            
            if (stateIndicator) {
                stateIndicator.className = `state-indicator ${newState.state}`;
            }
            
            if (stateBadge) {
                stateBadge.textContent = newState.state.toUpperCase();
                stateBadge.className = `state-badge ${newState.state}`;
            }
            
            // Update attributes if available
            if (newState.attributes) {
                this.updateLightAttributes(lightItem, newState.attributes);
            }
        }
        
        // Update last refresh time
        this.updateLastRefreshTime();
    }
    
    updateLightAttributes(lightItem, attributes) {
        // Update brightness
        const brightnessSpan = lightItem.querySelector('.brightness');
        if (brightnessSpan && attributes.brightness !== undefined) {
            const brightness = Math.round((attributes.brightness / 255) * 100);
            brightnessSpan.textContent = `${brightness}%`;
        }
        
        // Update color temperature
        const colorTempSpan = lightItem.querySelector('.color-temp');
        if (colorTempSpan && attributes.color_temp_kelvin) {
            colorTempSpan.textContent = `${attributes.color_temp_kelvin}K`;
        }
        
        // Update color
        const colorSpan = lightItem.querySelector('.color');
        if (colorSpan && attributes.hs_color) {
            const [h, s] = attributes.hs_color;
            colorSpan.textContent = `H:${Math.round(h)}° S:${Math.round(s)}%`;
        }
    }
    
    updateConnectionStatus(connected) {
        const header = this.container.querySelector('.panel-header');
        if (!header) return;
        
        // Remove existing status indicator
        const existingIndicator = header.querySelector('.connection-status');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // Add new status indicator
        const statusIndicator = document.createElement('div');
        statusIndicator.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
        statusIndicator.innerHTML = `
            <i class="fas ${connected ? 'fa-circle' : 'fa-circle'}"></i>
            <span>${connected ? 'Live' : 'Offline'}</span>
        `;
        statusIndicator.style.cssText = `
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 12px;
            color: ${connected ? '#4CAF50' : '#f44336'};
            margin-left: 8px;
        `;
        
        header.appendChild(statusIndicator);
    }

    async refreshStates() {
        try {
            // Get current light states
            const response = await this.fetchData(`${window.API_BASE}/api/lights`);
            const lights = response;
            
            // Get assigned entities from floorplan
            const assignedEntities = this.getAssignedFloorplanEntities();
            
            // Filter to only show assigned lights
            const assignedLights = lights.filter(light => 
                assignedEntities.some(entity => entity.entity_id === light.entity_id)
            );
            
            this.renderLiveStates(assignedLights);
            
            // Update last refresh time
            this.updateLastRefreshTime();
            
        } catch (error) {
            console.error('Error refreshing live states:', error);
            this.showError('Failed to refresh light states');
        }
    }

    renderLiveStates(lights) {
        const container = document.getElementById('liveStateList');
        if (!container) return;
        
        if (lights.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">No lights assigned in floorplan</p>';
            return;
        }
        
        container.innerHTML = lights.map(light => this.createLiveStateCard(light)).join('');
    }

    createLiveStateCard(light) {
        const isOn = light.state === 'on';
        const brightness = light.attributes?.brightness 
            ? Math.round((light.attributes.brightness / 255) * 100) 
            : 0;
        const colorTemp = light.attributes?.color_temp_kelvin || null;
        const rgbColor = light.attributes?.rgb_color || null;
        const hsColor = light.attributes?.hs_color || null;
        
        const friendlyName = light.attributes?.friendly_name || light.entity_id;
        
        return `
            <div class="live-state-card ${isOn ? 'state-on' : 'state-off'}">
                <div class="live-state-header">
                    <div class="live-state-icon">
                        <i class="fas fa-lightbulb ${isOn ? 'on' : 'off'}"></i>
                    </div>
                    <div class="live-state-info">
                        <div class="live-state-name">${friendlyName}</div>
                        <div class="live-state-entity">${light.entity_id}</div>
                    </div>
                    <div class="live-state-status">
                        <span class="state-badge ${isOn ? 'on' : 'off'}">${isOn ? 'ON' : 'OFF'}</span>
                    </div>
                </div>
                ${isOn ? `
                    <div class="live-state-details">
                        ${brightness !== null ? `
                            <div class="state-detail">
                                <i class="fas fa-sun"></i>
                                <span>Brightness: ${brightness}%</span>
                            </div>
                        ` : ''}
                        ${colorTemp ? `
                            <div class="state-detail">
                                <i class="fas fa-thermometer-half"></i>
                                <span>Temperature: ${colorTemp}K</span>
                            </div>
                        ` : ''}
                        ${rgbColor ? `
                            <div class="state-detail">
                                <i class="fas fa-palette"></i>
                                <span>RGB: ${rgbColor.join(', ')}</span>
                                <div class="color-swatch" style="background-color: rgb(${rgbColor.join(',')})"></div>
                            </div>
                        ` : ''}
                        ${hsColor && !rgbColor ? `
                            <div class="state-detail">
                                <i class="fas fa-palette"></i>
                                <span>Color: H:${Math.round(hsColor[0])}° S:${Math.round(hsColor[1])}%</span>
                                <div class="color-swatch" style="background-color: hsl(${hsColor[0]}, ${hsColor[1]}%, 50%)"></div>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }

    getAssignedFloorplanEntities() {
        const canvasPanel = window.panelManager?.getPanel('canvas');
        if (!canvasPanel) return [];
        
        return canvasPanel.getAssignedEntities();
    }

    updateLastRefreshTime() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString();
        
        // Add or update last refresh indicator
        let refreshIndicator = document.getElementById('lastRefreshTime');
        if (!refreshIndicator) {
            const header = this.container.querySelector('.panel-header');
            refreshIndicator = document.createElement('div');
            refreshIndicator.id = 'lastRefreshTime';
            refreshIndicator.className = 'last-refresh-time';
            header.appendChild(refreshIndicator);
        }
        
        refreshIndicator.textContent = `Last updated: ${timeStr}`;
    }

    startAutoRefresh() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        // Initial refresh
        this.refreshStates();
        
        // Set up interval
        this.updateInterval = setInterval(() => {
            this.refreshStates();
        }, this.refreshRate);
        
        console.log(`🔄 Auto-refresh started (${this.refreshRate}ms interval)`);
    }

    stopAutoRefresh() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            console.log('⏹️ Auto-refresh stopped');
        }
    }

    showError(message) {
        const container = document.getElementById('liveStateList');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>${message}</span>
                </div>
            `;
        }
    }

    onShow() {
        super.onShow();
        // Only resume auto-refresh if user explicitly enabled it
        if (document.getElementById('autoRefreshToggle')?.checked) {
            this.startAutoRefresh();
        }
    }

    onHide() {
        super.onHide();
        // Pause auto-refresh when panel is hidden to save resources
        this.stopAutoRefresh();
    }

    destroy() {
        this.stopAutoRefresh();
        super.destroy();
    }
}