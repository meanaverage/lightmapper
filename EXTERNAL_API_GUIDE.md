# LightMapper External API Integration Guide

## Overview

LightMapper provides a REST API that allows external applications (like Node-RED, custom scripts, or other Home Assistant add-ons) to interact with the floorplan and lighting system.

## Authentication

### Enabling External API Access

1. In the LightMapper add-on configuration, set:
   ```yaml
   enable_external_api: true
   api_key: "your-secret-api-key-here"
   ```

2. The API key must be included in all requests using one of these methods:
   - **Header**: `X-API-Key: your-secret-api-key-here`
   - **Query Parameter**: `?api_key=your-secret-api-key-here`

### Example with cURL:
```bash
curl -H "X-API-Key: your-secret-api-key-here" \
  http://homeassistant.local:8123/api/hassio_ingress/[token]/api/internal/floorplan/lights
```

## Light Management Endpoints

### Get All Lights with Positions
**GET** `/api/internal/floorplan/lights`

Returns all lights on the floorplan with their positions and current states.

**Response:**
```json
{
  "lights": [
    {
      "entity_id": "light.kitchen",
      "position": {
        "x": 100,
        "y": 200
      },
      "icon_style": "bulb",
      "state": "on",
      "attributes": {
        "brightness": 255,
        "color_temp": 350
      }
    }
  ]
}
```

### Get Specific Light
**GET** `/api/internal/floorplan/lights/{entity_id}`

Get position and information for a specific light.

**Response:**
```json
{
  "entity_id": "light.kitchen",
  "position": {
    "x": 100,
    "y": 200
  },
  "icon_style": "bulb"
}
```

### Add Light to Floorplan
**POST** `/api/internal/floorplan/lights`

Add a new light to the floorplan at a specific position.

**Request Body:**
```json
{
  "entity_id": "light.new_light",
  "position": {
    "x": 150,
    "y": 250
  },
  "icon_style": "recessed"  // optional: "bulb", "recessed", "strip", "flood"
}
```

### Update Light Position
**PUT** `/api/internal/floorplan/lights/{entity_id}`

Update the position of an existing light on the floorplan.

**Request Body:**
```json
{
  "position": {
    "x": 200,
    "y": 300
  }
}
```

### Delete Light from Floorplan
**DELETE** `/api/internal/floorplan/lights/{entity_id}`

Remove a light from the floorplan.

### Highlight/Flash Light
**POST** `/api/internal/floorplan/lights/{entity_id}/highlight`

Temporarily highlight a light on the map with a pulsing effect.

**Request Body:**
```json
{
  "duration": 3000,      // milliseconds (optional, default: 3000)
  "color": "#ffff00"     // hex color (optional, default: yellow)
}
```

## Scene Management

### Apply Scene
**POST** `/api/internal/scenes/{scene_id}/apply`

Apply a saved scene to Home Assistant.

### Get All Scenes
**GET** `/api/internal/scenes`

Get all saved scenes.

### Create Scene
**POST** `/api/internal/scenes`

Create a new scene with specific light settings.

**Request Body:**
```json
{
  "name": "Evening Mood",
  "lights": {
    "light.kitchen": {
      "brightness": 128,
      "color_temp": 2700
    },
    "light.living_room": {
      "brightness": 64,
      "rgb_color": [255, 200, 100]
    }
  }
}
```

## Node-RED Integration Examples

### Example 1: Flash Light on Motion Detection

```javascript
// Node-RED Function Node
msg.headers = {
    "X-API-Key": "your-api-key",
    "Content-Type": "application/json"
};

msg.payload = {
    duration: 5000,
    color: "#ff0000"
};

msg.url = `http://homeassistant.local:8123/api/hassio_ingress/[token]/api/internal/floorplan/lights/${msg.topic}/highlight`;
msg.method = "POST";

return msg;
```

### Example 2: Get All Light Positions

```javascript
// Node-RED Function Node
msg.headers = {
    "X-API-Key": "your-api-key"
};

msg.url = "http://homeassistant.local:8123/api/hassio_ingress/[token]/api/internal/floorplan/lights";
msg.method = "GET";

return msg;
```

### Example 3: Apply Scene Based on Time

```javascript
// Node-RED Function Node
const hour = new Date().getHours();
let sceneId;

if (hour >= 6 && hour < 12) {
    sceneId = "morning";
} else if (hour >= 12 && hour < 18) {
    sceneId = "afternoon";
} else {
    sceneId = "evening";
}

msg.headers = {
    "X-API-Key": "your-api-key"
};

msg.url = `http://homeassistant.local:8123/api/hassio_ingress/[token]/api/internal/scenes/${sceneId}/apply`;
msg.method = "POST";

return msg;
```

## Python Integration Example

```python
import requests
import json

class LightMapperAPI:
    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.headers = {
            "X-API-Key": api_key,
            "Content-Type": "application/json"
        }
    
    def get_all_lights(self):
        response = requests.get(
            f"{self.base_url}/api/internal/floorplan/lights",
            headers=self.headers
        )
        return response.json()
    
    def highlight_light(self, entity_id, duration=3000, color="#ffff00"):
        response = requests.post(
            f"{self.base_url}/api/internal/floorplan/lights/{entity_id}/highlight",
            headers=self.headers,
            json={"duration": duration, "color": color}
        )
        return response.json()
    
    def apply_scene(self, scene_id):
        response = requests.post(
            f"{self.base_url}/api/internal/scenes/{scene_id}/apply",
            headers=self.headers
        )
        return response.json()

# Usage
api = LightMapperAPI(
    "http://homeassistant.local:8123/api/hassio_ingress/[token]",
    "your-api-key"
)

# Flash kitchen light red for 5 seconds
api.highlight_light("light.kitchen", 5000, "#ff0000")

# Apply evening scene
api.apply_scene("evening")
```

## Response Codes

- **200 OK**: Request successful
- **400 Bad Request**: Invalid request parameters
- **401 Unauthorized**: Missing or invalid API key
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server error

## Rate Limiting

Currently, there are no rate limits on the API. However, please be considerate and avoid excessive requests that might impact performance.

## WebSocket Events

When connected via WebSocket, you can receive real-time events:

- `highlight_light`: When a light is highlighted
- `state_change`: When a light state changes
- `light_state_changed`: Specific light state changes

## Troubleshooting

1. **401 Unauthorized**: Check that your API key is correct and `enable_external_api` is true
2. **CORS errors**: The API includes CORS headers for cross-origin requests
3. **Connection refused**: Ensure LightMapper is running and accessible

## Future Enhancements

Planned additions to the API:
- Batch operations for multiple lights
- Room/area management endpoints
- Animation sequences
- Event subscriptions via webhooks