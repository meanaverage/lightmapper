// Room Properties Panel Component
class RoomPropertiesPanel {
    constructor(container) {
        this.container = container;
        this.selectedRoom = null;
        this.isVisible = false;
        this.init();
    }
    
    init() {
        // Create the panel HTML structure
        const panelHtml = `
            <div class="room-properties-panel" style="display: none;">
                <div class="room-panel-header">
                    <button class="back-btn">
                        <i class="fas fa-chevron-left"></i>
                        <span>back</span>
                    </button>
                    <div class="room-header-title">
                        <span class="room-label">Room</span>
                        <h2 class="room-name">Living</h2>
                    </div>
                </div>
                
                <div class="room-panel-content">
                    <div class="room-preview">
                        <div class="room-shape"></div>
                    </div>
                    
                    <div class="room-info">
                        <span class="info-label">Room</span>
                        <span class="room-area">0 ft²</span>
                    </div>
                    
                    <div class="property-list">
                        <div class="property-item" data-property="roomtype">
                            <div class="property-icon">
                                <div class="color-square" style="background: #ffdfbf;"></div>
                            </div>
                            <div class="property-content">
                                <div class="property-label">Roomtype</div>
                                <div class="property-value">Living</div>
                            </div>
                            <i class="fas fa-chevron-right"></i>
                        </div>
                        
                        <div class="property-item" data-property="material">
                            <div class="property-icon">
                                <div class="color-square" style="background: #ffdfbf;"></div>
                            </div>
                            <div class="property-content">
                                <div class="property-label">Material</div>
                                <div class="property-value">#FFDFBF</div>
                            </div>
                            <i class="fas fa-chevron-right"></i>
                        </div>
                        
                        <div class="property-item" data-property="styleboard">
                            <div class="property-icon">
                                <i class="fas fa-palette"></i>
                            </div>
                            <div class="property-content">
                                <div class="property-label">Styleboard</div>
                                <div class="property-value">Not Set</div>
                            </div>
                            <i class="fas fa-chevron-right"></i>
                        </div>
                        
                        <div class="property-item" data-property="settings">
                            <div class="property-icon">
                                <i class="fas fa-cog"></i>
                            </div>
                            <div class="property-content">
                                <div class="property-label">Settings</div>
                            </div>
                            <i class="fas fa-chevron-right"></i>
                        </div>
                    </div>
                </div>
                
                <!-- Sub-panels -->
                <div class="room-subpanel roomtype-panel" style="display: none;">
                    <div class="subpanel-header">
                        <button class="subpanel-back">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <h3>Choose Roomtype</h3>
                    </div>
                    <div class="subpanel-content">
                        <div class="roomtype-selector">
                            <div class="selector-group">
                                <label>Category</label>
                                <select class="category-select">
                                    <option>House</option>
                                    <option>Apartment</option>
                                    <option>Office</option>
                                    <option>Retail</option>
                                </select>
                            </div>
                            <div class="selector-group">
                                <label>Type</label>
                                <select class="type-select">
                                    <option>Living</option>
                                    <option>Dining</option>
                                    <option>Kitchen</option>
                                    <option>Bedroom</option>
                                    <option>Bathroom</option>
                                </select>
                            </div>
                        </div>
                        <div class="roomtype-grid">
                            <div class="roomtype-card active" data-type="living">
                                <div class="card-color" style="background: #ffdfbf;"></div>
                                <div class="card-info">
                                    <div class="card-name">Living</div>
                                    <div class="card-area">759.5 ft²</div>
                                </div>
                                <div class="card-dots">●●●</div>
                            </div>
                            <div class="roomtype-card" data-type="dining">
                                <div class="card-color" style="background: #ffc896;"></div>
                                <div class="card-info">
                                    <div class="card-name">Dining</div>
                                </div>
                                <div class="card-dots">●●●</div>
                            </div>
                            <div class="roomtype-card" data-type="kitchen">
                                <div class="card-color" style="background: #b5d3d3;"></div>
                                <div class="card-info">
                                    <div class="card-name">Kitchen</div>
                                </div>
                                <div class="card-dots">●●●</div>
                            </div>
                            <div class="roomtype-card" data-type="bedroom">
                                <div class="card-color" style="background: #ffc4d6;"></div>
                                <div class="card-info">
                                    <div class="card-name">Bedroom</div>
                                </div>
                                <div class="card-dots">●●●</div>
                            </div>
                            <div class="roomtype-card" data-type="bathroom">
                                <div class="card-color" style="background: #d3d3d3;"></div>
                                <div class="card-info">
                                    <div class="card-name">Bathroom</div>
                                </div>
                                <div class="card-dots">●●●</div>
                            </div>
                            <div class="roomtype-card" data-type="kidsroom">
                                <div class="card-color" style="background: #a8d8d8;"></div>
                                <div class="card-info">
                                    <div class="card-name">Kid's room</div>
                                    <div class="card-area">391.2 ft²</div>
                                </div>
                                <div class="card-dots">●●●</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="room-subpanel material-panel" style="display: none;">
                    <div class="subpanel-header">
                        <button class="subpanel-back">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <h3>Floor Finish</h3>
                    </div>
                    <div class="subpanel-content">
                        <div class="material-preview">
                            <div class="material-color" style="background: #ffdfbf;"></div>
                            <div class="material-info">
                                <div class="material-code">#FFDFBF</div>
                                <div class="material-name">Unnamed</div>
                            </div>
                        </div>
                        <div class="material-actions">
                            <button class="material-action">
                                <i class="fas fa-trash"></i>
                                <span>Remove This Color</span>
                            </button>
                            <button class="material-action">
                                <i class="fas fa-heart"></i>
                                <span>Add To Favorites</span>
                            </button>
                            <button class="material-action">
                                <i class="fas fa-cog"></i>
                                <span>Color Settings</span>
                                <i class="fas fa-chevron-right"></i>
                            </button>
                            <button class="material-action">
                                <i class="fas fa-th"></i>
                                <span>Choose Different Color</span>
                                <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="room-subpanel settings-panel" style="display: none;">
                    <div class="subpanel-header">
                        <button class="subpanel-back">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <h3>Room Settings</h3>
                    </div>
                    <div class="subpanel-content">
                        <div class="settings-group">
                            <label>Custom Name</label>
                            <input type="text" class="room-name-input" placeholder="Enter room name">
                        </div>
                        <div class="settings-group">
                            <label>Total Area</label>
                            <div class="area-display">375.5 ft²</div>
                        </div>
                        <div class="settings-group">
                            <label class="checkbox-label">
                                <input type="checkbox" checked>
                                <span>Show name in 2D</span>
                            </label>
                        </div>
                        <div class="settings-group">
                            <label class="checkbox-label">
                                <input type="checkbox">
                                <span>show surface area</span>
                            </label>
                        </div>
                        <div class="settings-divider"></div>
                        <div class="settings-group">
                            <label class="checkbox-label">
                                <input type="checkbox" checked>
                                <span>generate ceiling</span>
                            </label>
                        </div>
                        <div class="settings-group ceiling-material">
                            <div class="property-item">
                                <div class="property-content">
                                    <div class="property-label">Ceiling</div>
                                    <div class="property-value">Pure Brilliant White</div>
                                </div>
                                <i class="fas fa-chevron-right"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add the panel to the panels container
        const panelsContainer = this.container.querySelector('.planner-panels .panel-content');
        if (panelsContainer) {
            panelsContainer.insertAdjacentHTML('beforeend', panelHtml);
            this.panel = panelsContainer.querySelector('.room-properties-panel');
            this.bindEvents();
        }
    }
    
    bindEvents() {
        // Back button
        const backBtn = this.panel.querySelector('.back-btn');
        backBtn.addEventListener('click', () => this.hide());
        
        // Property items
        const propertyItems = this.panel.querySelectorAll('.property-item[data-property]');
        propertyItems.forEach(item => {
            item.addEventListener('click', () => {
                const property = item.dataset.property;
                this.showSubPanel(property);
            });
        });
        
        // Sub-panel back buttons
        const subPanelBacks = this.panel.querySelectorAll('.subpanel-back');
        subPanelBacks.forEach(btn => {
            btn.addEventListener('click', () => this.hideSubPanels());
        });
        
        // Roomtype cards
        const roomtypeCards = this.panel.querySelectorAll('.roomtype-card');
        roomtypeCards.forEach(card => {
            card.addEventListener('click', () => {
                roomtypeCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                
                const type = card.dataset.type;
                const name = card.querySelector('.card-name').textContent;
                const color = window.getComputedStyle(card.querySelector('.card-color')).backgroundColor;
                
                this.updateRoomType(type, name, color);
                this.hideSubPanels();
            });
        });
        
        // Listen for room selection events
        window.addEventListener('objectSelected', (event) => {
            if (event.detail.type === 'room') {
                this.showRoom(event.detail.object);
            }
        });
    }
    
    showSubPanel(panelName) {
        // Hide all sub-panels first
        this.hideSubPanels();
        
        // Show the requested sub-panel
        const subPanel = this.panel.querySelector(`.${panelName}-panel`);
        if (subPanel) {
            subPanel.style.display = 'block';
        }
    }
    
    hideSubPanels() {
        const subPanels = this.panel.querySelectorAll('.room-subpanel');
        subPanels.forEach(panel => panel.style.display = 'none');
    }
    
    updateRoomType(type, name, color) {
        if (!this.selectedRoom) return;
        
        // Update the room data
        this.selectedRoom.roomType = type;
        this.selectedRoom.name = name;
        this.selectedRoom.color = color;
        
        // Update the UI
        this.panel.querySelector('.room-name').textContent = name;
        this.panel.querySelector('.property-item[data-property="roomtype"] .property-value').textContent = name;
        this.panel.querySelector('.property-item[data-property="roomtype"] .color-square').style.background = color;
        
        // Dispatch event for redraw
        window.dispatchEvent(new CustomEvent('roomUpdated', { 
            detail: { room: this.selectedRoom } 
        }));
    }
    
    showRoom(room) {
        this.selectedRoom = room;
        
        // Update room info
        this.panel.querySelector('.room-name').textContent = room.name || 'Room';
        
        // Calculate area in square feet
        const areaInCm2 = room.area || 0;
        const areaInFt2 = (areaInCm2 / 929.0304).toFixed(1); // 1 ft² = 929.0304 cm²
        this.panel.querySelector('.room-area').textContent = `${areaInFt2} ft²`;
        
        // Update properties
        const roomType = room.roomType || 'living';
        const roomColor = room.color || '#ffdfbf';
        
        this.panel.querySelector('.property-item[data-property="roomtype"] .property-value').textContent = 
            room.name || 'Living';
        this.panel.querySelector('.property-item[data-property="roomtype"] .color-square').style.background = 
            roomColor;
        this.panel.querySelector('.property-item[data-property="material"] .color-square').style.background = 
            roomColor;
        this.panel.querySelector('.property-item[data-property="material"] .property-value').textContent = 
            roomColor.toUpperCase();
        
        // Hide all panels first
        const allPanels = this.container.querySelectorAll('.panel');
        allPanels.forEach(p => p.classList.remove('active'));
        
        // Show this panel
        this.show();
    }
    
    show() {
        this.panel.style.display = 'block';
        this.isVisible = true;
    }
    
    hide() {
        this.panel.style.display = 'none';
        this.isVisible = false;
        this.hideSubPanels();
        
        // Show the build panel again
        const buildPanel = this.container.querySelector('.build-panel');
        if (buildPanel) {
            buildPanel.classList.add('active');
        }
    }
}

// Make it available globally
window.RoomPropertiesPanel = RoomPropertiesPanel;