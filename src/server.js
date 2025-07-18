const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const WebSocket = require('ws');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// Load new settings system
const settings = require('./settings');
const HomeAssistantRegistry = require('./lib/HomeAssistantRegistry');

console.log('🚀 Starting LightMapper...');
console.log('📁 Current working directory:', process.cwd());
console.log('📁 __dirname:', __dirname);

const app = express();
const PORT = settings.server.port;

// Initialize Home Assistant Registry
const haRegistry = new HomeAssistantRegistry(settings.homeAssistant.configPath);

console.log('🔍 Settings Configuration:');
console.log('  Server port:', settings.server.port);
console.log('  Ingress mode:', settings.server.ingress);
console.log('  Supervised mode:', settings.server.supervised);
console.log('  HA Base URL:', settings.homeAssistant.baseUrl);
console.log('  HA Token available:', !!settings.homeAssistant.token);
console.log('  HA Config path:', settings.homeAssistant.configPath);
console.log('  Database path:', settings.database.path);
console.log('  Config accessible:', haRegistry.isConfigAccessible());

// Legacy support - keep for backward compatibility
const isIngress = settings.server.ingress;

// Configuration from settings (legacy support)
const config = {
  logLevel: settings.logging.level,
  gridSize: settings.ui.gridSize,
  defaults: settings.lightDefaults,
  ha: {
    baseUrl: settings.homeAssistant.baseUrl,
    token: settings.homeAssistant.token
  },
  ingress: settings.server.ingress,
  ingressPath: process.env.INGRESS_ENTRY || process.env.INGRESS_URL || ''
};

console.log('⚙️ Configuration loaded:');
console.log('  Log level:', config.logLevel);
console.log('  Grid size:', config.gridSize);
console.log('  Default brightness:', config.defaults.brightness + '%');
console.log('  Ingress mode:', config.ingress);
console.log('  HA Base URL:', config.ha.baseUrl);
console.log('  HA Token available:', !!config.ha.token);
console.log('  HA Token length:', config.ha.token ? config.ha.token.length : 'N/A');
console.log('🔧 Final configuration choice:');
console.log('  Using token type:', 
  config.ha.token === process.env.HASSIO_TOKEN ? 'HASSIO_TOKEN' :
  config.ha.token === process.env.SUPERVISOR_TOKEN ? 'SUPERVISOR_TOKEN' : 
  'USER_TOKEN');
console.log('  Final base URL:', config.ha.baseUrl);

// Database setup
const dbPath = settings.database.path;
let db;

// Initialize database
function initDatabase() {
  console.log('🗄️ Initializing database...');
  console.log('📍 Database path:', dbPath);
  
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Error opening database:', err);
        reject(err);
        return;
      }
      
      console.log('✅ Connected to SQLite database');
      
      // Create tables
      db.serialize(() => {
        // Scenes table
        db.run(`CREATE TABLE IF NOT EXISTS scenes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        
        // Scene lights table
        db.run(`CREATE TABLE IF NOT EXISTS scene_lights (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          scene_id INTEGER,
          position INTEGER,
          brightness INTEGER,
          color_temp INTEGER,
          hue INTEGER,
          saturation INTEGER,
          ha_entity_id TEXT,
          FOREIGN KEY (scene_id) REFERENCES scenes (id) ON DELETE CASCADE
        )`);
        
        // Settings table
        db.run(`CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT
        )`);
        
        // Light mappings table
        db.run(`CREATE TABLE IF NOT EXISTS light_mappings (
          position INTEGER PRIMARY KEY,
          ha_entity_id TEXT,
          friendly_name TEXT
        )`);

        // Create floorplan table for storing room layout and light positions
        db.run(`CREATE TABLE IF NOT EXISTS floorplan (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          room_outline TEXT,
          lights_data TEXT,
          mode TEXT DEFAULT 'grid',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        
        console.log('✅ Database tables created/verified');
        resolve();
      });
    });
  });
}

// Middleware
console.log('🛡️ Setting up middleware...');
app.use(helmet({
  contentSecurityPolicy: settings.security.enableHelmet ? undefined : false
}));
console.log('  ✅ Helmet configured (CSP:', settings.security.enableHelmet ? 'enabled' : 'disabled for ingress', ')');

app.use(cors());
console.log('  ✅ CORS enabled');

app.use(morgan('combined'));
console.log('  ✅ Morgan logging enabled');

app.use(express.json());
console.log('  ✅ JSON parsing enabled');

// Request logger for debugging (early in middleware chain)
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url} from ${req.ip}`);
  if (req.headers['x-forwarded-for']) {
    console.log(`  Forwarded from: ${req.headers['x-forwarded-for']}`);
  }
  if (req.headers['x-ingress-path']) {
    console.log(`  Ingress path: ${req.headers['x-ingress-path']}`);
  }
  if (req.headers['host']) {
    console.log(`  Host: ${req.headers['host']}`);
  }
  next();
});
console.log('  ✅ Request logging enabled');

// Set up static file serving - works for both ingress and standalone
console.log('📁 Setting up static file serving...');
const staticPath = path.join(__dirname, 'public');
console.log('  📍 Static files path:', staticPath);

// Check if public directory exists
if (fs.existsSync(staticPath)) {
  console.log('  ✅ Public directory exists');
  const cssPath = path.join(staticPath, 'css');
  const jsPath = path.join(staticPath, 'js');
  console.log('  📁 CSS directory exists:', fs.existsSync(cssPath));
  console.log('  📁 JS directory exists:', fs.existsSync(jsPath));
  
  if (fs.existsSync(cssPath)) {
    const cssFiles = fs.readdirSync(cssPath);
    console.log('  📄 CSS files found:', cssFiles);
  }
  
  if (fs.existsSync(jsPath)) {
    const jsFiles = fs.readdirSync(jsPath);
    console.log('  📄 JS files found:', jsFiles);
  }
} else {
  console.log('  ❌ Public directory does not exist!');
}

app.use(express.static(staticPath));
console.log('  ✅ Express static middleware configured');

// Serve planner static files  
app.use('/planner', express.static(path.join(staticPath, 'planner')));
console.log('  ✅ Planner static files configured');

// Explicitly handle css and js requests for ingress compatibility
app.get('/css/:filename', (req, res) => {
  console.log('🎨 CSS request:', req.params.filename);
  res.sendFile(path.join(staticPath, 'css', req.params.filename));
});

app.get('/js/:filename', (req, res) => {
  console.log('⚡ JS request:', req.params.filename);
  res.sendFile(path.join(staticPath, 'js', req.params.filename));
});

console.log('📊 Final configuration summary:');
console.log('  Static files served from:', staticPath);
console.log('  Current __dirname:', __dirname);
console.log('  Ingress mode:', isIngress);
if (isIngress) {
  console.log('  Ingress entry path:', config.ingressPath);
}

// API Key Authentication Middleware for external API access
const authenticateApiKey = (req, res, next) => {
  // Skip auth for internal requests and if external API is not enabled
  if (!settings.api.enableExternal) {
    return next();
  }
  
  // Skip auth for non-API endpoints
  if (!req.path.startsWith('/api/')) {
    return next();
  }
  
  // Allow internal access without API key (from the web UI)
  const referer = req.get('referer');
  if (referer && (referer.includes(req.get('host')) || referer.includes('hassio_ingress'))) {
    return next();
  }
  
  // Check for API key in header or query parameter
  const apiKey = req.get('X-API-Key') || req.query.api_key;
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  if (apiKey !== settings.api.apiKey) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  next();
};

// Apply API key middleware to all /api routes
app.use('/api/*', authenticateApiKey);

// Home Assistant API helper
class HomeAssistantAPI {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.token = token;
    this.ws = null;
    this.wsConnected = false;
    this.wsReconnectAttempts = 0;
    this.wsMaxReconnectAttempts = 5;
    this.wsSubscriptions = new Set();
    
    this.axios = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('🏠 HomeAssistantAPI initialized:');
    console.log('  Base URL:', baseUrl);
    console.log('  Token available:', !!token);
    console.log('  Token length:', token ? token.length : 'N/A');
    console.log('  Token preview:', token ? token.substring(0, 10) + '...' : 'N/A');
    
    // Don't initialize WebSocket - client handles real-time updates through proxy
    // this.initWebSocket();
  }
  
  initWebSocket() {
    if (!this.token) {
      console.warn('⚠️ No token available, skipping WebSocket connection');
      return;
    }
    
    try {
      // Convert HTTP(S) URL to WebSocket URL
      const wsUrl = this.baseUrl.replace('http://', 'ws://').replace('https://', 'wss://') + '/api/websocket';
      console.log('🔌 Connecting to Home Assistant WebSocket:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('✅ WebSocket connected to Home Assistant');
        this.wsConnected = true;
        this.wsReconnectAttempts = 0;
        this.authenticateWebSocket();
      };
      
      this.ws.onmessage = (event) => {
        this.handleWebSocketMessage(JSON.parse(event.data));
      };
      
      this.ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        this.wsConnected = false;
        // Don't automatically reconnect - client handles WebSocket connections
        // this.scheduleReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.wsConnected = false;
      };
      
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket:', error);
    }
  }
  
  authenticateWebSocket() {
    if (!this.ws || !this.wsConnected) return;
    
    // Send authentication message
    this.ws.send(JSON.stringify({
      type: 'auth',
      access_token: this.token
    }));
  }
  
  handleWebSocketMessage(message) {
    switch (message.type) {
      case 'auth_required':
        console.log('🔐 WebSocket authentication required');
        this.authenticateWebSocket();
        break;
        
      case 'auth_ok':
        console.log('✅ WebSocket authenticated successfully');
        // Don't subscribe to state changes - the client handles this through the proxy
        // this.subscribeToStateChanges();
        break;
        
      case 'auth_invalid':
        console.error('❌ WebSocket authentication failed');
        break;
        
      case 'event':
        if (message.event && message.event.event_type === 'state_changed') {
          this.handleStateChange(message.event);
        }
        break;
        
      case 'result':
        console.log('📊 WebSocket command result:', message);
        break;
        
      default:
        console.log('📨 WebSocket message:', message);
    }
  }
  
  subscribeToStateChanges() {
    if (!this.ws || !this.wsConnected) return;
    
    // Subscribe to state changes for light entities
    this.ws.send(JSON.stringify({
      id: 1,
      type: 'subscribe_events',
      event_type: 'state_changed'
    }));
    
    console.log('📡 Subscribed to Home Assistant state changes');
  }
  
  handleStateChange(event) {
    const { entity_id, new_state, old_state } = event.data;
    
    // Only handle light entities
    if (entity_id && entity_id.startsWith('light.')) {
      console.log(`💡 Light state changed: ${entity_id}`, {
        old: old_state?.state,
        new: new_state?.state
      });
      
      // Broadcast to all connected clients
      this.broadcastStateChange(entity_id, new_state);
    }
  }
  
  broadcastStateChange(entityId, newState) {
    // Broadcast to all WebSocket clients
    if (global.wsClients) {
      const message = JSON.stringify({
        type: 'state_change',
        entity_id: entityId,
        state: newState
      });
      
      global.wsClients.forEach(client => {
        if (client.readyState === client.OPEN) {
          client.send(message);
        }
      });
    }
  }
  
  scheduleReconnect() {
    if (this.wsReconnectAttempts >= this.wsMaxReconnectAttempts) {
      console.error('❌ Max WebSocket reconnect attempts reached');
      return;
    }
    
    const delay = Math.min(1000 * Math.pow(2, this.wsReconnectAttempts), 30000);
    this.wsReconnectAttempts++;
    
    console.log(`🔄 Scheduling WebSocket reconnect in ${delay}ms (attempt ${this.wsReconnectAttempts})`);
    setTimeout(() => this.initWebSocket(), delay);
  }
  
  async getLights() {
    try {
      console.log('🔍 Fetching lights from HA API...');
      console.log('  Base URL:', this.baseUrl);
      // Will be set based on proxy detection below
      console.log('  Token present:', !!this.token);
      
      // Use standard Home Assistant API endpoint
      const endpoint = '/api/states';
      const isProxied = this.baseUrl.includes('supervisor/core');
      
      console.log(`🏠 Using ${isProxied ? 'supervisor proxy' : 'direct'} API endpoint: ${endpoint}`);
      console.log('  Full URL:', `${this.baseUrl}${endpoint}`);
      
      let response;
      try {
        response = await this.axios.get(endpoint);
        console.log('✅ Successfully connected to Home Assistant API');
      } catch (error) {
        if (error.response?.status === 401) {
          if (isProxied) {
            console.log('❌ SUPERVISOR_TOKEN authentication failed!');
            console.log('💡 WORKAROUND: Configure manual token in add-on settings:');
            console.log('   1. Go to Home Assistant Profile → Security');
            console.log('   2. Create a Long-lived Access Token');
            console.log('   3. In add-on config, set:');
            console.log('      ha_token: YOUR_TOKEN_HERE');
            console.log('      ha_base_url: http://192.168.220.2:8123');
          } else {
            console.log('❌ Authentication failed with manual config. Check your token permissions.');
          }
        } else {
          console.log('❌ API connection failed:', error.response?.status, error.response?.statusText);
        }
        throw error;
      }
      
      const lights = response.data.filter(entity => 
        entity.entity_id.startsWith('light.') && 
        !entity.entity_id.includes('group')
      );
      
      console.log('✅ Successfully fetched', lights.length, 'lights from HA');
      return lights;
    } catch (error) {
      console.error('❌ Error fetching lights from HA:');
      console.error('  Error type:', error.constructor.name);
      console.error('  Error code:', error.code);
      console.error('  Error message:', error.message);
      if (error.config) {
        console.error('  Request URL:', error.config.url);
        console.error('  Request baseURL:', error.config.baseURL);
        console.error('  Full request URL:', `${error.config.baseURL}${error.config.url}`);
      }
      if (error.response) {
        console.error('  Response status:', error.response.status);
        console.error('  Response statusText:', error.response.statusText);
        console.error('  Response data:', error.response.data);
      }
      throw error;
    }
  }

  // WebSocket API helper for registry data
  async sendWebSocketCommand(command) {
    return new Promise((resolve, reject) => {
      const wsUrl = this.baseUrl.replace('http://', 'ws://').replace('https://', 'wss://') + '/websocket';
      console.log('🔌 Connecting to WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      let messageId = 1;
      
      ws.on('open', () => {
        console.log('✅ WebSocket connected');
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log('📨 WebSocket message:', message.type);
          
          if (message.type === 'auth_required') {
            // Send authentication
            ws.send(JSON.stringify({
              type: 'auth',
              access_token: this.token
            }));
          } else if (message.type === 'auth_ok') {
            // Send our command
            ws.send(JSON.stringify({
              id: messageId,
              ...command
            }));
          } else if (message.type === 'result' && message.id === messageId) {
            ws.close();
            if (message.success) {
              resolve(message.result);
            } else {
              reject(new Error(message.error?.message || 'WebSocket command failed'));
            }
          }
        } catch (error) {
          ws.close();
          reject(error);
        }
      });
      
      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
        reject(error);
      });
      
      ws.on('close', () => {
        console.log('🔌 WebSocket closed');
      });
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
          reject(new Error('WebSocket timeout'));
        }
      }, 10000);
    });
  }

  async getAreas() {
    try {
      console.log('🏠 Fetching areas via WebSocket API...');
      const areas = await this.sendWebSocketCommand({
        type: 'config/area_registry/list'
      });
      console.log('✅ Successfully fetched', areas.length, 'areas from HA');
      return areas;
    } catch (error) {
      console.error('❌ Error fetching areas from HA:', error.message);
      console.log('🔄 Attempting fallback to template endpoint...');
      
      // Fallback to template endpoint
      try {
        const endpoint = '/api/template';
        const response = await this.axios.post(endpoint, {
          template: '{{ areas() | list }}'
        });
        const areas = response.data.map(area => ({ name: area, id: area }));
        console.log('✅ Successfully fetched', areas.length, 'areas via template fallback');
        return areas;
      } catch (fallbackError) {
        console.error('❌ Template fallback failed:', fallbackError.message);
        return [];
      }
    }
  }

  async getDevices() {
    try {
      console.log('🔧 Fetching devices via WebSocket API...');
      const devices = await this.sendWebSocketCommand({
        type: 'config/device_registry/list'
      });
      console.log('✅ Successfully fetched', devices.length, 'devices from HA');
      return devices;
    } catch (error) {
      console.error('❌ Error fetching devices from HA:', error.message);
      return []; // Return empty array if devices can't be fetched
    }
  }

  async getEntities() {
    try {
      console.log('⚙️ Fetching entities via WebSocket API...');
      const entities = await this.sendWebSocketCommand({
        type: 'config/entity_registry/list'
      });
      console.log('✅ Successfully fetched', entities.length, 'entities from HA');
      return entities;
    } catch (error) {
      console.error('❌ Error fetching entities from HA:', error.message);
      return []; // Return empty array if entities can't be fetched
    }
  }
  
  async getStates() {
    try {
      console.log('🔍 Fetching all states from HA API...');
      const response = await this.axios.get('/api/states');
      console.log(`✅ Fetched ${response.data.length} states`);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching states from HA:', error.message);
      return []; // Return empty array if states can't be fetched
    }
  }
  
  async controlLight(entityId, state) {
    try {
      const service = state.state === 'on' ? 'turn_on' : 'turn_off';
      const data = {
        entity_id: entityId,
        ...state.attributes
      };
      
      const endpoint = `/api/services/light/${service}`;
      const isProxied = this.baseUrl.includes('supervisor/core');
      
      console.log(`🔧 Controlling light ${entityId} via ${endpoint}`);
      await this.axios.post(endpoint, data);
      console.log(`✅ Successfully controlled light ${entityId}`);
    } catch (error) {
      console.error(`❌ Error controlling light ${entityId}:`, error.message);
      throw error;
    }
  }
  
  async controlMultipleLights(lightStates) {
    const promises = lightStates.map(lightState => 
      this.controlLight(lightState.entityId, lightState.state)
    );
    
    return await Promise.allSettled(promises);
  }
}

const haAPI = new HomeAssistantAPI(config.ha.baseUrl, config.ha.token);

// API Routes

// Get all scenes
app.get('/api/internal/scenes', async (req, res) => {
  try {
    db.all(`
      SELECT s.*, COUNT(sl.id) as light_count 
      FROM scenes s 
      LEFT JOIN scene_lights sl ON s.id = sl.scene_id 
      GROUP BY s.id 
      ORDER BY s.updated_at DESC
    `, (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    });
  } catch (error) {
    console.error('Error getting scenes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get scene by ID with lights
app.get('/api/internal/scenes/:id', async (req, res) => {
  try {
    const sceneId = req.params.id;
    
    db.get('SELECT * FROM scenes WHERE id = ?', [sceneId], (err, scene) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!scene) {
        return res.status(404).json({ error: 'Scene not found' });
      }
      
      // Get lights for this scene
      db.all('SELECT * FROM scene_lights WHERE scene_id = ? ORDER BY position', [sceneId], (err, lights) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        res.json({ ...scene, lights });
      });
    });
  } catch (error) {
    console.error('Error getting scene:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new scene
app.post('/api/internal/scenes', async (req, res) => {
  try {
    const { name, lights } = req.body;
    
    if (!name || !lights || !Array.isArray(lights)) {
      return res.status(400).json({ error: 'Invalid scene data' });
    }
    
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // Insert scene
      db.run('INSERT INTO scenes (name) VALUES (?)', [name], function(err) {
        if (err) {
          console.error('Error creating scene:', err);
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Failed to create scene' });
        }
        
        const sceneId = this.lastID;
        
        // Insert lights
        const stmt = db.prepare(`
          INSERT INTO scene_lights (scene_id, position, brightness, color_temp, hue, saturation, ha_entity_id) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        let insertError = false;
        lights.forEach(light => {
          stmt.run([
            sceneId,
            light.position,
            light.brightness || config.defaults.brightness,
            light.colorTemp || config.defaults.colorTemp,
            light.hue || config.defaults.hue,
            light.saturation || config.defaults.saturation,
            light.haEntityId
          ], (err) => {
            if (err) {
              console.error('Error inserting light:', err);
              insertError = true;
            }
          });
        });
        
        stmt.finalize(() => {
          if (insertError) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to save scene lights' });
          }
          
          db.run('COMMIT');
          res.status(201).json({ id: sceneId, name, message: 'Scene created successfully' });
        });
      });
    });
  } catch (error) {
    console.error('Error creating scene:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update scene
app.put('/api/internal/scenes/:id', async (req, res) => {
  try {
    const sceneId = req.params.id;
    const { name, lights } = req.body;
    
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // Update scene name and timestamp
      db.run('UPDATE scenes SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [name, sceneId], function(err) {
        if (err) {
          console.error('Error updating scene:', err);
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Failed to update scene' });
        }
        
        // Delete existing lights
        db.run('DELETE FROM scene_lights WHERE scene_id = ?', [sceneId], (err) => {
          if (err) {
            console.error('Error deleting old lights:', err);
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to update scene' });
          }
          
          // Insert new lights
          const stmt = db.prepare(`
            INSERT INTO scene_lights (scene_id, position, brightness, color_temp, hue, saturation, ha_entity_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          
          let insertError = false;
          lights.forEach(light => {
            stmt.run([
              sceneId,
              light.position,
              light.brightness || config.defaults.brightness,
              light.colorTemp || config.defaults.colorTemp,
              light.hue || config.defaults.hue,
              light.saturation || config.defaults.saturation,
              light.haEntityId
            ], (err) => {
              if (err) {
                console.error('Error inserting light:', err);
                insertError = true;
              }
            });
          });
          
          stmt.finalize(() => {
            if (insertError) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Failed to save scene lights' });
            }
            
            db.run('COMMIT');
            res.json({ id: sceneId, name, message: 'Scene updated successfully' });
          });
        });
      });
    });
  } catch (error) {
    console.error('Error updating scene:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete scene
app.delete('/api/internal/scenes/:id', async (req, res) => {
  try {
    const sceneId = req.params.id;
    
    db.run('DELETE FROM scenes WHERE id = ?', [sceneId], function(err) {
      if (err) {
        console.error('Error deleting scene:', err);
        return res.status(500).json({ error: 'Failed to delete scene' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Scene not found' });
      }
      
      res.json({ message: 'Scene deleted successfully' });
    });
  } catch (error) {
    console.error('Error deleting scene:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Apply scene to lights
app.post('/api/internal/scenes/:id/apply', async (req, res) => {
  try {
    const sceneId = req.params.id;
    
    // Get scene lights
    db.all('SELECT * FROM scene_lights WHERE scene_id = ?', [sceneId], async (err, lights) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (lights.length === 0) {
        return res.status(404).json({ error: 'No lights found for scene' });
      }
      
      try {
        // Convert lights to HA API format
        const lightStates = lights.map(light => ({
          entityId: light.ha_entity_id,
          state: {
            state: 'on',
            attributes: {
              brightness: Math.round((light.brightness / 100) * 255),
              color_temp_kelvin: light.color_temp,
              hs_color: [light.hue, light.saturation]
            }
          }
        }));
        
        // Apply to Home Assistant
        const results = await haAPI.controlMultipleLights(lightStates);
        
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        res.json({ 
          message: `Scene applied: ${successful} lights controlled successfully${failed > 0 ? `, ${failed} failed` : ''}`,
          successful,
          failed
        });
      } catch (error) {
        console.error('Error applying scene:', error);
        res.status(500).json({ error: 'Failed to apply scene' });
      }
    });
  } catch (error) {
    console.error('Error applying scene:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get enhanced lights from registry with full metadata
app.get('/api/lights/enhanced', async (req, res) => {
  try {
    console.log('📋 Processing enhanced /api/lights request...');
    
    if (!haRegistry.isConfigAccessible()) {
      console.log('⚠️ HA config not accessible, falling back to standard API');
      return res.redirect('/api/lights');
    }
    
    // Get enhanced light entities with metadata
    const enhancedLights = await haRegistry.getLightEntitiesWithMetadata();
    
    // Get current states from HA API
    const currentStates = await haAPI.getLights();
    const stateMap = new Map(currentStates.map(light => [light.entity_id, light]));
    
    // Combine registry data with current states
    const lightsWithStates = enhancedLights.map(light => {
      const currentState = stateMap.get(light.entity_id);
      return {
        entityId: light.entity_id,
        friendlyName: light.name || light.original_name || light.entity_id.replace('light.', '').replace(/_/g, ' '),
        state: currentState ? currentState.state : 'unavailable',
        brightness: currentState ? currentState.attributes.brightness : null,
        colorTemp: currentState ? currentState.attributes.color_temp_kelvin : null,
        hsColor: currentState ? currentState.attributes.hs_color : null,
        disabled: light.disabled,
        hidden: light.hidden,
        platform: light.platform,
        device: light.device,
        area: light.area,
        attributes: currentState ? {
          ...currentState.attributes,
          icon: currentState.attributes.icon // Include icon from state
        } : {}
      };
    });
    
    console.log('📋 Returning', lightsWithStates.length, 'enhanced lights to client');
    res.json(lightsWithStates);
  } catch (error) {
    console.error('❌ Error getting enhanced lights:', error);
    console.log('🔄 Falling back to standard API');
    res.redirect('/api/lights');
  }
});

// Get available lights from Home Assistant with area information
app.get('/api/lights', async (req, res) => {
  try {
    console.log('📋 Processing /api/lights request...');
    
    // Always get lights first (required)
    const lights = await haAPI.getLights();
    console.log('✅ Successfully fetched', lights.length, 'lights');
    
    // Try to get additional data but don't fail if they're unavailable
    let areas = [];
    let devices = [];
    let entities = [];
    
    try {
      console.log('🔄 Attempting to fetch areas...');
      areas = await haAPI.getAreas();
      console.log('✅ Successfully fetched', areas.length, 'areas');
    } catch (error) {
      console.log('⚠️ Could not fetch areas:', error.message);
      console.log('📋 Continuing without area information...');
    }
    
    try {
      console.log('🔄 Attempting to fetch devices...');
      devices = await haAPI.getDevices();
      console.log('✅ Successfully fetched', devices.length, 'devices');
    } catch (error) {
      console.log('⚠️ Could not fetch devices:', error.message);
      console.log('📋 Continuing without device information...');
    }
    
    try {
      console.log('🔄 Attempting to fetch entities...');
      entities = await haAPI.getEntities();
      console.log('✅ Successfully fetched', entities.length, 'entities');
    } catch (error) {
      console.log('⚠️ Could not fetch entities:', error.message);
      console.log('📋 Continuing without entity information...');
    }
    
    // Create lookup maps for performance (safe even with empty arrays)
    const areaMap = new Map(areas.map(area => [area.area_id || area.id, area]));
    const deviceMap = new Map(devices.map(device => [device.id, device]));
    const entityMap = new Map(entities.map(entity => [entity.entity_id, entity]));
    
    const lightData = lights.map(light => {
      const entityInfo = entityMap.get(light.entity_id);
      let areaInfo = null;
      
      if (entityInfo) {
        // Try to get area from entity or device
        if (entityInfo.area_id) {
          areaInfo = areaMap.get(entityInfo.area_id);
        } else if (entityInfo.device_id) {
          const device = deviceMap.get(entityInfo.device_id);
          if (device && device.area_id) {
            areaInfo = areaMap.get(device.area_id);
          }
        }
      }
      
      return {
        entityId: light.entity_id,
        friendlyName: light.attributes.friendly_name || light.entity_id.replace('light.', '').replace(/_/g, ' '),
        state: light.state,
        brightness: light.attributes.brightness,
        colorTemp: light.attributes.color_temp_kelvin,
        hsColor: light.attributes.hs_color,
        area: areaInfo ? {
          id: areaInfo.area_id || areaInfo.id,
          name: areaInfo.name
        } : null
      };
    });
    
    console.log('📋 Returning', lightData.length, 'lights to client');
    res.json(lightData);
  } catch (error) {
    console.error('❌ Error getting lights:', error);
    console.error('❌ Full error details:', error.message);
    if (error.response) {
      console.error('❌ Response status:', error.response.status);
      console.error('❌ Response data:', error.response.data);
    }
    res.status(500).json({ error: 'Failed to get lights from Home Assistant' });
  }
});

// Get entities by type (generic endpoint for switches, binary_sensors, sensors, etc.)
app.get('/api/entities/:entityType', async (req, res) => {
  try {
    const { entityType } = req.params;
    console.log(`📋 Processing /api/entities/${entityType} request...`);
    
    // Get all states from Home Assistant
    const states = await haAPI.getStates();
    
    // Filter by entity type
    const filteredEntities = states.filter(state => {
      return state.entity_id.startsWith(`${entityType}.`);
    });
    
    console.log(`✅ Found ${filteredEntities.length} ${entityType} entities`);
    
    // Try to get additional data but don't fail if unavailable
    let areas = [];
    let devices = [];
    let entities = [];
    
    try {
      areas = await haAPI.getAreas();
      devices = await haAPI.getDevices();
      entities = await haAPI.getEntities();
    } catch (error) {
      console.log('⚠️ Could not fetch additional registry data:', error.message);
    }
    
    // Create lookup maps
    const areaMap = new Map(areas.map(area => [area.area_id || area.id, area]));
    const deviceMap = new Map(devices.map(device => [device.id, device]));
    const entityMap = new Map(entities.map(entity => [entity.entity_id, entity]));
    
    // Map entities with area information
    const mappedEntities = filteredEntities.map(state => {
      const entityInfo = entityMap.get(state.entity_id);
      let areaInfo = null;
      
      if (entityInfo) {
        if (entityInfo.area_id) {
          areaInfo = areaMap.get(entityInfo.area_id);
        } else if (entityInfo.device_id) {
          const device = deviceMap.get(entityInfo.device_id);
          if (device && device.area_id) {
            areaInfo = areaMap.get(device.area_id);
          }
        }
      }
      
      return {
        entity_id: state.entity_id,
        state: state.state,
        attributes: state.attributes || {},
        area: areaInfo ? {
          id: areaInfo.area_id || areaInfo.id,
          name: areaInfo.name
        } : null,
        last_changed: state.last_changed,
        last_updated: state.last_updated
      };
    });
    
    console.log(`📋 Returning ${mappedEntities.length} ${entityType} entities to client`);
    res.json(mappedEntities);
  } catch (error) {
    console.error(`❌ Error getting ${req.params.entityType} entities:`, error);
    res.status(500).json({ error: `Failed to get ${req.params.entityType} entities from Home Assistant` });
  }
});

// Get registry statistics
app.get('/api/internal/registry/stats', async (req, res) => {
  try {
    if (!haRegistry.isConfigAccessible()) {
      return res.status(503).json({ error: 'Home Assistant config not accessible' });
    }
    
    const stats = await haRegistry.getRegistryStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting registry stats:', error);
    res.status(500).json({ error: 'Failed to get registry statistics' });
  }
});

// Search entities
app.get('/api/internal/registry/search', async (req, res) => {
  try {
    const { q: query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    
    if (!haRegistry.isConfigAccessible()) {
      return res.status(503).json({ error: 'Home Assistant config not accessible' });
    }
    
    const results = await haRegistry.searchEntities(query);
    res.json(results);
  } catch (error) {
    console.error('Error searching entities:', error);
    res.status(500).json({ error: 'Failed to search entities' });
  }
});

// Get entities by area
app.get('/api/internal/registry/areas/:areaId/entities', async (req, res) => {
  try {
    const { areaId } = req.params;
    
    if (!haRegistry.isConfigAccessible()) {
      return res.status(503).json({ error: 'Home Assistant config not accessible' });
    }
    
    const entities = await haRegistry.getEntitiesByArea(areaId);
    res.json(entities);
  } catch (error) {
    console.error('Error getting entities by area:', error);
    res.status(500).json({ error: 'Failed to get entities by area' });
  }
});

// Clear registry cache
app.post('/api/internal/registry/cache/clear', (req, res) => {
  try {
    haRegistry.clearCache();
    res.json({ message: 'Registry cache cleared successfully' });
  } catch (error) {
    console.error('Error clearing registry cache:', error);
    res.status(500).json({ error: 'Failed to clear registry cache' });
  }
});

// Get areas for filtering (enhanced version)
app.get('/api/areas/enhanced', async (req, res) => {
  try {
    if (!haRegistry.isConfigAccessible()) {
      console.log('⚠️ HA config not accessible, falling back to standard API');
      return res.redirect('/api/areas');
    }
    
    const areas = await haRegistry.getAreaRegistry();
    const areaData = areas.map(area => ({
      id: area.id,
      name: area.name,
      normalized_name: area.normalized_name
    })).sort((a, b) => a.name.localeCompare(b.name));
    
    console.log('🏠 Returning', areaData.length, 'enhanced areas to client');
    res.json(areaData);
  } catch (error) {
    console.error('Error getting enhanced areas:', error);
    res.redirect('/api/areas');
  }
});

// Get areas for filtering
app.get('/api/areas', async (req, res) => {
  try {
    const areas = await haAPI.getAreas();
    
    const areaData = areas.map(area => ({
      id: area.area_id,
      name: area.name
    })).sort((a, b) => a.name.localeCompare(b.name));
    
    console.log('🏠 Returning', areaData.length, 'areas to client');
    res.json(areaData);
  } catch (error) {
    console.error('Error getting areas:', error);
    res.status(500).json({ error: 'Failed to fetch areas from Home Assistant' });
  }
});

// Get light mappings
app.get('/api/internal/mappings', async (req, res) => {
  try {
    db.all('SELECT * FROM light_mappings ORDER BY position', (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    });
  } catch (error) {
    console.error('Error getting mappings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update light mappings
app.post('/api/internal/mappings', async (req, res) => {
  try {
    const { mappings } = req.body;
    
    if (!Array.isArray(mappings)) {
      return res.status(400).json({ error: 'Invalid mappings data' });
    }
    
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      db.run('DELETE FROM light_mappings');
      
      const stmt = db.prepare('INSERT INTO light_mappings (position, ha_entity_id, friendly_name) VALUES (?, ?, ?)');
      
      mappings.forEach(mapping => {
        stmt.run([mapping.position, mapping.haEntityId, mapping.friendlyName]);
      });
      
      stmt.finalize((err) => {
        if (err) {
          console.error('Error saving mappings:', err);
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Failed to save mappings' });
        }
        
        db.run('COMMIT');
        res.json({ message: 'Mappings saved successfully' });
      });
    });
  } catch (error) {
    console.error('Error updating mappings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get floorplan data
app.get('/api/internal/floorplan', (req, res) => {
  console.log('📋 Floorplan data requested');
  
  db.get('SELECT * FROM floorplan ORDER BY updated_at DESC LIMIT 1', (err, row) => {
    if (err) {
      console.error('❌ Error getting floorplan:', err);
      res.status(500).json({ error: 'Failed to get floorplan data' });
      return;
    }
    
    if (!row) {
      // Return default empty floorplan
      res.json({
        mode: 'grid',
        roomOutline: [],
        lights: []
      });
      return;
    }
    
    res.json({
      id: row.id,
      mode: row.mode,
      roomOutline: row.room_outline ? JSON.parse(row.room_outline) : [],
      lights: row.lights_data ? JSON.parse(row.lights_data) : []
    });
  });
});

// Save floorplan data
app.post('/api/internal/floorplan', (req, res) => {
  console.log('💾 Saving floorplan data');
  
  const { mode, roomOutline, lights } = req.body;
  
  if (!mode) {
    res.status(400).json({ error: 'Mode is required' });
    return;
  }
  
  const roomOutlineJson = JSON.stringify(roomOutline || []);
  const lightsJson = JSON.stringify(lights || []);
  
  // Insert or update floorplan (we'll keep only the latest)
  db.run(`INSERT OR REPLACE INTO floorplan (id, room_outline, lights_data, mode, updated_at) 
           VALUES ((SELECT id FROM floorplan ORDER BY updated_at DESC LIMIT 1), ?, ?, ?, CURRENT_TIMESTAMP)`,
    [roomOutlineJson, lightsJson, mode],
    function(err) {
      if (err) {
        console.error('❌ Error saving floorplan:', err);
        res.status(500).json({ error: 'Failed to save floorplan' });
        return;
      }
      
      console.log('✅ Floorplan saved successfully');
      res.json({ 
        success: true, 
        id: this.lastID,
        message: 'Floorplan saved successfully' 
      });
    }
  );
});

// Get configuration
app.get('/api/internal/config', (req, res) => {
  console.log('📋 Config requested');
  
  // Create a copy of config to modify
  const responseConfig = { ...config };
  
  // Include HA configuration for internal use (WebSocket authentication)
  // Only include token if request is from same origin (not external API)
  const isInternalRequest = !req.get('X-API-Key') && !req.query.api_key;
  
  console.log('🔐 Config endpoint - Token available:', !!config.ha.token);
  console.log('🔐 Config endpoint - Is internal request:', isInternalRequest);
  
  if (isInternalRequest) {
    responseConfig.ha = {
      baseUrl: config.ha.baseUrl,
      token: config.ha.token, // Include token for WebSocket auth
      ingress: config.ingress
    };
  } else {
    // For external API requests, don't include sensitive data
    responseConfig.ha = {
      baseUrl: config.ha.baseUrl,
      ingress: config.ingress
      // No token
    };
  }
  
  res.json(responseConfig);
});

// Layer operations endpoints
app.post('/api/internal/layers/:layerId/bring-to-front', (req, res) => {
  console.log('🔝 Bring to front requested for layer:', req.params.layerId);
  res.json({ success: true, message: 'Layer brought to front' });
});

app.post('/api/internal/layers/:layerId/send-to-back', (req, res) => {
  console.log('🔻 Send to back requested for layer:', req.params.layerId);
  res.json({ success: true, message: 'Layer sent to back' });
});

app.post('/api/internal/layers/:layerId/bring-forward', (req, res) => {
  console.log('⬆️ Bring forward requested for layer:', req.params.layerId);
  res.json({ success: true, message: 'Layer brought forward' });
});

app.post('/api/internal/layers/:layerId/send-backward', (req, res) => {
  console.log('⬇️ Send backward requested for layer:', req.params.layerId);
  res.json({ success: true, message: 'Layer sent backward' });
});

// ==========================================
// External API Endpoints for Integration
// ==========================================

// Get all lights with their positions on the floorplan
app.get('/api/internal/floorplan/lights', async (req, res) => {
  console.log('🗺️ Get all lights with positions requested');
  try {
    // Get current floorplan
    db.get('SELECT * FROM floorplan ORDER BY updated_at DESC LIMIT 1', async (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch floorplan' });
      }
      
      if (!row || !row.lights_data) {
        return res.json({ lights: [] });
      }
      
      // Parse the floorplan data
      const floorplanData = JSON.parse(row.lights_data);
      
      // Get current light states from Home Assistant
      try {
        const haLights = await haApi.getLights();
        const lightMap = {};
        haLights.forEach(light => {
          lightMap[light.entity_id] = light;
        });
        
        // Combine position data with current states
        const lightsWithPositions = [];
        if (floorplanData.objects) {
          floorplanData.objects.forEach(obj => {
            if (obj.lightObject && obj.entityId) {
              const haLight = lightMap[obj.entityId];
              lightsWithPositions.push({
                entity_id: obj.entityId,
                position: {
                  x: obj.left,
                  y: obj.top
                },
                icon_style: obj.iconStyle || 'default',
                state: haLight ? haLight.state : 'unavailable',
                attributes: haLight ? haLight.attributes : {}
              });
            }
          });
        }
        
        res.json({ lights: lightsWithPositions });
      } catch (haError) {
        console.error('Error fetching HA lights:', haError);
        res.status(500).json({ error: 'Failed to fetch light states' });
      }
    });
  } catch (error) {
    console.error('Error in /api/internal/floorplan/lights:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a new light to the floorplan
app.post('/api/internal/floorplan/lights', (req, res) => {
  console.log('➕ Add light to floorplan requested');
  const { entity_id, position, icon_style } = req.body;
  
  if (!entity_id || !position || !position.x || !position.y) {
    return res.status(400).json({ error: 'entity_id and position (x, y) are required' });
  }
  
  // This would need to be implemented to modify the floorplan data
  // For now, return a success response indicating what would happen
  res.json({
    message: 'Light would be added to floorplan',
    entity_id,
    position,
    icon_style: icon_style || 'default'
  });
});

// Update a light's position on the floorplan
app.put('/api/internal/floorplan/lights/:entityId', (req, res) => {
  console.log('📍 Update light position requested for:', req.params.entityId);
  const { position } = req.body;
  
  if (!position || !position.x || !position.y) {
    return res.status(400).json({ error: 'position (x, y) is required' });
  }
  
  // This would need to be implemented to modify the floorplan data
  res.json({
    message: 'Light position would be updated',
    entity_id: req.params.entityId,
    position
  });
});

// Delete a light from the floorplan
app.delete('/api/internal/floorplan/lights/:entityId', (req, res) => {
  console.log('🗑️ Delete light from floorplan requested for:', req.params.entityId);
  
  // This would need to be implemented to modify the floorplan data
  res.json({
    message: 'Light would be removed from floorplan',
    entity_id: req.params.entityId
  });
});

// Highlight/flash a light on the map
app.post('/api/internal/floorplan/lights/:entityId/highlight', (req, res) => {
  console.log('✨ Highlight light requested for:', req.params.entityId);
  const { duration = 3000, color = '#ffff00' } = req.body;
  
  // Emit WebSocket event to connected clients
  if (global.wsClients && global.wsClients.size > 0) {
    const message = JSON.stringify({
      type: 'highlight_light',
      entity_id: req.params.entityId,
      duration,
      color
    });
    
    global.wsClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
    
    res.json({
      message: 'Highlight command sent',
      entity_id: req.params.entityId,
      duration,
      color
    });
  } else {
    res.status(503).json({ error: 'No connected clients to receive highlight command' });
  }
});

// Get specific light with position
app.get('/api/internal/floorplan/lights/:entityId', (req, res) => {
  console.log('🔍 Get specific light position requested for:', req.params.entityId);
  
  db.get('SELECT * FROM floorplan ORDER BY updated_at DESC LIMIT 1', async (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch floorplan' });
    }
    
    if (!row || !row.lights_data) {
      return res.status(404).json({ error: 'Light not found on floorplan' });
    }
    
    const floorplanData = JSON.parse(row.lights_data);
    
    // Find the specific light
    let foundLight = null;
    if (floorplanData.objects) {
      floorplanData.objects.forEach(obj => {
        if (obj.lightObject && obj.entityId === req.params.entityId) {
          foundLight = {
            entity_id: obj.entityId,
            position: {
              x: obj.left,
              y: obj.top
            },
            icon_style: obj.iconStyle || 'default'
          };
        }
      });
    }
    
    if (foundLight) {
      res.json(foundLight);
    } else {
      res.status(404).json({ error: 'Light not found on floorplan' });
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('💓 Health check requested');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Favicon handler to reduce console noise
app.get('/favicon.ico', (req, res) => {
  console.log('🎨 Favicon requested');
  res.status(204).end();
});

// Serve OpenAPI specification
app.get('/openapi.yaml', (req, res) => {
  console.log('📄 OpenAPI spec requested');
  res.sendFile(path.join(__dirname, '..', 'openapi.yaml'));
});

// Serve API documentation
app.get('/docs/api-docs.html', (req, res) => {
  console.log('📚 API docs requested');
  res.sendFile(path.join(__dirname, '..', 'docs', 'api-docs.html'));
});

// Serve main page for root
app.get('/', (req, res) => {
  console.log('🏠 Main page requested');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Move planner routes BEFORE the static middleware to handle them properly
// Planner HTML route
app.get('/planner', (req, res) => {
  console.log('📐 Planner page requested');
  console.log('  Request URL:', req.url);
  console.log('  Request path:', req.path);
  console.log('  Ingress mode:', isIngress);
  console.log('  All headers:', JSON.stringify(req.headers, null, 2));
  
  if (req.headers['x-ingress-path']) {
    console.log('  X-Ingress-Path:', req.headers['x-ingress-path']);
  }
  
  const plannerPath = path.join(__dirname, 'public', 'planner', 'index.html');
  console.log('  Serving planner from:', plannerPath);
  console.log('  File exists:', fs.existsSync(plannerPath));
  
  res.sendFile(plannerPath);
});

// Planner static files routes - handle CSS, JS, etc.
app.get('/planner/css/*', (req, res) => {
  const filename = req.params[0];
  console.log('🎨 Planner CSS request:', filename);
  res.sendFile(path.join(__dirname, 'public', 'planner', 'css', filename));
});

app.get('/planner/js/*', (req, res) => {
  const filename = req.params[0];
  console.log('📜 Planner JS request:', filename);
  res.sendFile(path.join(__dirname, 'public', 'planner', 'js', filename));
});

// Catch-all route for ingress support - must be last!
app.get('*', (req, res) => {
  console.log('🔗 Catch-all route triggered for path:', req.path);
  console.log('🔍 Ingress mode:', isIngress);
  if (req.headers['x-ingress-path']) {
    console.log('🔗 Ingress path header:', req.headers['x-ingress-path']);
  }
  
  // Check if this is a planner request
  if (req.path === '/planner' || req.path.startsWith('/planner/')) {
    console.log('📐 Planner detected in catch-all, serving planner index');
    res.sendFile(path.join(__dirname, 'public', 'planner', 'index.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// Start server
async function startServer() {
  console.log('🌟 Starting server initialization...');
  
  try {
    console.log('📋 Step 1: Initialize database');
    await initDatabase();
    console.log('✅ Database initialization complete');
    
    console.log('📋 Step 2: Start HTTP server');
    const server = app.listen(PORT, () => {
      console.log('🎉 LightMapper successfully started!');
      console.log(`🌐 Server running on port ${PORT}`);
      console.log(`🔗 Web interface: http://localhost:${PORT}`);
      console.log('🏠 Ready to manage your lighting scenes!');
    });
    
    console.log('📋 Step 3: Initialize WebSocket servers');
    
    // Original LightMapper WebSocket server for internal messages
    const wss = new WebSocket.Server({ 
        noServer: true  // We'll handle the upgrade manually
    });
    global.wsClients = new Set();
    
    wss.on('connection', (ws) => {
      console.log('🔌 Client connected to LightMapper WebSocket');
      global.wsClients.add(ws);
      
      ws.on('close', () => {
        console.log('🔌 Client disconnected from LightMapper WebSocket');
        global.wsClients.delete(ws);
      });
      
      ws.on('error', (error) => {
        console.error('❌ LightMapper WebSocket client error:', error);
        global.wsClients.delete(ws);
      });
      
      // Send initial connection success message
      ws.send(JSON.stringify({
        type: 'connection',
        message: 'Connected to LightMapper WebSocket'
      }));
    });
    
    // Home Assistant WebSocket proxy for ingress mode
    // Handle both direct and ingress paths
    const haWss = new WebSocket.Server({ 
        noServer: true  // We'll handle the upgrade manually
    });
    
    // Handle WebSocket upgrade requests
    server.on('upgrade', (request, socket, head) => {
      const pathname = request.url;
      console.log('🔌 WebSocket upgrade request for:', pathname);
      
      // Check if this is a request for the HA WebSocket proxy
      if (pathname === '/api/websocket' || pathname.includes('/api/websocket')) {
        haWss.handleUpgrade(request, socket, head, (ws) => {
          haWss.emit('connection', ws, request);
        });
      } else if (pathname === '/ws' || pathname.includes('/ws')) {
        // Handle regular LightMapper WebSocket
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });
    
    haWss.on('connection', (clientWs, request) => {
      console.log('🏠 Client connected to HA WebSocket proxy');
      console.log('  Request URL:', request.url);
      
      // Create connection to Home Assistant
      const haWsUrl = 'ws://supervisor/core/websocket';
      const haWs = new WebSocket(haWsUrl);
      let authenticated = false;
      
      haWs.on('open', () => {
        console.log('✅ Connected to Home Assistant WebSocket');
      });
      
      haWs.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        // Intercept auth_required to inject our token
        if (message.type === 'auth_required') {
          console.log('🔐 Proxy authenticating with Home Assistant...');
          haWs.send(JSON.stringify({
            type: 'auth',
            access_token: config.ha.token
          }));
          // Don't forward auth_required to client since we handle auth
        } else if (message.type === 'auth_ok') {
          authenticated = true;
          console.log('✅ Proxy authenticated with Home Assistant');
          // Send auth_ok to client to complete their auth flow
          clientWs.send(JSON.stringify({ type: 'auth_ok' }));
        } else if (message.type === 'auth_invalid') {
          console.error('❌ Proxy authentication failed');
          // Still send auth_invalid to client
          clientWs.send(data.toString());
        } else {
          // Forward all other messages to client
          clientWs.send(data.toString());
        }
      });
      
      haWs.on('error', (error) => {
        console.error('❌ HA WebSocket error:', error);
        clientWs.close();
      });
      
      haWs.on('close', () => {
        console.log('🏠 HA WebSocket closed');
        clientWs.close();
      });
      
      // Forward client messages to Home Assistant
      clientWs.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        // Handle auth messages from client
        if (message.type === 'auth') {
          // Client is trying to auth, but we handle it, so just acknowledge
          console.log('🔐 Client auth attempt received (handled by proxy)');
          return;
        }
        
        // Forward all other messages
        if (haWs.readyState === WebSocket.OPEN && authenticated) {
          haWs.send(data.toString());
        }
      });
      
      clientWs.on('close', () => {
        console.log('🏠 Client disconnected from HA WebSocket proxy');
        haWs.close();
      });
      
      clientWs.on('error', (error) => {
        console.error('❌ Client WebSocket error:', error);
        haWs.close();
      });
      
      // Send auth_required to trigger client auth flow
      clientWs.send(JSON.stringify({ type: 'auth_required' }));
    });
    
    console.log('✅ WebSocket servers initialized');
    console.log('  - LightMapper WebSocket at: /ws');
    console.log('  - HA WebSocket proxy at: /api/websocket');
    
    // Add error handling for the server
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
    });
    
    console.log('✅ Server startup sequence complete');
    
  } catch (error) {
    console.error('💥 Failed to start server:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Process monitoring and graceful shutdown
console.log('🔧 Setting up process monitoring...');

process.on('SIGINT', () => {
  console.log('📡 Received SIGINT - Shutting down gracefully...');
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err);
      } else {
        console.log('✅ Database connection closed');
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGTERM', () => {
  console.log('📡 Received SIGTERM - Shutting down gracefully...');
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err);
      } else {
        console.log('✅ Database connection closed');
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

console.log('✅ Process monitoring configured');

// Start the application
console.log('🚀 Launching LightMapper application...');
startServer();