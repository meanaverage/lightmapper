/**
 * LightMapper Settings Configuration
 * 
 * This configuration file follows the Node-RED pattern of separating
 * add-on controlled settings from user configurable settings.
 * 
 * Add-on controlled settings (automatic, not user configurable):
 * - port (set by Home Assistant add-on)
 * - ha_token (auto-detected from environment variables)
 * - ha_base_url (auto-detected from environment variables)
 * - database_path (fixed to /data/scenes.db)
 * - ingress_mode (auto-detected from environment)
 * - log_level (controlled by add-on configuration)
 * 
 * User configurable settings can be modified in the add-on configuration
 * or by editing this file directly.
 */

const fs = require('fs');
const path = require('path');

// Helper function to safely read JSON files
function readJSONFile(filePath, defaultValue = {}) {
    try {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(content);
        }
    } catch (error) {
        console.warn(`⚠️ Could not read ${filePath}:`, error.message);
    }
    return defaultValue;
}

// Helper function to read Home Assistant secrets
function readHASecrets() {
    const secretsPath = '/config/secrets.yaml';
    try {
        if (fs.existsSync(secretsPath)) {
            const content = fs.readFileSync(secretsPath, 'utf8');
            const secrets = {};
            content.split('\n').forEach(line => {
                const match = line.match(/^(\w+):\s*(.+)$/);
                if (match) {
                    secrets[match[1]] = match[2].trim();
                }
            });
            return secrets;
        }
    } catch (error) {
        console.warn('⚠️ Could not read HA secrets:', error.message);
    }
    return {};
}

// Get environment info
const isIngress = !!(process.env.INGRESS_ENTRY || process.env.INGRESS_URL || process.env.HASSIO_TOKEN);
const isSupervised = !!process.env.SUPERVISOR_TOKEN;

// Read user options from add-on config
const userOptions = readJSONFile(isIngress ? '/data/options.json' : path.join(__dirname, 'data', 'options.json'));

// Read HA secrets for token fallback
const haSecrets = readHASecrets();

module.exports = {
    // ==========================================
    // ADD-ON CONTROLLED SETTINGS (DO NOT MODIFY)
    // ==========================================
    
    // Server configuration (controlled by add-on)
    server: {
        port: parseInt(process.env.PORT) || 3000,
        host: process.env.HOST || '0.0.0.0',
        ingress: isIngress,
        supervised: isSupervised
    },
    
    // Home Assistant connection (auto-detected)
    homeAssistant: {
        baseUrl: userOptions.ha_base_url || 
                 process.env.HA_BASE_URL || 
                 'http://supervisor/core',
        token: process.env.HASSIO_TOKEN || 
               process.env.SUPERVISOR_TOKEN || 
               haSecrets.ha_token ||
               userOptions.ha_token,
        configPath: '/config',
        dataPath: '/data'
    },
    
    // Database configuration (fixed paths)
    database: {
        path: isIngress ? '/data/scenes.db' : path.join(__dirname, 'data', 'scenes.db'),
        backupPath: isIngress ? '/data/backups' : path.join(__dirname, 'data', 'backups'),
        maxBackups: 5
    },
    
    // ==========================================
    // USER CONFIGURABLE SETTINGS
    // ==========================================
    
    // Default light settings
    lightDefaults: {
        brightness: parseInt(process.env.DEFAULT_BRIGHTNESS) || userOptions.default_brightness || 100,
        colorTemp: parseInt(process.env.DEFAULT_COLOR_TEMP) || userOptions.default_color_temp || 3000,
        hue: parseInt(process.env.DEFAULT_HUE) || userOptions.default_hue || 60,
        saturation: parseInt(process.env.DEFAULT_SATURATION) || userOptions.default_saturation || 100
    },
    
    // UI/UX preferences
    ui: {
        theme: userOptions.theme || 'auto', // auto, light, dark
        gridSize: parseInt(process.env.GRID_SIZE) || userOptions.grid_size || 8,
        enableLabels: userOptions.grid_labels !== false,
        enableMetrics: userOptions.use_metric || false,
        enhancedColorPicker: userOptions.enhanced_color_picker !== false,
        measurementDisplay: userOptions.measurement_display !== false,
        showDebugInfo: process.env.NODE_ENV === 'development'
    },
    
    // API configuration
    api: {
        enableExternal: userOptions.enable_external_api || false,
        apiKey: userOptions.api_key || '',
        corsOrigins: ['*'],
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100 // limit each IP to 100 requests per windowMs
        }
    },
    
    // Logging configuration
    logging: {
        level: process.env.LOG_LEVEL || userOptions.log_level || 'info',
        enableConsole: true,
        enableFile: false,
        maxFileSize: '10mb',
        maxFiles: 5
    },
    
    // WebSocket configuration
    websocket: {
        reconnectAttempts: 10,
        reconnectDelay: 1000,
        heartbeatInterval: 30000,
        timeout: 10000
    },
    
    // Entity registry configuration
    entityRegistry: {
        cacheTTL: 5 * 60 * 1000, // 5 minutes
        enableDirectAccess: true,
        fallbackToAPI: true
    },
    
    // Performance settings
    performance: {
        enableCaching: true,
        cacheSize: 1000,
        cacheTTL: 10 * 60 * 1000, // 10 minutes
        enableCompression: true
    },
    
    // Security settings
    security: {
        enableHelmet: !isIngress, // Disable helmet CSP in ingress mode
        enableCors: true,
        trustProxy: isIngress || isSupervised,
        sessionSecret: process.env.SESSION_SECRET || 'lightmapper-secret'
    },
    
    // Feature flags
    features: {
        enableSceneExport: true,
        enableSceneImport: true,
        enableBackgroundImages: true,
        enableAdvancedLighting: true,
        enableEntityFiltering: true,
        enableAreaIntegration: true
    },
    
    // Development settings
    development: {
        enableHotReload: process.env.NODE_ENV === 'development',
        enableSourceMaps: process.env.NODE_ENV === 'development',
        enableVerboseLogging: process.env.NODE_ENV === 'development'
    }
};