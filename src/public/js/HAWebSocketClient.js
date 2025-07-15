/**
 * Home Assistant WebSocket Client
 * Connects directly to Home Assistant's WebSocket API for real-time updates
 */
class HAWebSocketClient {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.authenticated = false;
        this.messageId = 1;
        this.pendingMessages = new Map();
        this.eventSubscriptions = new Map();
        this.listeners = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 1000;
        
        console.log('🏠 HAWebSocketClient initialized');
        this.connect();
    }
    
    async connect() {
        try {
            // Determine the WebSocket URL based on environment
            const wsUrl = await this.getWebSocketUrl();
            console.log('🏠 Connecting to Home Assistant WebSocket:', wsUrl);
            
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('🏠 WebSocket connection opened');
            };
            
            this.ws.onmessage = (event) => {
                this.handleMessage(JSON.parse(event.data));
            };
            
            this.ws.onclose = () => {
                console.log('🏠 WebSocket connection closed');
                this.connected = false;
                this.authenticated = false;
                this.stopHeartbeat();
                this.emit('disconnected');
                this.scheduleReconnect();
            };
            
            this.ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
                this.emit('error', error);
            };
            
        } catch (error) {
            console.error('❌ Failed to connect to Home Assistant WebSocket:', error);
            this.scheduleReconnect();
        }
    }
    
    async getWebSocketUrl() {
        // Check if we're running in Home Assistant add-on environment
        const isIngress = window.location.href.includes('hassio_ingress');
        
        if (isIngress) {
            // In ingress mode, use our WebSocket proxy
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const basePath = window.API_BASE || '';
            const wsUrl = `${wsProtocol}//${window.location.host}${basePath}/api/websocket`;
            console.log('🏠 Ingress mode: using WebSocket proxy:', wsUrl);
            return wsUrl;
        } else {
            // Otherwise, try to construct from current location
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.hostname;
            const port = window.location.port || (protocol === 'wss:' ? '443' : '80');
            
            // Check if we have a configured HA URL
            try {
                const configResponse = await fetch(`${window.API_BASE || ''}/api/internal/config`);
                if (configResponse.ok) {
                    const config = await configResponse.json();
                    if (config.ha && config.ha.baseUrl) {
                        const haUrl = new URL(config.ha.baseUrl);
                        const wsProtocol = haUrl.protocol === 'https:' ? 'wss:' : 'ws:';
                        return `${wsProtocol}//${haUrl.host}/api/websocket`;
                    }
                }
            } catch (e) {
                console.log('Could not fetch config, using default URL');
            }
            
            return `${protocol}//${host}:${port}/api/websocket`;
        }
    }
    
    handleMessage(message) {
        // Only log non-event messages to reduce console noise
        if (message.type !== 'event') {
            console.log('📨 HA WebSocket message:', message);
        }
        
        switch (message.type) {
            case 'auth_required':
                this.authenticate();
                break;
                
            case 'auth_ok':
                console.log('✅ Authenticated with Home Assistant');
                this.connected = true;
                this.authenticated = true;
                this.reconnectAttempts = 0;
                this.emit('connected');
                // Start heartbeat to keep connection alive
                this.startHeartbeat();
                // Subscribe to events after authentication
                this.subscribeToStateChanges();
                break;
                
            case 'auth_invalid':
                // Check if we're in ingress mode where proxy handles auth
                const isIngress = window.location.href.includes('hassio_ingress');
                if (isIngress) {
                    console.log('🔄 Proxy mode: Authentication handled by server');
                    this.connected = true; // Mark as connected anyway
                    this.emit('connected');
                } else {
                    console.error('❌ Authentication failed:', message.message);
                    // In direct mode, this is a real error
                    this.emit('error', new Error('Authentication failed'));
                }
                break;
                
            case 'result':
                this.handleResult(message);
                break;
                
            case 'event':
                this.handleEvent(message);
                break;
                
            case 'pong':
                // Pong received, connection is alive
                break;
                
            default:
                console.log('📨 Unknown message type:', message.type);
        }
    }
    
    async authenticate() {
        console.log('🔐 Authenticating with Home Assistant...');
        
        // In ingress mode with proxy, we don't send auth from client
        // The proxy handles authentication on the server side
        const isIngress = window.location.href.includes('hassio_ingress');
        if (isIngress) {
            console.log('🏠 Ingress mode: auth handled by proxy');
            // Just send a dummy auth to satisfy the client flow
            this.ws.send(JSON.stringify({
                type: 'auth',
                access_token: 'proxy-handled'
            }));
            return;
        }
        
        // For non-ingress mode, get token from config
        try {
            const configResponse = await fetch(`${window.API_BASE || ''}/api/internal/config`);
            if (configResponse.ok) {
                const config = await configResponse.json();
                console.log('🔑 Config received, token available:', !!config.ha?.token);
                
                if (config.ha && config.ha.token) {
                    // Send auth message with token
                    console.log('🔐 Sending authentication with token...');
                    this.ws.send(JSON.stringify({
                        type: 'auth',
                        access_token: config.ha.token
                    }));
                    return;
                }
            }
        } catch (error) {
            console.error('❌ Failed to get auth token:', error);
        }
        
        // If we can't get a token, close the connection
        console.error('❌ No authentication token available');
        this.ws.close();
    }
    
    handleResult(message) {
        const pending = this.pendingMessages.get(message.id);
        if (pending) {
            if (message.success) {
                pending.resolve(message.result);
            } else {
                pending.reject(new Error(message.error.message));
            }
            this.pendingMessages.delete(message.id);
        }
    }
    
    handleEvent(message) {
        if (message.event.event_type === 'state_changed') {
            const eventData = message.event.data;
            const entityId = eventData.entity_id;
            
            // Only process light entities
            if (entityId && entityId.startsWith('light.')) {
                console.log(`💡 Light state changed: ${entityId}`);
                
                // Transform to our expected format
                const stateData = {
                    entityId: entityId,
                    state: {
                        entity_id: entityId,
                        state: eventData.new_state.state,
                        attributes: eventData.new_state.attributes,
                        last_changed: eventData.new_state.last_changed,
                        last_updated: eventData.new_state.last_updated
                    }
                };
                
                // Emit to listeners
                this.emit('light_state_changed', stateData);
                this.emit('state_changed', stateData);
            }
        }
    }
    
    async subscribeToStateChanges() {
        console.log('📡 Subscribing to state changes...');
        
        const isIngress = window.location.href.includes('hassio_ingress');
        
        try {
            const result = await this.sendMessagePromise({
                type: 'subscribe_events',
                event_type: 'state_changed'
            });
            
            console.log('✅ Subscribed to state changes, result:', result);
            if (result && result.id) {
                this.eventSubscriptions.set('state_changed', result.id);
            } else {
                if (isIngress) {
                    console.log('🔄 Proxy mode: Subscription handled by server');
                } else {
                    console.warn('⚠️ Subscribe result missing ID, but may still receive events');
                }
            }
        } catch (error) {
            if (isIngress) {
                console.log('🔄 Proxy mode: Events will be forwarded by server');
            } else {
                console.error('❌ Failed to subscribe to state changes:', error);
                console.log('🔄 Will continue without explicit subscription');
            }
        }
    }
    
    sendMessagePromise(message) {
        return new Promise((resolve, reject) => {
            if (!this.authenticated) {
                reject(new Error('Not authenticated'));
                return;
            }
            
            const id = this.messageId++;
            message.id = id;
            
            this.pendingMessages.set(id, { resolve, reject });
            this.ws.send(JSON.stringify(message));
            
            // Timeout after 30 seconds
            setTimeout(() => {
                if (this.pendingMessages.has(id)) {
                    this.pendingMessages.delete(id);
                    reject(new Error('Request timeout'));
                }
            }, 30000);
        });
    }
    
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Max reconnect attempts reached');
            return;
        }
        
        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
        this.reconnectAttempts++;
        
        console.log(`🔄 Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
        setTimeout(() => this.connect(), delay);
    }
    
    /**
     * Add event listener
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    /**
     * Remove event listener
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
     */
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ Error in event listener for ${event}:`, error);
                }
            });
        }
    }
    
    /**
     * Send ping to keep connection alive
     */
    ping() {
        if (this.authenticated) {
            this.ws.send(JSON.stringify({ type: 'ping' }));
        }
    }
    
    /**
     * Start periodic ping to keep connection alive
     */
    startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            this.ping();
        }, 30000); // Ping every 30 seconds
    }
    
    /**
     * Stop heartbeat
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    
    /**
     * Handle highlight light request
     */
    handleHighlightLight(message) {
        const { entity_id, duration, color } = message;
        console.log(`✨ Highlight light request: ${entity_id} for ${duration}ms in ${color}`);
        
        // Find the light on the canvas
        const canvasPanel = window.panelManager?.getPanel('canvas');
        if (!canvasPanel) return;
        
        const lights = canvasPanel.getLights();
        const light = lights.find(l => l.entityId === entity_id);
        
        if (light) {
            const canvas = canvasPanel.getCanvas();
            if (!canvas) return;
            
            // Store original values
            const originalStroke = light.stroke;
            const originalStrokeWidth = light.strokeWidth;
            const originalShadow = light.shadow ? light.shadow.color : null;
            
            // Apply highlight effect
            light.set({
                stroke: color,
                strokeWidth: 5,
                shadow: new fabric.Shadow({
                    color: color,
                    blur: 20,
                    offsetX: 0,
                    offsetY: 0
                })
            });
            
            // Animate the highlight
            let pulseDirection = 1;
            const pulseInterval = setInterval(() => {
                const currentBlur = light.shadow.blur;
                const newBlur = currentBlur + (pulseDirection * 5);
                
                if (newBlur >= 30 || newBlur <= 10) {
                    pulseDirection *= -1;
                }
                
                light.shadow.blur = newBlur;
                canvas.renderAll();
            }, 100);
            
            canvas.renderAll();
            
            // Remove highlight after duration
            setTimeout(() => {
                clearInterval(pulseInterval);
                light.set({
                    stroke: originalStroke,
                    strokeWidth: originalStrokeWidth,
                    shadow: originalShadow ? new fabric.Shadow({ color: originalShadow }) : null
                });
                canvas.renderAll();
            }, duration);
        }
    }
    
    /**
     * Close connection
     */
    close() {
        this.stopHeartbeat();
        if (this.ws) {
            this.ws.close();
        }
    }
}

// Create global HA WebSocket client instance
window.haWsClient = new HAWebSocketClient();