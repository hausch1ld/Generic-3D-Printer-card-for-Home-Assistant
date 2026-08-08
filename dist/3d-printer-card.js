/* 3D Printer Card for Home Assistant
 * Dependency-free Web Component
 */

const CARD_VERSION = "0.5.0";

const TRANSLATIONS = {
  en: {
    general: "General", filaments: "Filaments", title: "Title", subtitle: "Subtitle", design: "Design", normal: "Normal", compact: "Compact", status_entity: "Status entity",
    multi_filament: "Multi-filament system", title_alignment: "Title alignment", left: "Left", center: "Center", right: "Right", background_image: "Background image path", background_color: "Background color",
    upload_image: "Upload or choose image", spool: "Spool", remove_spool: "Remove spool", label: "Label", spool_entity: "Spool entity", static_spool_image: "Static spool image path", add_spool: "Add spool",
    printer: "3D printer", printer_image: "Printer image path", model_entity: "Model image entity", model_image: "Static model image path", model_size: "Model size", small: "Small", medium: "Medium", large: "Large", camera: "Camera", height: "Height in pixels", compact_height_hint: "Compact mode automatically reduces this height by 30%.",
    progress: "Progress bar and information", progress_tab: "Progress", large_tab: "Large buttons", small_tab: "Small buttons", filename: "Filename", progress_entity: "Progress", info: "Info", info_entity: "Entity", add_info: "Add info", remove_info: "Remove info",
    large_bar: "Large button bar", large_hint: "Up to four buttons. The large value is a sensor; the second entity is shown below and opens on click.", large_button: "Large button", remove_button: "Remove button", icon: "Icon", main_value: "Large value (sensor)", main_unit: "Large value unit", secondary_entity: "Small / clickable entity", secondary_label: "Small value label", secondary_unit: "Small value unit", add_button: "Add button",
    small_bar: "Small button bar", small_hint: "Button entities are pressed; switches and lights are toggled. Compact mode places them vertically over the printer image.", small_button: "Small button", action_entity: "Button, switch or light",
    target: "Target", configure_printer: "Configure printer image", toggle_camera: "Toggle printer and camera view", are_you_sure: "Are you sure?"
  },
  de: {
    general: "Allgemein", filaments: "Filamente", title: "Titel", subtitle: "Untertitel", design: "Design", normal: "Normal", compact: "Kompakt", status_entity: "Status-Entität",
    multi_filament: "Multi-Filament-System", title_alignment: "Titelausrichtung", left: "Links", center: "Zentriert", right: "Rechts", background_image: "Pfad zum Hintergrundbild", background_color: "Hintergrundfarbe",
    upload_image: "Bild hochladen oder auswählen", spool: "Spule", remove_spool: "Spule entfernen", label: "Label", spool_entity: "Spulen-Entität", static_spool_image: "Pfad zum statischen Spulenbild", add_spool: "Spule hinzufügen",
    printer: "3D-Drucker", printer_image: "Pfad zum Druckerbild", model_entity: "Model-Entität", model_image: "Pfad zum statischen Modellbild", model_size: "Modellgröße", small: "Klein", medium: "Mittel", large: "Groß", camera: "Kamera", height: "Höhe in Pixeln", compact_height_hint: "Im Kompaktmodus wird diese Höhe automatisch um 30 % reduziert.",
    progress: "Fortschrittsbalken und Infos", progress_tab: "Fortschritt", large_tab: "Große Buttons", small_tab: "Kleine Buttons", filename: "Dateiname", progress_entity: "Fortschritt", info: "Info", info_entity: "Entität", add_info: "Info hinzufügen", remove_info: "Info entfernen",
    large_bar: "Große Buttonleiste", large_hint: "Bis zu vier Buttons. Der große Wert ist ein Sensor; die zweite Entität wird klein angezeigt und öffnet sich beim Anklicken.", large_button: "Großer Button", remove_button: "Button entfernen", icon: "Icon", main_value: "Großer Wert (Sensor)", main_unit: "Einheit großer Wert", secondary_entity: "Kleine / anklickbare Entität", secondary_label: "Label kleiner Wert", secondary_unit: "Einheit kleiner Wert", add_button: "Button hinzufügen",
    small_bar: "Kleine Buttonleiste", small_hint: "Button-Entitäten werden gedrückt, Switches und Lights umgeschaltet. Im Kompaktmodus stehen sie vertikal über dem Druckerbild.", small_button: "Kleiner Button", action_entity: "Button, Switch oder Light",
    target: "Ziel", configure_printer: "Druckerbild konfigurieren", toggle_camera: "Zwischen Drucker und Kamera wechseln", are_you_sure: "Bist du sicher?"
  }
};

class ThreeDPrinterCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("three-d-printer-card-editor");
  }

  static getStubConfig() {
    return {
      name: "3D Printer",
      design: "normal",
      model_size: "small",
      sections: { multi_filament: true, printer: true, progress: true, large_buttons: true, small_buttons: true },
      ace: { label: "", title_alignment: "left", spools: [] },
      large_buttons: [],
      small_buttons: []
    };
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._showCamera = false;
    this._boundClick = (event) => this._onClick(event);
  }

  setConfig(config) {
    if (!config || typeof config !== "object") throw new Error("3d-printer-card: configuration is required");
    this._config = config;
    this._showCamera = config.default_view === "camera";
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this.shadowRoot?.querySelector("ha-card")) this._refreshDynamic();
    else this._render();
  }

  getCardSize() {
    return 8;
  }

  _t(key) {
    const language = (this._hass?.locale?.language || "en").toLowerCase().split("-")[0];
    return (TRANSLATIONS[language] || TRANSLATIONS.en)[key] || TRANSLATIONS.en[key] || key;
  }

  _section(name) {
    return this._config?.sections?.[name] !== false;
  }

  _largeButtons() {
    if (Array.isArray(this._config?.large_buttons)) return this._config.large_buttons.slice(0, 4);
    const metrics = this._config?.metrics || {};
    return ["nozzle", "bed", "fan"].map((key) => metrics[key] ? { ...metrics[key], _legacyKey: key } : null).filter(Boolean);
  }

  _smallButtons() {
    if (Array.isArray(this._config?.small_buttons)) return this._config.small_buttons;
    const defaults = { pause: ["Pause", "mdi:pause"], resume: ["Resume", "mdi:play"], stop: ["Stop", "mdi:stop"], light: ["Light", "mdi:lightbulb"] };
    return Object.entries(this._config?.actions || {}).map(([key, value]) => ({ ...value, _legacyKey: key, label: value.label || defaults[key]?.[0], icon: value.icon || defaults[key]?.[1] }));
  }

  _infos() {
    if (Array.isArray(this._config?.infos)) return this._config.infos.slice(0, 4).map((info) => ({
      label: info.label,
      entity: info.entity
    }));
    const c = this._config || {};
    const labels = c.detail_labels || {};
    const infos = [];
    if (c.layer_current_entity || c.layer_total_entity) infos.push({
      label: labels.layer || (this._hass?.locale?.language?.toLowerCase().startsWith("de") ? "Schicht" : "Layer"),
      entity: c.layer_current_entity,
      secondary_entity: c.layer_total_entity,
      separator: " / "
    });
    if (c.elapsed_time_entity) infos.push({ label: labels.elapsed || (this._hass?.locale?.language?.toLowerCase().startsWith("de") ? "Vergangen" : "Elapsed"), entity: c.elapsed_time_entity, format: "time" });
    if (c.remaining_time_entity) infos.push({ label: labels.remaining || (this._hass?.locale?.language?.toLowerCase().startsWith("de") ? "Verbleibend" : "Remaining"), entity: c.remaining_time_entity, format: "time" });
    if (c.estimated_end_entity || c.total_time_entity) infos.push({ label: labels.estimated_end || (this._hass?.locale?.language?.toLowerCase().startsWith("de") ? "Ende" : "Estimated end"), entity: c.estimated_end_entity || c.total_time_entity, format: "end" });
    return infos.slice(0, 4);
  }

  _infoValue(info) {
    if (info.format === "time") return this._displayTime(info.entity);
    if (info.format === "end") return this._displayEnd(info.entity);
    const primary = this._format(info.entity);
    if (!info.secondary_entity) return primary;
    return `${primary}${this._escape(info.separator || " / ")}${this._format(info.secondary_entity)}`;
  }

  connectedCallback() {
    this.shadowRoot.addEventListener("click", this._boundClick);
    this._render();
  }

  disconnectedCallback() {
    this.shadowRoot.removeEventListener("click", this._boundClick);
  }

  _state(entityId) {
    return entityId && this._hass ? this._hass.states[entityId] : undefined;
  }

  _isMissing(value) {
    return value == null || value === "" || value === "unknown" || value === "unavailable";
  }

  _value(entityId, fallback = "—") {
    const state = this._state(entityId)?.state;
    return this._isMissing(state) ? fallback : state;
  }

  _entityImage(entityId) {
    const state = this._state(entityId);
    if (!state) return "";
    const picture = state.attributes?.entity_picture;
    if (picture) return this._hass?.hassUrl ? this._hass.hassUrl(picture) : picture;
    return /^https?:|^\/|^data:image/.test(state.state || "") ? state.state : "";
  }

  _image(source) {
    if (!source) return "";
    if (typeof source === "object") return this._entityImage(source.entity) || source.url || "";
    if (this._hass?.states?.[source]) return this._entityImage(source);
    return source;
  }

  _escape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  }

  _format(entityId, explicitUnit, fallback = "—") {
    const state = this._state(entityId);
    if (!state || this._isMissing(state.state)) return fallback;
    const configuredUnit = state.attributes?.unit_of_measurement;
    const unit = explicitUnit !== undefined ? explicitUnit : configuredUnit;
    let formattedValue = state.state;
    if (typeof this._hass?.formatEntityState === "function") {
      if (explicitUnit === undefined) {
        const formatted = this._hass.formatEntityState(state);
        formattedValue = configuredUnit && formatted.endsWith(configuredUnit)
          ? formatted.slice(0, -configuredUnit.length).trimEnd()
          : formatted;
      } else {
        const withoutUnit = { ...state, attributes: { ...state.attributes } };
        delete withoutUnit.attributes.unit_of_measurement;
        formattedValue = this._hass.formatEntityState(withoutUnit);
      }
    }
    return `${this._escape(formattedValue)}${unit ? ` <span class="unit">${this._escape(unit)}</span>` : ""}`;
  }

  _displayTime(entityId) {
    const state = this._value(entityId);
    if (state === "—") return state;
    if (/^\d+(\.\d+)?$/.test(state)) {
      const seconds = Math.max(0, Math.round(Number(state)));
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}` : `${minutes}:${String(secs).padStart(2, "0")}`;
    }
    return this._escape(state);
  }

  _metric(cfg, index) {
    if (!cfg) return "";
    const value = this._format(cfg.entity, cfg.unit);
    const secondaryEntity = cfg.secondary_entity || cfg.target_entity;
    const target = secondaryEntity ? this._format(secondaryEntity, cfg.secondary_unit ?? cfg.target_unit ?? cfg.unit) : "";
    const label = String(cfg.label || "").trim();
    const icon = cfg.icon || this._state(cfg.entity)?.attributes?.icon || "mdi:gauge";
    return `<button type="button" class="metric ${label ? "has-label" : ""} ${this._state(cfg.entity) ? "" : "missing"}" data-metric="${index}" ${secondaryEntity ? `data-target-entity="${this._escape(secondaryEntity)}"` : ""}>
      <div class="metric-main"><div class="metric-head"><ha-icon icon="${this._escape(icon)}"></ha-icon>${label ? `<span>${this._escape(label)}</span>` : ""}</div>
      <div class="metric-value">${value}</div></div>
      ${target ? `<div class="target">${this._escape(cfg.secondary_label || cfg.target_label || this._t("target"))} ${target}</div>` : '<div class="target">&nbsp;</div>'}
    </button>`;
  }

  _spools(compact = false) {
    const ace = this._config?.ace;
    if (!ace) return "";
    const spools = (ace.spools || []).slice(0, 5);
    const title = String(ace.label || "").trim();
    const backgroundStyle = compact ? "" : ` style="--ace-color:${this._escape(ace.background_color || "transparent")};${this._image(ace.image) ? `--ace-image:url('${this._escape(this._image(ace.image))}')` : ""}"`;
    return `<section class="ace ${compact ? "ace-compact" : ""}"${backgroundStyle}>
      ${!compact && title ? `<div class="ace-title align-${this._escape(ace.title_alignment || "left")}">${this._escape(title)}</div>` : ""}
      <div class="spools" style="--spool-count:${Math.max(1, spools.length)}">${spools.map((spool, index) => {
        const entityId = spool.entity || spool.image_entity;
        const state = this._state(entityId);
        const image = this._image(entityId) || this._image(spool.image);
        const sensorLabel = !this._isMissing(state?.state) ? state.state : state?.attributes?.friendly_name;
        const label = spool.label || sensorLabel || `${index + 1}`;
        return `<div class="spool ${image ? "" : "empty"}" data-spool="${index}">${image ? `<img src="${this._escape(image)}" alt="${this._escape(label)}">` : `<span>${index + 1}</span>`}<small>${this._escape(label)}</small></div>`;
      }).join("")}</div>
    </section>`;
  }

  _visual() {
    if (this._showCamera && this._config.camera_entity) return '<div class="camera-host" data-camera-host></div>';
    const printer = this._image(this._config.printer_image);
    const model = this._image(this._config.model_image_entity) || this._image(this._config.model_image);
    return `<div class="printer-scene" data-view="printer">
      ${printer ? `<img class="printer-image" src="${this._escape(printer)}" alt="3D printer">` : `<div class="image-placeholder"><ha-icon icon="mdi:printer-3d"></ha-icon><span>${this._escape(this._t("configure_printer"))}</span></div>`}
      ${model ? `<img class="model-image" src="${this._escape(model)}" alt="Print model">` : ""}
    </div>`;
  }

  _button(cfg, index) {
    if (!cfg) return "";
    const state = this._state(cfg.entity);
    const label = cfg.label || state?.attributes?.friendly_name || `${this._t("small_button")} ${index + 1}`;
    const icon = cfg.icon || state?.attributes?.icon || "mdi:gesture-tap-button";
    return `<button class="action" data-small-action="${index}" title="${this._escape(label)}">
      <ha-icon icon="${this._escape(icon)}"></ha-icon><span>${this._escape(label)}</span>
    </button>`;
  }

  _render() {
    if (!this.shadowRoot || !this._config) return;
    // HA supplies a new `hass` object very frequently. Preserve media nodes so
    // images and camera streams are not torn down/reloaded on every state tick.
    const previousVisual = this.shadowRoot.querySelector(".visual");
    const previousAce = this.shadowRoot.querySelector(".ace");
    const previousView = previousVisual?.dataset?.view;
    const c = this._config;
    const progressRaw = Number(this._value(c.progress_entity, 0));
    const progress = Number.isFinite(progressRaw) ? Math.min(100, Math.max(0, progressRaw)) : 0;
    const name = this._value(c.filename_entity, c.name || "3D Printer");
    const status = this._value(c.status_entity, "");
    const infos = this._infos();
    const largeButtons = this._largeButtons();
    const smallButtons = this._smallButtons();
    const compact = c.design === "compact";
    const printerHeight = Math.max(160, Number(c.printer_height) || 360);
    this.shadowRoot.innerHTML = `<style>${ThreeDPrinterCard.styles}</style>
      <ha-card class="${compact ? "compact" : "normal"} model-size-${["medium", "large"].includes(c.model_size) ? c.model_size : "small"}" style="--printer-height:${printerHeight}px;--printer-color:${this._escape(c.printer_background_color || "#101113")}">
        <header><div><h2>${this._escape(c.name || "3D Printer")}</h2>${c.subtitle ? `<p>${this._escape(c.subtitle)}</p>` : ""}</div><span class="status" data-status ${status ? "" : "hidden"}>${this._escape(status)}</span></header>
        ${!compact && this._section("multi_filament") ? this._spools() : ""}
        ${this._section("printer") ? `<div class="visual-wrap"><button class="visual" data-view="${this._showCamera ? "camera" : "printer"}" data-toggle-view aria-label="${this._escape(this._t("toggle_camera"))}">${this._visual()}</button>${compact && this._section("multi_filament") ? this._spools(true) : ""}<div class="visual-actions">${compact && this._section("small_buttons") ? smallButtons.slice(0, 4).map((button, index) => this._button(button, index)).join("") : ""}<button class="view-hint" data-toggle-view type="button" title="${this._escape(this._t("toggle_camera"))}"><ha-icon icon="${this._showCamera ? "mdi:printer-3d" : "mdi:cctv"}"></ha-icon></button></div></div>` : ""}
        ${this._section("progress") ? `<section class="job">
          <div class="job-line"><strong data-filename>${this._escape(name)}</strong><b data-progress-label>${Math.round(progress)}%</b></div>
          <div class="progress" data-progress role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><i style="width:${progress}%"></i></div>
          ${infos.length ? `<div class="details" style="--info-count:${infos.length}">${infos.map((info, index) => `<div><span>${this._escape(info.label || this._state(info.entity)?.attributes?.friendly_name || `${this._t("info")} ${index + 1}`)}</span><strong data-info="${index}">${this._infoValue(info)}</strong></div>`).join("")}</div>` : ""}
        </section>` : ""}
        ${this._section("large_buttons") && largeButtons.length ? `<section class="metrics" style="--button-count:${largeButtons.length}">${largeButtons.map((button, index) => this._metric(button, index)).join("")}</section>` : ""}
        ${!compact && this._section("small_buttons") && smallButtons.length ? `<footer style="--button-count:${smallButtons.length}">${smallButtons.map((button, index) => this._button(button, index)).join("")}</footer>` : ""}
      </ha-card>`;

    const newVisual = this.shadowRoot.querySelector(".visual");
    if (previousVisual && newVisual && previousView === newVisual.dataset.view) newVisual.replaceWith(previousVisual);
    const newAce = this.shadowRoot.querySelector(".ace");
    if (previousAce && newAce && previousAce.classList.contains("ace-compact") === newAce.classList.contains("ace-compact")) newAce.replaceWith(previousAce);
    this._updateMedia();

    if (this._showCamera && c.camera_entity && !this.shadowRoot.querySelector(".camera-host ha-camera-stream")) {
      const host = this.shadowRoot.querySelector("[data-camera-host]");
      const camera = document.createElement("ha-camera-stream");
      camera.hass = this._hass;
      camera.stateObj = this._state(c.camera_entity);
      camera.controls = true;
      camera.muted = true;
      host?.append(camera);
    }
  }

  _refreshDynamic() {
    const c = this._config;
    if (!c || !this._hass) return;
    const setText = (selector, value) => {
      const element = this.shadowRoot.querySelector(selector);
      if (element && element.textContent !== String(value)) element.textContent = value;
    };
    const setHtml = (selector, value) => {
      const element = this.shadowRoot.querySelector(selector);
      if (element && element.innerHTML !== String(value)) element.innerHTML = value;
    };
    const status = this._value(c.status_entity, "");
    const statusElement = this.shadowRoot.querySelector("[data-status]");
    if (statusElement) {
      statusElement.hidden = !status;
      setText("[data-status]", status);
    }
    const progressRaw = Number(this._value(c.progress_entity, 0));
    const progress = Number.isFinite(progressRaw) ? Math.min(100, Math.max(0, progressRaw)) : 0;
    setText("[data-filename]", this._value(c.filename_entity, c.name || "3D Printer"));
    setText("[data-progress-label]", `${Math.round(progress)}%`);
    const progressElement = this.shadowRoot.querySelector("[data-progress]");
    if (progressElement) progressElement.setAttribute("aria-valuenow", progress);
    const progressBar = progressElement?.querySelector("i");
    if (progressBar) progressBar.style.width = `${progress}%`;
    this._infos().forEach((info, index) => setHtml(`[data-info="${index}"]`, this._infoValue(info)));
    this._largeButtons().forEach((cfg, index) => {
      const secondaryEntity = cfg.secondary_entity || cfg.target_entity;
      setHtml(`[data-metric="${index}"] .metric-value`, this._format(cfg.entity, cfg.unit));
      const target = secondaryEntity ? `${this._escape(cfg.secondary_label || cfg.target_label || this._t("target"))} ${this._format(secondaryEntity, cfg.secondary_unit ?? cfg.target_unit ?? cfg.unit)}` : "&nbsp;";
      setHtml(`[data-metric="${index}"] .target`, target);
      this.shadowRoot.querySelector(`[data-metric="${index}"]`)?.classList.toggle("missing", !this._state(cfg.entity));
    });
    this._updateMedia();
    const camera = this.shadowRoot.querySelector("ha-camera-stream");
    if (camera) {
      camera.hass = this._hass;
      camera.stateObj = this._state(c.camera_entity);
    }
  }

  _displayEnd(entityId) {
    const value = this._value(entityId);
    if (value === "—") return value;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime()) && /[-T:]/.test(value)) {
      return this._escape(new Intl.DateTimeFormat(this._hass?.locale?.language || navigator.language, {
        hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit"
      }).format(date));
    }
    return this._escape(value);
  }

  _updateMedia() {
    const c = this._config;
    const visual = this.shadowRoot.querySelector(".visual");
    if (visual) {
      const printer = visual.querySelector(".printer-image");
      const model = visual.querySelector(".model-image");
      const printerSrc = this._image(c.printer_image);
      const modelSrc = this._image(c.model_image_entity) || this._image(c.model_image);
      if (printer && printerSrc && printer.getAttribute("src") !== printerSrc) printer.setAttribute("src", printerSrc);
      if (model && modelSrc && model.getAttribute("src") !== modelSrc) model.setAttribute("src", modelSrc);
    }
    const ace = this.shadowRoot.querySelector(".ace");
    if (!ace || !c.ace) return;
    const aceImage = this._image(c.ace.image);
    ace.style.setProperty("--ace-image", aceImage ? `url('${aceImage.replaceAll("'", "%27")}')` : "none");
    (c.ace.spools || []).slice(0, 5).forEach((spool, index) => {
      const slot = ace.querySelector(`[data-spool="${index}"]`);
      if (!slot) return;
      const entityId = spool.entity || spool.image_entity;
      const state = this._state(entityId);
      const image = this._image(entityId) || this._image(spool.image);
      const label = spool.label || (!this._isMissing(state?.state) ? state.state : state?.attributes?.friendly_name) || `${index + 1}`;
      const img = slot.querySelector("img");
      if (img && image && img.getAttribute("src") !== image) img.setAttribute("src", image);
      slot.querySelector("small").textContent = label;
    });
  }

  async _onClick(event) {
    const toggle = event.target.closest("[data-toggle-view]");
    if (toggle) {
      if (!this._config.camera_entity) return;
      this._showCamera = !this._showCamera;
      this._render();
      return;
    }
    const metric = event.target.closest("[data-target-entity]");
    if (metric) {
      this.dispatchEvent(new CustomEvent("hass-more-info", {
        bubbles: true,
        composed: true,
        detail: { entityId: metric.dataset.targetEntity }
      }));
      return;
    }
    const button = event.target.closest("[data-small-action]");
    if (!button) return;
    const config = this._smallButtons()[Number(button.dataset.smallAction)];
    if (!config) return;
    if (config._legacyKey) {
      await this._runAction(config);
      return;
    }
    const entityId = config.entity;
    const domain = entityId?.split(".")[0];
    if (domain === "button") await this._hass?.callService("button", "press", { entity_id: entityId });
    else if (domain === "switch" || domain === "light") await this._hass?.callService("homeassistant", "toggle", { entity_id: entityId });
  }

  async _runAction(config) {
    const action = config.tap_action || config;
    if (action.confirmation) {
      const text = typeof action.confirmation === "object" ? action.confirmation.text : this._t("are_you_sure");
      if (!window.confirm(text || this._t("are_you_sure"))) return;
    }
    const type = action.action || (action.service ? "call-service" : "none");
    if (type === "none") return;
    if (type === "toggle") {
      const entityId = action.entity || config.entity;
      if (entityId) await this._hass.callService("homeassistant", "toggle", { entity_id: entityId });
      return;
    }
    if (type === "more-info") {
      const entityId = action.entity || config.entity;
      if (entityId) this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId } }));
      return;
    }
    if (type === "navigate" && action.navigation_path) {
      history.pushState(null, "", action.navigation_path);
      window.dispatchEvent(new Event("location-changed"));
      return;
    }
    if (type === "url" && action.url_path) {
      window.open(action.url_path, action.new_tab === false ? "_self" : "_blank", "noopener");
      return;
    }
    if (type === "call-service" || type === "perform-action") {
      const serviceName = action.service || action.perform_action;
      if (!serviceName?.includes(".")) return;
      const [domain, service] = serviceName.split(".", 2);
      const data = { ...(action.service_data || action.data || {}) };
      const target = action.target || (action.entity ? { entity_id: action.entity } : undefined);
      await this._hass.callService(domain, service, data, target);
    }
  }

  static get styles() { return `
    :host { display:block; --accent:var(--primary-color,#03a9f4); color:var(--primary-text-color,#eee); }
    * { box-sizing:border-box; }
    ha-card { overflow:hidden; padding:18px; }
    header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:14px; }
    h2 { font-size:20px; line-height:1.2; margin:0; } header p { color:var(--secondary-text-color); margin:4px 0 0; font-size:13px; }
    .status { background:color-mix(in srgb,var(--accent) 18%,transparent); color:var(--accent); border:1px solid color-mix(in srgb,var(--accent) 35%,transparent); border-radius:999px; padding:5px 10px; font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; }
    .ace { position:relative; min-height:112px; margin:0 0 12px; padding:12px 16px 10px; border-radius:14px; overflow:hidden; background:linear-gradient(145deg,rgba(255,255,255,.09),rgba(255,255,255,.025)),var(--ace-image) center/cover,var(--ace-color); border:1px solid rgba(255,255,255,.08); }
    .ace-title { width:100%; color:var(--secondary-text-color); font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; } .ace-title.align-left{text-align:left}.ace-title.align-center{text-align:center}.ace-title.align-right{text-align:right}
    .spools { display:grid; grid-template-columns:repeat(var(--spool-count),minmax(0,76px)); justify-content:center; gap:10px; max-width:440px; margin:8px auto 0; }
    .spool { min-width:0; text-align:center; } .spool img,.spool>span { display:block; width:58px; height:58px; max-width:100%; margin:auto; border-radius:50%; object-fit:contain; filter:drop-shadow(0 5px 6px rgba(0,0,0,.3)); }
    .spool>span { display:grid; place-items:center; border:5px solid rgba(255,255,255,.16); color:var(--secondary-text-color); }
    .spool small { display:block; overflow:hidden; margin-top:3px; color:var(--secondary-text-color); font-size:10px; text-overflow:ellipsis; white-space:nowrap; }
    .visual-wrap { position:relative; } .visual { position:relative; display:block; width:100%; height:var(--printer-height); max-height:70vh; margin:0; padding:0; overflow:hidden; cursor:pointer; color:inherit; background:radial-gradient(circle at 50% 55%,rgba(255,255,255,.08),transparent 55%),var(--printer-color); border:1px solid rgba(255,255,255,.08); border-radius:16px; }
    .printer-scene,.camera-host,.camera-host ha-camera-stream { display:block; width:100%; height:100%; } .printer-scene { position:relative; }
    .printer-image { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; }
    .model-image { position:absolute; left:50%; top:56%; width:30%; height:30%; object-fit:contain; transform:translate(-50%,-50%); filter:drop-shadow(0 8px 7px rgba(0,0,0,.5)); }
    .model-size-medium .model-image { width:65%; height:65%; }
    .model-size-large .model-image { inset:0; width:100%; height:100%; transform:none; }
    .image-placeholder { display:grid; place-content:center; height:100%; gap:8px; color:var(--secondary-text-color); } .image-placeholder ha-icon { width:52px;height:52px;margin:auto; }
    .visual-actions { position:absolute; right:10px; bottom:10px; left:10px; display:flex; justify-content:flex-end; align-items:center; gap:7px; pointer-events:none; } .visual-actions>*{pointer-events:auto}.view-hint { display:grid; flex:0 0 42px; width:42px; height:42px; padding:0; color:inherit; place-items:center; cursor:pointer; border:1px solid rgba(255,255,255,.12); border-radius:12px; background:rgba(0,0,0,.62); backdrop-filter:blur(8px); }
    .job { padding:18px 2px 14px; } .job-line { display:flex; justify-content:space-between; gap:12px; margin-bottom:9px; } .job-line strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .job-line b { color:var(--accent); }
    .progress { height:8px; overflow:hidden; background:rgba(255,255,255,.1); border-radius:999px; } .progress i { display:block; height:100%; background:linear-gradient(90deg,var(--accent),color-mix(in srgb,var(--accent) 65%,white)); border-radius:inherit; transition:width .35s ease; }
    .details { display:grid; grid-template-columns:repeat(var(--info-count),minmax(0,1fr)); justify-content:center; gap:10px; max-width:calc(var(--info-count) * 25%); margin:14px auto 0; text-align:center; } .details div { min-width:0; } .details span,.target { display:block; overflow:hidden; color:var(--secondary-text-color); font-size:10px; text-overflow:ellipsis; text-transform:uppercase; white-space:nowrap; } .details strong { display:block; margin-top:3px; font-size:13px; }
    .metrics { display:grid; grid-template-columns:repeat(var(--button-count),1fr); gap:8px; padding:14px 0; border-top:1px solid rgba(255,255,255,.08); }
    .metric { min-width:0; padding:11px; text-align:center; color:inherit; font:inherit; background:rgba(127,127,127,.09); border:1px solid transparent; border-radius:12px; } .metric[data-target-entity] { cursor:pointer; } .metric[data-target-entity]:hover { background:color-mix(in srgb,var(--accent) 12%,rgba(127,127,127,.09)); border-color:color-mix(in srgb,var(--accent) 25%,transparent); } .metric-main{display:block}.metric-head { display:flex; min-height:18px; align-items:center; justify-content:center; gap:5px; color:var(--secondary-text-color); font-size:11px; } .normal .metric.has-label .metric-head ha-icon{display:none}.metric-head ha-icon { width:19px;height:19px; } .metric-value { margin:6px 0 3px; font-size:20px; font-weight:700; } .unit { font-size:.65em;color:var(--secondary-text-color); } .target { text-transform:none; } .missing { opacity:.65; }
    footer { display:grid; grid-template-columns:repeat(var(--button-count),1fr); gap:8px; padding-top:3px; } .action { display:flex; min-width:0; min-height:48px; flex-direction:column; align-items:center; justify-content:center; gap:3px; cursor:pointer; color:var(--primary-text-color); background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.06); border-radius:12px; } .action:hover { background:color-mix(in srgb,var(--accent) 16%,rgba(255,255,255,.06)); } .action ha-icon { width:21px;height:21px; } .action span { overflow:hidden; max-width:100%; font-size:10px; text-overflow:ellipsis; }
    .compact .visual{height:calc(var(--printer-height) * .7)}.compact .ace-compact{position:absolute;z-index:2;top:50%;left:10px;width:48px;min-height:0;margin:0;padding:0;overflow:visible;transform:translateY(-50%);background:none;border:0}.compact .ace-compact .spools{display:flex;max-width:none;margin:0;flex-direction:column;gap:6px}.compact .ace-compact .spool{display:grid;width:48px;min-height:42px;padding:6px 2px 3px;place-items:center;border:1px solid rgba(255,255,255,.08);border-radius:10px;background:rgba(0,0,0,.62);backdrop-filter:blur(8px)}.compact .ace-compact .spool img,.compact .ace-compact .spool>span{width:25px;height:25px}.compact .ace-compact .spool small{max-width:43px;margin-top:1px;color:#ddd;font-size:7px}.compact .visual-actions{top:50%;right:10px;bottom:auto;left:auto;flex-direction:column;justify-content:center;gap:6px;transform:translateY(-50%)}.compact .visual-actions .action,.compact .view-hint{flex:0 0 42px;width:42px;min-width:42px;min-height:42px;height:42px;padding:0;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(0,0,0,.62);backdrop-filter:blur(8px)}.compact .visual-actions .action ha-icon,.compact .view-hint ha-icon{width:21px;height:21px}.compact .visual-actions .action span{display:none}.compact .metric{padding:8px 10px}.compact .metric-main{display:flex;align-items:center;justify-content:center;gap:10px}.compact .metric-head span{display:none}.compact .metric-head ha-icon{display:block;width:22px;height:22px}.compact .metric-value{margin:0;font-size:20px}.compact .target{margin-top:4px}
    @media(max-width:460px){ ha-card{padding:13px}.spools{gap:5px;grid-template-columns:repeat(var(--spool-count),minmax(0,54px))}.normal .spool img,.normal .spool>span{width:48px;height:48px}.metric{padding:9px 5px}.metric-value{font-size:17px}.metrics{grid-template-columns:repeat(2,1fr)} }
  `; }
}

class ThreeDPrinterCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._activeTab = "general";
    this._onChange = (event) => this._handleChange(event);
    this._onValueChanged = (event) => this._handleSelector(event);
    this._onClick = (event) => this._handleClick(event);
  }

  setConfig(config) {
    const incoming = JSON.parse(JSON.stringify(config || {}));
    if (this._config && JSON.stringify(incoming) === JSON.stringify(this._config)) return;
    this._config = incoming;
    if (!Array.isArray(this._config.large_buttons) && this._config.metrics) {
      this._config.large_buttons = ["nozzle", "bed", "fan"].map((key) => this._config.metrics[key]).filter(Boolean).map((item) => ({
        label: item.label, icon: item.icon, entity: item.entity, unit: item.unit,
        secondary_entity: item.target_entity, secondary_label: item.target_label, secondary_unit: item.target_unit
      }));
    }
    if (!Array.isArray(this._config.small_buttons) && this._config.actions) {
      this._config.small_buttons = Object.values(this._config.actions).map((item) => {
        const action = item.tap_action || item;
        const targetEntity = action.entity || action.target?.entity_id;
        return { label: item.label, icon: item.icon, entity: Array.isArray(targetEntity) ? targetEntity[0] : targetEntity };
      }).filter((item) => item.entity);
    }
    if (!Array.isArray(this._config.infos)) {
      const labels = this._config.detail_labels || {};
      const infos = [];
      if (this._config.layer_current_entity) infos.push({ label: labels.layer || "Layer", entity: this._config.layer_current_entity });
      if (this._config.elapsed_time_entity) infos.push({ label: labels.elapsed || "Elapsed", entity: this._config.elapsed_time_entity });
      if (this._config.remaining_time_entity) infos.push({ label: labels.remaining || "Remaining", entity: this._config.remaining_time_entity });
      if (this._config.estimated_end_entity || this._config.total_time_entity) infos.push({ label: labels.estimated_end || "Estimated end", entity: this._config.estimated_end_entity || this._config.total_time_entity });
      if (infos.length) this._config.infos = infos.slice(0, 4);
    }
    if (Array.isArray(this._config.infos)) this._config.infos = this._config.infos.slice(0, 4).map((info) => ({ label: info.label, entity: info.entity }));
    this._render();
  }

  set hass(hass) {
    const oldLanguage = this._hass?.locale?.language;
    this._hass = hass;
    if (this._config && oldLanguage !== hass?.locale?.language) this._render();
    else this.shadowRoot?.querySelectorAll("ha-selector").forEach((selector) => { selector.hass = hass; });
  }

  connectedCallback() {
    this.shadowRoot.addEventListener("change", this._onChange);
    this.shadowRoot.addEventListener("value-changed", this._onValueChanged);
    this.shadowRoot.addEventListener("click", this._onClick);
    this._render();
  }

  disconnectedCallback() {
    this.shadowRoot.removeEventListener("change", this._onChange);
    this.shadowRoot.removeEventListener("value-changed", this._onValueChanged);
    this.shadowRoot.removeEventListener("click", this._onClick);
  }

  _escape(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  }

  _t(key) {
    const language = (this._hass?.locale?.language || "en").toLowerCase().split("-")[0];
    return (TRANSLATIONS[language] || TRANSLATIONS.en)[key] || TRANSLATIONS.en[key] || key;
  }

  _get(path, fallback = "") {
    let value = this._config;
    for (const key of path) value = value?.[key];
    return value ?? fallback;
  }

  _set(path, value) {
    const next = JSON.parse(JSON.stringify(this._config || {}));
    let target = next;
    path.slice(0, -1).forEach((key, index) => {
      const following = path[index + 1];
      if (target[key] == null) target[key] = typeof following === "number" ? [] : {};
      target = target[key];
    });
    if (value === "" || value == null) delete target[path.at(-1)];
    else target[path.at(-1)] = value;
    this._config = next;
    this.dispatchEvent(new CustomEvent("config-changed", { bubbles: true, composed: true, detail: { config: next } }));
  }

  _path(path) {
    return this._escape(JSON.stringify(path));
  }

  _input(label, path, type = "text", options = "") {
    const value = this._get(path);
    return `<label><span>${label}</span><input type="${type}" data-path="${this._path(path)}" value="${this._escape(value)}" ${options}></label>`;
  }

  _selector(label, path, selector) {
    return `<label class="selector"><span>${label}</span><ha-selector data-path="${this._path(path)}" data-selector="${this._escape(JSON.stringify(selector))}"></ha-selector></label>`;
  }

  _imageField(label, path) {
    return `<div class="image-field">${this._input(label, path)}${this._selector(this._t("upload_image"), path, { media: { accept: ["image/*"], clearable: true, image_upload: true, hide_content_type: true } }).replace("<ha-selector ", "<ha-selector data-image-selector=\"true\" ")}</div>`;
  }

  _toggle(name, title) {
    const enabled = this._get(["sections", name], true) !== false;
    return `<label class="toggle"><span>${title}</span><input type="checkbox" data-path="${this._path(["sections", name])}" ${enabled ? "checked" : ""}></label>`;
  }

  _spoolEditor(spool, index) {
    return `<div class="item"><div class="item-head"><b>${this._t("spool")} ${index + 1}</b><button type="button" class="remove" data-remove-spool="${index}" title="${this._t("remove_spool")}"><ha-icon icon="mdi:minus"></ha-icon></button></div><div class="grid">
      ${this._input(this._t("label"), ["ace", "spools", index, "label"])}
      ${this._selector(this._t("spool_entity"), ["ace", "spools", index, "entity"], { entity: {} })}
      ${this._imageField(this._t("static_spool_image"), ["ace", "spools", index, "image"])}
    </div></div>`;
  }

  _largeButtonEditor(button, index) {
    return `<div class="item"><div class="item-head"><b>${this._t("large_button")} ${index + 1}</b><button type="button" class="remove" data-remove-large="${index}" title="${this._t("remove_button")}"><ha-icon icon="mdi:minus"></ha-icon></button></div><div class="grid">
      ${this._input(this._t("label"), ["large_buttons", index, "label"])}
      ${this._selector(this._t("icon"), ["large_buttons", index, "icon"], { icon: {} })}
      ${this._selector(this._t("main_value"), ["large_buttons", index, "entity"], { entity: { domain: "sensor" } })}
      ${this._input(this._t("main_unit"), ["large_buttons", index, "unit"])}
      ${this._selector(this._t("secondary_entity"), ["large_buttons", index, "secondary_entity"], { entity: {} })}
      ${this._input(this._t("secondary_label"), ["large_buttons", index, "secondary_label"])}
      ${this._input(this._t("secondary_unit"), ["large_buttons", index, "secondary_unit"])}
    </div></div>`;
  }

  _smallButtonEditor(button, index) {
    return `<div class="item"><div class="item-head"><b>${this._t("small_button")} ${index + 1}</b><button type="button" class="remove" data-remove-small="${index}" title="${this._t("remove_button")}"><ha-icon icon="mdi:minus"></ha-icon></button></div><div class="grid">
      ${this._input(this._t("label"), ["small_buttons", index, "label"])}
      ${this._selector(this._t("icon"), ["small_buttons", index, "icon"], { icon: {} })}
      ${this._selector(this._t("action_entity"), ["small_buttons", index, "entity"], { entity: { domain: ["button", "switch", "light"] } })}
    </div></div>`;
  }

  _infoEditor(info, index) {
    return `<div class="item"><div class="item-head"><b>${this._t("info")} ${index + 1}</b><button type="button" class="remove" data-remove-info="${index}" title="${this._t("remove_info")}"><ha-icon icon="mdi:minus"></ha-icon></button></div><div class="grid">
      ${this._input(this._t("label"), ["infos", index, "label"])}
      ${this._selector(this._t("info_entity"), ["infos", index, "entity"], { entity: {} })}
    </div></div>`;
  }

  _render() {
    if (!this.shadowRoot || !this._config) return;
    const scrollPositions = [];
    for (let node = this; node; ) {
      if (node.scrollTop) scrollPositions.push([node, node.scrollTop]);
      const root = node.getRootNode?.();
      node = node.parentElement || root?.host;
    }
    const ace = this._config.ace || {};
    const spools = (ace.spools || []).slice(0, 5);
    const infos = Array.isArray(this._config.infos) ? this._config.infos.slice(0, 4) : [];
    const largeButtons = Array.isArray(this._config.large_buttons) ? this._config.large_buttons.slice(0, 4) : [];
    const smallButtons = Array.isArray(this._config.small_buttons) ? this._config.small_buttons : [];
    const tabs = [
      ["general", this._t("general")], ["filaments", this._t("filaments")], ["printer", this._t("printer")],
      ["progress", this._t("progress_tab")], ["large", this._t("large_tab")], ["small", this._t("small_tab")]
    ];
    const tab = tabs.some(([key]) => key === this._activeTab) ? this._activeTab : "general";
    let content = "";
    if (tab === "general") content = `<section class="panel"><h3>${this._t("general")}</h3><div class="grid">${this._input(this._t("title"), ["name"])}${this._input(this._t("subtitle"), ["subtitle"])}<label><span>${this._t("design")}</span><select data-path="${this._path(["design"])}"><option value="normal" ${this._get(["design"], "normal") === "normal" ? "selected" : ""}>${this._t("normal")}</option><option value="compact" ${this._get(["design"]) === "compact" ? "selected" : ""}>${this._t("compact")}</option></select></label>${this._selector(this._t("status_entity"), ["status_entity"], { entity: {} })}</div></section>`;
    else if (tab === "filaments") content = `<section class="panel">${this._toggle("multi_filament", this._t("multi_filament"))}<div class="grid">${this._input(this._t("title"), ["ace", "label"])}<label><span>${this._t("title_alignment")}</span><select data-path="${this._path(["ace", "title_alignment"])}"><option value="left" ${ace.title_alignment !== "center" && ace.title_alignment !== "right" ? "selected" : ""}>${this._t("left")}</option><option value="center" ${ace.title_alignment === "center" ? "selected" : ""}>${this._t("center")}</option><option value="right" ${ace.title_alignment === "right" ? "selected" : ""}>${this._t("right")}</option></select></label>${this._imageField(this._t("background_image"), ["ace", "image"])}${this._input(this._t("background_color"), ["ace", "background_color"], "color")}</div>${spools.map((spool, index) => this._spoolEditor(spool, index)).join("")}${spools.length < 5 ? `<button type="button" class="add" data-add-spool><ha-icon icon="mdi:plus"></ha-icon>${this._t("add_spool")}</button>` : ""}</section>`;
    else if (tab === "printer") content = `<section class="panel">${this._toggle("printer", this._t("printer"))}<div class="grid">${this._imageField(this._t("printer_image"), ["printer_image"])}${this._input(this._t("background_color"), ["printer_background_color"], "color")}${this._selector(this._t("model_entity"), ["model_image_entity"], { entity: { domain: "image" } })}${this._imageField(this._t("model_image"), ["model_image"])}<label><span>${this._t("model_size")}</span><select data-path="${this._path(["model_size"])}"><option value="small" ${!["medium", "large"].includes(this._get(["model_size"])) ? "selected" : ""}>${this._t("small")}</option><option value="medium" ${this._get(["model_size"]) === "medium" ? "selected" : ""}>${this._t("medium")}</option><option value="large" ${this._get(["model_size"]) === "large" ? "selected" : ""}>${this._t("large")}</option></select></label>${this._selector(this._t("camera"), ["camera_entity"], { entity: { domain: "camera" } })}${this._input(this._t("height"), ["printer_height"], "number", 'min="160" max="900" step="10"')}</div><p class="hint">${this._t("compact_height_hint")}</p></section>`;
    else if (tab === "progress") content = `<section class="panel">${this._toggle("progress", this._t("progress"))}<div class="grid">${this._selector(this._t("filename"), ["filename_entity"], { entity: {} })}${this._selector(this._t("progress_entity"), ["progress_entity"], { entity: {} })}</div>${infos.map((info, index) => this._infoEditor(info, index)).join("")}${infos.length < 4 ? `<button type="button" class="add" data-add-info><ha-icon icon="mdi:plus"></ha-icon>${this._t("add_info")}</button>` : ""}</section>`;
    else if (tab === "large") content = `<section class="panel">${this._toggle("large_buttons", this._t("large_bar"))}<p class="hint">${this._t("large_hint")}</p>${largeButtons.map((button, index) => this._largeButtonEditor(button, index)).join("")}${largeButtons.length < 4 ? `<button type="button" class="add" data-add-large><ha-icon icon="mdi:plus"></ha-icon>${this._t("add_button")}</button>` : ""}</section>`;
    else content = `<section class="panel">${this._toggle("small_buttons", this._t("small_bar"))}<p class="hint">${this._t("small_hint")}</p>${smallButtons.map((button, index) => this._smallButtonEditor(button, index)).join("")}<button type="button" class="add" data-add-small><ha-icon icon="mdi:plus"></ha-icon>${this._t("add_button")}</button></section>`;
    this.shadowRoot.innerHTML = `<style>
      :host{display:block;max-width:100%;container-type:inline-size;color:var(--primary-text-color);font-family:var(--paper-font-body1_-_font-family,inherit)}*{box-sizing:border-box;min-width:0}.editor{display:grid;max-width:100%;gap:12px;padding:4px 0 16px;overflow:hidden}.tabs{display:flex;max-width:100%;gap:3px;overflow-x:auto;border-bottom:1px solid var(--divider-color);scrollbar-width:thin}.tab{flex:0 0 auto;padding:10px 12px;color:var(--secondary-text-color);font:inherit;font-size:12px;font-weight:600;cursor:pointer;background:none;border:0;border-bottom:2px solid transparent}.tab[aria-selected="true"]{color:var(--primary-color);border-bottom-color:var(--primary-color)}.panel{max-width:100%;padding:12px;border:1px solid var(--divider-color);border-radius:12px;background:var(--card-background-color)}.panel>h3{margin:0 0 12px;font-size:16px}.toggle{display:flex;align-items:center;justify-content:space-between;font-weight:700}.toggle input{width:20px;height:20px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px}label:not(.toggle),.selector,.image-field{display:grid;max-width:100%;align-content:start;gap:6px;min-width:0}label>span{overflow:hidden;color:var(--secondary-text-color);font-size:12px;text-overflow:ellipsis;white-space:nowrap}ha-selector{display:block;width:100%;max-width:100%;min-width:0;overflow:hidden}input,select{width:100%;max-width:100%;min-height:42px;padding:8px 10px;color:var(--primary-text-color);background:transparent;border:1px solid var(--divider-color);border-radius:8px;font:inherit}.image-field{grid-column:1/-1;padding:8px;border:1px solid var(--divider-color);border-radius:8px}.item{max-width:100%;margin-top:12px;padding:10px;overflow:hidden;border:1px solid var(--divider-color);border-radius:10px}.item-head{display:flex;align-items:center;justify-content:space-between}.remove,.add{display:inline-grid;place-items:center;min-width:36px;height:36px;padding:0 10px;color:var(--primary-text-color);cursor:pointer;background:var(--secondary-background-color);border:0;border-radius:8px}.add{display:flex;gap:6px;margin-top:12px}.remove ha-icon,.add ha-icon{width:20px;height:20px}.hint{margin:8px 0 0;color:var(--secondary-text-color);font-size:12px;line-height:1.4}@container(max-width:560px){.grid{grid-template-columns:1fr}}@media(max-width:700px){.grid{grid-template-columns:1fr}}
    </style><div class="editor"><nav class="tabs" role="tablist">${tabs.map(([key, label]) => `<button type="button" class="tab" role="tab" data-editor-tab="${key}" aria-selected="${tab === key}">${label}</button>`).join("")}</nav>${content}</div>`;
    this.shadowRoot.querySelectorAll("ha-selector").forEach((element) => {
      const path = JSON.parse(element.dataset.path);
      element.hass = this._hass;
      element.selector = JSON.parse(element.dataset.selector);
      element.value = element.hasAttribute("data-image-selector") ? undefined : this._get(path, undefined);
    });
    const restoreScroll = () => scrollPositions.forEach(([node, top]) => { node.scrollTop = top; });
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(restoreScroll);
    else restoreScroll();
  }

  _handleChange(event) {
    const field = event.target.closest("[data-path]");
    if (!field || field.localName === "ha-selector") return;
    const path = JSON.parse(field.dataset.path);
    const value = field.type === "checkbox" ? field.checked : field.type === "number" ? (field.value === "" ? "" : Number(field.value)) : field.value;
    this._set(path, value);
  }

  _handleSelector(event) {
    const field = event.target.closest("ha-selector[data-path]");
    if (!field) return;
    event.stopPropagation();
    const path = JSON.parse(field.dataset.path);
    if (field.hasAttribute("data-image-selector")) {
      const value = event.detail?.value;
      const mediaId = value?.media_content_id || "";
      let imagePath = value?.metadata?.thumbnail || mediaId;
      const uploadPrefix = "media-source://image_upload/";
      if (mediaId.startsWith(uploadPrefix)) imagePath = `/api/image/serve/${mediaId.slice(uploadPrefix.length)}/original`;
      this._set(path, imagePath);
      const pathKey = JSON.stringify(path);
      const textField = [...this.shadowRoot.querySelectorAll("input[data-path]")].find((input) => input.dataset.path === pathKey);
      if (textField) textField.value = imagePath || "";
      return;
    }
    this._set(path, event.detail?.value);
  }

  _handleClick(event) {
    const action = event.target.closest("button");
    if (!action) return;
    if (action.dataset.editorTab) {
      this._activeTab = action.dataset.editorTab;
      this._render();
      return;
    }
    const next = JSON.parse(JSON.stringify(this._config || {}));
    if (action.hasAttribute("data-add-spool")) {
      next.ace ||= {}; next.ace.spools ||= []; if (next.ace.spools.length < 5) next.ace.spools.push({});
    } else if (action.dataset.removeSpool !== undefined) next.ace.spools.splice(Number(action.dataset.removeSpool), 1);
    else if (action.hasAttribute("data-add-info")) { next.infos ||= []; if (next.infos.length < 4) next.infos.push({}); }
    else if (action.dataset.removeInfo !== undefined) next.infos.splice(Number(action.dataset.removeInfo), 1);
    else if (action.hasAttribute("data-add-large")) { next.large_buttons ||= []; if (next.large_buttons.length < 4) next.large_buttons.push({ icon: "mdi:gauge" }); }
    else if (action.dataset.removeLarge !== undefined) next.large_buttons.splice(Number(action.dataset.removeLarge), 1);
    else if (action.hasAttribute("data-add-small")) { next.small_buttons ||= []; next.small_buttons.push({ icon: "mdi:gesture-tap-button" }); }
    else if (action.dataset.removeSmall !== undefined) next.small_buttons.splice(Number(action.dataset.removeSmall), 1);
    else return;
    this._config = next;
    this.dispatchEvent(new CustomEvent("config-changed", { bubbles: true, composed: true, detail: { config: next } }));
    this._render();
  }
}

// Custom element names must begin with an ASCII letter. `3d-printer-card`
// would make customElements.define() throw "The string contains invalid characters".
if (!customElements.get("three-d-printer-card")) customElements.define("three-d-printer-card", ThreeDPrinterCard);
if (!customElements.get("three-d-printer-card-editor")) customElements.define("three-d-printer-card-editor", ThreeDPrinterCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({ type: "three-d-printer-card", name: "3D Printer Card", description: "Generic 3D printer dashboard with camera, ACE/AMS and controls", preview: true });
console.info(`%c 3D-PRINTER-CARD %c v${CARD_VERSION} `, "color:white;background:#03a9f4;font-weight:bold", "color:#03a9f4;background:#222");
