# LightMapper

A powerful Home Assistant add-on for managing complex lighting scenes with grid-based selection, individual light control, and beautiful web interface.

## Features

🏠 **Grid-Based Light Selection** - Visual 8-position grid for easy light selection  
💡 **Individual Light Control** - Precise control over each light's brightness, color temperature, hue, and saturation  
🎨 **Color Visualization** - Real-time RGB/hex color previews  
📱 **Responsive Design** - Beautiful dark theme optimized for mobile and desktop  
💾 **SQLite Database** - Reliable scene storage with full CRUD operations  
🔄 **Real-time Updates** - Live light status and state capture  
⚙️ **Light Mapping** - Map grid positions to your Home Assistant light entities  
🚀 **Modern Web Interface** - Fast, intuitive, and feature-rich

## Screenshots

### Main Interface
![Main Interface](screenshots/main-interface.png)

### Individual Light Controls
![Individual Controls](screenshots/individual-controls.png)

### Scene Management
![Scene Management](screenshots/scene-management.png)

## Installation

### Method 1: Add-on Store (Recommended)

1. **Add Repository**: In Home Assistant, go to **Supervisor** → **Add-on Store** → **⋮** → **Repositories** and add:
   ```
   https://github.com/meanaverage/lightmapper
   ```

2. **Install Add-on**: Find "LightMapper" in the store and click **Install**

3. **Configure**: Set your preferences in the **Configuration** tab

4. **Start**: Click **Start** and optionally enable **Auto-start**

## Configuration

### Add-on Options

```yaml
log_level: info              # Logging level (trace|debug|info|notice|warning|error|fatal)
grid_size: 8                 # Number of light positions in grid (4-12)
default_brightness: 100      # Default brightness percentage (0-100)
default_color_temp: 3000     # Default color temperature in Kelvin (2000-6500)
default_hue: 60             # Default hue in degrees (0-360)
default_saturation: 100     # Default saturation percentage (0-100)
```

### Example Configuration

```yaml
log_level: info
grid_size: 8
default_brightness: 80
default_color_temp: 2700
default_hue: 30
default_saturation: 85
```

## Usage

### Initial Setup

1. **Access Interface**: Once started, access the web interface at `http://homeassistant.local:3000` or through the **Web UI** button

### Advanced Features

#### Capture Current State
- Click **📷 Capture Current State** to automatically select all currently-on lights and capture their settings

#### Individual Light Control
- Toggle **Individual Light Control** to customize each light separately
- Adjust brightness, color temperature, hue, and saturation per light
- Real-time color previews show exactly what each light will look like

#### Scene Management
- **Load**: Preview a scene's light selection without applying
- **Apply**: Immediately activate scene lighting
- **Delete**: Remove unwanted scenes (with confirmation)

## Database

The add-on uses SQLite for reliable data storage:

- **Location**: `/data/scenes.db` (persisted across restarts)
- **Tables**: `scenes`, `scene_lights`, `light_mappings`, `settings`
- **Automatic Backups**: Database is automatically backed up with Home Assistant snapshots

### Database Schema

```sql
-- Scenes table
CREATE TABLE scenes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Scene lights table  
CREATE TABLE scene_lights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scene_id INTEGER,
    position INTEGER,
    brightness INTEGER,
    color_temp INTEGER,
    hue INTEGER,
    saturation INTEGER,
    ha_entity_id TEXT,
    FOREIGN KEY (scene_id) REFERENCES scenes (id) ON DELETE CASCADE
);

-- Light mappings table
CREATE TABLE light_mappings (
    position INTEGER PRIMARY KEY,
    ha_entity_id TEXT,
    friendly_name TEXT
);
```

## API Endpoints

The add-on exposes a REST API for integration:

### Scenes
- `GET /api/scenes` - List all scenes
- `GET /api/scenes/:id` - Get scene details
- `POST /api/scenes` - Create new scene
- `PUT /api/scenes/:id` - Update scene
- `DELETE /api/scenes/:id` - Delete scene
- `POST /api/scenes/:id/apply` - Apply scene to lights

### Lights & Mappings
- `GET /api/lights` - Get available Home Assistant lights
- `GET /api/mappings` - Get current light mappings
- `POST /api/mappings` - Update light mappings

### System
- `GET /api/config` - Get add-on configuration
- `GET /health` - Health check endpoint

## Home Assistant Integration

### Required Light Entities

The add-on works with any Home Assistant light entities that support:
- `light.turn_on` / `light.turn_off` services
- `brightness` attribute (0-255)
- `color_temp_kelvin` attribute (Kelvin color temperature)
- `hs_color` attribute (Hue/Saturation array)

### Compatible Light Types

- **Philips Hue**: Full support for all features
- **LIFX**: Full support for all features  
- **TP-Link Kasa**: Brightness and basic color support
- **Zigbee Lights**: Varies by device capabilities
- **Z-Wave Lights**: Varies by device capabilities
- **WiFi Smart Bulbs**: Most modern bulbs supported

### Supervisor Token

The add-on automatically uses the Home Assistant Supervisor token for API access. No manual token configuration required.

## Troubleshooting

### Common Issues

#### Add-on Won't Start
- Check Home Assistant logs: **Supervisor** → **System** → **System Log**
- Verify Home Assistant version compatibility (requires HA 2022.3+)
- Ensure sufficient storage space for SQLite database

#### Lights Not Appearing
- Verify light entities exist in **Developer Tools** → **States**
- Check entity naming (must start with `light.`)
- Ensure lights are not grouped (individual entities only)

#### Web Interface Not Loading
- Check if port 3000 is available
- Verify add-on is running: **Supervisor** → **Add-ons** → **LightMapper**
- Try accessing directly: `http://homeassistant.local:3000`

#### Scenes Not Applying
- Verify light mappings in Settings
- Check Home Assistant logs for light control errors
- Ensure lights are reachable and powered on

### Debug Mode

Enable debug logging for detailed troubleshooting:

```yaml
log_level: debug
```

View logs in: **Supervisor** → **Add-ons** → **LightMapper** → **Log**

### Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/ha-lightmapper/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/ha-lightmapper/discussions)
- **Home Assistant Community**: [Forum Thread](https://community.home-assistant.io/)

## Development

### Local Development

```bash
# Clone repository
git clone https://github.com/yourusername/ha-lightmapper
cd ha-lightmapper

# Install dependencies
cd src && npm install

# Run development server
npm run dev
```

### Building Add-on

```bash
# Build for all architectures
docker buildx build --platform linux/amd64,linux/arm64,linux/arm/v7 -t lightmapper .

# Build for single architecture
docker build -t lightmapper .
```

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Changelog

### v1.0.0 (2024-01-XX)
- Initial release
- Grid-based light selection
- Individual light control
- SQLite database storage
- Modern web interface
- Home Assistant integration

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Home Assistant Team** - For the amazing home automation platform
- **Community Contributors** - For testing and feedback
- **MDI Icons** - For beautiful Material Design icons

---

**Made with ❤️ for the Home Assistant community** 
