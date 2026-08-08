/* 3D Printer Card for Home Assistant
 * Dependency-free Web Component
 */

const CARD_VERSION = "0.3.0";

class ThreeDPrinterCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("three-d-printer-card-editor");
  }

  static getStubConfig() {
    return {
      name: "3D Printer",
      design: "normal",
      sections: { multi_filament: true, printer: true, progress: true, large_buttons: true, small_buttons: true },
      ace: { label: "ACE / AMS", title_alignment: "left", spools: [] },
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
    const unit = explicitUnit !== undefined ? explicitUnit : state.attributes?.unit_of_measurement;
    return `${this._escape(state.state)}${unit ? ` <span class="unit">${this._escape(unit)}</span>` : ""}`;
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
    return `<button type="button" class="metric ${this._state(cfg.entity) ? "" : "missing"}" data-metric="${index}" ${secondaryEntity ? `data-target-entity="${this._escape(secondaryEntity)}"` : ""}>
      <div class="metric-head"><ha-icon icon="${this._escape(cfg.icon || "mdi:gauge")}"></ha-icon><span>${this._escape(cfg.label || this._state(cfg.entity)?.attributes?.friendly_name || `Button ${index + 1}`)}</span></div>
      <div class="metric-value">${value}</div>
      ${target ? `<div class="target">${this._escape(cfg.secondary_label || cfg.target_label || "Target")} ${target}</div>` : '<div class="target">&nbsp;</div>'}
    </button>`;
  }

  _spools() {
    const ace = this._config?.ace;
    if (!ace) return "";
    const spools = (ace.spools || []).slice(0, 5);
    return `<section class="ace" style="--ace-color:${this._escape(ace.background_color || "transparent")};${this._image(ace.image) ? `--ace-image:url('${this._escape(this._image(ace.image))}')` : ""}">
      <div class="ace-title align-${this._escape(ace.title_alignment || "left")}">${this._escape(ace.label || "ACE / AMS")}</div>
      <div class="spools" style="--spool-count:${Math.max(1, spools.length)}">${spools.map((spool, index) => {
        const entityId = spool.entity || spool.image_entity;
        const state = this._state(entityId);
        const image = this._image(entityId || spool.image);
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
      ${printer ? `<img class="printer-image" src="${this._escape(printer)}" alt="3D printer">` : '<div class="image-placeholder"><ha-icon icon="mdi:printer-3d"></ha-icon><span>Configure printer_image</span></div>'}
      ${model ? `<img class="model-image" src="${this._escape(model)}" alt="Print model">` : ""}
    </div>`;
  }

  _button(cfg, index) {
    if (!cfg) return "";
    const state = this._state(cfg.entity);
    const label = cfg.label || state?.attributes?.friendly_name || `Button ${index + 1}`;
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
    const currentLayer = this._value(c.layer_current_entity);
    const totalLayer = this._value(c.layer_total_entity);
    const labels = c.detail_labels || {};
    const largeButtons = this._largeButtons();
    const smallButtons = this._smallButtons();
    const compact = c.design === "compact";
    const printerHeight = Math.max(160, Number(c.printer_height) || 360);
    this.shadowRoot.innerHTML = `<style>${ThreeDPrinterCard.styles}</style>
      <ha-card class="${compact ? "compact" : "normal"}" style="--printer-height:${printerHeight}px;--printer-color:${this._escape(c.printer_background_color || "#101113")}">
        <header><div><h2>${this._escape(c.name || "3D Printer")}</h2>${c.subtitle ? `<p>${this._escape(c.subtitle)}</p>` : ""}</div><span class="status" data-status ${status ? "" : "hidden"}>${this._escape(status)}</span></header>
        ${this._section("multi_filament") ? this._spools() : ""}
        ${this._section("printer") ? `<div class="visual-wrap"><button class="visual" data-view="${this._showCamera ? "camera" : "printer"}" data-toggle-view aria-label="Toggle printer and camera view">${this._visual()}</button><div class="visual-actions">${compact && this._section("small_buttons") ? smallButtons.map((button, index) => this._button(button, index)).join("") : ""}<button class="view-hint" data-toggle-view type="button" title="Toggle camera"><ha-icon icon="${this._showCamera ? "mdi:printer-3d" : "mdi:cctv"}"></ha-icon></button></div></div>` : ""}
        ${this._section("progress") ? `<section class="job">
          <div class="job-line"><strong data-filename>${this._escape(name)}</strong><b data-progress-label>${Math.round(progress)}%</b></div>
          <div class="progress" data-progress role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><i style="width:${progress}%"></i></div>
          <div class="details">
            <div><span>${this._escape(labels.layer || "Layer")}</span><strong data-layers>${this._escape(currentLayer)} / ${this._escape(totalLayer)}</strong></div>
            <div><span>${this._escape(labels.elapsed || "Elapsed")}</span><strong data-elapsed>${this._displayTime(c.elapsed_time_entity)}</strong></div>
            <div><span>${this._escape(labels.remaining || "Remaining")}</span><strong data-remaining>${this._displayTime(c.remaining_time_entity)}</strong></div>
            <div><span>${this._escape(labels.estimated_end || "Voraussichtliches Ende")}</span><strong data-estimated-end>${this._displayEnd(c.estimated_end_entity || c.total_time_entity)}</strong></div>
          </div>
        </section>` : ""}
        ${this._section("large_buttons") && largeButtons.length ? `<section class="metrics" style="--button-count:${largeButtons.length}">${largeButtons.map((button, index) => this._metric(button, index)).join("")}</section>` : ""}
        ${!compact && this._section("small_buttons") && smallButtons.length ? `<footer style="--button-count:${smallButtons.length}">${smallButtons.map((button, index) => this._button(button, index)).join("")}</footer>` : ""}
      </ha-card>`;

    const newVisual = this.shadowRoot.querySelector(".visual");
    if (previousVisual && newVisual && previousView === newVisual.dataset.view) newVisual.replaceWith(previousVisual);
    const newAce = this.shadowRoot.querySelector(".ace");
    if (previousAce && newAce) newAce.replaceWith(previousAce);
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
    setText("[data-layers]", `${this._value(c.layer_current_entity)} / ${this._value(c.layer_total_entity)}`);
    setText("[data-elapsed]", this._displayTime(c.elapsed_time_entity));
    setText("[data-remaining]", this._displayTime(c.remaining_time_entity));
    setText("[data-estimated-end]", this._displayEnd(c.estimated_end_entity || c.total_time_entity));
    this._largeButtons().forEach((cfg, index) => {
      const secondaryEntity = cfg.secondary_entity || cfg.target_entity;
      setHtml(`[data-metric="${index}"] .metric-value`, this._format(cfg.entity, cfg.unit));
      const target = secondaryEntity ? `${this._escape(cfg.secondary_label || cfg.target_label || "Target")} ${this._format(secondaryEntity, cfg.secondary_unit ?? cfg.target_unit ?? cfg.unit)}` : "&nbsp;";
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
      const image = this._image(entityId || spool.image);
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
      const text = typeof action.confirmation === "object" ? action.confirmation.text : "Are you sure?";
      if (!window.confirm(text || "Are you sure?")) return;
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
    ha-card { overflow:hidden; padding:18px; background:var(--ha-card-background,var(--card-background-color,#1c1c1e)); }
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
    .image-placeholder { display:grid; place-content:center; height:100%; gap:8px; color:var(--secondary-text-color); } .image-placeholder ha-icon { width:52px;height:52px;margin:auto; }
    .visual-actions { position:absolute; right:10px; bottom:10px; left:10px; display:flex; justify-content:flex-end; align-items:center; gap:7px; pointer-events:none; } .visual-actions>*{pointer-events:auto}.view-hint { display:grid; flex:0 0 38px; width:38px; height:38px; padding:0; color:inherit; place-items:center; cursor:pointer; border:1px solid rgba(255,255,255,.12); border-radius:12px; background:rgba(0,0,0,.58); backdrop-filter:blur(8px); }
    .job { padding:18px 2px 14px; } .job-line { display:flex; justify-content:space-between; gap:12px; margin-bottom:9px; } .job-line strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .job-line b { color:var(--accent); }
    .progress { height:8px; overflow:hidden; background:rgba(255,255,255,.1); border-radius:999px; } .progress i { display:block; height:100%; background:linear-gradient(90deg,var(--accent),color-mix(in srgb,var(--accent) 65%,white)); border-radius:inherit; transition:width .35s ease; }
    .details { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-top:14px; } .details div { min-width:0; } .details span,.target { display:block; color:var(--secondary-text-color); font-size:10px; text-transform:uppercase; } .details strong { display:block; margin-top:3px; font-size:13px; }
    .metrics { display:grid; grid-template-columns:repeat(var(--button-count),1fr); gap:8px; padding:14px 0; border-top:1px solid rgba(255,255,255,.08); }
    .metric { min-width:0; padding:11px; text-align:center; color:inherit; font:inherit; background:rgba(255,255,255,.045); border:1px solid transparent; border-radius:12px; } .metric[data-target-entity] { cursor:pointer; } .metric[data-target-entity]:hover { background:color-mix(in srgb,var(--accent) 12%,rgba(255,255,255,.045)); border-color:color-mix(in srgb,var(--accent) 25%,transparent); } .metric-head { display:flex; align-items:center; justify-content:center; gap:5px; color:var(--secondary-text-color); font-size:11px; } .metric-head ha-icon { width:17px;height:17px; } .metric-value { margin:6px 0 3px; font-size:20px; font-weight:700; } .unit { font-size:.65em;color:var(--secondary-text-color); } .target { text-transform:none; } .missing { opacity:.65; }
    footer { display:grid; grid-template-columns:repeat(var(--button-count),1fr); gap:8px; padding-top:3px; } .action { display:flex; min-width:0; min-height:48px; flex-direction:column; align-items:center; justify-content:center; gap:3px; cursor:pointer; color:var(--primary-text-color); background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.06); border-radius:12px; } .action:hover { background:color-mix(in srgb,var(--accent) 16%,rgba(255,255,255,.06)); } .action ha-icon { width:21px;height:21px; } .action span { overflow:hidden; max-width:100%; font-size:10px; text-overflow:ellipsis; }
    .compact .visual{height:calc(var(--printer-height) * .7)}.compact .ace{min-height:56px;padding:7px 12px 6px}.compact .ace-title{font-size:9px}.compact .spools{margin-top:3px}.compact .spool img,.compact .spool>span{width:30px;height:30px}.compact .spool small{font-size:8px}.compact .visual-actions .action{flex:0 1 62px;min-height:38px;background:rgba(0,0,0,.58);backdrop-filter:blur(8px)}.compact .visual-actions .action ha-icon{width:18px;height:18px}.compact .visual-actions .action span{font-size:8px}
    @media(max-width:460px){ ha-card{padding:13px}.details{grid-template-columns:repeat(2,1fr)}.spools{gap:5px;grid-template-columns:repeat(var(--spool-count),minmax(0,54px))}.spool img,.spool>span{width:48px;height:48px}.metric{padding:9px 5px}.metric-value{font-size:17px}.metrics{grid-template-columns:repeat(2,1fr)} }
  `; }
}

class ThreeDPrinterCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._onChange = (event) => this._handleChange(event);
    this._onValueChanged = (event) => this._handleSelector(event);
    this._onClick = (event) => this._handleClick(event);
  }

  setConfig(config) {
    this._config = JSON.parse(JSON.stringify(config || {}));
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
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this.shadowRoot?.querySelectorAll("ha-selector").forEach((selector) => { selector.hass = hass; });
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

  _toggle(name, title) {
    const enabled = this._get(["sections", name], true) !== false;
    return `<label class="toggle"><span>${title}</span><input type="checkbox" data-path="${this._path(["sections", name])}" ${enabled ? "checked" : ""}></label>`;
  }

  _spoolEditor(spool, index) {
    return `<div class="item"><div class="item-head"><b>Spule ${index + 1}</b><button type="button" class="remove" data-remove-spool="${index}" title="Spule entfernen"><ha-icon icon="mdi:minus"></ha-icon></button></div><div class="grid">
      ${this._input("Beschriftung", ["ace", "spools", index, "label"])}
      ${this._selector("Spulen-Entität", ["ace", "spools", index, "entity"], { entity: {} })}
      ${this._selector("Statisches Spulenbild / Upload", ["ace", "spools", index, "image"], { image: {} })}
    </div></div>`;
  }

  _largeButtonEditor(button, index) {
    return `<div class="item"><div class="item-head"><b>Großer Button ${index + 1}</b><button type="button" class="remove" data-remove-large="${index}" title="Button entfernen"><ha-icon icon="mdi:minus"></ha-icon></button></div><div class="grid">
      ${this._input("Beschriftung", ["large_buttons", index, "label"])}
      ${this._selector("Icon", ["large_buttons", index, "icon"], { icon: {} })}
      ${this._selector("Großer Wert (Sensor)", ["large_buttons", index, "entity"], { entity: { domain: "sensor" } })}
      ${this._input("Einheit großer Wert", ["large_buttons", index, "unit"])}
      ${this._selector("Kleine / anklickbare Entität", ["large_buttons", index, "secondary_entity"], { entity: {} })}
      ${this._input("Beschriftung kleiner Wert", ["large_buttons", index, "secondary_label"])}
      ${this._input("Einheit kleiner Wert", ["large_buttons", index, "secondary_unit"])}
    </div></div>`;
  }

  _smallButtonEditor(button, index) {
    return `<div class="item"><div class="item-head"><b>Kleiner Button ${index + 1}</b><button type="button" class="remove" data-remove-small="${index}" title="Button entfernen"><ha-icon icon="mdi:minus"></ha-icon></button></div><div class="grid">
      ${this._input("Beschriftung", ["small_buttons", index, "label"])}
      ${this._selector("Icon", ["small_buttons", index, "icon"], { icon: {} })}
      ${this._selector("Button, Switch oder Light", ["small_buttons", index, "entity"], { entity: { domain: ["button", "switch", "light"] } })}
    </div></div>`;
  }

  _render() {
    if (!this.shadowRoot || !this._config) return;
    const ace = this._config.ace || {};
    const spools = (ace.spools || []).slice(0, 5);
    const largeButtons = Array.isArray(this._config.large_buttons) ? this._config.large_buttons.slice(0, 4) : [];
    const smallButtons = Array.isArray(this._config.small_buttons) ? this._config.small_buttons : [];
    this.shadowRoot.innerHTML = `<style>
      :host{display:block;color:var(--primary-text-color);font-family:var(--paper-font-body1_-_font-family,inherit)}*{box-sizing:border-box}.editor{display:grid;gap:12px;padding:4px 0 16px}.panel{padding:12px;border:1px solid var(--divider-color);border-radius:12px;background:var(--card-background-color)}.panel>h3{margin:0 0 12px;font-size:16px}.toggle{display:flex;align-items:center;justify-content:space-between;font-weight:700}.toggle input{width:20px;height:20px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px}label:not(.toggle){display:grid;align-content:start;gap:6px;min-width:0}label>span{color:var(--secondary-text-color);font-size:12px}input,select{width:100%;min-height:42px;padding:8px 10px;color:var(--primary-text-color);background:transparent;border:1px solid var(--divider-color);border-radius:8px;font:inherit}.item{margin-top:12px;padding:10px;border:1px solid var(--divider-color);border-radius:10px}.item-head{display:flex;align-items:center;justify-content:space-between}.remove,.add{display:inline-grid;place-items:center;min-width:36px;height:36px;padding:0 10px;color:var(--primary-text-color);cursor:pointer;background:var(--secondary-background-color);border:0;border-radius:8px}.add{display:flex;gap:6px;margin-top:12px}.remove ha-icon,.add ha-icon{width:20px;height:20px}.hint{margin:8px 0 0;color:var(--secondary-text-color);font-size:12px;line-height:1.4}@media(max-width:600px){.grid{grid-template-columns:1fr}}
    </style><div class="editor">
      <section class="panel"><h3>Allgemein</h3><div class="grid">${this._input("Titel", ["name"])}${this._input("Untertitel", ["subtitle"])}<label><span>Design</span><select data-path="${this._path(["design"])}"><option value="normal" ${this._get(["design"], "normal") === "normal" ? "selected" : ""}>Normal</option><option value="compact" ${this._get(["design"]) === "compact" ? "selected" : ""}>Kompakt</option></select></label>${this._selector("Status-Entität", ["status_entity"], { entity: {} })}</div></section>
      <section class="panel">${this._toggle("multi_filament", "Multi-Filament-System")}<div class="grid">${this._input("Titel", ["ace", "label"])}<label><span>Titelausrichtung</span><select data-path="${this._path(["ace", "title_alignment"])}"><option value="left" ${ace.title_alignment !== "center" && ace.title_alignment !== "right" ? "selected" : ""}>Links</option><option value="center" ${ace.title_alignment === "center" ? "selected" : ""}>Zentriert</option><option value="right" ${ace.title_alignment === "right" ? "selected" : ""}>Rechts</option></select></label>${this._selector("Hintergrundbild / Upload", ["ace", "image"], { image: {} })}${this._input("Hintergrundfarbe", ["ace", "background_color"], "color")}</div>${spools.map((spool, index) => this._spoolEditor(spool, index)).join("")}${spools.length < 5 ? '<button type="button" class="add" data-add-spool><ha-icon icon="mdi:plus"></ha-icon>Spule hinzufügen</button>' : ""}</section>
      <section class="panel">${this._toggle("printer", "3D-Drucker")}<div class="grid">${this._selector("Druckerbild / Upload", ["printer_image"], { image: {} })}${this._input("Hintergrundfarbe", ["printer_background_color"], "color")}${this._selector("Model-Entität", ["model_image_entity"], { entity: { domain: "image" } })}${this._selector("Statisches Modelbild / Upload", ["model_image"], { image: {} })}${this._selector("Kamera", ["camera_entity"], { entity: { domain: "camera" } })}${this._input("Höhe in Pixeln", ["printer_height"], "number", 'min="160" max="900" step="10"')}</div><p class="hint">Im Kompaktmodus wird die eingestellte Höhe automatisch um 30 % reduziert.</p></section>
      <section class="panel">${this._toggle("progress", "Fortschrittsbalken und Infos")}<div class="grid">${this._selector("Dateiname", ["filename_entity"], { entity: {} })}${this._selector("Fortschritt", ["progress_entity"], { entity: {} })}${this._selector("Aktuelle Schicht", ["layer_current_entity"], { entity: {} })}${this._selector("Gesamte Schichten", ["layer_total_entity"], { entity: {} })}${this._selector("Vergangene Zeit", ["elapsed_time_entity"], { entity: {} })}${this._selector("Verbleibende Zeit", ["remaining_time_entity"], { entity: {} })}${this._selector("Voraussichtliches Ende", ["estimated_end_entity"], { entity: {} })}${this._input("Label Schicht", ["detail_labels", "layer"])}${this._input("Label vergangen", ["detail_labels", "elapsed"])}${this._input("Label verbleibend", ["detail_labels", "remaining"])}${this._input("Label Ende", ["detail_labels", "estimated_end"])}</div></section>
      <section class="panel">${this._toggle("large_buttons", "Große Buttonleiste")}<p class="hint">Bis zu vier Buttons. Der große Wert ist ein Sensor; die zweite Entität wird klein angezeigt und öffnet sich beim Anklicken.</p>${largeButtons.map((button, index) => this._largeButtonEditor(button, index)).join("")}${largeButtons.length < 4 ? '<button type="button" class="add" data-add-large><ha-icon icon="mdi:plus"></ha-icon>Button hinzufügen</button>' : ""}</section>
      <section class="panel">${this._toggle("small_buttons", "Kleine Buttonleiste")}<p class="hint">Button-Entitäten werden gedrückt, Switches und Lights umgeschaltet. Im Kompaktmodus liegt diese Leiste über dem Druckerbild.</p>${smallButtons.map((button, index) => this._smallButtonEditor(button, index)).join("")}<button type="button" class="add" data-add-small><ha-icon icon="mdi:plus"></ha-icon>Button hinzufügen</button></section>
    </div>`;
    this.shadowRoot.querySelectorAll("ha-selector").forEach((element) => {
      const path = JSON.parse(element.dataset.path);
      element.hass = this._hass;
      element.selector = JSON.parse(element.dataset.selector);
      element.value = this._get(path, undefined);
    });
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
    this._set(JSON.parse(field.dataset.path), event.detail?.value);
  }

  _handleClick(event) {
    const action = event.target.closest("button");
    if (!action) return;
    const next = JSON.parse(JSON.stringify(this._config || {}));
    if (action.hasAttribute("data-add-spool")) {
      next.ace ||= {}; next.ace.spools ||= []; if (next.ace.spools.length < 5) next.ace.spools.push({});
    } else if (action.dataset.removeSpool !== undefined) next.ace.spools.splice(Number(action.dataset.removeSpool), 1);
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
