import { css, html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('landing-page')
export class LandingPage extends LitElement {
  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      width: 100%;
      text-align: center;
      color: white;
      box-sizing: border-box;
      padding: 2rem;
    }

    .content {
      max-width: 800px;
      animation: fadeIn 2s ease-in-out;
    }

    h1 {
      font-size: clamp(3rem, 10vw, 6rem);
      font-weight: 700;
      margin-bottom: 1rem;
      text-transform: uppercase;
      color: #fff;
      text-shadow:
        0 0 5px #fff,
        0 0 10px #fff,
        0 0 20px #ff00de,
        0 0 30px #ff00de,
        0 0 40px #ff00de,
        0 0 55px #ff00de,
        0 0 75px #ff00de;
    }

    p {
      font-size: clamp(1rem, 3vw, 1.5rem);
      margin-bottom: 3rem;
      line-height: 1.6;
      text-shadow: 0 0 5px rgba(0, 0, 0, 0.7);
    }

    .enter-button {
      font-family: 'Google Sans', sans-serif;
      font-size: 1.5rem;
      font-weight: 600;
      color: #fff;
      background-color: transparent;
      border: 3px solid #fff;
      border-radius: 50px;
      padding: 1rem 3rem;
      cursor: pointer;
      text-transform: uppercase;
      transition: all 0.3s ease;
      box-shadow:
        inset 0 0 10px #00bfff,
        0 0 10px #00bfff,
        inset 0 0 20px #00bfff,
        0 0 20px #00bfff;
    }

    .enter-button:hover,
    .enter-button:focus {
      color: #000;
      background-color: #fff;
      box-shadow: 0 0 20px #fff, 0 0 40px #00bfff, 0 0 60px #00bfff;
      outline: none;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;

  private enterApp() {
    this.dispatchEvent(new CustomEvent('enter-app', { bubbles: true, composed: true }));
  }

  override render() {
    return html`
      <div class="content">
        <h1>PromptDJ MIDI</h1>
        <p>
          Craft your sound in real-time. Mix and morph genres and beats with the turn of a knob. Your live AI music creation tool.
        </p>
        <button class="enter-button" @click=${this.enterApp}>Enter</button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'landing-page': LandingPage;
  }
}
