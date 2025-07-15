import { BasePanel } from './BasePanel.js';

export class ScenesPanel extends BasePanel {
    constructor() {
        super('scenes', 'Scenes', 'fa-image');
        this.scenes = [];
        this.selectedScene = null;
    }

    render() {
        this.container.innerHTML = `
            <div class="panel-header">
                <h3>${this.title}</h3>
            </div>
            <div class="scene-controls">
                <div class="scene-actions">
                    <input type="text" id="newSceneName" placeholder="Scene name..." class="scene-name-input">
                    <button id="saveScene" class="btn btn-primary" disabled>
                        <i class="fas fa-save"></i> Save Scene
                    </button>
                </div>
                <div class="scene-bulk-actions">
                    <button id="clearSceneSettings" class="btn btn-secondary" title="Clear all scene settings">
                        <i class="fas fa-eraser"></i> Clear All
                    </button>
                    <button id="setDefaultSceneValues" class="btn btn-secondary" title="Set default values for all lights">
                        <i class="fas fa-magic"></i> Set Defaults
                    </button>
                </div>
            </div>
            <div id="scenesList" class="scenes-list"></div>
        `;
        
        this.bindEvents();
        this.loadScenes();
    }

    bindEvents() {
        // Scene name input
        const sceneNameInput = document.getElementById('newSceneName');
        if (sceneNameInput) {
            sceneNameInput.addEventListener('input', () => {
                this.updateSaveButtonState();
            });
        }

        // Save scene button
        const saveSceneBtn = document.getElementById('saveScene');
        if (saveSceneBtn) {
            saveSceneBtn.addEventListener('click', () => {
                this.saveScene();
            });
        }

        // Clear scene settings button
        const clearBtn = document.getElementById('clearSceneSettings');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                window.sceneManager?.clearSelection();
            });
        }

        // Set default values button
        const defaultsBtn = document.getElementById('setDefaultSceneValues');
        if (defaultsBtn) {
            defaultsBtn.addEventListener('click', () => {
                window.sceneManager?.selectAll();
            });
        }
    }

    async loadScenes() {
        try {
            const response = await this.fetchData(`${window.API_BASE}/api/internal/scenes`);
            this.scenes = response;
            this.renderScenes();
        } catch (error) {
            console.error('Error loading scenes:', error);
            window.sceneManager?.showStatus('Failed to load scenes', 'error');
        }
    }

    renderScenes() {
        const container = document.getElementById('scenesList');
        container.innerHTML = '';
        
        if (this.scenes.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">No scenes saved yet. Create your first scene!</p>';
            return;
        }
        
        this.scenes.forEach(scene => {
            const sceneCard = this.createSceneCard(scene);
            container.appendChild(sceneCard);
        });
    }

    createSceneCard(scene) {
        const sceneCard = document.createElement('div');
        sceneCard.className = 'scene-card';
        sceneCard.dataset.sceneId = scene.id;
        
        const createdDate = new Date(scene.created_at).toLocaleDateString();
        const updatedDate = new Date(scene.updated_at).toLocaleDateString();
        
        sceneCard.innerHTML = `
            <div class="scene-name">${scene.name}</div>
            <div class="scene-info">
                ${scene.light_count} light${scene.light_count !== 1 ? 's' : ''}<br>
                Created: ${createdDate}<br>
                ${scene.created_at !== scene.updated_at ? `Updated: ${updatedDate}` : ''}
            </div>
            <div class="scene-actions-card">
                <button class="btn btn-small btn-primary" onclick="window.panelManager.getPanel('scenes').loadScene(${scene.id})">Load</button>
                <button class="btn btn-small btn-success" onclick="window.panelManager.getPanel('scenes').applySceneById(${scene.id})">Apply</button>
                <button class="btn btn-small btn-error" onclick="window.panelManager.getPanel('scenes').deleteScene(${scene.id})">Delete</button>
            </div>
        `;
        
        sceneCard.addEventListener('click', (e) => {
            if (!e.target.closest('.scene-actions-card')) {
                this.selectScene(scene.id);
            }
        });
        
        return sceneCard;
    }

    selectScene(sceneId) {
        document.querySelectorAll('.scene-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        const sceneCard = document.querySelector(`[data-scene-id="${sceneId}"]`);
        if (sceneCard) {
            sceneCard.classList.add('selected');
            this.selectedScene = sceneId;
        }
    }

    async loadScene(sceneId) {
        try {
            const scene = await this.fetchData(`${window.API_BASE}/api/internal/scenes/${sceneId}`);
            
            // Clear current selection
            window.sceneManager?.clearSelection();
            
            // Load scene lights
            scene.lights.forEach(light => {
                // Set scene light settings for each light
                if (window.sceneManager) {
                    const settings = {};
                    if (light.brightness !== undefined) settings.brightness = light.brightness;
                    if (light.colorTemp !== undefined) settings.kelvin = light.colorTemp;
                    if (light.hue !== undefined && light.saturation !== undefined) {
                        settings.color = { hue: light.hue, saturation: light.saturation };
                    }
                    
                    // Apply settings to the light
                    Object.entries(settings).forEach(([property, value]) => {
                        window.sceneManager.setSceneLightProperty(light.entityId, property, value);
                    });
                }
            });
            
            // Refresh the lights panel
            window.panelManager?.getPanel('lights')?.refresh();
            
            this.selectScene(sceneId);
            window.sceneManager?.showStatus(`Scene "${scene.name}" loaded`, 'success');
            
        } catch (error) {
            console.error('Error loading scene:', error);
            window.sceneManager?.showStatus('Failed to load scene', 'error');
        }
    }

    async saveScene() {
        const sceneName = document.getElementById('newSceneName').value.trim();
        
        if (!sceneName) {
            window.sceneManager?.showStatus('Please enter a scene name', 'warning');
            return;
        }
        
        // Get all floorplan lights
        const assignedEntities = window.panelManager?.getPanel('lights')?.getAssignedFloorplanEntities() || [];
        
        if (assignedEntities.length === 0) {
            window.sceneManager?.showStatus('No lights found in floorplan. Add lights to the floorplan first.', 'warning');
            return;
        }
        
        const lights = assignedEntities.map(entity => {
            const entityId = entity.entity_id;
            
            // Get scene settings for this light
            const sceneSettings = window.sceneManager?.sceneLightSettings.get(entityId) || {
                brightness: null,
                kelvin: null,
                color: null
            };
            
            const lightData = {
                entityId,
                haEntityId: entityId
            };
            
            // Only include properties that are set (not null)
            if (sceneSettings.brightness !== null) {
                lightData.brightness = sceneSettings.brightness;
            }
            
            if (sceneSettings.kelvin !== null) {
                lightData.colorTemp = sceneSettings.kelvin;
            }
            
            if (sceneSettings.color !== null) {
                lightData.hue = sceneSettings.color.hue;
                lightData.saturation = sceneSettings.color.saturation;
            }
            
            return lightData;
        });
        
        try {
            const response = await fetch(`${window.API_BASE}/api/internal/scenes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: sceneName,
                    lights
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                window.sceneManager?.showStatus(`Scene "${sceneName}" saved successfully with ${lights.length} lights`, 'success');
                document.getElementById('newSceneName').value = '';
                await this.loadScenes();
                this.updateSaveButtonState();
            } else {
                window.sceneManager?.showStatus(result.error || 'Failed to save scene', 'error');
            }
            
        } catch (error) {
            console.error('Error saving scene:', error);
            window.sceneManager?.showStatus('Failed to save scene', 'error');
        }
    }

    async applySceneById(sceneId) {
        try {
            const response = await fetch(`${window.API_BASE}/api/internal/scenes/${sceneId}/apply`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (response.ok) {
                window.sceneManager?.showStatus(result.message, 'success');
                // Refresh light states
                await window.sceneManager?.loadLights();
                window.panelManager?.getPanel('lights')?.refresh();
            } else {
                window.sceneManager?.showStatus(result.error || 'Failed to apply scene', 'error');
            }
            
        } catch (error) {
            console.error('Error applying scene:', error);
            window.sceneManager?.showStatus('Failed to apply scene', 'error');
        }
    }

    async deleteScene(sceneId) {
        const scene = this.scenes.find(s => s.id === sceneId);
        if (!scene) return;
        
        if (!confirm(`Are you sure you want to delete the scene "${scene.name}"?`)) {
            return;
        }
        
        try {
            const response = await fetch(`${window.API_BASE}/api/internal/scenes/${sceneId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (response.ok) {
                window.sceneManager?.showStatus(`Scene "${scene.name}" deleted`, 'success');
                await this.loadScenes();
                
                if (this.selectedScene === sceneId) {
                    this.selectedScene = null;
                }
            } else {
                window.sceneManager?.showStatus(result.error || 'Failed to delete scene', 'error');
            }
            
        } catch (error) {
            console.error('Error deleting scene:', error);
            window.sceneManager?.showStatus('Failed to delete scene', 'error');
        }
    }

    updateSaveButtonState() {
        const hasFloorplanLights = window.panelManager?.getPanel('lights')?.getAssignedFloorplanEntities().length > 0;
        const hasSceneName = document.getElementById('newSceneName').value.trim().length > 0;
        document.getElementById('saveScene').disabled = !hasFloorplanLights || !hasSceneName;
    }

    // Public methods
    refresh() {
        this.loadScenes();
    }
}