/**
 * @fileoverview Control real time music with a MIDI controller
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { PlaybackState, Prompt } from './types';
import { GoogleGenAI, LiveMusicFilteredPrompt } from '@google/genai';
import { PromptDjMidi } from './components/PromptDjMidi';
import { ToastMessage } from './components/ToastMessage';
import { LiveMusicHelper } from './utils/LiveMusicHelper';
import { AudioAnalyser } from './utils/AudioAnalyser';
import './components/LandingPage'; // Import the landing page component

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = 'lyria-realtime-exp';

function main() {
  const landingPage = document.createElement('landing-page');
  document.body.appendChild(landingPage);

  landingPage.addEventListener('enter-app', () => {
    // Smoothly fade out the landing page
    landingPage.style.transition = 'opacity 0.5s ease-out';
    landingPage.style.opacity = '0';
    
    setTimeout(() => {
      landingPage.remove();
      // Lock scrolling for the main application
      document.body.style.overflow = 'hidden';
      // The main app has its own background, so we can clear the overlay
      document.body.style.backgroundColor = 'transparent';
      initializeApp();
    }, 500); // Match timeout to transition duration
  }, { once: true }); // Ensure the event listener only runs once
}


function initializeApp() {
  const genrePrompts = buildPromptMap(GENRE_PROMPTS, 'genre');
  const beatsPrompts = buildPromptMap(BEATS_PROMPTS, 'beats');

  const pdjMidi = new PromptDjMidi();
  pdjMidi.presets = PRESETS;
  pdjMidi.promptSets = {
    'Genres': genrePrompts,
    'Beats': beatsPrompts
  };
  document.body.appendChild(pdjMidi);

  const toastMessage = new ToastMessage();
  document.body.appendChild(toastMessage);

  const liveMusicHelper = new LiveMusicHelper(ai, model);
  const audioAnalyser = new AudioAnalyser(liveMusicHelper.audioContext);
  liveMusicHelper.extraDestination = audioAnalyser.node;

  pdjMidi.addEventListener('prompts-changed', ((e: Event) => {
    const customEvent = e as CustomEvent<Map<string, Prompt>>;
    const prompts = customEvent.detail;
    liveMusicHelper.setWeightedPrompts(prompts);
  }));

  pdjMidi.addEventListener('play-pause', () => {
    liveMusicHelper.playPause();
  });

  liveMusicHelper.addEventListener('playback-state-changed', ((e: Event) => {
    const customEvent = e as CustomEvent<PlaybackState>;
    const playbackState = customEvent.detail;
    pdjMidi.playbackState = playbackState;
    playbackState === 'playing' ? audioAnalyser.start() : audioAnalyser.stop();
  }));

  liveMusicHelper.addEventListener('filtered-prompt', ((e: Event) => {
    const customEvent = e as CustomEvent<LiveMusicFilteredPrompt>;
    const filteredPrompt = customEvent.detail;
    toastMessage.show(filteredPrompt.filteredReason!)
    pdjMidi.addFilteredPrompt(filteredPrompt.text!);
  }));

  const errorToast = ((e: Event) => {
    const customEvent = e as CustomEvent<string>;
    const error = customEvent.detail;
    toastMessage.show(error);
  });

  liveMusicHelper.addEventListener('error', errorToast);
  pdjMidi.addEventListener('error', errorToast);

  audioAnalyser.addEventListener('audio-level-changed', ((e: Event) => {
    const customEvent = e as CustomEvent<number>;
    const level = customEvent.detail;
    pdjMidi.audioLevel = level;
  }));

}

function buildPromptMap(promptList: {color: string, text: string}[], prefix: string) {
  // Pick 3 random prompts to start at weight = 1
  const startOn = [...promptList]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  const prompts = new Map<string, Prompt>();

  for (let i = 0; i < promptList.length; i++) {
    const promptId = `${prefix}-prompt-${i}`;
    const prompt = promptList[i];
    const { text, color } = prompt;
    prompts.set(promptId, {
      promptId,
      text,
      weight: startOn.includes(prompt) ? 1 : 0,
      cc: i,
      color,
      sensitivity: 1,
    });
  }

  return prompts;
}

const PRESETS = [
  {
    name: '🎚 Preset 1 – Beach Chillwave 🌴🌊',
    prompts: [
      'Lo-fi hip hop groove',
      'Vinyl crackle and hiss',
      'Echoing vocal chops',
      'UK drill percussion',
    ],
  },
  {
    name: '🎚 Preset 2 – Trap Storm ⚡🔥',
    prompts: [
      'Heavy 808 kick',
      'HardTrap',
      'Hard-hitting snare drum',
      'HardcoreTrap',
      'TrapRap',
    ],
  },
  {
    name: '🎚 Preset 3 – Underground Grime 🌌🏙',
    prompts: [
      'Deep grime sub-bass',
      'Dark and gritty grime synth',
      'Driving kick drum pattern',
      'Distorted bassline',
    ],
  },
  {
    name: '🎚 Preset 4 – Apocalyptic Rave ☢️🔊',
    prompts: [
      'Heavy 808 kick',
      'HardcoreTrap',
      'Distorted bassline',
      'Syncopated percussion layers',
      'TrapRap',
    ],
  },
];

const GENRE_PROMPTS = [
  { color: '#9900ff', text: 'Bossa Nova' },
  { color: '#5200ff', text: 'Chillwave' },
  { color: '#ff25f6', text: 'Drum and Bass' },
  { color: '#2af6de', text: 'Post Punk' },
  { color: '#ffdd28', text: 'Shoegaze' },
  { color: '#2af6de', text: 'Funk' },
  { color: '#9900ff', text: 'Chiptune' },
  { color: '#3dffab', text: 'Lush Strings' },
  { color: '#d8ff3e', text: 'Sparkling Arpeggios' },
  { color: '#d9b2ff', text: 'Staccato Rhythms' },
  { color: '#3dffab', text: 'Punchy Kick' },
  { color: '#ffdd28', text: 'Dubstep' },
  { color: '#ff25f6', text: 'K Pop' },
  { color: '#d8ff3e', text: 'Neo Soul' },
  { color: '#5200ff', text: 'Trip Hop' },
  { color: '#d9b2ff', text: 'Thrash' },
];

const BEATS_PROMPTS = [
  { color: '#FF4136', text: 'Heavy 808 kick' },
  { color: '#FF851B', text: 'HardTrap' },
  { color: '#FFDC00', text: 'Classic boom bap breakbeat' },
  { color: '#01FF70', text: 'Deep grime sub-bass' },
  { color: '#3D9970', text: 'Hard-hitting snare drum' },
  { color: '#7FDBFF', text: 'UK drill percussion' },
  { color: '#0074D9', text: 'Lo-fi hip hop groove' },
  { color: '#F012BE', text: 'TrapRap' },
  { color: '#B10DC9', text: 'HardcoreTrap' },
  { color: '#85144b', text: 'Old school hip-hop horns' },
  { color: '#39CCCC', text: 'Dark and gritty grime synth' },
  { color: '#DDDDDD', text: 'Driving kick drum pattern' },
  { color: '#AAAAAA', text: 'Distorted bassline' },
  { color: '#F012BE', text: 'Vinyl crackle and hiss' },
  { color: '#FF851B', text: 'Echoing vocal chops' },
  { color: '#FF4136', text: 'Syncopated percussion layers' },
];

main();