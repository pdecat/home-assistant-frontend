import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../../components/ha-expansion-panel";
import type { DeviceRegistryEntry } from "../../../../../../data/device/device_registry";
import type { ZHADevice } from "../../../../../../data/zha";
import { fetchZHADevice } from "../../../../../../data/zha";
import { haStyle } from "../../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../../types";
import { formatAsPaddedHex } from "../../../../integrations/integration-panels/zha/functions";

@customElement("ha-device-info-zha")
export class HaDeviceInfoZha extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public device!: DeviceRegistryEntry;

  @state() private _zhaDevice?: ZHADevice;

  @state() private _lastFetch = 0;

  @state() private _expanded =
    localStorage.getItem("zha-device-info-expanded") === "true";

  protected updated(changedProperties: PropertyValues<this>) {
    super.updated(changedProperties);
    if (changedProperties.has("device")) {
      this._fetchDevice();
      return;
    }

    if (changedProperties.has("hass") && this.device) {
      this._checkEntityUpdates();
    }
  }

  private _checkEntityUpdates() {
    const entities = Object.values(this.hass.entities).filter(
      (ent) => ent.device_id === this.device.id
    );

    for (const ent of entities) {
      const stateObj = this.hass.states[ent.entity_id];
      if (stateObj) {
        const lastUpdated = new Date(stateObj.last_updated).getTime();
        if (lastUpdated > this._lastFetch) {
          this._fetchDevice();
          return;
        }
      }
    }
  }

  private _fetchDevice() {
    const zigbeeConnection = this.device.connections.find(
      (conn) => conn[0] === "zigbee"
    );
    if (!zigbeeConnection) {
      return;
    }
    fetchZHADevice(this.hass, zigbeeConnection[1]).then((device) => {
      this._zhaDevice = device;
      this._lastFetch = Date.now();
    });
  }

  protected render() {
    if (!this._zhaDevice) {
      return nothing;
    }
    return html`
      <ha-expansion-panel
        header="Zigbee info"
        .expanded=${this._expanded}
        @expanded-changed=${this._handleExpandedChanged}
      >
        <div>Nwk: ${formatAsPaddedHex(this._zhaDevice.nwk)}</div>
        <div>Device Type: ${this._zhaDevice.device_type}</div>
        <div>
          LQI:
          ${
            this._zhaDevice.lqi ||
            this.hass!.localize("ui.dialogs.zha_device_info.unknown")
          }
        </div>
        <div>
          RSSI:
          ${
            this._zhaDevice.rssi ||
            this.hass!.localize("ui.dialogs.zha_device_info.unknown")
          }
        </div>
        <div>
          ${this.hass!.localize("ui.dialogs.zha_device_info.last_seen")}:
          ${
            this._zhaDevice.last_seen ||
            this.hass!.localize("ui.dialogs.zha_device_info.unknown")
          }
        </div>
        <div>
          ${this.hass!.localize("ui.dialogs.zha_device_info.power_source")}:
          ${
            this._zhaDevice.power_source ||
            this.hass!.localize("ui.dialogs.zha_device_info.unknown")
          }
        </div>
        ${
          this._zhaDevice.quirk_applied
            ? html`
                <div>
                  ${this.hass!.localize("ui.dialogs.zha_device_info.quirk")}:
                  ${this._zhaDevice.quirk_class}
                </div>
              `
            : ""
        }
      </ha-expansion-panel>
    `;
  }

  private _handleExpandedChanged(ev: CustomEvent) {
    this._expanded = ev.detail.expanded;
    localStorage.setItem("zha-device-info-expanded", String(this._expanded));
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        h4 {
          margin-bottom: 4px;
        }
        div {
          word-break: break-all;
          margin-top: 2px;
        }
        ha-expansion-panel {
          --expansion-panel-summary-padding: 0;
          --expansion-panel-content-padding: 0;
          padding-top: 4px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-info-zha": HaDeviceInfoZha;
  }
}
