const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const WebSocket = require('ws');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting LightMapper...');
console.log('📁 Current working directory:', process.cwd());
console.log('📁 __dirname:', __dirname);

const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced ingress detection - check multiple environment variables
const INGRESS_ENTRY = process.env.INGRESS_ENTRY;
const INGRESS_URL = process.env.INGRESS_URL;
const HASSIO_TOKEN = process.env.HASSIO_TOKEN;
const SUPERVISOR_TOKEN = process.env.SUPERVISOR_TOKEN;

console.log('🔍 Environment variable check:');
console.log('  INGRESS_ENTRY:', INGRESS_ENTRY || 'NOT SET');
console.log('  INGRESS_URL:', INGRESS_URL || 'NOT SET');
console.log('  HASSIO_TOKEN:', HASSIO_TOKEN ? 'SET (hidden)' : 'NOT SET');
console.log('  SUPERVISOR_TOKEN:', SUPERVISOR_TOKEN ? 'SET (hidden)' : 'NOT SET');
console.log('  NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
console.log('  PORT:', process.env.PORT || 'NOT SET (using default 3000)');

// Multiple ways to detect ingress
const isIngress = !!(INGRESS_ENTRY || INGRESS_URL || HASSIO_TOKEN);

console.log('🔧 Ingress detection result:', isIngress);

// Try to read options.json for user-provided token
let userOptions = {};
try {
  const optionsPath = '/data/options.json';
  if (fs.existsSync(optionsPath)) {
    userOptions = JSON.parse(fs.readFileSync(optionsPath, 'utf8'));
    console.log('📋 User options loaded from /data/options.json');
  }
} catch (error) {
  console.log('⚠️ Could not read user options:', error.message);
}

// Configuration from environment variables
const config = {
  logLevel: process.env.LOG_LEVEL || 'info',
  gridSize: parseInt(process.env.GRID_SIZE) || 8,
  defaults: {
    brightness: parseInt(process.env.DEFAULT_BRIGHTNESS) || 100,
    colorTemp: parseInt(process.env.DEFAULT_COLOR_TEMP) || 3000,
    hue: parseInt(process.env.DEFAULT_HUE) || 60,
    saturation: parseInt(process.env.DEFAULT_SATURATION) || 100
  },
  ha: {
    // Priority order: user config, startup script detection, supervisor proxy, fallback
    baseUrl: userOptions.ha_base_url || 
             process.env.HA_BASE_URL || 
             'http://supervisor/core',
    token: process.env.SUPERVISOR_TOKEN || userOptions.ha_token || process.env.HASSIO_TOKEN
  },
  ingress: isIngress,
  ingressPath: INGRESS_ENTRY || INGRESS_URL || ''
};

console.log('⚙️ Configuration loaded:');
console.log('  Log level:', config.logLevel);
console.log('  Grid size:', config.gridSize);
console.log('  Default brightness:', config.defaults.brightness + '%');
console.log('  Ingress mode:', config.ingress);
console.log('  HA Base URL:', config.ha.baseUrl);
console.log('  HA Token available:', !!config.ha.token);
console.log('  HA Token length:', config.ha.token ? config.ha.token.length : 'N/A');
console.log('🔍 Home Assistant URL resolution:');
console.log('  userOptions.ha_base_url:', userOptions.ha_base_url || 'NOT SET');
console.log('  process.env.HA_BASE_URL:', process.env.HA_BASE_URL || 'NOT SET');
console.log('  supervisor fallback: http://supervisor/core');
console.log('🔍 User options debug:');
console.log('  userOptions.ha_token available:', !!userOptions.ha_token);
console.log('  process.env.SUPERVISOR_TOKEN available:', !!process.env.SUPERVISOR_TOKEN);
console.log('🔧 Final configuration choice:');
console.log('  Using token type:', config.ha.token === process.env.SUPERVISOR_TOKEN ? 'SUPERVISOR_TOKEN' : 'USER_TOKEN');
console.log('  Using base URL source:', 
  userOptions.ha_base_url ? 'USER_CONFIG' : 
  process.env.HA_BASE_URL ? 'AUTO_DETECTED' : 
  'SUPERVISOR_PROXY');
console.log('  Final base URL:', config.ha.baseUrl);

// Database setup
const dbPath = '/data/scenes.db';
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
  contentSecurityPolicy: isIngress ? false : undefined
}));
console.log('  ✅ Helmet configured (CSP:', isIngress ? 'disabled for ingress' : 'enabled', ')');

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
  console.log('  Ingress entry path:', INGRESS_ENTRY || INGRESS_URL);
}

// Home Assistant API helper
class HomeAssistantAPI {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.token = token;
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
app.get('/api/scenes', async (req, res) => {
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
app.get('/api/scenes/:id', async (req, res) => {
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
app.post('/api/scenes', async (req, res) => {
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
app.put('/api/scenes/:id', async (req, res) => {
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
app.delete('/api/scenes/:id', async (req, res) => {
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
app.post('/api/scenes/:id/apply', async (req, res) => {
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
app.get('/api/mappings', async (req, res) => {
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
app.post('/api/mappings', async (req, res) => {
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
app.get('/api/floorplan', (req, res) => {
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
app.post('/api/floorplan', (req, res) => {
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
app.get('/api/config', (req, res) => {
  console.log('📋 Config requested');
  res.json(config);
});

// Layer operations endpoints
app.post('/api/layers/:layerId/bring-to-front', (req, res) => {
  console.log('🔝 Bring to front requested for layer:', req.params.layerId);
  res.json({ success: true, message: 'Layer brought to front' });
});

app.post('/api/layers/:layerId/send-to-back', (req, res) => {
  console.log('🔻 Send to back requested for layer:', req.params.layerId);
  res.json({ success: true, message: 'Layer sent to back' });
});

app.post('/api/layers/:layerId/bring-forward', (req, res) => {
  console.log('⬆️ Bring forward requested for layer:', req.params.layerId);
  res.json({ success: true, message: 'Layer brought forward' });
});

app.post('/api/layers/:layerId/send-backward', (req, res) => {
  console.log('⬇️ Send backward requested for layer:', req.params.layerId);
  res.json({ success: true, message: 'Layer sent backward' });
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

// Serve main page for root
app.get('/', (req, res) => {
  console.log('🏠 Main page requested');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Catch-all route for ingress support - must be last!
app.get('*', (req, res) => {
  console.log('🔗 Catch-all route triggered for path:', req.path);
  console.log('🔍 Ingress mode:', isIngress);
  if (req.headers['x-ingress-path']) {
    console.log('🔗 Ingress path header:', req.headers['x-ingress-path']);
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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