# Home Assistant API Endpoints Reference

## Authentication
- **GET** `/auth/providers` - Available auth providers
- **POST** `/auth/login_flow` - Initiate login
- **POST** `/auth/token` - Get access token

## Core Data Retrieval
- **GET** `/api/states` - All entity states and attributes
- **GET** `/api/states/{entity_id}` - Single entity state
- **GET** `/api/config` - Home Assistant configuration
- **GET** `/api/services` - Available services per domain

## Light-Specific
- **GET** `/api/states/light.{name}` - Individual light state (on/off, brightness, color)
- **POST** `/api/services/light/turn_on` - Control lights (brightness, color, transition)
- **POST** `/api/services/light/turn_off` - Turn lights off

## Scene Management
- **GET** `/api/states/scene.{name}` - Scene configuration
- **POST** `/api/services/scene/turn_on` - Activate scene
- **POST** `/api/services/scene/create` - Create new scene with entity states

## WebSocket Connection
- **ws://{host}/api/websocket` - Real-time updates
  - Subscribe to state changes
  - Call services
  - Get entity history

## Data Types Retrieved
- **Lights**: state, brightness (0-255), rgb_color, color_temp, supported_features
- **Scenes**: entity states snapshot, friendly_name
- **Config**: version, location, units, components
- **Services**: domain, service name, required/optional fields

## Project Function Usage

### Server-side (src/server.js - HomeAssistantAPI class)
- **testConnection()** - GET `/api/` - Tests HA connection
- **getLights()** - GET `/api/states` - Fetches all light entities
- **getAreas()** - WebSocket `config/area_registry/list` or POST `/api/template` - Gets areas/rooms
- **getDevices()** - WebSocket `config/device_registry/list` - Gets device registry
- **getEntities()** - WebSocket `config/entity_registry/list` - Gets entity registry
- **controlLight()** - POST `/api/services/light/turn_on|turn_off` - Controls lights
- **sendWebSocketCommand()** - WebSocket `/websocket` - Helper for WS commands

### Client-side (src/public/js/app.js)
- **loadConfig()** - GET `/api/config` - App configuration
- **loadScenes()** - GET `/api/scenes` - Saved scenes from DB
- **loadLights()** - GET `/api/lights` - Light states via server proxy
- **loadMappings()** - GET `/api/mappings` - Light position mappings
- **loadAreas()** - GET `/api/areas` - Areas via server proxy
- **loadScene()** - GET `/api/scenes/{id}` - Single scene details
- **saveScene()** - POST `/api/scenes` - Creates new scene
- **applySceneById()** - POST `/api/scenes/{id}/apply` - Activates scene
- **deleteScene()** - DELETE `/api/scenes/{id}` - Removes scene
- **getDeviceTrackersByMAC()** - GET `{haUrl}/api/states` - Direct HA call for trackers
- **fetchCurrentLightStates()** - GET `/api/lights` - Refreshes light states