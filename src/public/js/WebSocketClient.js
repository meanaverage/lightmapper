/**
 * WebSocket client for real-time updates from Home Assistant
 * @class WebSocketClient
 */
class WebSocketClient {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 1000;
        this.listeners = new Map();
        
        console.log('🔌 WebSocketClient initialized');
        this.connect();
    }
    
    connect() {
        const basePath = window.API_BASE || '';
        
        // Check if we're in ingress mode
        if (basePath.includes('hassio_ingress')) {
            console.log('🔌 Ingress mode detected - WebSocket connections not supported');
            console.log('🔄 Falling back to polling for real-time updates');
            
            // In ingress mode, WebSocket connections through the proxy are unreliable
            // Instead, we'll use server-sent events or polling
            this.setupPollingFallback();
            return;
        }
        
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}${basePath}/ws`;
        
        console.log('🔌 Connecting to LightMapper WebSocket:', wsUrl);
        
        try {
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('✅ WebSocket connected');
                this.connected = true;
                this.reconnectAttempts = 0;
                this.reconnectDelay = 1000;
                
                // Notify listeners
                this.emit('connected');
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleMessage(message);
                } catch (error) {
                    console.error('❌ Failed to parse WebSocket message:', error);
                }
            };
            
            this.ws.onclose = () => {
                console.log('🔌 WebSocket disconnected');
                this.connected = false;
                this.emit('disconnected');
                this.scheduleReconnect();
            };
            
            this.ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
                this.connected = false;
                this.emit('error', error);
            };
            
        } catch (error) {
            console.error('❌ Failed to create WebSocket connection:', error);
            this.scheduleReconnect();
        }
    }
    
    handleMessage(message) {
        console.log('📨 WebSocket message received:', message);
        
        switch (message.type) {
            case 'connection':
                console.log('🎉 WebSocket connection established');
                break;
                
            case 'state_change':
                this.handleStateChange(message);
                break;
                
            default:
                console.log('📨 Unknown message type:', message.type);
        }
    }
    
    handleStateChange(message) {
        const { entity_id, state } = message;
        
        if (entity_id && entity_id.startsWith('light.')) {
            console.log(`💡 Light state changed: ${entity_id}`, state);
            
            // Emit to all listeners
            this.emit('light_state_changed', {
                entityId: entity_id,
                state: state
            });
            
            // Also emit generic state change
            this.emit('state_changed', {
                entityId: entity_id,
                state: state
            });
        }
    }
    
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Max WebSocket reconnect attempts reached');
            return;
        }
        
        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
        this.reconnectAttempts++;
        
        console.log(`🔄 Scheduling WebSocket reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
        setTimeout(() => this.connect(), delay);
    }
    
    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {function} callback - Callback function
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {function} callback - Callback function
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    /**
     * Emit event to all listeners
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ Error in WebSocket event listener for ${event}:`, error);
                }
            });
        }
    }
    
    /**
     * Send message to server
     * @param {object} message - Message to send
     */
    send(message) {
        if (this.ws && this.connected) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('⚠️ WebSocket not connected, cannot send message');
        }
    }
    
    /**
     * Setup polling fallback for ingress mode
     */
    setupPollingFallback() {
        console.log('🔄 Setting up polling fallback');
        
        // Mark as connected (polling mode)
        this.connected = true;
        this.emit('connected');
        
        // Set up periodic polling for state changes
        this.pollingInterval = setInterval(() => {
            this.pollForStateChanges();
        }, 5000); // Poll every 5 seconds
    }
    
    /**
     * Poll for state changes (fallback for ingress mode)
     */
    async pollForStateChanges() {
        try {
            const response = await fetch(`${window.API_BASE}/api/lights`);
            const lights = await response.json();
            
            // Check if we have previous state to compare
            if (this.lastLightStates) {
                // Compare with previous state and emit changes
                lights.forEach(light => {
                    const previousState = this.lastLightStates[light.entity_id];
                    if (previousState && JSON.stringify(previousState) !== JSON.stringify(light)) {
                        // State changed, emit event
                        this.emit('light_state_changed', {
                            entityId: light.entity_id,
                            state: light
                        });
                    }
                });
            }
            
            // Store current state for next comparison
            this.lastLightStates = {};
            lights.forEach(light => {
                this.lastLightStates[light.entity_id] = light;
            });
            
        } catch (error) {
            console.error('❌ Error polling for state changes:', error);
        }
    }
    
    /**
     * Close connection
     */
    close() {
        if (this.ws) {
            this.ws.close();
        }
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
    }
}

// Create global WebSocket client instance
window.wsClient = new WebSocketClient();