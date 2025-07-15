import { BasePanel } from './BasePanel.js';

/**
 * Debug Panel - Development and troubleshooting tools
 * @class DebugPanel
 * @extends BasePanel
 * @description Provides debugging information about panels, layers, canvas objects,
 * and system state for troubleshooting issues.
 */
export class DebugPanel extends BasePanel {
    constructor() {
        super('debug', 'Debug Tools', 'fa-bug');
        this.logBuffer = [];
        this.maxLogs = 100;
        this.autoRefresh = false;
        this.refreshInterval = null;
    }

    render() {
        this.container.innerHTML = `
            <div class="panel-header">
                <h3>${this.title}</h3>
                <div class="panel-header-actions">
                    <button class="btn btn-icon-only" title="Clear Logs" onclick="window.panelManager.getPanel('debug').clearLogs()">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn btn-icon-only ${this.autoRefresh ? 'active' : ''}" title="Auto Refresh" onclick="window.panelManager.getPanel('debug').toggleAutoRefresh()">
                        <i class="fas fa-sync"></i>
                    </button>
                    <button class="btn btn-icon-only" title="Refresh Now" onclick="window.panelManager.getPanel('debug').refresh()">
                        <i class="fas fa-redo"></i>
                    </button>
                </div>
            </div>
            <div class="debug-content">
                <div class="debug-section">
                    <h4>System State</h4>
                    <div id="systemState" class="debug-info"></div>
                </div>
                
                <div class="debug-section">
                    <h4>Panel States</h4>
                    <div id="panelStates" class="debug-info"></div>
                </div>
                
                <div class="debug-section">
                    <h4>Layer System</h4>
                    <div id="layerInfo" class="debug-info"></div>
                </div>
                
                <div class="debug-section">
                    <h4>Canvas Objects</h4>
                    <div id="canvasInfo" class="debug-info"></div>
                </div>
                
                <div class="debug-section">
                    <h4>Event Log</h4>
                    <div id="eventLog" class="debug-log"></div>
                </div>
            </div>
        `;
        
        this.refresh();
    }

    refresh() {
        this.updateSystemState();
        this.updatePanelStates();
        this.updateLayerInfo();
        this.updateCanvasInfo();
        this.updateEventLog();
    }

    updateSystemState() {
        const container = document.getElementById('systemState');
        if (!container) return;

        const info = {
            'API Base': window.API_BASE || 'Not set',
            'Floorplan Editor': window.floorplanEditor ? 'Initialized' : 'Not initialized',
            'Layer Manager': window.layerManager ? 'Initialized' : 'Not initialized',
            'Panel Manager': window.panelManager ? 'Initialized' : 'Not initialized',
            'Scene Manager': window.sceneManager ? 'Initialized' : 'Not initialized',
            'CAD Interface': window.cadInterface ? 'Initialized' : 'Not initialized',
            'Entity Panel Manager': window.entityPanelManager ? 'Initialized' : 'Not initialized'
        };

        container.innerHTML = Object.entries(info).map(([key, value]) => 
            `<div class="debug-item">
                <span class="debug-key">${key}:</span>
                <span class="debug-value ${value.includes('Not') ? 'error' : 'success'}">${value}</span>
            </div>`
        ).join('');
    }

    updatePanelStates() {
        const container = document.getElementById('panelStates');
        if (!container || !window.panelManager) return;

        const panels = [];
        window.panelManager.panels.forEach((panel, id) => {
            panels.push({
                id: id,
                title: panel.title,
                container: panel.container ? 'Yes' : 'No',
                visible: panel.container?.style.display !== 'none' ? 'Yes' : 'No'
            });
        });

        container.innerHTML = `
            <table class="debug-table">
                <thead>
                    <tr>
                        <th>Panel ID</th>
                        <th>Title</th>
                        <th>Container</th>
                        <th>Visible</th>
                    </tr>
                </thead>
                <tbody>
                    ${panels.map(p => `
                        <tr>
                            <td>${p.id}</td>
                            <td>${p.title}</td>
                            <td class="${p.container === 'Yes' ? 'success' : 'error'}">${p.container}</td>
                            <td class="${p.visible === 'Yes' ? 'success' : 'warning'}">${p.visible}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    updateLayerInfo() {
        const container = document.getElementById('layerInfo');
        if (!container) return;

        if (!window.layerManager) {
            container.innerHTML = '<div class="debug-warning">Layer Manager not initialized</div>';
            return;
        }

        const layerCount = Object.keys(window.layerManager.layers).length;
        const layerOrder = window.layerManager.layerOrder;

        container.innerHTML = `
            <div class="debug-item">
                <span class="debug-key">Total Layers:</span>
                <span class="debug-value">${layerCount}</span>
            </div>
            <div class="debug-item">
                <span class="debug-key">Layer Order:</span>
                <span class="debug-value">${layerOrder.length} items</span>
            </div>
            <div class="debug-subtitle">Layers (top to bottom):</div>
            <div class="debug-layer-list">
                ${layerOrder.map((layerId, index) => {
                    const layer = window.layerManager.layers[layerId];
                    if (!layer) return '';
                    return `
                        <div class="debug-layer-item">
                            <span class="layer-index">${index}.</span>
                            <span class="layer-name">${layer.name}</span>
                            <span class="layer-type">[${layer.objectType}]</span>
                            <span class="layer-z">z:${layer.zIndex}</span>
                            <span class="layer-state">
                                ${layer.visible ? '👁️' : '🚫'}
                                ${layer.locked ? '🔒' : '🔓'}
                            </span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    updateCanvasInfo() {
        const container = document.getElementById('canvasInfo');
        if (!container) return;

        if (!window.floorplanEditor?.canvas) {
            container.innerHTML = '<div class="debug-warning">Canvas not initialized</div>';
            return;
        }

        const canvas = window.floorplanEditor.canvas;
        const objects = canvas.getObjects();
        const objectTypes = {};
        let orphanedCount = 0;

        objects.forEach(obj => {
            const type = this.getObjectTypeForDebug(obj);
            objectTypes[type] = (objectTypes[type] || 0) + 1;
            
            if (!obj.customLayer && !obj.gridLine && !obj.snapGuide) {
                orphanedCount++;
            }
        });

        const activeObject = canvas.getActiveObject();

        container.innerHTML = `
            <div class="debug-item">
                <span class="debug-key">Total Objects:</span>
                <span class="debug-value">${objects.length}</span>
            </div>
            <div class="debug-item">
                <span class="debug-key">Orphaned Objects:</span>
                <span class="debug-value ${orphanedCount > 0 ? 'warning' : 'success'}">${orphanedCount}</span>
            </div>
            <div class="debug-item">
                <span class="debug-key">Active Selection:</span>
                <span class="debug-value">${activeObject ? this.getObjectTypeForDebug(activeObject) : 'None'}</span>
            </div>
            <div class="debug-subtitle">Object Types:</div>
            <div class="debug-type-list">
                ${Object.entries(objectTypes).map(([type, count]) => 
                    `<div class="debug-type-item">
                        <span class="type-name">${type}:</span>
                        <span class="type-count">${count}</span>
                    </div>`
                ).join('')}
            </div>
        `;
    }

    updateEventLog() {
        const container = document.getElementById('eventLog');
        if (!container) return;

        if (this.logBuffer.length === 0) {
            container.innerHTML = '<div class="debug-info">No events logged yet</div>';
            return;
        }

        container.innerHTML = this.logBuffer.map(log => 
            `<div class="log-entry ${log.type}">
                <span class="log-time">${log.time}</span>
                <span class="log-message">${log.message}</span>
            </div>`
        ).join('');

        // Auto-scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    getObjectTypeForDebug(obj) {
        if (obj.lightObject) return 'Light';
        if (obj.roomObject) return 'Room';
        if (obj.textObject) return 'Text';
        if (obj.labelObject) return 'Label';
        if (obj.backgroundImage) return 'Background';
        if (obj.gridLine) return 'Grid Line';
        if (obj.snapGuide) return 'Snap Guide';
        if (obj.glowCircle) return 'Glow Effect';
        if (obj.selectionRing) return 'Selection Ring';
        return obj.type || 'Unknown';
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        this.logBuffer.push({
            time: timestamp,
            message: message,
            type: type
        });

        // Keep buffer size limited
        if (this.logBuffer.length > this.maxLogs) {
            this.logBuffer.shift();
        }

        // Update display if panel is visible
        if (this.container && this.container.style.display !== 'none') {
            this.updateEventLog();
        }
    }

    clearLogs() {
        this.logBuffer = [];
        this.updateEventLog();
        this.log('Logs cleared', 'system');
    }

    toggleAutoRefresh() {
        this.autoRefresh = !this.autoRefresh;
        
        if (this.autoRefresh) {
            this.refreshInterval = setInterval(() => {
                this.refresh();
            }, 1000);
            this.log('Auto-refresh enabled', 'system');
        } else {
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
                this.refreshInterval = null;
            }
            this.log('Auto-refresh disabled', 'system');
        }

        // Update button state
        const button = this.container.querySelector('[title="Auto Refresh"]');
        if (button) {
            button.classList.toggle('active', this.autoRefresh);
        }
    }

    // Panel event handlers
    onObjectSelected(data) {
        if (data?.object) {
            const type = this.getObjectTypeForDebug(data.object);
            const layer = data.object.customLayer || 'No layer';
            this.log(`Object selected: ${type} (Layer: ${layer})`, 'event');
        }
    }

    onObjectAdded(data) {
        if (data?.object) {
            const type = this.getObjectTypeForDebug(data.object);
            const layer = data.object.customLayer || 'No layer';
            this.log(`Object added: ${type} (Layer: ${layer})`, 'event');
        }
    }

    onObjectRemoved(data) {
        if (data?.object) {
            const type = this.getObjectTypeForDebug(data.object);
            this.log(`Object removed: ${type}`, 'event');
        }
    }

    onLayerVisibilityChanged(data) {
        this.log(`Layer visibility changed: ${data.layerId} = ${data.visible}`, 'event');
    }

    onLayerLockChanged(data) {
        this.log(`Layer lock changed: ${data.layerId} = ${data.locked}`, 'event');
    }

    onLayersReordered(data) {
        this.log(`Layers reordered: ${data.draggedLayerId} → ${data.targetLayerId}`, 'event');
    }

    hide() {
        super.hide();
        // Stop auto-refresh when hidden
        if (this.autoRefresh) {
            this.toggleAutoRefresh();
        }
    }
}

// Add CSS for debug panel
const style = document.createElement('style');
style.textContent = `
.debug-content {
    padding: 10px;
    overflow-y: auto;
    height: calc(100% - 60px);
    background: var(--cad-bg-secondary, #2d2d2d);
}

.debug-section {
    margin-bottom: 20px;
    background: var(--cad-bg-tertiary, #1e1e1e);
    border: 1px solid var(--cad-border-primary, #3a3a3a);
    border-radius: 4px;
    padding: 10px;
}

.debug-section h4 {
    margin: 0 0 10px 0;
    font-size: 14px;
    color: var(--cad-text-primary, #e0e0e0);
    border-bottom: 1px solid var(--cad-border-primary, #3a3a3a);
    padding-bottom: 5px;
}

.debug-info {
    font-size: 12px;
    color: var(--cad-text-secondary, #b0b0b0);
}

.debug-item {
    display: flex;
    justify-content: space-between;
    padding: 2px 0;
}

.debug-key {
    font-weight: 500;
}

.debug-value {
    font-family: monospace;
}

.debug-value.success { color: #4caf50; }
.debug-value.warning { color: #ff9800; }
.debug-value.error { color: #f44336; }

.debug-table {
    width: 100%;
    font-size: 12px;
    border-collapse: collapse;
}

.debug-table th {
    background: var(--cad-bg-primary, #262626);
    color: var(--cad-text-primary, #e0e0e0);
    padding: 4px 8px;
    text-align: left;
    font-weight: 500;
}

.debug-table td {
    padding: 4px 8px;
    border-top: 1px solid var(--cad-border-primary, #3a3a3a);
}

.debug-table .success { color: #4caf50; }
.debug-table .warning { color: #ff9800; }
.debug-table .error { color: #f44336; }

.debug-warning {
    color: #ff9800;
    text-align: center;
    padding: 10px;
}

.debug-subtitle {
    margin-top: 10px;
    margin-bottom: 5px;
    font-weight: 500;
    color: var(--cad-text-primary, #e0e0e0);
}

.debug-layer-list,
.debug-type-list {
    font-family: monospace;
    font-size: 11px;
}

.debug-layer-item {
    padding: 2px 0;
    display: flex;
    gap: 8px;
}

.layer-index { color: #666; }
.layer-name { color: var(--cad-text-primary, #e0e0e0); }
.layer-type { color: #4a9eff; }
.layer-z { color: #ff9800; }
.layer-state { }

.debug-type-item {
    display: flex;
    justify-content: space-between;
    padding: 2px 0;
}

.debug-log {
    max-height: 200px;
    overflow-y: auto;
    font-family: monospace;
    font-size: 11px;
    background: var(--cad-bg-primary, #262626);
    padding: 5px;
    border-radius: 3px;
}

.log-entry {
    padding: 2px 0;
    display: flex;
    gap: 8px;
}

.log-entry.event { color: #4a9eff; }
.log-entry.error { color: #f44336; }
.log-entry.warning { color: #ff9800; }
.log-entry.success { color: #4caf50; }
.log-entry.system { color: #9c27b0; }

.log-time {
    color: #666;
    flex-shrink: 0;
}

.log-message {
    word-break: break-word;
}
`;
document.head.appendChild(style);