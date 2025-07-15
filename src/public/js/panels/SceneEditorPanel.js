import { BasePanel } from './BasePanel.js';

export class SceneEditorPanel extends BasePanel {
    constructor() {
        super('sceneEditor', 'Scene Editor', 'fa-edit');
        this.currentScene = null;
        this.originalScene = null;
        this.hasChanges = false;
    }

    render() {
        this.container.innerHTML = `
            <div class="scene-editor-header-actions">
                <button id="newSceneBtn" class="btn btn-icon-only" title="New Scene">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            <div id="sceneEditorContent" class="scene-editor-content">
                ${this.currentScene ? this.renderSceneEditor() : this.renderEmptyState()}
            </div>
        `;
        
        this.bindEvents();
    }

    renderEmptyState() {
        return `
            <div class="scene-editor-empty">
                <i class="fas fa-image"></i>
                <p>Select a scene to edit or create a new one</p>
                <button class="btn btn-primary" onclick="window.panelManager.getPanel('sceneEditor').createNewScene()">
                    <i class="fas fa-plus"></i> Create New Scene
                </button>
            </div>
        `;
    }

    renderSceneEditor() {
        return `
            <div class="scene-editor-header">
                <input type="text" id="sceneNameInput" class="scene-name-editor" 
                       value="${this.currentScene.name}" placeholder="Scene name...">
                <div class="scene-editor-actions">
                    <button id="saveSceneBtn" class="btn btn-primary" ${!this.hasChanges ? 'disabled' : ''}>
                        <i class="fas fa-save"></i> Save
                    </button>
                    <button id="revertSceneBtn" class="btn btn-secondary" ${!this.hasChanges ? 'disabled' : ''}>
                        <i class="fas fa-undo"></i> Revert
                    </button>
                    <button id="deleteSceneBtn" class="btn btn-error">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
            
            <div class="scene-editor-info">
                <div class="info-item">
                    <i class="fas fa-lightbulb"></i>
                    <span>${this.currentScene.lights?.length || 0} lights</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-clock"></i>
                    <span>Created: ${new Date(this.currentScene.created_at).toLocaleDateString()}</span>
                </div>
                ${this.currentScene.updated_at !== this.currentScene.created_at ? `
                    <div class="info-item">
                        <i class="fas fa-history"></i>
                        <span>Updated: ${new Date(this.currentScene.updated_at).toLocaleDateString()}</span>
                    </div>
                ` : ''}
            </div>
            
            <div class="scene-editor-controls">
                <h4>Quick Actions</h4>
                <div class="quick-actions">
                    <button class="btn btn-secondary" onclick="window.panelManager.getPanel('sceneEditor').captureCurrentState()">
                        <i class="fas fa-camera"></i> Capture Current State
                    </button>
                    <button class="btn btn-secondary" onclick="window.panelManager.getPanel('sceneEditor').testScene()">
                        <i class="fas fa-play"></i> Test Scene
                    </button>
                    <button class="btn btn-secondary" onclick="window.panelManager.getPanel('sceneEditor').duplicateScene()">
                        <i class="fas fa-copy"></i> Duplicate
                    </button>
                </div>
            </div>
            
            <div class="scene-editor-lights">
                <h4>Scene Lights</h4>
                <div id="sceneLightsList" class="scene-lights-list">
                    ${this.renderSceneLights()}
                </div>
            </div>
        `;
    }

    renderSceneLights() {
        if (!this.currentScene.lights || this.currentScene.lights.length === 0) {
            return '<p style="text-align: center; color: var(--text-muted); padding: 20px;">No lights in this scene</p>';
        }
        
        return this.currentScene.lights.map(light => this.renderSceneLight(light)).join('');
    }

    renderSceneLight(light) {
        const entity = window.lightEntities?.[light.entityId];
        const friendlyName = entity?.attributes?.friendly_name || light.entityId;
        
        return `
            <div class="scene-light-card" data-entity-id="${light.entityId}">
                <div class="scene-light-header">
                    <div class="scene-light-info">
                        <div class="scene-light-name">${friendlyName}</div>
                        <div class="scene-light-entity">${light.entityId}</div>
                    </div>
                    <button class="btn btn-icon-only btn-small" onclick="window.panelManager.getPanel('sceneEditor').removeLight('${light.entityId}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="scene-light-properties">
                    ${light.brightness !== undefined ? `
                        <div class="light-property">
                            <label>
                                <i class="fas fa-sun"></i> Brightness
                            </label>
                            <div class="property-control">
                                <input type="range" min="0" max="100" value="${light.brightness}" 
                                       onchange="window.panelManager.getPanel('sceneEditor').updateLightProperty('${light.entityId}', 'brightness', this.value)">
                                <span class="property-value">${light.brightness}%</span>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${light.colorTemp !== undefined ? `
                        <div class="light-property">
                            <label>
                                <i class="fas fa-thermometer-half"></i> Temperature
                            </label>
                            <div class="property-control">
                                <input type="range" min="2000" max="6500" step="100" value="${light.colorTemp}" 
                                       onchange="window.panelManager.getPanel('sceneEditor').updateLightProperty('${light.entityId}', 'colorTemp', this.value)">
                                <span class="property-value">${light.colorTemp}K</span>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${light.hue !== undefined && light.saturation !== undefined ? `
                        <div class="light-property">
                            <label>
                                <i class="fas fa-palette"></i> Color
                            </label>
                            <div class="property-control color-control">
                                <div class="color-preview" style="background-color: hsl(${light.hue}, ${light.saturation}%, 50%)"></div>
                                <button class="btn btn-small" onclick="window.panelManager.getPanel('sceneEditor').editLightColor('${light.entityId}')">
                                    Edit Color
                                </button>
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="scene-light-actions">
                    <button class="btn btn-small btn-secondary" onclick="window.panelManager.getPanel('sceneEditor').addProperty('${light.entityId}')">
                        <i class="fas fa-plus"></i> Add Property
                    </button>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // New scene button
        const newSceneBtn = document.getElementById('newSceneBtn');
        if (newSceneBtn) {
            newSceneBtn.addEventListener('click', () => this.createNewScene());
        }
        
        if (!this.currentScene) return;
        
        // Scene name input
        const nameInput = document.getElementById('sceneNameInput');
        if (nameInput) {
            nameInput.addEventListener('input', (e) => {
                this.currentScene.name = e.target.value;
                this.markAsChanged();
            });
        }
        
        // Save button
        const saveBtn = document.getElementById('saveSceneBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveScene());
        }
        
        // Revert button
        const revertBtn = document.getElementById('revertSceneBtn');
        if (revertBtn) {
            revertBtn.addEventListener('click', () => this.revertChanges());
        }
        
        // Delete button
        const deleteBtn = document.getElementById('deleteSceneBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteScene());
        }
        
        // Update range input displays
        this.container.querySelectorAll('input[type="range"]').forEach(input => {
            input.addEventListener('input', (e) => {
                const valueSpan = e.target.parentElement.querySelector('.property-value');
                if (valueSpan) {
                    const unit = e.target.max > 100 ? 'K' : '%';
                    valueSpan.textContent = e.target.value + unit;
                }
            });
        });
    }

    createNewScene() {
        this.currentScene = {
            id: null,
            name: 'New Scene',
            lights: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        this.originalScene = null;
        this.hasChanges = true;
        this.render();
    }

    loadScene(scene) {
        this.currentScene = JSON.parse(JSON.stringify(scene)); // Deep clone
        this.originalScene = JSON.parse(JSON.stringify(scene));
        this.hasChanges = false;
        this.render();
    }

    async saveScene() {
        if (!this.currentScene.name.trim()) {
            window.sceneManager?.showStatus('Please enter a scene name', 'warning');
            return;
        }
        
        try {
            const url = this.currentScene.id 
                ? `${window.API_BASE}/api/internal/scenes/${this.currentScene.id}`
                : `${window.API_BASE}/api/internal/scenes`;
                
            const method = this.currentScene.id ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: this.currentScene.name,
                    lights: this.currentScene.lights
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                window.sceneManager?.showStatus(`Scene "${this.currentScene.name}" saved`, 'success');
                this.currentScene = result;
                this.originalScene = JSON.parse(JSON.stringify(result));
                this.hasChanges = false;
                this.render();
                
                // Refresh scenes panel
                window.panelManager?.refreshPanel('scenes');
            } else {
                window.sceneManager?.showStatus(result.error || 'Failed to save scene', 'error');
            }
        } catch (error) {
            console.error('Error saving scene:', error);
            window.sceneManager?.showStatus('Failed to save scene', 'error');
        }
    }

    async deleteScene() {
        if (!this.currentScene.id) return;
        
        if (!confirm(`Are you sure you want to delete the scene "${this.currentScene.name}"?`)) {
            return;
        }
        
        try {
            const response = await fetch(`${window.API_BASE}/api/internal/scenes/${this.currentScene.id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                window.sceneManager?.showStatus(`Scene "${this.currentScene.name}" deleted`, 'success');
                this.currentScene = null;
                this.originalScene = null;
                this.hasChanges = false;
                this.render();
                
                // Refresh scenes panel
                window.panelManager?.refreshPanel('scenes');
            } else {
                const result = await response.json();
                window.sceneManager?.showStatus(result.error || 'Failed to delete scene', 'error');
            }
        } catch (error) {
            console.error('Error deleting scene:', error);
            window.sceneManager?.showStatus('Failed to delete scene', 'error');
        }
    }

    revertChanges() {
        if (this.originalScene) {
            this.currentScene = JSON.parse(JSON.stringify(this.originalScene));
            this.hasChanges = false;
            this.render();
            window.sceneManager?.showStatus('Changes reverted', 'info');
        }
    }

    captureCurrentState() {
        // Get all assigned entities from floorplan
        const assignedEntities = window.panelManager?.getPanel('lights')?.getAssignedFloorplanEntities() || [];
        
        this.currentScene.lights = assignedEntities.map(entity => {
            const currentEntity = window.lightEntities?.[entity.entity_id];
            const light = { entityId: entity.entity_id };
            
            if (currentEntity?.state === 'on') {
                if (currentEntity.attributes?.brightness !== undefined) {
                    light.brightness = Math.round((currentEntity.attributes.brightness / 255) * 100);
                }
                if (currentEntity.attributes?.color_temp_kelvin) {
                    light.colorTemp = currentEntity.attributes.color_temp_kelvin;
                }
                if (currentEntity.attributes?.hs_color) {
                    light.hue = Math.round(currentEntity.attributes.hs_color[0]);
                    light.saturation = Math.round(currentEntity.attributes.hs_color[1]);
                }
            }
            
            return light;
        });
        
        this.markAsChanged();
        this.render();
        window.sceneManager?.showStatus('Captured current light states', 'success');
    }

    async testScene() {
        if (!this.currentScene.lights || this.currentScene.lights.length === 0) {
            window.sceneManager?.showStatus('No lights in scene to test', 'warning');
            return;
        }
        
        // Apply the scene temporarily
        try {
            for (const light of this.currentScene.lights) {
                const data = { entity_id: light.entityId };
                
                if (light.brightness !== undefined) {
                    data.brightness_pct = light.brightness;
                }
                if (light.colorTemp !== undefined) {
                    data.kelvin = light.colorTemp;
                }
                if (light.hue !== undefined && light.saturation !== undefined) {
                    data.hs_color = [light.hue, light.saturation];
                }
                
                await window.lightController?.controlLight(light.entityId, data);
            }
            
            window.sceneManager?.showStatus('Scene test applied', 'success');
        } catch (error) {
            console.error('Error testing scene:', error);
            window.sceneManager?.showStatus('Failed to test scene', 'error');
        }
    }

    duplicateScene() {
        const duplicatedScene = JSON.parse(JSON.stringify(this.currentScene));
        duplicatedScene.id = null;
        duplicatedScene.name = `${duplicatedScene.name} (Copy)`;
        duplicatedScene.created_at = new Date().toISOString();
        duplicatedScene.updated_at = new Date().toISOString();
        
        this.currentScene = duplicatedScene;
        this.originalScene = null;
        this.hasChanges = true;
        this.render();
        
        window.sceneManager?.showStatus('Scene duplicated', 'success');
    }

    updateLightProperty(entityId, property, value) {
        const light = this.currentScene.lights.find(l => l.entityId === entityId);
        if (!light) return;
        
        light[property] = parseInt(value);
        this.markAsChanged();
    }

    removeLight(entityId) {
        this.currentScene.lights = this.currentScene.lights.filter(l => l.entityId !== entityId);
        this.markAsChanged();
        this.render();
    }

    editLightColor(entityId) {
        const light = this.currentScene.lights.find(l => l.entityId === entityId);
        if (!light) return;
        
        // Show color picker for this light
        window.sceneManager?.showColorPicker(entityId, null);
    }

    addProperty(entityId) {
        // Show property selection menu
        const light = this.currentScene.lights.find(l => l.entityId === entityId);
        if (!light) return;
        
        // For now, just add default properties
        if (light.brightness === undefined) {
            light.brightness = 80;
        } else if (light.colorTemp === undefined) {
            light.colorTemp = 3000;
        } else if (light.hue === undefined) {
            light.hue = 0;
            light.saturation = 100;
        }
        
        this.markAsChanged();
        this.render();
    }

    markAsChanged() {
        this.hasChanges = true;
        const saveBtn = document.getElementById('saveSceneBtn');
        const revertBtn = document.getElementById('revertSceneBtn');
        
        if (saveBtn) saveBtn.disabled = false;
        if (revertBtn) revertBtn.disabled = false;
    }

    // Called when a scene is selected from the scenes panel
    onSceneSelected(data) {
        if (data.scene) {
            this.loadScene(data.scene);
        }
    }
}