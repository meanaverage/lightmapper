# LightMapper Settings Configuration

LightMapper uses a structured settings system inspired by Node-RED's configuration pattern. This provides clear separation between add-on controlled settings and user configurable options.

## Configuration Structure

### Add-on Controlled Settings (Automatic)

These settings are automatically managed by the Home Assistant add-on and should not be manually configured:

- **Server Configuration**
  - `server.port` - Port number (set by HA add-on)
  - `server.host` - Host address (automatic)
  - `server.ingress` - Ingress mode detection (automatic)
  - `server.supervised` - Supervised mode detection (automatic)

- **Home Assistant Connection**
  - `homeAssistant.baseUrl` - HA API base URL (auto-detected)
  - `homeAssistant.token` - Authentication token (auto-detected)
  - `homeAssistant.configPath` - HA config directory path (fixed to `/config`)
  - `homeAssistant.dataPath` - LightMapper data directory (fixed to `/data`)

- **Database Configuration**
  - `database.path` - Database file location (automatic)
  - `database.backupPath` - Backup directory location (automatic)

### User Configurable Settings

These settings can be modified in the add-on configuration or by editing `settings.js`:

#### Light Defaults
```javascript
lightDefaults: {
  brightness: 100,        // Default brightness (0-100)
  colorTemp: 3000,        // Default color temperature in Kelvin
  hue: 60,                // Default hue (0-360)
  saturation: 100         // Default saturation (0-100)
}
```

#### UI/UX Preferences
```javascript
ui: {
  theme: 'auto',                    // Theme: 'auto', 'light', 'dark'
  gridSize: 8,                      // Grid size for floorplan
  enableLabels: true,               // Show entity labels
  enableMetrics: false,             // Use metric units
  enhancedColorPicker: true,        // Enhanced color picker
  measurementDisplay: true,         // Show measurements
  showDebugInfo: false              // Show debug information
}
```

#### API Configuration
```javascript
api: {
  enableExternal: false,            // Enable external API access
  apiKey: '',                       // API key for external access
  corsOrigins: ['*'],              // CORS allowed origins
  rateLimit: {
    windowMs: 900000,               // Rate limit window (15 minutes)
    max: 100                        // Max requests per window
  }
}
```

#### Logging Configuration
```javascript
logging: {
  level: 'info',                    // Log level: 'trace', 'debug', 'info', 'warn', 'error'
  enableConsole: true,              // Enable console logging
  enableFile: false,                // Enable file logging
  maxFileSize: '10mb',              // Max log file size
  maxFiles: 5                       // Max log files to keep
}
```

#### WebSocket Configuration
```javascript
websocket: {
  reconnectAttempts: 10,            // Max reconnection attempts
  reconnectDelay: 1000,             // Reconnection delay (ms)
  heartbeatInterval: 30000,         // Heartbeat interval (ms)
  timeout: 10000                    // Connection timeout (ms)
}
```

#### Entity Registry Configuration
```javascript
entityRegistry: {
  cacheTTL: 300000,                 // Cache time-to-live (5 minutes)
  enableDirectAccess: true,         // Enable direct registry access
  fallbackToAPI: true               // Fallback to API if registry unavailable
}
```

#### Performance Settings
```javascript
performance: {
  enableCaching: true,              // Enable response caching
  cacheSize: 1000,                  // Cache size limit
  cacheTTL: 600000,                 // Cache TTL (10 minutes)
  enableCompression: true           // Enable response compression
}
```

#### Security Settings
```javascript
security: {
  enableHelmet: true,               // Enable Helmet security headers
  enableCors: true,                 // Enable CORS
  trustProxy: false,                // Trust proxy headers
  sessionSecret: 'auto-generated'   // Session secret
}
```

#### Feature Flags
```javascript
features: {
  enableSceneExport: true,          // Enable scene export
  enableSceneImport: true,          // Enable scene import
  enableBackgroundImages: true,     // Enable background images
  enableAdvancedLighting: true,     // Enable advanced lighting features
  enableEntityFiltering: true,      // Enable entity filtering
  enableAreaIntegration: true       // Enable area integration
}
```

## Home Assistant Integration

### Entity Registry Access

LightMapper can directly access Home Assistant's entity registry for enhanced metadata:

- **Direct Registry Access**: Reads from `/config/.storage/core.entity_registry`
- **Enhanced Entity Information**: Includes device, area, and platform data
- **Better Relationships**: Direct device-to-area mappings
- **Caching**: Intelligent caching with 5-minute TTL

### Token Management

Automatic token detection with priority order:

1. `HASSIO_TOKEN` (Ingress mode)
2. `SUPERVISOR_TOKEN` (Supervised mode)
3. `secrets.yaml` (From HA config)
4. User configuration (Manual)

### Configuration Directory Access

Access to Home Assistant's main config directory provides:

- Entity registry data
- Device registry data  
- Area registry data
- Secrets file access
- Log file access (future feature)

## API Endpoints

### Enhanced Endpoints

- `GET /api/lights/enhanced` - Lights with full registry metadata
- `GET /api/areas/enhanced` - Areas with enhanced information
- `GET /api/internal/registry/stats` - Registry statistics
- `GET /api/internal/registry/search?q=query` - Entity search
- `GET /api/internal/registry/areas/:areaId/entities` - Entities by area
- `POST /api/internal/registry/cache/clear` - Clear registry cache

### Standard Endpoints

All existing endpoints remain available with backward compatibility.

## Configuration Examples

### Add-on Configuration (config.yaml)
```yaml
# User configurable options
log_level: info
grid_size: 8
default_brightness: 100
default_color_temp: 3000
enhanced_color_picker: true
enable_external_api: false
api_key: "your-api-key-here"
```

### Environment Variables
```bash
# These are automatically set by Home Assistant
HASSIO_TOKEN=abc123...
INGRESS_ENTRY=/api/hassio_ingress/...
PORT=3000

# Optional overrides
LOG_LEVEL=debug
GRID_SIZE=10
```

## Migration Guide

### From Legacy Configuration

The new settings system is backward compatible. Existing configurations will continue to work, but you can gradually migrate to the new system:

1. **Settings are automatically loaded** from environment variables and options.json
2. **No breaking changes** - all existing functionality preserved
3. **Enhanced features** available through new endpoints
4. **Better error handling** and fallback mechanisms

### Benefits of New System

- **Clearer separation** between add-on and user settings
- **Better documentation** with inline comments
- **Enhanced entity information** through direct registry access
- **Improved performance** with intelligent caching
- **Future-proof** following Home Assistant add-on best practices

## Troubleshooting

### Common Issues

1. **Registry not accessible**: Check that `/config` is properly mapped in add-on configuration
2. **Token issues**: Verify Home Assistant permissions and add-on configuration
3. **Cache issues**: Use the cache clear endpoint to reset registry cache
4. **Performance**: Adjust cache settings and enable compression for better performance

### Debug Information

Enable debug logging by setting `log_level: debug` in add-on configuration or `LOG_LEVEL=debug` environment variable.

### Support

For issues or questions:
1. Check the logs for error messages
2. Verify Home Assistant permissions
3. Clear registry cache if experiencing stale data
4. Report issues with full log output