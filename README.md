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
- ACE/AMS area with up to four freely configurable spool images
- Filename, progress, layers, elapsed time, remaining time and estimated end
- Nozzle, bed and fan fields with optional target entities and units
- Clickable metric fields that open the target entity's Home Assistant dialog
- Configurable Pause, Resume, Stop and Light actions
- Optional confirmation before stopping a print
- Stable display for missing, `unknown` and `unavailable` entities
- Responsive, dark Home Assistant-compatible design

## Installation with HACS

This repository can be installed as a HACS custom repository:

1. Open **HACS** in Home Assistant.
2. Open the three-dot menu in the top-right corner and choose **Custom repositories**.
3. Enter:
   `https://github.com/hausch1ld/Generic-3D-Printer-card-for-Home-Assistant`
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

Tapping the printer/model area switches to the live camera and back. Without `camera_entity`, the view remains unchanged.

### ACE/AMS and images

`ace.spools` supports up to four entries. Set `entity` to a sensor whose state is the filament label and whose `entity_picture` attribute contains the spool image. An explicit `label` overrides the state. The older `image_entity` option remains supported. `ace.image` optionally adds an ACE/AMS background image.

Transparent model images work best for the model overlay. Printer and ACE images are not bundled, so you can use assets matching your own hardware.

### Metrics

Configure `metrics.nozzle`, `metrics.bed` and `metrics.fan` with:

- `entity`
- optional `target_entity`
- optional `label`, `icon` and `unit`
- optional `target_label` and `target_unit`

Without an explicit unit, the entity's `unit_of_measurement` is used. If `target_entity` is set, clicking the metric opens that entity's Home Assistant more-info dialog.

### Actions

Under `actions.pause`, `resume`, `stop` and `light`, configure `label`, `icon` and `tap_action`. Supported action types are `perform-action`, `call-service`, `toggle`, `more-info`, `navigate`, `url` and `none`.

Add a confirmation to safety-critical actions:

```yaml
confirmation:
  text: Really stop the print?
```

Unconfigured sections and buttons are hidden. Missing, `unknown` and `unavailable` values display as `—`.

## Version

Current build: **0.2.2**

This card has been tested with [hass-anycubic](https://github.com/Nino6689/hass-anycubic) by [@Nino6689](https://github.com/Nino6689), but is designed to work with any integration that exposes suitable Home Assistant entities.
