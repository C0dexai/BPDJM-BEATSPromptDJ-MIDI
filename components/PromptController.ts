/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { css, html, LitElement } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

import './WeightKnob';
import type { WeightKnob } from './WeightKnob';

import type { MidiDispatcher } from '../utils/MidiDispatcher';
import type { Prompt, ControlChange } from '../types';

/** A single prompt input associated with a MIDI CC. */
@customElement('prompt-controller')
// FIX: The class should extend LitElement to be a web component.
export class PromptController extends LitElement {
  static override styles = css`
    .prompt {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    weight-knob {
      width: 70%;
      flex-shrink: 0;
    }
    #midi {
      font-family: monospace;
      text-align: center;
      font-size: 1.5vmin;
      border: 0.2vmin solid #fff;
      border-radius: 0.5vmin;
      padding: 2px 5px;
      color: #fff;
      background: #0006;
      cursor: pointer;
      visibility: hidden;
      user-select: none;
      margin-top: 0.75vmin;
      transition: all 0.2s ease;
      min-width: 50px;
      .learn-mode & {
        color: orange;
        border-color: orange;
        animation: pulse-orange 1.5s infinite;
      }
      &.learn-success {
        color: #4ade80;
        border-color: #4ade80;
        animation: none;
      }
      .show-cc & {
        visibility: visible;
      }
    }
    @keyframes pulse-orange {
      0% {
        box-shadow: 0 0 0 0 rgba(255, 165, 0, 0.4);
      }
      70% {
        box-shadow: 0 0 0 10px rgba(255, 165, 0, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(255, 165, 0, 0);
      }
    }
    .sensitivity-control {
      visibility: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-top: 0.5vmin;
      font-size: 1.3vmin;
      color: #fff;
      width: 80%;
      .show-cc & {
        visibility: visible;
      }
      label {
        font-family: monospace;
      }
      input[type='range'] {
        -webkit-appearance: none;
        width: 100%;
        background: transparent;
        margin-top: 2px;
      }
      input[type='range']:focus {
        outline: none;
      }
      /* Thumb */
      input[type='range']::-webkit-slider-thumb {
        -webkit-appearance: none;
        height: 1.5vmin;
        width: 1.5vmin;
        border-radius: 50%;
        background: #fff;
        cursor: pointer;
        margin-top: -0.5vmin;
      }
      input[type='range']::-moz-range-thumb {
        height: 1.5vmin;
        width: 1.5vmin;
        border-radius: 50%;
        background: #fff;
        cursor: pointer;
      }
      /* Track */
      input[type='range']::-webkit-slider-runnable-track {
        width: 100%;
        height: 0.5vmin;
        cursor: pointer;
        background: #0006;
        border-radius: 0.5vmin;
        border: 0.1vmin solid #fff;
      }
      input[type='range']::-moz-range-track {
        width: 100%;
        height: 0.5vmin;
        cursor: pointer;
        background: #0006;
        border-radius: 0.5vmin;
        border: 0.1vmin solid #fff;
      }
    }
    #text {
      font-weight: 500;
      font-size: 1.8vmin;
      max-width: 17vmin;
      min-width: 2vmin;
      padding: 0.1em 0.3em;
      margin-top: 0.5vmin;
      flex-shrink: 0;
      border-radius: 0.25vmin;
      text-align: center;
      white-space: pre;
      overflow: hidden;
      border: none;
      outline: none;
      -webkit-font-smoothing: antialiased;
      background: #000;
      color: #fff;
      &:not(:focus) {
        text-overflow: ellipsis;
      }
    }
    :host([filtered]) {
      weight-knob {
        opacity: 0.5;
      }
      #text {
        background: #da2000;
        z-index: 1;
      }
    }
    @media only screen and (max-width: 600px) {
      #text {
        font-size: 2.3vmin;
      }
      weight-knob {
        width: 60%;
      }
    }
  `;

  @property({ type: String }) promptId = '';
  @property({ type: String }) text = '';
  @property({ type: Number }) weight = 0;
  @property({ type: String }) color = '';
  @property({ type: Boolean, reflect: true }) filtered = false;

  @property({ type: Number }) cc = 0;
  @property({ type: Number }) channel = 0; // Not currently used
  @property({ type: Number }) sensitivity = 1;

  @property({ type: Boolean }) learnMode = false;
  @property({ type: Boolean }) showCC = false;

  @query('weight-knob') private weightInput!: WeightKnob;
  @query('#text') private textInput!: HTMLInputElement;

  @property({ type: Object })
  midiDispatcher: MidiDispatcher | null = null;

  @property({ type: Number }) audioLevel = 0;

  @state() private learnSuccess = false;
  @state() private midiActive = false;
  private midiActiveTimeout: number | undefined;

  private lastValidText!: string;

  override connectedCallback() {
    super.connectedCallback();
    this.midiDispatcher?.addEventListener('cc-message', (e: Event) => {
      const customEvent = e as CustomEvent<ControlChange>;
      const { channel, cc, value } = customEvent.detail;
      if (this.learnMode) {
        this.cc = cc;
        this.channel = channel;
        this.learnMode = false;

        this.learnSuccess = true;
        setTimeout(() => {
          this.learnSuccess = false;
        }, 1000);

        this.dispatchPromptChange();
      } else if (cc === this.cc) {
        const normalizedValue = value / 127;
        const curvedValue = Math.pow(normalizedValue, this.sensitivity);
        this.weight = curvedValue * 2;

        this.midiActive = true;
        if (this.midiActiveTimeout) {
          clearTimeout(this.midiActiveTimeout);
        }
        this.midiActiveTimeout = window.setTimeout(() => {
          this.midiActive = false;
        }, 200);

        this.dispatchPromptChange();
      }
    });
  }

  override firstUpdated() {
    // contenteditable is applied to textInput so we can "shrink-wrap" to text width
    // It's set here and not render() because Lit doesn't believe it's a valid attribute.
    this.textInput.setAttribute('contenteditable', 'plaintext-only');

    // contenteditable will do weird things if this is part of the template.
    this.textInput.textContent = this.text;
    this.lastValidText = this.text;
  }

  override update(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('showCC') && !this.showCC) {
      this.learnMode = false;
    }
    if (changedProperties.has('text') && this.textInput) {
      this.textInput.textContent = this.text;
    }
    super.update(changedProperties);
  }

  private dispatchPromptChange() {
    this.dispatchEvent(
      new CustomEvent<Prompt>('prompt-changed', {
        detail: {
          promptId: this.promptId,
          text: this.text,
          weight: this.weight,
          cc: this.cc,
          color: this.color,
          sensitivity: this.sensitivity,
        },
      }),
    );
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.textInput.blur();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      this.resetText();
      this.textInput.blur();
    }
  }

  private resetText() {
    this.text = this.lastValidText;
    this.textInput.textContent = this.lastValidText;
  }

  private async updateText() {
    const newText = this.textInput.textContent?.trim();
    if (!newText) {
      this.resetText();
    } else {
      this.text = newText;
      this.lastValidText = newText;
    }
    this.dispatchPromptChange();
    // Show the prompt from the beginning if it's cropped
    this.textInput.scrollLeft = 0;
  }

  private onFocus() {
    // .select() for contenteditable doesn't work.
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(this.textInput);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  private updateWeight() {
    this.weight = this.weightInput.value;
    this.dispatchPromptChange();
  }

  private toggleLearnMode() {
    this.learnMode = !this.learnMode;
    if (this.learnMode) {
      this.learnSuccess = false;
    }
  }

  private updateSensitivity(e: Event) {
    const target = e.target as HTMLInputElement;
    this.sensitivity = parseFloat(target.value);
    this.dispatchPromptChange();
  }

  override render() {
    const promptClasses = classMap({
      prompt: true,
      'learn-mode': this.learnMode,
      'show-cc': this.showCC,
    });

    const midiClasses = classMap({
      'learn-success': this.learnSuccess,
    });

    return html`<div class=${promptClasses}>
      <weight-knob
        id="weight"
        value=${this.weight}
        color=${this.filtered ? '#888' : this.color}
        audioLevel=${this.filtered ? 0 : this.audioLevel}
        ?midiActive=${this.midiActive}
        @input=${this.updateWeight}></weight-knob>
      <span
        id="text"
        spellcheck="false"
        @focus=${this.onFocus}
        @keydown=${this.onKeyDown}
        @blur=${this.updateText}></span>
      <div id="midi" class=${midiClasses} @click=${this.toggleLearnMode}>
        ${this.learnMode
          ? 'Learn...'
          : this.learnSuccess
          ? 'Learned!'
          : `CC:${this.cc}`}
      </div>
      <div class="sensitivity-control">
        <label for="sensitivity-slider-${this.promptId}">Curve</label>
        <input
          id="sensitivity-slider-${this.promptId}"
          type="range"
          min="0.25"
          max="4"
          step="0.01"
          .value=${this.sensitivity}
          @input=${this.updateSensitivity} />
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'prompt-controller': PromptController;
  }
}