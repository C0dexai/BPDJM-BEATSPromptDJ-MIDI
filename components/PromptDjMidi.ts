/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import { throttle } from '../utils/throttle';

import './PromptController';
import './PlayPauseButton';
import type { PlaybackState, Prompt } from '../types';
import { MidiDispatcher } from '../utils/MidiDispatcher';

/** The grid of prompt inputs. */
@customElement('prompt-dj-midi')
export class PromptDjMidi extends LitElement {
  static override styles = css`
    :host {
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      box-sizing: border-box;
      position: relative;
    }
    #background {
      will-change: background-image;
      position: absolute;
      height: 100%;
      width: 100%;
      z-index: -1;
      background: #111;
    }
    #grid {
      width: 80vmin;
      height: 80vmin;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 2.5vmin;
    }
    prompt-controller {
      width: 100%;
    }
    play-pause-button {
      position: relative;
      width: 15vmin;
      margin-top: 2vmin;
    }
    #buttons {
      position: absolute;
      top: 0;
      right: 0;
      padding: 5px;
      display: flex;
      gap: 5px;
    }
    button {
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      color: #fff;
      background: #0002;
      -webkit-font-smoothing: antialiased;
      border: 1.5px solid #fff;
      border-radius: 4px;
      user-select: none;
      padding: 3px 6px;
      &.active {
        background-color: #fff;
        color: #000;
      }
    }
    select {
      font: inherit;
      padding: 5px;
      background: #fff;
      color: #000;
      border-radius: 4px;
      border: none;
      outline: none;
      cursor: pointer;
    }
    #tabs {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-bottom: 2vmin;
    }
    .tab {
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      color: #fff;
      background: #0002;
      -webkit-font-smoothing: antialiased;
      border: 1.5px solid #fff;
      border-radius: 4px;
      user-select: none;
      padding: 8px 16px;
      transition: background-color 0.2s, color 0.2s;
    }
    .tab:hover {
      background-color: #fff4;
    }
    .tab.active {
      background-color: #fff;
      color: #000;
    }
  `;

  private midiDispatcher: MidiDispatcher;

  @property({ type: Object }) promptSets: { [name: string]: Map<string, Prompt> } = {};
  @property({ type: Array }) presets: { name: string, prompts: string[] }[] = [];

  @state() private activeTabName = '';
  @property({ type: Boolean }) private showMidi = false;
  @property({ type: String }) public playbackState: PlaybackState = 'stopped';
  @state() public audioLevel = 0;
  @state() private midiInputIds: string[] = [];
  @state() private activeMidiInputId: string | null = null;

  @property({ type: Object })
  private filteredPrompts = new Set<string>();

  constructor() {
    super();
    this.midiDispatcher = new MidiDispatcher();
  }

  override firstUpdated() {
    if (Object.keys(this.promptSets).length > 0) {
      if (!this.activeTabName) {
        this.activeTabName = Object.keys(this.promptSets)[0];
      }
      this.dispatchPromptsChanged();
    }
  }

  private get activePromptsMap(): Map<string, Prompt> | undefined {
    return this.promptSets[this.activeTabName];
  }

  private dispatchPromptsChanged() {
    if (!this.activePromptsMap) return;
    this.dispatchEvent(
      new CustomEvent('prompts-changed', {
        detail: this.activePromptsMap,
      })
    );
  }

  private handlePromptChanged(e: CustomEvent<Prompt>) {
    const updatedPrompt = e.detail;
    const { promptId } = updatedPrompt;
    
    if (!this.activePromptsMap) return;

    const newActiveMap = new Map(this.activePromptsMap);
    newActiveMap.set(promptId, updatedPrompt);
    
    this.promptSets[this.activeTabName] = newActiveMap;
    this.promptSets = { ...this.promptSets };

    this.dispatchPromptsChanged();
  }

  /** Generates radial gradients for each prompt based on weight and color. */
  private readonly makeBackground = throttle(
    () => {
      if (!this.activePromptsMap) return '';

      const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

      const MAX_WEIGHT = 0.5;
      const MAX_ALPHA = 0.6;

      const bg: string[] = [];

      [...this.activePromptsMap.values()].forEach((p, i) => {
        const alphaPct = clamp01(p.weight / MAX_WEIGHT) * MAX_ALPHA;
        const alpha = Math.round(alphaPct * 0xff)
          .toString(16)
          .padStart(2, '0');

        const stop = p.weight / 2;
        const x = (i % 4) / 3;
        const y = Math.floor(i / 4) / 3;
        const s = `radial-gradient(circle at ${x * 100}% ${y * 100}%, ${p.color}${alpha} 0px, ${p.color}00 ${stop * 100}%)`;

        bg.push(s);
      });

      return bg.join(', ');
    },
    30, // don't re-render more than once every XXms
  );

  private toggleShowMidi() {
    return this.setShowMidi(!this.showMidi);
  }

  public async setShowMidi(show: boolean) {
    this.showMidi = show;
    if (!this.showMidi) return;
    try {
      const inputIds = await this.midiDispatcher.getMidiAccess();
      this.midiInputIds = inputIds;
      this.activeMidiInputId = this.midiDispatcher.activeMidiInputId;
    } catch (e) {
      this.showMidi = false;
      this.dispatchEvent(new CustomEvent('error', {detail: (e as Error).message}));
    }
  }

  private handleMidiInputChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const newMidiId = selectElement.value;
    this.activeMidiInputId = newMidiId;
    this.midiDispatcher.activeMidiInputId = newMidiId;
  }

  private playPause() {
    this.dispatchEvent(new CustomEvent('play-pause'));
  }

  private switchTab(e: Event) {
    const button = e.currentTarget as HTMLButtonElement;
    const tabName = button.dataset.tabName;
    if (tabName && tabName !== this.activeTabName) {
      this.activeTabName = tabName;
      this.filteredPrompts.clear();
      this.dispatchPromptsChanged();
    }
  }

  public addFilteredPrompt(prompt: string) {
    this.filteredPrompts = new Set([...this.filteredPrompts, prompt]);
  }

  private handlePresetChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    const presetName = select.value;
    if (!presetName) return;

    const selectedPreset = this.presets.find(p => p.name === presetName);
    if (!selectedPreset || !this.activePromptsMap) return;

    const presetPrompts = new Set(selectedPreset.prompts);
    const newActiveMap = new Map<string, Prompt>();

    for (const [promptId, prompt] of this.activePromptsMap.entries()) {
      const newPrompt = { ...prompt };
      if (presetPrompts.has(prompt.text)) {
        newPrompt.weight = 1;
      } else {
        newPrompt.weight = 0;
      }
      newActiveMap.set(promptId, newPrompt);
    }

    this.promptSets[this.activeTabName] = newActiveMap;
    this.promptSets = { ...this.promptSets };
    this.dispatchPromptsChanged();

    select.value = '';
  }

  override render() {
    const bg = styleMap({
      backgroundImage: this.makeBackground(),
    });
    return html`<div id="background" style=${bg}></div>
      <div id="buttons">
        <button
          @click=${this.toggleShowMidi}
          class=${this.showMidi ? 'active' : ''}
          >MIDI</button
        >
        <select
          @change=${this.handleMidiInputChange}
          .value=${this.activeMidiInputId || ''}
          style=${this.showMidi ? '' : 'visibility: hidden'}>
          ${this.midiInputIds.length > 0
        ? this.midiInputIds.map(
          (id) =>
            html`<option value=${id}>
                    ${this.midiDispatcher.getDeviceName(id)}
                  </option>`,
        )
        : html`<option value="">No devices found</option>`}
        </select>
        ${this.activeTabName === 'Beats' ? html`
          <select @change=${this.handlePresetChange}>
            <option value="" selected>Load Beat Preset...</option>
            ${this.presets.map(preset => html`
              <option .value=${preset.name}>${preset.name}</option>
            `)}
          </select>
        ` : ''}
      </div>

      <div id="tabs">
        ${Object.keys(this.promptSets).map(name => html`
            <button
                class="tab ${this.activeTabName === name ? 'active' : ''}"
                data-tab-name=${name}
                @click=${this.switchTab}>
                ${name}
            </button>
        `)}
      </div>
      <div id="grid">${this.renderPrompts()}</div>
      <play-pause-button .playbackState=${this.playbackState} @click=${this.playPause}></play-pause-button>`;
  }

  private renderPrompts() {
    if (!this.activePromptsMap) return;
    return [...this.activePromptsMap.values()].map((prompt) => {
      return html`<prompt-controller
        promptId=${prompt.promptId}
        ?filtered=${this.filteredPrompts.has(prompt.text)}
        cc=${prompt.cc}
        text=${prompt.text}
        weight=${prompt.weight}
        color=${prompt.color}
        .midiDispatcher=${this.midiDispatcher}
        .showCC=${this.showMidi}
        audioLevel=${this.audioLevel}
        @prompt-changed=${this.handlePromptChanged}>
      </prompt-controller>`;
    });
  }
}