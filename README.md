# Generic 3D Printer Card for Home Assistant

A configurable Lovelace dashboard card for 3D printers. It combines a large printer view with a model overlay, a switchable live camera, an ACE/AMS area with four spool images, print progress, temperatures, fan speed and printer controls.

The card does not hardcode Anycubic or other manufacturer-specific entity names. All entities, images, labels and actions are configured in YAML.

<p align="center">
  <img width="45%" alt="3D Printer Card overview" src="https://github.com/user-attachments/assets/c3ee6c92-2863-430f-a509-988aaff2e915">
  <img width="45%" alt="3D Printer Card camera view" src="https://github.com/user-attachments/assets/8a6a4290-3795-4033-a245-9fdd8fcbd444">
</p>

## Features

- Full-width printer image with a dynamic model-image overlay
- Tap the printer area to switch between printer and live-camera views
- Visual dashboard editor; YAML is optional
- Five independently switchable sections
- ACE/AMS area with up to five automatically centered spool images
- Filename, progress, layers, elapsed time, remaining time and estimated end
- Up to four large metric buttons with a sensor value and a clickable secondary entity
- Clickable metric fields that open the target entity's Home Assistant dialog
- Small action buttons for `button`, `switch` and `light` entities
- Per-button labels and icon overrides
- Normal and compact layouts
- Home Assistant image selector with image upload support
- Stable display for missing, `unknown` and `unavailable` entities
- Responsive, dark Home Assistant-compatible design

## Installation with HACS

This repository can be installed as a HACS custom repository:

1. Open **HACS** in Home Assistant.
2. Open the three-dot menu in the top-right corner and choose **Custom repositories**.
3. Enter:
   `https://github.com/hausch1ld/Generic-3D-Printer-card-for-Home-Assistant-`
4. Select **Dashboard** as the category and click **Add**.
5. Open **Generic 3D Printer Card**, click **Download**, and reload the browser when installation is complete.

HACS should add the JavaScript resource automatically. If it does not, open **Settings → Dashboards → Resources** and add:

```text
/hacsfiles/Generic-3D-Printer-card-for-Home-Assistant-/3d-printer-card.js
```

Select **JavaScript module** as the resource type.

## Manual installation

1. Copy `dist/3d-printer-card.js` to `/config/www/3d-printer-card/3d-printer-card.js`.
2. In **Settings → Dashboards → Resources**, add `/local/3d-printer-card/3d-printer-card.js` as a **JavaScript module**.
3. Reload the browser completely.

The resource URL can stay unchanged on future updates. Replace the file and perform a hard refresh (`Cmd+Shift+R` on macOS or `Ctrl+F5` on Windows).

## Add the card

Add a **Manual** card to a dashboard and start with:

```yaml
type: custom:three-d-printer-card
name: My 3D Printer
printer_image: /local/3d-printer-card/printer.png
model_image_entity: image.printer_current_model
camera_entity: camera.printer
status_entity: sensor.printer_status
filename_entity: sensor.printer_filename
progress_entity: sensor.printer_progress
layer_current_entity: sensor.printer_current_layer
layer_total_entity: sensor.printer_total_layers
elapsed_time_entity: sensor.printer_elapsed_time
remaining_time_entity: sensor.printer_remaining_time
estimated_end_entity: sensor.printer_estimated_end
```

After adding the card, use Home Assistant's regular dashboard editor to configure it. The editor is split into five switchable sections:

1. **Multi-Filament System**
2. **3D Printer**
3. **Progress bar and information**
4. **Large button bar**
5. **Small button bar**

The image controls use Home Assistant's native image selector, so you can select an existing image, enter a supported path or upload a new image. The full configuration remains available in YAML for advanced use.

> The Lovelace type is `custom:three-d-printer-card`. Web Component names cannot begin with a number, so `custom:3d-printer-card` is not valid. The JavaScript filename remains `3d-printer-card.js`.

See [`example.yaml`](example.yaml) for a complete configuration with ACE/AMS, metrics and actions.

## Configuration

### Main view

| Option | Description |
|---|---|
| `name`, `subtitle` | Card title and optional subtitle |
| `printer_image` | Image URL, `/local/...` path or image entity |
| `model_image_entity` | Current model image entity |
| `camera_entity` | Camera entity used for the live view |
| `default_view` | Set to `camera` to start in camera view |
| `status_entity` | Printer status |
| `filename_entity` | Print job or filename |
| `progress_entity` | Progress from 0 to 100 |
| `layer_current_entity`, `layer_total_entity` | Current and total layer count |
| `elapsed_time_entity`, `remaining_time_entity` | Numeric seconds or an already formatted sensor value |
| `estimated_end_entity` | Estimated end; timestamps are formatted locally |
| `detail_labels` | Custom labels for `layer`, `elapsed`, `remaining` and `estimated_end` |
| `sections` | Switches the five editor/card sections on or off |
| `design` | `normal` or `compact` |
| `printer_background_color` | Background color behind the printer/model |
| `printer_height` | Printer area height in pixels; compact mode displays it 30% shorter |

Tapping the printer/model area switches to the live camera and back. Without `camera_entity`, the view remains unchanged.

### ACE/AMS and images

`ace.spools` supports up to five entries. Spools are centered automatically and remain symmetrical for every item count. Set `entity` to a sensor whose state is the filament label and whose `entity_picture` attribute contains the spool image. An explicit `label` overrides the state. The older `image_entity` option remains supported. A static `image` can also be selected or uploaded for each spool.

`ace.image` adds an optional background image, while `ace.background_color` defines a plain fallback/background color. Use `ace.title_alignment` with `left`, `center` or `right` to align the section title. Compact mode reduces this section to half of its normal height and scales its contents proportionally.

Transparent model images work best for the model overlay. Printer and ACE images are not bundled, so you can use assets matching your own hardware.

### Large button bar

Configure up to four entries under `large_buttons` with:

- `entity`: the main sensor shown as the large value
- optional `secondary_entity`: any entity shown below and opened on click
- optional `label`, `icon` and `unit`
- optional `secondary_label` and `secondary_unit`

Without an explicit unit, the entity's `unit_of_measurement` is used. If `secondary_entity` is set, clicking the metric opens that entity's Home Assistant more-info dialog. Existing `metrics.nozzle`, `metrics.bed` and `metrics.fan` configurations from version 0.2.x remain supported.

### Small button bar

Each entry under `small_buttons` accepts a `button`, `switch` or `light` entity plus optional `label` and `icon`. A `button` entity is pressed; a `switch` or `light` entity is toggled. A configured icon overrides the entity's icon.

The compact design moves this entire bar onto the lower edge of the printer image next to the camera toggle. Existing `actions` configurations from version 0.2.x remain operational for backward compatibility.

### Compact design

Set `design: compact` in YAML or select **Compact** in the editor. The printer area becomes 30% shorter, the Multi-Filament section becomes roughly half as high, and the small button bar moves onto the printer image. Images continue to use `object-fit: contain`, preserving their aspect ratio.

Unconfigured sections and buttons are hidden. Missing, `unknown` and `unavailable` values display as `—`.

## Version

Current build: **0.3.0**

This card has been tested with [hass-anycubic](https://github.com/Nino6689/hass-anycubic) by [@Nino6689](https://github.com/Nino6689), but is designed to work with any integration that exposes suitable Home Assistant entities.
