# Changelog

All notable changes to the LightMapper will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.25] - 2024-12-30

### 🚨 **Manual Object Restoration Fallback**
- ✅ **Bypass fabric.util.enlivenObjects**: Implemented manual object restoration method to avoid fabric.js hanging issues
- 🔧 **Timeout-Triggered Fallback**: When fabric.util.enlivenObjects times out, automatically switches to manual restoration
- 🎯 **Direct Object Creation**: Manually creates fabric.js objects (lines, text, circles, rectangles, polygons) from saved data
- 🏷️ **Complete Property Restoration**: Preserves all custom properties, event handlers, and object relationships
- 📊 **Comprehensive Debugging**: Added detailed logging throughout manual restoration process

**Root Cause**: fabric.util.enlivenObjects was hanging indefinitely on certain saved object data, preventing any floorplan loading from completing.

**Technical Solution**: 
- Added `manualObjectRestoration()` method that creates objects directly using fabric.js constructors
- Timeout mechanism detects hung fabric.util.enlivenObjects and triggers manual fallback
- Preserves all object types: lines, text, circles, rectangles, polygons, lights, rooms
- Maintains all custom properties: lightObject, textObject, roomObject, entity assignments
- Restores event handlers for double-click editing and right-click context menus

**User Impact**: 
- ✅ Floorplan loading will now complete successfully even with problematic saved data
- ✅ All objects (lines, text, shapes, lights) will be restored to canvas
- ✅ Area-specific save/load functionality fully operational
- ✅ Fallback method provides detailed debug information for troubleshooting

## [3.0.24] - 2024-12-30

### 🚨 **Critical Fabric.js Callback Debugging**
- ✅ **Objects Data Inspection**: Added detailed logging of objects data before passing to fabric.js
- ⏰ **Timeout Detection**: Added 10-second timeout to detect if fabric.util.enlivenObjects hangs
- 🛡️ **Error Handling**: Added try-catch around fabric.util.enlivenObjects with full stack traces
- 🔍 **Pre-Processing Validation**: Inspects object types, keys, and properties before fabric.js processing

**Root Cause Investigation**: User's debug output shows fabric.util.enlivenObjects is called but callback never fires. This suggests either corrupted objects data or fabric.js error preventing callback execution.

**Debug Features Added**:
- Pre-processing inspection shows object type, key count, and properties
- 10-second timeout detection for hung fabric.js operations
- Complete error handling with stack traces
- Timeout clearance when callback successfully fires

**Expected Outcome**: Will reveal either corrupted objects data, fabric.js errors, or timeout issues preventing successful object restoration.

## [3.0.23] - 2024-12-30

### 🔍 **Enhanced Loading Process Debugging**
- ✅ **Comprehensive Callback Debugging**: Added detailed logging throughout the fabric.js object restoration process
- 🎯 **Object Processing Tracking**: Added per-object debugging showing type and properties during loading
- 📊 **Final State Verification**: Added canvas state inspection after loading completes
- ⏰ **Auto-Save Interference Detection**: Enhanced auto-save debugging to identify timing conflicts
- 🔍 **Completion Callback Tracing**: Added try-catch and detailed logging for callback execution

**Purpose**: User reported that despite no JavaScript errors, the canvas remains blank after loading. This update adds comprehensive debugging to trace exactly where objects might be getting lost during the loading process.

**Debug Information Added**:
- Object type and property inspection during processing
- Canvas addition confirmation for each object
- Final canvas state (total objects, visible objects, array lengths)
- Auto-save trigger timing and conflicts
- Completion callback execution success/failure

**Expected Debug Output**: Loading should now show detailed progression through object restoration, helping identify where the process might be failing.

## [3.0.22] - 2024-12-30

### 🚨 **Critical Method Conflict Fix**
- ✅ **Fixed loadLayout Method Conflict**: Resolved duplicate method names causing JavaScript errors during floorplan loading
- 🔧 **Renamed Legacy Method**: Renamed conflicting auto-load method to `loadLayoutFromAutoSave()` 
- 🎯 **Method Disambiguation**: Area-specific `loadLayout(data, onComplete)` now works without interference
- 📂 **Load Functionality Restored**: Floorplan loading now completes successfully without JavaScript errors

**Root Cause**: The FloorplanEditor class had two methods named `loadLayout()` - one for area-specific loading with parameters and one for legacy auto-loading without parameters. JavaScript was getting confused about which method to call, causing errors and preventing successful loading.

**Technical Fix**: 
- Renamed legacy auto-loading method from `loadLayout()` to `loadLayoutFromAutoSave()`
- Updated the single call site in the initialization code
- Preserved all existing functionality while eliminating the naming conflict
- Area-specific loading method `loadLayout(data, onComplete)` now works without interference

**User Impact**: 
- ✅ Area-specific floorplan loading now works completely
- ✅ Objects are properly restored to canvas after loading
- ✅ No more JavaScript errors during load operations
- ✅ Each area maintains independent floorplan data successfully

## [3.0.21] - 2024-12-30

### 🐛 **Critical Area-Specific Load Bug Fix**
- ✅ **Fixed Async Loading Issue**: Resolved critical bug where lights weren't being restored after loading saved floorplans
- 🔄 **Added Completion Callbacks**: loadLayout() now accepts callback parameter to signal when loading is actually complete
- 🚫 **Prevent Invalid Saves**: Added validation to prevent saves with undefined or empty area selections
- 🧹 **Auto-Cleanup Corrupted Data**: Automatically removes corrupted localStorage entries with undefined area IDs
- 📊 **Enhanced Load Debugging**: Added comprehensive logging throughout the loading process to track object restoration

**Root Cause**: The `fabric.util.enlivenObjects()` function is asynchronous, but the code calling `renderFloorplanLightsList()` was running immediately after `loadLayout()` - before objects were actually restored to the canvas. This caused the lights list to show 0 lights even though the correct data was loaded.

**Technical Fix**: 
- Modified `loadLayout(data, onComplete)` to accept completion callback
- Added callback to signal when `fabric.util.enlivenObjects()` has finished
- Updated `loadLegacyFormat()` to also support completion callbacks
- Added `isLoadingLayout` flag to prevent auto-save during loading
- Enhanced validation prevents saves with invalid area selections

**User Impact**: 
- ✅ Area-specific saves and loads now work correctly
- ✅ Each area maintains its own independent floorplan data
- ✅ Lights are properly restored after loading
- ✅ No more corrupted localStorage entries

## [3.0.20] - 2024-12-30

### 🔍 **Enhanced Area-Specific Save/Load Debugging**
- ✅ **Enhanced Debugging Logs**: Added comprehensive debugging to save/load operations showing storage keys, area IDs, and data sizes
- 🔧 **localStorage Inspector**: Added `debugLocalStorageFloorplans()` function to inspect all saved floorplans with detailed metadata
- 🏠 **Area Selection Tracking**: Enhanced area selection logging to track previous/new area changes
- 🧹 **Debug Utilities**: Added `clearAllFloorplanData()` function for testing and debugging
- 🌐 **Global Debug Functions**: Exposed `window.debugFloorplans()` and `window.clearFloorplans()` for console debugging

**Root Cause Investigation**: User reported potential issues with area-specific save/load functionality where different area floorplans might be getting mixed up. This update adds comprehensive debugging to track exactly which localStorage keys are being used and what data is being saved/loaded.

**Technical Enhancement**: 
- All save operations now log: area ID, area name, storage key, and data sizes
- All load operations show detailed inspection of found data and validation
- localStorage inspector shows all saved floorplans across all areas with metadata
- Global debug functions available in browser console for manual testing

**Usage for Debugging**:
- Open browser console and call `debugFloorplans()` to see all saved data
- Call `clearFloorplans()` to reset all saved floorplans for testing
- Enhanced console logs during save/load operations show exactly what's happening

## [3.0.19] - 2024-12-30

### 🐛 **Floorplan Save/Load Method Conflict Resolution**
- ✅ **Fixed saveLayout() Method Conflict**: Resolved duplicate method names that caused floorplan saves to return undefined
- 🔧 **Renamed Auto-Save Method**: Changed conflicting auto-save `saveLayout()` to `autoSaveLayout()` to prevent interference
- 💾 **Proper Data Return**: Main `saveLayout()` method now correctly returns floorplan data for area-specific saves
- 🔄 **Updated Method Calls**: Fixed all auto-save references to use the correct `autoSaveLayout()` method
- 📂 **Load Functionality Restored**: Floorplan loading now works correctly with proper layout data structure

**Root Cause**: The FloorplanEditor class had two `saveLayout()` methods - one that returned data for exports/saves (line 6239) and one for auto-saving to localStorage (line 6599) that returned undefined. When `window.floorplanEditor.saveLayout()` was called for area-specific saves, it was calling the auto-save version which didn't return data, causing "Invalid floorplan data" errors during load.

**Technical Fix**: 
- Renamed the auto-save method from `saveLayout()` to `autoSaveLayout()`
- Updated `startAutoSave()` and `triggerAutoSave()` to call `autoSaveLayout()`
- Preserved the main `saveLayout()` method for data exports and area-specific saves
- Maintained backward compatibility for file save/load functionality

## [3.0.18] - 2024-12-30

### 🐛 **Area Selection API Field Mapping Fix**
- ✅ **Fixed Area ID References**: Corrected frontend code to use `area.id` instead of `area.area_id` to match server API response
- 🔧 **Area Selection Working**: Area dropdown now properly sets `selectedArea` and shows correct area names
- 🏠 **Save/Load Fixed**: Floorplan saves now use proper area names instead of 'undefined'
- 📋 **Consistent API**: Aligned frontend area handling with server's API response structure

**Root Cause**: The server `/api/areas` endpoint was returning `{ id: area_id, name: area.name }` but the frontend code was still looking for `area.area_id` instead of `area.id`. This caused the area selection to fail and save operations to use 'undefined' for area names.

**Technical Fix**: 
- Updated `populateAreaSelector()` to use `area.id` and `area.id` 
- Updated `getAreaName()` to search by `area.id` instead of `area.area_id`
- Fixed option value assignment in area dropdown to use proper field names

## [3.0.17] - 2024-12-30

### 🏗️ **LocalStorage Floorplan Save/Load System**
- ✅ **localStorage Implementation**: Replaced non-existent API endpoints with browser localStorage for floorplan persistence
- 💾 **Area-Specific Storage**: Each area's floorplan is saved with a unique key `lightmapper_floorplan_{area_id}`
- 📂 **Enhanced Load Experience**: Load status now shows when the floorplan was originally saved
- 📋 **Saved Floorplans List**: Implemented localStorage scanning to build list of all saved floorplans with metadata
- 🗑️ **Delete Functionality**: Added utility function to delete saved floorplans (for future UI implementation)
- 🔍 **Existence Check**: Added utility function to check if a saved floorplan exists for any area

**Root Cause**: The save/load floorplan functionality was trying to POST/GET to API endpoints (`/api/floorplans`) that were never implemented in the backend. This caused 404 errors when users tried to save their floorplan layouts.

**Technical Implementation**: 
- **Save Data Structure**: `{ area_id, area_name, layout, version, timestamp, lights_count }`
- **Storage Keys**: `lightmapper_floorplan_bonus_room`, `lightmapper_floorplan_kitchen`, etc.
- **Persistence**: Data survives browser restarts and is scoped per browser/device
- **Sorting**: Saved floorplans list sorted by most recently saved first

**Benefits**: 
- ✅ Immediate functionality - no backend development needed
- 🔄 Works offline and in any browser environment  
- 💾 ~5MB+ storage capacity per domain (plenty for floorplan data)
- 🚀 Fast save/load operations with no network latency

## [3.0.16] - 2024-12-30

### 🐛 **Chevron Icon Rotation Fix**  
- ✅ **Removed CSS Rotation**: Eliminated `transform: rotate(180deg)` from `.light-collapse-toggle.expanded` rule
- 🔧 **Proper Icon Direction**: Individual light collapse toggles now show correct down arrows (⬇️) when expanded and right arrows (➡️) when collapsed
- 🎯 **Consistent Behavior**: Individual light toggles now match the global toggle button behavior exactly
- 🚫 **No More Confusion**: Removed conflicting CSS that was overriding JavaScript icon management

**Root Cause**: The CSS rule `.light-collapse-toggle.expanded` was applying a 180-degree rotation to the chevron icons, turning down arrows into up arrows when lights were expanded. This conflicted with the JavaScript logic that was correctly setting `fa-chevron-down` for expanded state and `fa-chevron-right` for collapsed state.

**Technical Fix**: Removed the `transform: rotate(180deg)` CSS rule completely. The JavaScript already handles icon class changes properly:
- Expanded state: Uses `fa-chevron-down` class (down arrow ⬇️)
- Collapsed state: Uses `fa-chevron-right` class (right arrow ➡️)

**User Impact**: Individual light collapse toggles now display the correct directional arrows that match user expectations and are consistent with the global expand/collapse button behavior.

## [3.0.15] - 2024-12-30

### 🐛 **Entity Assignment Dropdown Click Handling Fix**
- ✅ **Improved Click Detection**: Enhanced dropdown option click handling to properly detect clicks on friendly names and entity IDs
- 🔧 **Event Delegation**: Added robust event delegation using `closest()` to ensure clicks anywhere within dropdown options are properly handled
- 🎯 **Entity ID Validation**: Added validation to ensure empty or invalid entity IDs don't get assigned
- 🎨 **Visual Feedback**: Added hover effects and improved cursor styling for better user experience
- 🚫 **No-Results Protection**: Prevented selection of "no results" placeholder options

**Root Cause**: The entity assignment dropdown was using basic click handling that didn't properly handle clicks on child elements (friendly names and entity IDs). When users clicked specifically on the text elements, the event targeting wasn't bubbling correctly to trigger the option selection.

**Technical Fix**: 
- Replaced basic click handling with proper event delegation using `e.target.closest('.dropdown-option')`
- Added `e.preventDefault()` to ensure consistent behavior
- Enhanced CSS with `pointer-events: auto` and proper hover states for all clickable elements
- Added entity ID validation to prevent assignment of empty values

**User Impact**: Users can now click anywhere within dropdown options (friendly name, entity ID, or whitespace) to properly select and assign light entities. The "Assign" button will properly enable and the assignment will work correctly when pressing Enter.

## [3.0.14] - 2024-12-30

### 🐛 **Enhanced Font Awesome Icon Specificity Fix**
- ✅ **Added High-Specificity CSS Rules**: Created more specific CSS selectors targeting `.light-card .light-collapse-toggle` to override any conflicting styles
- 🔧 **Font Family Override**: Added explicit Font Awesome font family and weight declarations for individual light toggle buttons
- 🎯 **Comprehensive Icon Coverage**: Extended CSS fixes to cover all chevron directions with maximum specificity
- 🔄 **Isolated Fix**: Targeted individual light collapse buttons specifically while preserving global button functionality

**Root Cause**: Despite the general Font Awesome icon fixes in v3.0.13, the individual light collapse buttons were still showing incorrect chevron directions due to CSS specificity conflicts. The `.fa-chevron-down` class was correctly applied, but lower specificity allowed other styles to override the icon content.

**Technical Fix**: Added highly specific CSS selectors (`.light-card .light-collapse-toggle .fa-chevron-down::before`) with `!important` declarations and explicit font family overrides to ensure Font Awesome 6.4.0 displays the correct Unicode characters for individual light collapse buttons.

## [3.0.13] - 2024-12-30

### 🐛 **Font Awesome Chevron Icon Display Fix**
- ✅ **Fixed Icon Display**: Added explicit CSS content rules to ensure correct chevron icons display
- 🔧 **Font Awesome 6.4.0 Compatibility**: Resolved Font Awesome version conflict causing wrong glyphs to display
- 🎯 **Consistent Arrow Direction**: Ensured down arrows (⬇️) show for expanded state, right arrows (➡️) for collapsed state
- 🔄 **Unicode Override**: Added !important CSS rules to override any font loading issues that cause wrong icons

**Root Cause**: Font Awesome 6.4.0 was loading correctly, but there was a glyph mapping conflict causing up arrows (^) to display instead of down arrows (⬇️) for expanded light controls. This made the interface confusing as the visual arrows didn't match the actual state.

**Technical Fix**: Added explicit CSS `::before` content rules with correct Unicode values (`\f078` for down, `\f054` for right) to ensure proper chevron display regardless of font loading order or version conflicts.

## [3.0.12] - 2024-12-30

### 🐛 **Collapse/Expand All Button CSS State Management**
- ✅ **Fixed CSS Class Management**: Added missing `collapsed` and `expanded` class management in `toggleAllLightsCollapse()` function
- 🔧 **Synchronized State Logic**: Aligned toggle all functionality with individual light collapse behavior for consistent visual state transitions
- 🎯 **Proper Class Transitions**: Toggle all now properly adds/removes both expanded and collapsed classes to ensure CSS animations work correctly
- 🔄 **Visual State Consistency**: Resolved issue where lights appeared expanded but had wrong CSS classes preventing proper visual collapse

**Root Cause**: The `toggleAllLightsCollapse()` function was only removing/adding the `expanded` class but wasn't adding the `collapsed` class or removing it when expanding. The CSS relies on these specific classes to apply the correct `max-height` and `opacity` values for smooth transitions.

**Technical Fix**: Added proper class management to match the individual `toggleLightCollapse()` logic - adding `collapsed` when collapsing and removing it when expanding, and vice versa for the `expanded` class.

## [3.0.11] - 2024-12-30

### 🐛 **Double Event Listener Fix**
- ✅ **Prevented Duplicate Listeners**: Added protection against multiple event listeners being attached to the same buttons
- 🔧 **Event Listener Guards**: Used `data-listener-added` flags to prevent duplicate event listener registration
- 🎯 **Fixed Double Execution**: Resolved issue where toggle all button was executing both "collapse all" and "expand all" actions simultaneously
- 📊 **Enhanced Reliability**: All panel buttons (toggle all, area selector, save/load) now protected against duplicate listeners

**Root Cause**: The `setupPanelEventListeners()` function could be called multiple times during the application lifecycle, causing multiple event listeners to be attached to the same DOM elements. This resulted in button clicks triggering the same function multiple times in rapid succession.

**Technical Fix**: Added conditional checks using `dataset.listenerAdded` flags to ensure each event listener is only attached once per DOM element lifecycle.

## [3.0.10] - 2024-12-30

### 🐛 **Collapse/Expand All Button Fix**
- ✅ **Fixed CSS Issue**: Added missing default `max-height` and `opacity` values to `.light-scene-controls` base class
- 🔧 **Improved Transitions**: Added `!important` declarations to ensure collapsed/expanded states override default values
- 💬 **Enhanced Feedback**: Added missing status message display when toggling all lights
- 🎯 **Smooth Animation**: Fixed transition issue where lights couldn't properly animate from auto height to specific values

**Technical Details**: The JavaScript logic was working correctly, but CSS transitions couldn't animate from `max-height: auto` to specific pixel values. This fix ensures all light controls now properly expand and collapse with smooth animations when using the toggle all button.

## [3.0.9] - 2024-12-30

### 🏠 **Area Management & Floorplan Save/Load System**

This major update introduces comprehensive area-based workflow management with persistent floorplan storage capabilities.

#### ✨ **New Area Section in Home Ribbon**
- ✅ **Home Assistant Integration**: Added Area dropdown that fetches and displays all Home Assistant areas
- 🎯 **Smart Selection**: Areas are sorted alphabetically with friendly names displayed
- 📍 **Context Awareness**: Selected area provides context for save/load operations
- 🔄 **Real-time Updates**: Area selection updates immediately with visual feedback

#### 💾 **Advanced Save System**
- ✅ **Area-Based Storage**: Save floorplans with area context and metadata
- 📊 **Rich Metadata**: Includes area info, version, timestamp, and light count
- 🛡️ **Error Handling**: Comprehensive error handling with user feedback
- 🔄 **Auto-Refresh**: Automatically refreshes saved floorplans list after successful save

#### 📂 **Intelligent Load System**
- ✅ **Context-Aware Loading**: Load saved floorplans specific to selected area
- 🎯 **Validation**: Validates floorplan data before loading
- 🔄 **Auto-Update**: Automatically refreshes lights list after loading
- ⚠️ **Smart Warnings**: Clear feedback when no saved floorplan exists for area

#### 🎨 **Professional UI Integration**
- ✅ **CAD-Style Design**: Matches existing professional interface theme
- 📱 **Responsive Layout**: Vertical layout optimized for ribbon space
- 🎯 **Intuitive Icons**: Save (💾) and Load (📂) icons with clear labels
- 🔄 **Visual Feedback**: Hover effects and active states for all controls

#### 🔧 **Technical Implementation**
- ✅ **API Integration**: RESTful endpoints for areas and floorplan operations
- 🔄 **Async Operations**: All network operations properly async with error handling
- 📋 **State Management**: Proper tracking of selected area and saved floorplans
- 🛡️ **Data Validation**: Comprehensive validation of area and floorplan data

#### 📋 **Workflow Enhancement**
- ✅ **Step-by-Step Process**: 1) Select Area → 2) Design Floorplan → 3) Save → 4) Load Anytime
- 🎯 **Context Preservation**: Area selection persists during design session
- 🔄 **Seamless Integration**: Works perfectly with existing Live States and Scene modes
- 📊 **Progress Tracking**: Clear status messages throughout save/load process

#### 🚀 **Performance & Reliability**
- ✅ **Efficient Loading**: Parallel loading of areas and floorplans during startup
- 🔄 **Graceful Degradation**: App functions normally even if area loading fails
- 📊 **Memory Management**: Proper cleanup and state management
- 🛡️ **Error Recovery**: Robust error handling prevents crashes

This update transforms LightMapper from a session-based tool into a comprehensive area management system, enabling users to create, save, and manage multiple floorplans organized by Home Assistant areas.

## [3.0.8] - 2024-12-30

### ✨ **Collapse/Expand All Button**
- ✅ **Quick Toggle**: Added collapse/expand all button next to Clear All button in lights panel header
- 🔽 **Smart Icons**: Shows down arrow when expanded (click to collapse all), right arrow when collapsed (click to expand all)
- 🎯 **Intelligent State**: Button automatically detects current state and updates icon accordingly
- ⚡ **Instant Action**: One-click to collapse or expand all light cards in the list
- 🔄 **Real-time Updates**: Button state updates when individual lights are collapsed/expanded

### 🛠️ **Technical Implementation**
- 🔧 **Event Listeners**: Added proper button event handling in setupPanelEventListeners()
- 📊 **State Detection**: Counts expanded/collapsed lights to determine button state
- 🎯 **Individual Sync**: Individual light toggles update the collapse all button state
- 🌟 **Icon Management**: Proper chevron icon updates for both individual and global toggles
- 📱 **UX Consistency**: Follows common app patterns for collapse/expand all functionality

### 🎨 **User Experience**
- 💡 **Efficient Management**: Quickly organize lights list view without individual clicking
- 🎯 **Visual Clarity**: Clear indication of action with appropriate arrow directions
- 🔄 **Seamless Integration**: Button fits naturally with existing panel controls
- ⚡ **Fast Workflow**: Streamlined light management for power users
- 🎨 **Professional Design**: Matches CAD interface design standards

## [3.0.7] - 2024-12-30

### 🎯 **Live States Display Enhancement**
- ✅ **Real Current Values**: Lights list now shows actual brightness, color temperature, and HSV values from Home Assistant in Live States mode
- 📊 **Accurate Brightness Display**: Shows actual brightness (e.g., 37%) instead of "Not Set" when lights are on
- 🌈 **True Color Values**: Displays actual HSV color values (e.g., "HSV(0°,100%)") with live color preview
- 🌡️ **Real Kelvin Values**: Shows actual color temperature from Home Assistant (e.g., "3000K") instead of "Not Set"
- 🔄 **Dynamic Mode Switching**: Lights list updates instantly when switching between Live States and Scene Lights modes

### 🛠️ **Technical Improvements**
- 🔧 **Smart Mode Detection**: Added logic to detect current state mode and display appropriate values
- 📊 **Data Source Logic**: Live States mode shows Home Assistant entity data, Scene Lights mode shows scene settings
- 🎨 **Enhanced Color Display**: Improved color value formatting with HSV notation and live color preview
- 🔄 **Automatic Refresh**: Lights list refreshes automatically when toggling between display modes
- 🌟 **Conditional Controls**: Scene editing controls only appear in Scene Lights mode for better UX

### 🎨 **User Experience**
- 💡 **Clear Value Display**: No more confusing "Not Set" values when lights are actually on with specific settings
- 🎯 **Visual Consistency**: Text display now matches the visual representation on the floorplan
- 🔍 **Better Debugging**: Users can now see exact current values to understand what Home Assistant is reporting
- 🎨 **Professional Interface**: Clean HSV color notation with live preview matching CAD interface standards

## [3.0.6] - 2024-12-30

### 🐛 **Fixed Color Picker Display**
- ✅ **Visible Color Picker**: Fixed missing CSS styles that prevented the color picker popup from being visible
- 🎨 **Professional Modal**: Added comprehensive CSS styling for the color picker with CAD-style design
- 🌈 **Complete Interface**: Color picker now displays properly with color wheel, RGB inputs, hex input, and HSV sliders
- 🔧 **Functional Buttons**: Apply and Cancel buttons now have proper styling and hover effects
- 📊 **Modal Overlay**: Added backdrop blur and proper z-index for professional modal appearance

### 🎨 **Enhanced Color Picker Design**
- 🎯 **CAD-Style Theme**: Color picker matches the professional CAD interface with dark theme colors
- 🔹 **Blue Accent Colors**: Uses consistent blue accent colors for interactive elements
- 💎 **Professional Styling**: Modern button design with hover states and transitions
- 🌟 **User-Friendly Layout**: Clear organization with proper spacing and visual hierarchy
- 📱 **Responsive Design**: Color picker adapts to different screen sizes with proper overflow handling

### 🛠️ **Technical Fixes**
- 🔧 **CSS Classes**: Added complete `.color-picker-popup` and related CSS classes
- 🎨 **Visual Variables**: Uses CAD CSS variables for consistent theming
- 📊 **Z-Index Management**: Proper layering with z-index 10000 to appear above all other elements
- 🌟 **Cross-Browser Support**: Added webkit and moz prefixes for slider styling

## [3.0.5] - 2024-12-30

### 🎯 **Dynamic Lights Tab Header**
- ✅ **Smart Header Text**: Lights tab header now dynamically changes based on current mode
- 🔴 **"Live States" Mode**: When in current state mode, header shows "Live States" instead of "Scene Lights"
- 🎨 **"Scene Lights" Mode**: When in scene preview mode, header shows "Scene Lights" as before
- 🔄 **Real-time Updates**: Header text updates immediately when switching between modes
- 💡 **Better User Clarity**: Users can instantly see which mode they're in by checking the header

### 🛠️ **Technical Improvements**
- 🔧 **Centralized Header Logic**: Added `updateLightsTabHeader()` method for consistent header management
- 🎯 **Initialization**: Proper header initialization on app startup based on default mode
- 📊 **Mode Integration**: Header updates seamlessly integrated with existing mode toggle functionality
- 🌟 **Clean Code**: Consolidated header update logic to prevent duplication

## [3.0.4] - 2024-12-30

### 🎯 **Fixed Current State Mode**
- 🔄 **Real-time Data**: Fixed current state mode to fetch actual brightness and color from Home Assistant
- 📊 **Accurate Brightness**: Now shows actual brightness (e.g., 37%) instead of always showing 100%
- 🎨 **True Colors**: Displays actual light colors (e.g., red) instead of default orange
- ✨ **Enhanced Visual Effects**: Glow effects now properly scale with real brightness values
- 🔧 **Fresh Data Fetch**: Automatically fetches current light states when switching to current mode

### 🛠️ **Technical Fixes**
- 🔧 **API Integration**: Added `fetchCurrentLightStates()` function for real-time Home Assistant data
- 📊 **Data Mapping**: Fixed attribute structure mapping for brightness, color temperature, and HSV values
- 🎯 **Async Updates**: Made state refresh functions async for proper data loading
- 🌟 **Debug Logging**: Added comprehensive logging for troubleshooting current state updates

## [3.0.3] - 2024-12-30

### 🎨 **NEW: Sleek Photoshop-Style Design**
- ✅ **Single Column Layout**: Redesigned lights panel to show only one light horizontally at a time
- 🎯 **Removed Rounded Corners**: Eliminated all border-radius styling for cleaner, professional appearance
- 🌟 **Clean Line Separators**: Replaced bounding boxes with subtle border-bottom lines between items
- 💡 **Photoshop-Style Interface**: Streamlined design matching Adobe Photoshop's vertical collapsible lists
- 🔧 **Enhanced Active States**: Added left border accent for active property chips instead of full borders

### 🎨 **Visual Design Improvements**
- 🎨 **Minimal Hover Effects**: Reduced background changes to subtle 3% opacity for professional look
- 🌈 **Cleaner Headers**: Removed padding and rounded corners from light headers
- 🎯 **Streamlined Properties**: Property chips now use clean bottom borders instead of full outlines
- 💼 **Professional Spacing**: Consistent 16px padding throughout interface elements
- 📊 **Better Visual Hierarchy**: Clear separation without unnecessary decorative elements

### 🛠️ **Technical Improvements**
- 🔧 **Flex Column Layout**: Changed from grid to flex column for proper single-column display
- 🎯 **Border Optimization**: Removed redundant borders and box-shadows for cleaner rendering
- 📊 **Consistent Spacing**: Standardized padding and margins across all light card elements
- 🌟 **Enhanced Transitions**: Improved hover and active state transitions for smoother interactions
- 💡 **Code Cleanup**: Removed unused border-radius and box-shadow properties

### 🎯 **User Experience**
- 🖱️ **Cleaner Interface**: Professional look matching industry-standard design software
- 🎨 **Better Focus**: Single column layout reduces visual clutter and improves focus
- 🔧 **Consistent Interaction**: Uniform styling across all collapsible elements
- 💡 **Improved Readability**: Better contrast and spacing for enhanced usability
- 🌟 **Professional Workflow**: Interface now matches expectations from Adobe and other pro tools

## [3.0.2] - 2024-12-30

### 🎯 **NEW: Collapsible Scene Lights**
- ✅ **Collapsible Light Cards**: Scene lights in the lights panel are now collapsible for better organization
- 🎯 **Chevron Indicators**: Each light displays a chevron (▼) icon indicating collapsible/expandable state
- 🌟 **Default Expanded**: All lights start expanded by default for immediate access to controls
- 💡 **Smooth Animations**: Professional CSS transitions for expanding/collapsing with opacity and height changes
- 🔧 **Clickable Headers**: Click anywhere on light header or chevron to toggle collapse state

### 🎨 **Enhanced Light Card Design**
- 🎨 **Professional Styling**: Updated light cards with improved CAD-style design and better spacing
- 🌈 **Visual Hierarchy**: Enhanced property chips with better contrast and hover effects
- 🎯 **Hover Feedback**: Interactive headers with subtle background changes on hover
- 💼 **Consistent Theming**: Maintains professional CAD interface design system
- 📊 **Better Organization**: Collapsible design reduces clutter while maintaining full functionality

### 🛠️ **Technical Implementation**
- 🔧 **New Methods**: Added `setupLightCollapse()` and `toggleLightCollapse()` methods
- 🎯 **CSS Transitions**: Smooth max-height and opacity animations for collapse/expand
- 📊 **State Management**: Proper tracking of expanded/collapsed states per light
- 🌟 **Event Handling**: Click event delegation for both header and chevron elements
- 💡 **DOM Integration**: Enhanced HTML structure with proper data attributes and IDs

### 🎯 **User Experience**
- 🖱️ **Intuitive Interaction**: Natural click-to-expand behavior matching modern UI patterns
- 🎨 **Visual Feedback**: Clear chevron rotation and smooth transitions provide immediate feedback
- 🔧 **Space Efficiency**: Collapsible design allows for better use of panel space
- 💡 **Preserved Functionality**: All existing light control functionality remains intact
- 🌟 **Professional Workflow**: Maintains CAD-style interface consistency

## [3.0.1] - 2024-12-30

### 🐛 **Critical DOM Initialization Fix**
- ✅ **Fixed Workspace Element Reference**: Corrected DOM element selector from `.floorplan-workspace` to `.drawing-area` to match new CAD interface structure
- 🔧 **Enhanced Error Handling**: Added proper error handling and retry mechanism for DOM initialization
- 🎯 **Initialization Timing**: Added DOM readiness check to prevent "Workspace element not found" errors
- 💡 **Retry Logic**: Canvas setup now retries if workspace dimensions aren't available yet
- 🛠️ **Improved Debugging**: Enhanced error messages and warnings for better troubleshooting

### 🛠️ **Technical Changes**
- 🔧 **DOM Selector**: Updated `document.querySelector('.floorplan-workspace')` to `document.querySelector('.drawing-area')`
- 🎯 **Error Prevention**: Added checks for element existence and dimensions before canvas initialization
- 📊 **Retry Mechanism**: 100ms retry delay for workspace element readiness
- 🌟 **Safer Resize**: Enhanced `resizeCanvas()` function with proper error handling

## [3.0.0] - 2024-12-30

### 🚀 **MAJOR: CAD Interface Revolution**
- ✅ **Complete Professional Redesign**: Revolutionary CAD-style interface transformation resembling AutoCAD
- 🎛️ **Ribbon Toolbar System**: Modern Office/AutoCAD-style ribbon with Home, Insert, Modify, View, and Scenes tabs
- 📋 **Dockable Panel System**: Professional left panel (Lights/Layers) and right panel (Properties/Scenes)
- ⌨️ **Command Palette**: Terminal-style command input with auto-suggestions, fuzzy search, and command history
- 📊 **Professional Status Bar**: Real-time mouse coordinates, selection count, zoom level, and mode toggles
- 🔧 **CAD Keyboard Shortcuts**: Single-key tool switching (S=Select, L=Light, R=Room, T=Text, etc.)

### 🎨 **Design System Overhaul**
- 🌟 **Professional Dark Theme**: Sophisticated color scheme matching modern CAD applications
- 💼 **CAD Typography**: Professional font system with proper sizing hierarchy
- 🎯 **Modern Controls**: Ribbon tools, panel tabs, and status toggles with hover effects
- 📐 **Grid & Measurement**: Enhanced grid system with CAD-style coordinate tracking
- 🎭 **Professional Icons**: Comprehensive icon system for all tools and functions

### 🛠️ **Technical Architecture**
- 🏗️ **CADInterfaceManager**: New class managing ribbon tabs, panels, and command palette
- 🔌 **Seamless Integration**: Enhanced FloorplanEditor integration with new interface elements
- 📊 **Real-time Updates**: Status bar updates for coordinates, zoom, selection count
- ⚡ **Command System**: Advanced command execution with suggestions and error handling
- 🎛️ **State Management**: Professional tool state management across old and new interfaces

### 🎯 **User Experience**
- 🖱️ **CAD-style Interaction**: Professional workflow matching AutoCAD user expectations
- ⌨️ **Power User Features**: Comprehensive keyboard shortcuts for all major functions
- 💡 **Status Feedback**: Real-time feedback for all actions via command palette and status bar
- 🔄 **Seamless Transition**: All existing functionality preserved while adding professional interface
- 📱 **Responsive Design**: CAD interface adapts to different screen sizes

### 🔧 **Enhanced Features**
- 🎨 **Tool Organization**: Logical grouping of tools in ribbon tabs for intuitive access
- 📋 **Panel Management**: Tabbed panels for better organization of lights, layers, properties, and scenes
- ⚙️ **Mode Indicators**: Visual feedback for active tools, grid state, snap mode, etc.
- 🎯 **Selection Feedback**: Enhanced selection indicators with proper count display
- 💾 **Command History**: Persistent command history for repeated operations

## [2.7.4] - 2024-12-30

### 🐛 **Fixed Chip Display Text Consistency**
- ✅ **Consistent "Not Set" Display**: Fixed chip display to always show "Not Set" instead of "Off" when properties are not configured
- 🔧 **Fixed Template Logic**: Updated HTML template for brightness, kelvin, and color chips to match updateChipDisplay function behavior  
- 💡 **User Experience**: Eliminated confusion between "Off" and "Not Set" states - now consistently shows "Not Set" for unconfigured properties
- 🎯 **Proper State Indication**: "Not Set" clearly indicates the property hasn't been configured for the scene

### 🛠️ **Technical Changes**
- 🔧 **Template Fix**: Changed `'Off'` to `'Not Set'` in chip value template for all three properties
- 📊 **Consistency**: HTML template now matches `updateChipDisplay` function logic
- 🎯 **All Properties**: Fixed brightness, kelvin, and color chip initial rendering

## [2.7.3] - 2024-12-30

### 🗑️ **Removed Polygon Editing Feature**
- ❌ **Removed Interactive Polygon Editing**: Completely removed the polygon editing feature due to technical difficulties
- 🧹 **Clean Code**: Removed all polygon editing methods and event handlers
- 🔧 **Simplified Interface**: No more double-click polygon editing or ESC key handling for polygon mode
- 💡 **Stable Experience**: Focus on core functionality without experimental features

### 🛠️ **Technical Changes**
- ❌ **Removed Methods**: `handleDoubleClick`, `enterPolygonEditMode`, `exitPolygonEditMode`, `setupPolygonControls`, `createPolygonControl`, `updatePolygonPoint`, `removePolygonControls`
- 🚫 **Removed Events**: Double-click event handler for polygon editing
- 🔧 **Simplified ESC Key**: ESC key now only cancels room drawing operations
- 📊 **Code Cleanup**: Removed all polygon editing related variables and state management

## [2.7.2] - 2024-12-30

### 🔧 **Advanced Polygon Editing Debug**
- ✅ **Test Control System**: Added green test control at polygon center for visibility verification
- 🎯 **Fixed Coordinate System**: Changed from polygon top-left to center-based coordinate calculation
- 🔍 **Comprehensive Debugging**: Added detailed logging for control creation, positioning, and removal
- 🌟 **Enhanced Visibility**: Forced canvas rendering and object layering for better control visibility
- 💡 **Diagnostic Mode**: Temporarily disabled polygon selectability changes for debugging

### 🛠️ **Technical Improvements**
- 🔧 **Center-Based Coordinates**: Uses `polygon.left + polygon.width/2` for accurate control positioning
- 📊 **Test Control**: Green circle at polygon center to verify control system functionality
- 🎯 **Forced Rendering**: Added explicit `canvas.renderAll()` calls after control creation
- 🌈 **Debug Logging**: Console output for control positions, canvas viewport, and object states

## [2.7.1] - 2024-12-30

### 🐛 **Polygon Editing Debug & Fix**
- ✅ **Enhanced Debugging**: Added comprehensive logging for polygon editing control point creation
- 🔧 **Improved Positioning**: Fixed control point positioning using simplified coordinate calculation
- 🎯 **Better Error Handling**: Added validation for polygon points and control creation
- 💡 **Debug Information**: Detailed console logging for troubleshooting polygon editing issues
- 🌟 **Coordinate Fixes**: Changed from complex transform matrix to direct positioning for better reliability

### 🛠️ **Technical Improvements**
- 🔧 **Direct Positioning**: Uses `polygon.left + point.x` instead of transform matrix for control points
- 📊 **Validation**: Added checks for polygon points array validity before creating controls
- 🎯 **Enhanced Logging**: Console logs for double-click events, polygon properties, and control creation
- 🌈 **Simplified Updates**: Direct coordinate calculation for polygon point updates

## [2.7.0] - 2024-12-30

### 🔥 **NEW: Interactive Polygon Editing**
- ✅ **Double-Click to Edit**: Double-click any polygon (room outline) to enter interactive edit mode
- 🎯 **Draggable Vertex Controls**: Red control points appear at each polygon vertex for precise editing
- 🔧 **Real-Time Updates**: Polygon shape updates in real-time as you drag control points
- 💡 **Intuitive Exit**: Double-click empty area or use ESC to exit edit mode
- 🌟 **Smart Positioning**: Control points use proper coordinate transformation for accurate positioning

### 🛠️ **Technical Implementation**
- 🔧 **New Methods**: Added `handleDoubleClick`, `enterPolygonEditMode`, `exitPolygonEditMode`
- 🎯 **Control System**: `setupPolygonControls`, `createPolygonControl`, `updatePolygonPoint`
- 📊 **Coordinate Transform**: Uses `fabric.util.transformPoint` for proper polygon-to-canvas coordinate mapping
- 🌈 **Event Handling**: Individual control points have `moving` event handlers for real-time updates
- 🔄 **State Management**: Proper cleanup and restoration of polygon properties during edit mode

### 🎨 **Visual Features**
- ⭕ **Red Control Points**: 6px radius circles with white borders for clear visibility
- 🎯 **No Selection**: Control points don't have selection handles to avoid UI clutter
- 💡 **Visual Feedback**: Status messages inform user about edit mode state
- 🌟 **Tool Integration**: Automatically switches to select tool during edit mode

### 🖱️ **User Experience**
- 🔧 **Simple Workflow**: Draw polygon → Double-click → Drag vertices → Double-click empty area
- 🎯 **Non-Destructive**: Edit mode preserves all polygon properties and styling
- 💡 **Clear Feedback**: Status bar messages guide user through the editing process
- 🌟 **Familiar Interaction**: Similar to professional design software polygon editing

## [2.6.5] - 2024-12-30

### 🎨 **Smart Contrasting Outlines**
- ✅ **Intelligent Outline Color**: Light outlines now automatically use contrasting colors (black or white) based on fill color luminance
- 🌟 **Perfect Visibility**: Dark fills get white outlines, light fills get black outlines for optimal contrast
- 💡 **Automatic Adaptation**: No more invisible outlines - every light has a clearly visible outline when brightness is set
- 🎯 **Smart Color Detection**: Supports both RGB and hex color formats with robust parsing

### 🛠️ **Technical Changes**
- 🔧 **New Function**: Added `getContrastingColor(fillColor)` to calculate optimal outline color
- 🌈 **Luminance Calculation**: Uses relative luminance formula (0.299*R + 0.587*G + 0.114*B) for accurate brightness detection
- 📊 **Contrast Logic**: Returns `#000000` (black) for light colors, `#FFFFFF` (white) for dark colors
- 🎯 **Updated Stroke**: Changed from `stroke: fillColor` to `stroke: this.getContrastingColor(fillColor)`

### 🎨 **Visual Improvements**
- ⭕ **Always Visible**: Light outlines are now always clearly visible regardless of fill color
- 🌟 **Better Contrast**: Optimal contrast ensures outlines stand out from both light and dark backgrounds
- 💡 **Professional Look**: Smart color adaptation creates polished, professional appearance
- 🎭 **Universal Compatibility**: Works perfectly with all light colors - red, green, blue, white, yellow, etc.

## [2.6.4] - 2024-12-30

### 🎨 **Enhanced Glow Effect**
- ✅ **Added Light Outline**: Main light now has a 2px outline when brightness is set for better definition
- 🌟 **Reduced Glow Opacity**: Made glow effect more subtle by reducing opacity range from 0.8→0.2 to 0.4→0.1
- 💡 **Better Visual Balance**: Outline on main light provides clear definition while subtle glow adds atmosphere
- 🎯 **Improved Contrast**: Main light now stands out clearly against its own glow effect

### 🛠️ **Technical Changes**
- 🔧 **Light Outline**: Added `stroke: fillColor, strokeWidth: 2` to main light when brightness is set
- 🌈 **Opacity Reduction**: Changed from `0.8 - (glowIntensity * 0.6)` to `0.4 - (glowIntensity * 0.3)`
- 📊 **Opacity Range**: 0.4 at 0% brightness → 0.1 at 100% brightness (more subtle)
- 🎯 **Affected Functions**: Updated both `updateFloorplanLightColor` and `updateFloorplanLightFromSceneSettings` methods

### 🎨 **Visual Improvements**
- ⭕ **Defined Light**: Main light circle now has clear outline for better visibility
- 🌟 **Subtle Glow**: Reduced opacity makes glow effect more atmospheric and less overwhelming
- 💡 **Better Hierarchy**: Main light clearly visible with subtle glow enhancement
- 🎭 **Refined Appearance**: More polished look with proper visual balance

## [2.6.3] - 2024-12-30

### 🐛 **Critical Glow Effect Fixes**
- ✅ **Fixed Glow Centering**: Corrected glow circle positioning to be perfectly centered on main light circle
- 🎯 **Fixed Positioning Logic**: Changed from top-left positioning to proper center calculation for larger glow circles
- 🌟 **Fixed Opacity Logic**: Inverted opacity formula so higher brightness creates more diffuse (translucent) glow effect
- 💡 **Natural Light Physics**: Higher brightness now creates larger, more diffuse glow (realistic light behavior)
- 🔧 **Intuitive Behavior**: Glow effect now behaves logically - brighter lights have more spread-out, softer glow

### 🛠️ **Technical Changes**
- 🎯 **Positioning**: `left: light.left + light.radius - (light.radius + glowSize)` for proper centering
- 🌈 **Opacity Formula**: `0.8 → 0.2` (more diffuse as brightness increases) vs previous `0.2 → 0.8` (denser)
- 📊 **Size Scaling**: Maintained 5px→40px radius extension based on brightness
- 🔧 **Affected Functions**: Fixed both `updateFloorplanLightColor` and `updateFloorplanLightFromSceneSettings` methods

### 🎨 **Visual Improvements**
- ⭕ **Perfect Centering**: Glow circles now perfectly centered on main light circles
- 🌟 **Realistic Diffusion**: Higher brightness creates softer, more spread-out glow effect
- 💡 **Intuitive Scaling**: Brightness slider now behaves as expected for glow effects
- 🎭 **Natural Appearance**: Glow effect mimics real light physics with proper diffusion

## [2.6.2] - 2024-12-30

### 🐛 **Critical Bug Fix**
- ✅ **Fixed Fabric.js v6 API Compatibility**: Corrected outdated API calls causing glow circle layering errors
- 🔧 **Updated sendToBack/bringToFront**: Changed from object methods to canvas methods for proper layering
- 🎯 **Canvas Methods**: Now using `canvas.sendObjectToBack()` and `canvas.bringObjectToFront()` instead of object methods
- 🛠️ **Fixed TypeError**: Resolved "sendToBack is not a function" runtime error in glow circle system
- 💡 **Modern API**: Updated to current Fabric.js v6 API specification for proper compatibility

### 🛠️ **Technical Changes**
- 🔧 **Before**: `glowCircle.sendToBack()` and `light.bringToFront()` (deprecated)
- ✅ **After**: `canvas.sendObjectToBack(glowCircle)` and `canvas.bringObjectToFront(light)` (v6 API)
- 🎯 **Affected Functions**: Fixed both `updateFloorplanLightColor` and `updateFloorplanLightFromSceneSettings` methods
- 📊 **Error Prevention**: Eliminated runtime errors when applying glow effects to lights

## [2.6.1] - 2024-12-30

### 🔄 **Separate Glow Circle System**
- ✅ **NEW: Separate Glow Circles**: Creates independent larger circles behind main lights for true glow effect
- 🎯 **Preserved Light Size**: Main light circles remain unchanged in size and appearance
- 🌟 **Independent Scaling**: Glow circles scale radius independently (5px to 40px extension)
- 💡 **Clean Separation**: Main light and glow effect are completely separate objects
- 🎨 **Better Visual Control**: Glow circles positioned behind main lights with proper layering

### 🛠️ **Technical Implementation**
- 🔧 **Glow Circle Creation**: `new fabric.Circle()` with radius = `light.radius + glowSize`
- 📊 **Size Formula**: `Math.max(5, brightness * 0.4)` for glow radius extension
- 🎭 **Opacity Range**: 0.2 → 0.8 for glow circle opacity
- 🗂️ **Object Management**: Stores glow circle reference on main light for cleanup
- 🎯 **Layer Control**: Glow circles sent to back, main lights brought to front

### 🎨 **Visual Benefits**
- ⭕ **Unchanged Light Size**: Main light circles stay exactly the same size
- 🌈 **True Glow Effect**: Separate circles create authentic glow appearance
- 📏 **Predictable Scaling**: Glow radius directly correlates to brightness
- 🧹 **Clean Architecture**: No stroke/shadow artifacts affecting main light appearance
- 🎪 **Proper Layering**: Glow always appears behind main light for correct visual effect

## [2.6.0] - 2024-12-30

### 🔄 **Major Glow System Redesign**
- ✅ **NEW: Stroke-based Glow**: Completely replaced shadow blur with stroke (border) system for predictable glow effects
- 🚫 **Removed Shadow Blur**: Eliminated problematic blur system that spread opacity over excessive areas
- 🎯 **Glow Distance Control**: Brightness now controls stroke width (glow distance) from 2px to 20px
- 🌟 **Consistent Visibility**: Stroke-based glow maintains sharp visibility at all brightness levels
- 💡 **Predictable Scaling**: Linear relationship between brightness and glow distance without density loss

### 🛠️ **Technical Implementation**
- 🔧 **New Glow Formula**: `Math.max(2, brightness * 0.2)` for stroke width (glow distance)
- 📊 **Opacity Range**: 0.3 → 1.0 for stroke opacity, multiplied by 0.6 for transparency effect
- 🎨 **Stroke Properties**: Uses `stroke`, `strokeWidth`, `strokeOpacity` instead of shadow blur
- 🚫 **Removed Shadow**: Set `shadow: null` to eliminate blur-based effects entirely
- 🎯 **Consistent Implementation**: Updated both glow functions with stroke-based system

### 🎨 **Visual Improvements**
- 🌈 **Sharp Glow Edges**: Stroke creates clean, sharp glow boundaries vs blurry shadow
- 📏 **Precise Distance**: Glow distance directly correlates to brightness percentage
- ✨ **Better Visibility**: No more disappearing glow at high brightness levels
- 🎭 **Uniform Effect**: Same visual impact across all brightness ranges

## [2.5.8] - 2024-12-30

### 🐛 **Reduced Blur Scaling**
- ✅ **Much Less Aggressive Scaling**: Changed blur size from 4x scaling (20px→80px) to 2.5x scaling (20px→70px)
- 🎯 **Controlled Spread**: Blur no longer spreads glow over excessive area, maintaining visibility at high brightness
- 🔧 **New Size Formula**: `Math.max(20, 20 + (brightness * 0.5))` - much more conservative scaling
- 🌟 **Maintained Visibility**: High brightness (69%+) glow should now remain visible and dramatic
- 💡 **Balanced Approach**: Combines moderate size scaling with opacity compensation for optimal glow effect

### 🛠️ **Technical Details**
- 📊 **Size Range**: 20px at 0% brightness → 70px at 100% brightness (2.5x increase vs previous 4x)
- 🎨 **Opacity Range**: Still scales 0.6 → 1.0 to compensate for density loss
- 🔍 **Blur Physics**: Smaller maximum blur size prevents over-spreading of opacity
- 🎯 **Consistent Implementation**: Updated both glow functions with conservative size scaling

## [2.5.7] - 2024-12-30

### 🐛 **Fixed Blur Density Loss**
- ✅ **Compensated for Blur Physics**: Higher opacity now compensates for blur density loss at larger sizes
- 🔬 **Root Cause**: Larger blur spreads the same opacity over more area, making it appear less dense/visible
- 🎯 **Smart Scaling**: Opacity now increases with brightness to maintain glow visibility (0.6 → 1.0)
- 🌟 **Visible Glow**: High brightness levels (69%+ brightness) now have visible, dramatic glow effects
- 💡 **Physics-based**: Matches how real light behaves - brighter lights have more visible glow

### 🛠️ **Technical Details**
- 🔧 **New Opacity Formula**: `Math.max(0.6, 0.6 + (glowIntensity * 0.4))` - compensates for blur density loss
- 📊 **Opacity Range**: 0.6 at 0% brightness → 1.0 at 100% brightness (40% increase)
- 🎨 **Size + Opacity**: Both size (20px→80px) and opacity (0.6→1.0) now scale together
- 🔍 **Blur Physics**: Larger blur radius naturally spreads opacity over more area, requiring higher opacity

## [2.5.6] - 2024-12-30

### 🐛 **Constant Opacity Glow Fix**
- ✅ **Constant Opacity**: Set glow opacity to constant 0.615 for all brightness levels (same as 10% brightness)
- 🎯 **Size-only Scaling**: Glow effect now only scales with size (20px → 80px), opacity remains constant
- 🌟 **Predictable Behavior**: Eliminates all opacity-related inconsistencies in glow visibility
- 💡 **Clean Implementation**: Removed all opacity calculations, using fixed 0.615 opacity value

### 🛠️ **Technical Details**
- 🔧 **Simplified Logic**: Replaced `Math.max(0.6, 0.6 + (glowIntensity * 0.15))` with constant `0.615`
- 📊 **Opacity**: Fixed at 0.615 for all brightness levels (no variation)
- 🎨 **Size Range**: Still scales from 20px (1% brightness) to 80px (100% brightness)
- 🎯 **Consistent Implementation**: Updated both glow functions with same constant opacity

## [2.5.5] - 2024-12-30

### 🐛 **Fine-tuned Glow Effect**
- ✅ **Minimized Opacity Changes**: Reduced opacity variation from 0.5 range to 0.15 range (0.3-0.8 → 0.6-0.75)
- 🎯 **Size-focused Scaling**: Glow effect now primarily scales with size rather than opacity for more intuitive behavior
- 🌟 **Consistent Visibility**: Higher base opacity (0.6) ensures glow remains visible at all brightness levels
- 💡 **Subtle Opacity Scaling**: Opacity only increases slightly (0.15) to maintain glow visibility without over-opacity

### 🛠️ **Technical Details**
- 🔧 **New Opacity Formula**: `Math.max(0.6, 0.6 + (glowIntensity * 0.15))` - much more conservative opacity changes
- 📊 **Opacity Range**: 0.6 at 0% brightness → 0.75 at 100% brightness (minimal change)
- 🎨 **Primary Effect**: Size scaling (20px → 80px) now drives most of the visual difference
- 🎯 **Consistent Implementation**: Updated both glow functions with same conservative opacity scaling

## [2.5.4] - 2024-12-30

### 🐛 **Critical Glow Fix**
- ✅ **Fixed Inverted Glow Visibility**: Corrected glow effect where higher brightness was creating less visible glows
- 🌟 **Proper Brightness Scaling**: Higher brightness now creates both larger AND more visible glows (as expected)
- 🔆 **Intuitive Behavior**: Brightness slider now behaves logically - more brightness = more dramatic, visible glow effect
- 📊 **New Opacity Formula**: Changed from decreasing opacity to increasing opacity with brightness (0.3 → 0.8)
- 💡 **Better Visual Feedback**: Glow effects now properly represent light intensity with both size and visibility scaling

### 🛠️ **Technical Details**
- 🔧 **Fixed Opacity Logic**: Changed from `Math.max(0.2, 0.8 - (glowIntensity * 0.6))` to `Math.max(0.3, 0.3 + (glowIntensity * 0.5))`
- 📈 **Opacity Range**: 0.3 at 0% brightness → 0.8 at 100% brightness (increasing with brightness)
- 🎯 **Consistent Implementation**: Updated both `updateFloorplanLightColor()` and `updateFloorplanLightFromSceneSettings()` functions

## [2.5.3] - 2024-12-30

### 🐛 **Bug Fix**
- ✅ **Fixed Glow Effect Logic**: Corrected counter-intuitive glow behavior where higher brightness created less visible glow
- 🌟 **Realistic Glow Physics**: Higher brightness now creates larger, softer glows with lower opacity (more realistic)
- 🔆 **Enhanced Brightness Mapping**: Lower brightness creates smaller, more concentrated glows with higher opacity for visibility
- 🎨 **Improved Visual Feedback**: Glow effect now properly represents light intensity with realistic opacity scaling
- 💡 **Better User Experience**: Brightness slider now behaves intuitively - more brightness = more dramatic glow effect

### 🛠️ **Technical Improvements**
- 🔧 **Inverted Opacity Logic**: Changed from `opacity: glowIntensity * 0.8` to `opacity: Math.max(0.2, 0.8 - (glowIntensity * 0.6))`
- 📊 **Enhanced Logging**: Added brightness and opacity values to glow effect debug logs
- 🎯 **Consistent Implementation**: Updated both `updateFloorplanLightColor()` and `updateFloorplanLightFromSceneSettings()` functions

## [1.2.26] - 2024-12-30

### 🐛 **Bug Fix**
- ✅ **Fixed Fabric.js Warnings**: Resolved persistent "fabric Setting type has no effect" console warnings
- 🔧 **Grid Line Properties**: Removed invalid `type: 'line'` and `excludeFromExport: true` properties from fabric.Line objects
- 🧹 **Clean Console**: Eliminated fabric.js warnings that appeared during page load initialization
- 🎯 **Proper Property Usage**: Grid lines now use only valid fabric.js properties while maintaining custom identification

### 🛠️ **Technical Improvements**
- 🏗️ **Cleaner Object Creation**: Simplified grid line creation with only necessary properties
- 🔍 **Console Cleanup**: Removed fabric.js property warnings from developer console
- 📐 **Maintained Functionality**: Grid visibility and snapping continue to work perfectly

## [1.2.25] - 2024-12-30

### 🔧 **Major Save/Load System Overhaul**
- 🏗️ **Comprehensive Object Persistence**: All objects (lines, shapes, rectangles, polygons) now save/load properly
- 🔄 **Rotation Preservation**: All rotation, scaling, and transformation properties are now preserved
- 📐 **Enhanced Snapping**: Added snapping to line endpoints and polygon vertices with visual crosshair guides
- ⚡ **SHIFT Key Support**: Enabled fabric.js SHIFT key functionality for proportional scaling, constrained rotation (15° increments), and constrained movement
- 🎨 **Line Drawing Tool**: Added dedicated line drawing tool with real-time preview and endpoint snapping
- 🔍 **Improved Snapping Visual**: Enhanced snap guides with crosshair indicators for precise positioning
- 💾 **Backward Compatibility**: Maintains support for loading older save formats
- 🎯 **Smart Object Classification**: Comprehensive object type detection and restoration with proper event handlers

### 🐛 **Critical Bug Fixes**
- ✅ **Fixed Save System**: Lines, shapes, and custom objects now properly save and restore
- 🔄 **Fixed Rotations**: All object rotations and transformations are now preserved
- 🎯 **Fixed Snapping**: Line endpoints and polygon vertices now snap correctly
- 🎨 **Fixed Object Restoration**: All objects restore with proper properties and functionality

### 🎨 **Enhanced Drawing Tools**
- 🖊️ **Line Tool**: New dedicated line drawing tool with live preview
- 📏 **Smart Snapping**: Snap to line endpoints, polygon vertices, and object centers
- 🎯 **Visual Feedback**: Enhanced snap guides with crosshair indicators for precision
- ⌨️ **Keyboard Shortcuts**: SHIFT key now works for all fabric.js interactions

### 🔧 **Technical Improvements**
- 🏗️ **Unified Save Format**: New comprehensive object storage system
- 🔄 **Enhanced Load System**: Improved object restoration with full property preservation
- 🎯 **Better Object Detection**: Smart classification of different object types
- 📐 **Transformation Preservation**: All scale, rotation, skew, and flip properties preserved

## [1.2.24] - 2024-12-30

### 🔄 **Major Architecture Unification**
- 🏗️ **Unified Interface**: Removed dual mode system - floorplan and grid are now one unified interface
- 📋 **Dynamic Entity List**: "Select Lights" section now shows assigned floorplan entities instead of fixed grid
- 🔄 **Auto-Population**: Light list automatically updates when entities are assigned in floorplan
- 🎛️ **Enhanced Individual Controls**: Individual light controls now work with actual entity IDs
- 📏 **Improved UX**: Better entity selection popup height and visual feedback
- ⚡ **Real-time Updates**: Light list refreshes automatically when new entities are assigned

### 🐛 **Critical Bug Fixes**
- ✅ **Fixed Individual Controls**: Toggle now properly shows/hides individual controls
- 🔗 **Entity Integration**: Individual controls now display entity names and IDs correctly
- 🎯 **Selection Logic**: Updated selection system to work with floorplan entities
- 🛡️ **DOM Safety**: Added safe ID conversion for entities with dots in names

### 🛠️ **Technical Improvements**
- 🚫 Removed `toggleViewMode()` and view mode toggle UI
- 📊 Added `selectedFloorplanLights` Set for entity-based selection
- 🔄 Updated all selection methods to work with entity IDs
- 🎛️ Enhanced `renderIndividualControls()` to handle real entities
- 🔄 Added automatic refresh when entities are assigned to lights

## [1.2.23] - 2024-12-28

### ✨ **State Visualization Toggle**
- 🔄 **Current vs Scene Preview Toggle**: New button to switch between showing current Home Assistant state and scene preview
- 🏠 **Current State Mode**: Green button shows lights as they actually are in Home Assistant right now
- 🎨 **Scene Preview Mode**: Purple button shows lights as they will look with your slider settings
- 🔀 **Smart Display Logic**: Instantly compare real-world state vs planned scene configuration
- ⚡ **Real-time Updates**: Toggle updates all lights immediately with smooth animations

### 🎛️ **Enhanced User Control**
- 🎯 **Visual Comparison**: Easily see the difference between current lighting and your planned scene
- 🔍 **Scene Design Mode**: Preview exactly how your scene will look before applying it
- 🏡 **Reality Check**: Switch back to current state to see actual light conditions
- 💡 **Intelligent Fallback**: Scene preview uses selected light controls or global sliders

### 🎨 **Visual Enhancements**
- 🌈 **Gradient Button Styling**: Beautiful green/purple gradients with hover effects and animations
- ✨ **Switching Animation**: Smooth scale animation when toggling between modes
- 🎭 **Dynamic Icons**: Home icon for current state, palette icon for scene preview
- 📱 **Responsive Design**: Looks great on all device sizes

### 🛠️ **Technical Implementation**
- 🔧 Added `showCurrentState` property to track display mode
- 🎯 Implemented `toggleStateMode()` with icon and text updates
- 🔄 Enhanced `updateLightVisualState()` with mode-aware logic
- 🎨 Added sophisticated CSS styling with animations and gradients

## [1.2.22] - 2024-12-28

### ✨ **Major Floorplan Editor Enhancements**
- 🎨 **Real-time Light Visualization**: Light bulbs now show colors and brightness based on slider values
- 🎛️ **Smart Light Settings Panel**: Selected lights automatically show in dedicated Light Settings control
- 📱 **Individual Light Controls**: Entity name, ID, and full slider controls for selected lights
- 🔄 **Bi-directional Sync**: Global sliders update selected floorplan light visual state
- 🌈 **Live Color Preview**: Real-time color preview box shows exact RGB values
- ⚡ **Auto Mode Switch**: Selecting a light automatically switches to Individual Light Control mode

### 🔧 **Interactive Features**
- 🎯 **Entity Assignment Visual Update**: Lights immediately show their Home Assistant state when assigned
- 🖱️ **Click-to-Configure**: Click any light bulb to see its settings and adjust colors/brightness
- 🎨 **Slider-to-Visual Sync**: Moving sliders instantly updates the light bulb appearance
- 💡 **Smart Entity Display**: Shows both friendly name and entity ID for selected lights

### 🎭 **User Experience Improvements**
- 🌟 **Professional Light Settings UI**: Dedicated panel with gradient background and blue accent
- 📊 **Visual Value Indicators**: Color-coded values and live RGB display
- 🎨 **Enhanced Slider Design**: Custom styled sliders with hover effects and gradients
- 📱 **Responsive Design**: Works beautifully on desktop and mobile devices

### 🛠️ **Technical Implementation**
- 🔄 Added `createIndividualControlsForLight()` for dynamic light-specific controls
- 🎨 Implemented `updateLightVisualStateFromSliders()` for real-time visual updates
- 🎯 Enhanced `updateControlsFromLight()` with automatic mode switching
- 📊 Added comprehensive CSS styling for selected light controls

## [1.2.21] - 2024-12-28

### ✨ Enhanced
- 🔍 **Improved Entity Selector**: Complete redesign of entity assignment interface
  - Replaced basic dropdown with searchable, filterable interface
  - Added two-row display format: friendly name (large) + entity ID (small monospace)
  - Implemented alphabetical sorting by friendly name
  - Added keyboard navigation support (arrow keys, Enter, Escape)
  - Enhanced visual feedback with hover states and highlighting
  - Improved modal UX with auto-focus and click-outside-to-close

### 🛠️ Technical Improvements
- 📱 Added comprehensive CSS styling for entity assignment modal
- 🎯 Implemented advanced dropdown functionality with search filtering
- 📐 Added responsive design support for mobile devices
- ♿ Enhanced accessibility with proper keyboard navigation
- 🎨 Custom scrollbar styling and visual states

## [1.2.20] - 2024-12-28

### Fixed
- 🐛 **JavaScript Bug Fix**: Fixed "response is not defined" ReferenceError in HomeAssistantAPI.getLights()
- 🔧 **Variable Scoping**: Properly declared response variable outside try block to fix scoping issue
- 🌐 **Lights Loading**: Lights endpoint now works correctly without JavaScript errors

### Technical
- 📡 Fixed variable scoping in server.js line 271 by declaring `let response;` before try block
- 🔧 Resolved ReferenceError that was causing 500 Internal Server Error on /api/lights

## [1.2.19] - 2024-12-28

### Fixed
- 🚀 **CRITICAL: Authentication Root Cause Fixed**: Added missing `homeassistant_api: true` to config.yaml
- 🔧 **SUPERVISOR_TOKEN Now Available**: Home Assistant now properly provides authentication token to add-on
- 📊 **Restored Working Configuration**: Reverted to working 1.2.7 config.yaml structure with all essential settings
- 🏠 **Add-on Lifecycle Fixed**: Restored `startup: application`, `boot: auto`, `watchdog`, `webui` settings
- 🌐 **Full Schema Restored**: All configuration options and defaults properly configured

### Root Cause Analysis
- **The Issue**: Missing `homeassistant_api: true` in config.yaml meant Home Assistant wasn't providing SUPERVISOR_TOKEN
- **The Fix**: Restored complete working configuration from version 1.2.7 that had working authentication
- **Result**: 401 Unauthorized errors should now be resolved as add-on has proper API access

### Technical
- 📡 Added `homeassistant_api: true` - Critical for SUPERVISOR_TOKEN provision
- 🔧 Restored full options schema with all defaults (grid_size, brightness, etc.)
- 🌐 Added proper add-on mapping with `config` and `ssl` access
- 🛠️ Restored watchdog health check endpoint configuration

## [1.2.18] - 2024-12-28

### Fixed
- 🚀 **CRITICAL: Corrected URL Construction Logic**: Fixed persistent double `/core` issue in API requests  
- 🔧 **Reverted to Working Pattern**: Base URL `http://supervisor/core` + endpoint `/api/states` = correct full URL
- 🌐 **Standardized API Endpoints**: All endpoints now consistently use `/api/` prefix for Home Assistant API
- 📊 **Enhanced Debugging**: Added comprehensive URL construction logging to identify issues quickly
- 🔍 **Authentication Flow**: Maintained proper SUPERVISOR_TOKEN usage for official add-on environment

### Technical
- 📡 Reverted baseURL from `http://supervisor/core/api` back to `http://supervisor/core`
- 🔧 Standardized all API calls to use `/api/states`, `/api/services/light/*`, `/api/template` 
- 🌐 Simplified endpoint logic - removed conditional endpoint construction
- 🛠️ Enhanced ingress path detection and logging for troubleshooting

## [1.2.17] - 2024-12-28

### Fixed
- 🚀 **CRITICAL: Fixed 401 Unauthorized API Errors**: Corrected Home Assistant API URL construction
- 🔧 **URL Pattern Fix**: Fixed double `/core` in API URLs (was: `/core/core/api/states`, now: `/core/api/states`)
- 🏠 **Official HA Add-on Compliance**: Updated authentication to match official HA add-on documentation
- 🔄 **Smart Endpoint Detection**: Added automatic detection of supervisor proxy vs direct API access
- 📡 **Multi-mode Support**: Properly supports both `http://supervisor/core/api` and direct HA URLs

### Technical
- 📊 Fixed baseURL + endpoint concatenation logic in axios configuration
- 🔧 Updated all API endpoints to use correct path patterns based on access method
- 🌐 Improved authentication flow following official HA add-on communication guidelines
- 🔍 Enhanced debugging logs to show actual URLs being constructed

## [1.2.16] - 2024-12-28

### Fixed
- ✅ **API Error Resolution**: Fixed 500 Internal Server Error on `/api/lights` endpoint
- 🔧 **WebSocket Fault Tolerance**: Made areas, devices, and entities fetching optional to prevent failures
- 🛠️ **Enhanced Error Handling**: Improved logging and error handling for API connection issues
- 🌐 **Robust Light Loading**: Lights endpoint now works even if WebSocket connections fail

### Technical
- 📊 Added detailed error logging for each API call step
- 🔄 Made WebSocket-based metadata fetching fault-tolerant 
- 🔧 Enhanced API debugging capabilities

## [1.2.15] - 2024-12-28

### Changed
- 🔄 **Version Bump**: Updated version to trigger Home Assistant upgrade prompt
- 📦 **Synchronized Versions**: All files now consistently use version 1.2.15

## [1.2.14] - 2024-12-28

### Fixed
- ✅ **Ingress Support**: Added proper Home Assistant ingress configuration
  - Added `ingress: true` to config.yaml to enable ingress mode
  - Added `ingress_port: 3000` to specify the ingress port
  - Added panel integration with `panel_icon` and `panel_title`
  - Added catch-all route handler for ingress path support
- 🔧 **Panel Integration**: Add-on now appears in Home Assistant sidebar
- 🌐 **Routing**: Fixed server routing to handle ingress paths correctly

### Enhanced
- 📱 **Panel Configuration**: Custom lightbulb group icon and "LightMapper" title
- 🔗 **Path Handling**: Improved routing for embedded Home Assistant usage
- 🛠️ **Asset Loading**: Verified relative paths work correctly with ingress

### Technical
- 🌐 Added catch-all route (`app.get('*')`) for ingress path handling
- 📊 Enhanced ingress detection and logging
- 🔧 Panel configuration with `panel_admin: false` for all users

## [1.2.13] - 2024-12-28

### Fixed
- ✅ **Missing Dependencies**: Added required Node.js modules that were missing from package.json
  - Added `sqlite3` for database functionality
  - Added `axios` for HTTP requests to Home Assistant API
  - Added `ws` for WebSocket communication
  - Added `morgan` for HTTP request logging
- 🚀 **Add-on Installation**: Resolved "Cannot find module 'sqlite3'" error during startup
- 🏗️ **Build Process**: Fixed dependency resolution for local Home Assistant add-on installation

### Technical
- 📦 Updated package.json with all required dependencies for server functionality
- 🔧 Ensured proper module loading for database and API communication
- 🛠️ Fixed Docker build process to include all necessary Node.js packages

## [1.2.12] - 2024-12-28

### ✨ New Features
- 🧲 **Enhanced Object Snapping**: Objects now snap to grid when being moved, not just when created
- 🎯 **Object-to-Object Snapping**: Smart alignment with visual guide lines when moving objects near each other
- 📱 **Canvas-Controls Integration**: Selecting a light on the canvas automatically updates the control sliders to show its current state
- 🌈 **Real-time Light States**: Lights on canvas now visually represent their actual Home Assistant state (color, brightness, on/off)
- ✨ **Selection Highlighting**: Selected lights get a green glow effect for better visual feedback

### 🔧 Enhanced Features
- 🎨 **Visual State Sync**: Light colors and brightness update in real-time based on Home Assistant entity states
- 🎛️ **Auto Mode Switch**: Selecting a light automatically switches to individual control mode
- 💡 **Smart Entity Assignment**: When assigning entities to lights, visual state immediately updates
- 🔄 **Dynamic Updates**: Moving selected lights updates the control sliders in real-time

### 🎨 User Experience Improvements
- 📏 **Dashed Guide Lines**: Red dashed lines appear when objects align horizontally or vertically
- 🎯 **Snap Tolerance**: 10-pixel tolerance zone for object alignment snapping
- 🖱️ **Visual Feedback**: Clear indicators when snapping occurs during object movement
- 🔗 **Seamless Integration**: Canvas and controls work together as a unified interface

### 🛠️ Technical Details
- Enhanced `handleObjectMoving()` with advanced snapping algorithms
- Added `snapToObjects()` method with horizontal/vertical alignment detection
- New `createSnapGuide()` and `clearSnapGuides()` for visual feedback
- Implemented `updateControlsFromLight()` for bi-directional canvas-controls sync
- Added `updateLightVisualState()` with HSV/RGB color conversion and temperature mapping
- Selection management with `highlightSelectedLight()` and `removeHighlightFromLight()`

## [1.2.11] - 2024-12-28

### Fixed
- ✅ Removed red debug line that appeared momentarily during grid operations
- ✅ Fixed grid display at zoom levels below 100% by improving visibility calculation
- ✅ Fixed drawing line colors to be theme-aware and visible in both light and dark modes
- ✅ Fixed long-hold bulb menu to properly apply selected light icon style
- ✅ Removed friendly/entity name toggle - now always uses entity names formatted nicely

### Removed
- 🗑️ Friendly/Entity name toggle button (always uses entity names now)
- 🗑️ Debug test lines in grid drawing function

## [1.2.10] - 2024-12-27

### Fixed
- ✅ Critical JavaScript error fix: Corrected Fabric.js method names
  - Fixed `sendToBack` → `sendObjectToBack` (6 instances)
  - Fixed `bringToFront` → `bringObjectToFront` (1 instance)
- ✅ Grid system now works properly - no more canvas crashes
- ✅ All object layering operations now use correct Fabric.js API

### Technical
- 🔧 Comprehensive canvas object manipulation fixes
- 🐛 Resolved TypeError that was preventing grid line creation
- 🎯 Grid debugging tools remain accessible via `window.floorplanDebug`

## [1.2.9] - 2024-12-27

### Added
- 🔧 Comprehensive grid debugging system with extensive console logging
- 🛠️ Manual grid refresh tools and debug functions
- ⌨️ Keyboard shortcut Ctrl+G for manual grid refresh
- 🔍 Enhanced canvas setup validation and error handling
- 🌐 Global debug functions accessible via `window.floorplanDebug`

### Technical
- 📊 Added detailed logging for canvas dimensions, zoom levels, visible areas
- 🎯 Canvas coordinate debugging for precise grid positioning
- 🔄 Enhanced grid refresh mechanisms for troubleshooting

## [1.2.8] - 2024-12-27

### Added
- ✅ **Grid System**: Enhanced grid with proper color adaptation for light/dark themes
- 🖼️ **Background Images**: Fixed Fabric.js image loading with comprehensive error handling
- 📐 **Rectangle Tool**: Right-click room tool activates rectangle drawing mode
- 💡 **Long-Hold Light Menu**: 500ms hold on lightbulb tool shows style options (Circle, Bulb, Recessed)
- 🏷️ **Smart Labels**: Labels now follow lights in real-time during movement
- 🎨 **Theme-Aware Drawing**: All drawing colors adapt automatically to current theme
- 💾 **Auto-Save System**: Saves every 30 seconds + 2 seconds after changes

### Fixed
- 🎯 Grid drawing with proper canvas coordinate calculations
- 📷 Image loading using Image objects instead of broken fromURL method
- 🏷️ Label positioning and real-time movement tracking
- 🎨 White-on-white visibility issues in light mode
- 💾 Automatic data persistence for lights, texts, rooms, backgrounds, settings

### Enhanced
- 🔄 Real-time preview for rectangle drawing
- 🎯 Improved light reference tracking for labels
- 🌈 Dynamic theme switching for all visual elements
- 📊 Comprehensive data storage and retrieval 