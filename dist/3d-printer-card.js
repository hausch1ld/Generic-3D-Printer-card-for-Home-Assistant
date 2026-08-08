/* 3D Printer Card for Home Assistant
 * Version 0.1.0 - dependency-free Web Component
 */

const CARD_VERSION = "0.2.2";

class ThreeDPrinterCard extends HTMLElement {
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

  _metric(key, defaults) {
    const cfg = this._config?.metrics?.[key];
    if (!cfg) return "";
    const value = this._format(cfg.entity, cfg.unit);
    const target = cfg.target_entity ? this._format(cfg.target_entity, cfg.target_unit ?? cfg.unit) : "";
    return `<button type="button" class="metric ${this._state(cfg.entity) ? "" : "missing"}" data-metric="${key}" ${cfg.target_entity ? `data-target-entity="${this._escape(cfg.target_entity)}"` : ""}>
      <div class="metric-head"><ha-icon icon="${this._escape(cfg.icon || defaults.icon)}"></ha-icon><span>${this._escape(cfg.label || defaults.label)}</span></div>
      <div class="metric-value">${value}</div>
      ${target ? `<div class="target">${this._escape(cfg.target_label || "Target")} ${target}</div>` : '<div class="target">&nbsp;</div>'}
    </button>`;
  }

  _spools() {
    const ace = this._config?.ace;
    if (!ace) return "";
    const spools = Array.from({ length: 4 }, (_, index) => ace.spools?.[index] || {});
    return `<section class="ace" style="${this._image(ace.image) ? `--ace-image:url('${this._escape(this._image(ace.image))}')` : ""}">
      <div class="ace-title">${this._escape(ace.label || "ACE / AMS")}</div>
      <div class="spools">${spools.map((spool, index) => {
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
    const model = this._image(this._config.model_image_entity || this._config.model_image);
    return `<div class="printer-scene" data-view="printer">
      ${printer ? `<img class="printer-image" src="${this._escape(printer)}" alt="3D printer">` : '<div class="image-placeholder"><ha-icon icon="mdi:printer-3d"></ha-icon><span>Configure printer_image</span></div>'}
      ${model ? `<img class="model-image" src="${this._escape(model)}" alt="Print model">` : ""}
    </div>`;
  }

  _button(key, defaults) {
    const cfg = this._config?.actions?.[key];
    if (!cfg) return "";
    return `<button class="action" data-action="${key}" title="${this._escape(cfg.label || defaults.label)}">
      <ha-icon icon="${this._escape(cfg.icon || defaults.icon)}"></ha-icon><span>${this._escape(cfg.label || defaults.label)}</span>
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
    this.shadowRoot.innerHTML = `<style>${ThreeDPrinterCard.styles}</style>
      <ha-card>
        <header><div><h2>${this._escape(c.name || "3D Printer")}</h2>${c.subtitle ? `<p>${this._escape(c.subtitle)}</p>` : ""}</div><span class="status" data-status ${status ? "" : "hidden"}>${this._escape(status)}</span></header>
        ${this._spools()}
        <button class="visual" data-view="${this._showCamera ? "camera" : "printer"}" data-toggle-view aria-label="Toggle printer and camera view">${this._visual()}<span class="view-hint"><ha-icon icon="${this._showCamera ? "mdi:printer-3d" : "mdi:cctv"}"></ha-icon></span></button>
        <section class="job">
          <div class="job-line"><strong data-filename>${this._escape(name)}</strong><b data-progress-label>${Math.round(progress)}%</b></div>
          <div class="progress" data-progress role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><i style="width:${progress}%"></i></div>
          <div class="details">
            <div><span>${this._escape(labels.layer || "Layer")}</span><strong data-layers>${this._escape(currentLayer)} / ${this._escape(totalLayer)}</strong></div>
            <div><span>${this._escape(labels.elapsed || "Elapsed")}</span><strong data-elapsed>${this._displayTime(c.elapsed_time_entity)}</strong></div>
            <div><span>${this._escape(labels.remaining || "Remaining")}</span><strong data-remaining>${this._displayTime(c.remaining_time_entity)}</strong></div>
            <div><span>${this._escape(labels.estimated_end || "Voraussichtliches Ende")}</span><strong data-estimated-end>${this._displayEnd(c.estimated_end_entity || c.total_time_entity)}</strong></div>
          </div>
        </section>
        <section class="metrics">
          ${this._metric("nozzle", { label: "Nozzle", icon: "mdi:printer-3d-nozzle-heat" })}
          ${this._metric("bed", { label: "Bed", icon: "mdi:radiator" })}
          ${this._metric("fan", { label: "Fan", icon: "mdi:fan" })}
        </section>
        <footer>
          ${this._button("pause", { label: "Pause", icon: "mdi:pause" })}
          ${this._button("resume", { label: "Resume", icon: "mdi:play" })}
          ${this._button("stop", { label: "Stop", icon: "mdi:stop" })}
          ${this._button("light", { label: "Light", icon: "mdi:lightbulb" })}
        </footer>
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
    [["nozzle", { label: "Nozzle", icon: "mdi:printer-3d-nozzle-heat" }], ["bed", { label: "Bed", icon: "mdi:radiator" }], ["fan", { label: "Fan", icon: "mdi:fan" }]].forEach(([key]) => {
      const cfg = c.metrics?.[key];
      if (!cfg) return;
      setHtml(`[data-metric="${key}"] .metric-value`, this._format(cfg.entity, cfg.unit));
      const target = cfg.target_entity ? `${this._escape(cfg.target_label || "Target")} ${this._format(cfg.target_entity, cfg.target_unit ?? cfg.unit)}` : "&nbsp;";
      setHtml(`[data-metric="${key}"] .target`, target);
      this.shadowRoot.querySelector(`[data-metric="${key}"]`)?.classList.toggle("missing", !this._state(cfg.entity));
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
      const modelSrc = this._image(c.model_image_entity || c.model_image);
      if (printer && printerSrc && printer.getAttribute("src") !== printerSrc) printer.setAttribute("src", printerSrc);
      if (model && modelSrc && model.getAttribute("src") !== modelSrc) model.setAttribute("src", modelSrc);
    }
    const ace = this.shadowRoot.querySelector(".ace");
    if (!ace || !c.ace) return;
    const aceImage = this._image(c.ace.image);
    ace.style.setProperty("--ace-image", aceImage ? `url('${aceImage.replaceAll("'", "%27")}')` : "none");
    Array.from({ length: 4 }, (_, index) => c.ace.spools?.[index] || {}).forEach((spool, index) => {
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
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = this._config.actions?.[button.dataset.action];
    if (action) await this._runAction(action);
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
    .ace { position:relative; min-height:104px; margin:0 0 12px; padding:12px 16px 10px; border-radius:14px; overflow:hidden; background:linear-gradient(145deg,rgba(255,255,255,.09),rgba(255,255,255,.025)),var(--ace-image) center/cover; border:1px solid rgba(255,255,255,.08); }
    .ace-title { position:absolute; left:12px; top:10px; color:var(--secondary-text-color); font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; }
    .spools { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; max-width:440px; margin:16px auto 0; }
    .spool { min-width:0; text-align:center; } .spool img,.spool>span { display:block; width:58px; height:58px; max-width:100%; margin:auto; border-radius:50%; object-fit:contain; filter:drop-shadow(0 5px 6px rgba(0,0,0,.3)); }
    .spool>span { display:grid; place-items:center; border:5px solid rgba(255,255,255,.16); color:var(--secondary-text-color); }
    .spool small { display:block; overflow:hidden; margin-top:3px; color:var(--secondary-text-color); font-size:10px; text-overflow:ellipsis; white-space:nowrap; }
    .visual { position:relative; display:block; width:100%; height:clamp(245px,48vw,440px); margin:0; padding:0; overflow:hidden; cursor:pointer; color:inherit; background:radial-gradient(circle at 50% 55%,rgba(255,255,255,.08),transparent 55%),#101113; border:1px solid rgba(255,255,255,.08); border-radius:16px; }
    .printer-scene,.camera-host,.camera-host ha-camera-stream { display:block; width:100%; height:100%; } .printer-scene { position:relative; }
    .printer-image { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; }
    .model-image { position:absolute; left:50%; top:56%; width:30%; height:30%; object-fit:contain; transform:translate(-50%,-50%); filter:drop-shadow(0 8px 7px rgba(0,0,0,.5)); }
    .image-placeholder { display:grid; place-content:center; height:100%; gap:8px; color:var(--secondary-text-color); } .image-placeholder ha-icon { width:52px;height:52px;margin:auto; }
    .view-hint { position:absolute; right:10px; bottom:10px; display:grid; width:34px; height:34px; place-items:center; border-radius:50%; background:rgba(0,0,0,.58); backdrop-filter:blur(8px); }
    .job { padding:18px 2px 14px; } .job-line { display:flex; justify-content:space-between; gap:12px; margin-bottom:9px; } .job-line strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .job-line b { color:var(--accent); }
    .progress { height:8px; overflow:hidden; background:rgba(255,255,255,.1); border-radius:999px; } .progress i { display:block; height:100%; background:linear-gradient(90deg,var(--accent),color-mix(in srgb,var(--accent) 65%,white)); border-radius:inherit; transition:width .35s ease; }
    .details { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-top:14px; } .details div { min-width:0; } .details span,.target { display:block; color:var(--secondary-text-color); font-size:10px; text-transform:uppercase; } .details strong { display:block; margin-top:3px; font-size:13px; }
    .metrics { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; padding:14px 0; border-top:1px solid rgba(255,255,255,.08); }
    .metric { min-width:0; padding:11px; text-align:center; color:inherit; font:inherit; background:rgba(255,255,255,.045); border:1px solid transparent; border-radius:12px; } .metric[data-target-entity] { cursor:pointer; } .metric[data-target-entity]:hover { background:color-mix(in srgb,var(--accent) 12%,rgba(255,255,255,.045)); border-color:color-mix(in srgb,var(--accent) 25%,transparent); } .metric-head { display:flex; align-items:center; justify-content:center; gap:5px; color:var(--secondary-text-color); font-size:11px; } .metric-head ha-icon { width:17px;height:17px; } .metric-value { margin:6px 0 3px; font-size:20px; font-weight:700; } .unit { font-size:.65em;color:var(--secondary-text-color); } .target { text-transform:none; } .missing { opacity:.65; }
    footer { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; padding-top:3px; } .action { display:flex; min-width:0; min-height:48px; flex-direction:column; align-items:center; justify-content:center; gap:3px; cursor:pointer; color:var(--primary-text-color); background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.06); border-radius:12px; } .action:hover { background:color-mix(in srgb,var(--accent) 16%,rgba(255,255,255,.06)); } .action ha-icon { width:21px;height:21px; } .action span { overflow:hidden; max-width:100%; font-size:10px; text-overflow:ellipsis; }
    @media(max-width:460px){ ha-card{padding:13px}.visual{height:260px}.details{grid-template-columns:repeat(2,1fr)}.spools{gap:5px}.spool img,.spool>span{width:48px;height:48px}.metric{padding:9px 5px}.metric-value{font-size:17px} }
  `; }
}

// Custom element names must begin with an ASCII letter. `3d-printer-card`
// would make customElements.define() throw "The string contains invalid characters".
if (!customElements.get("three-d-printer-card")) customElements.define("three-d-printer-card", ThreeDPrinterCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "three-d-printer-card", name: "3D Printer Card", description: "Generic 3D printer dashboard with camera, ACE/AMS and controls", preview: true });
console.info(`%c 3D-PRINTER-CARD %c v${CARD_VERSION} `, "color:white;background:#03a9f4;font-weight:bold", "color:#03a9f4;background:#222");
