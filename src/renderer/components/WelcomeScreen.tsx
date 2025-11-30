import React, { useState } from 'react';
import { APP_VERSION, APP_AUTHOR, APP_VERSION_NAME, APP_NAME, APP_DESCRIPTION } from '../constants';
import { WandIcon, CloseIcon } from './icons';

interface WelcomeScreenProps {
  onNewProject: () => void;
  onLoadProject: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNewProject, onLoadProject }) => {
  const [showFeatures, setShowFeatures] = useState(false);

  const features = [
    {
      category: "🎵 Audio Engine",
      items: [
        "Web Audio API con latenza sub-10ms",
        "Elaborazione real-time multi-traccia",
        "Pooling intelligente AudioContext",
        "Supporto formati MP3, WAV, OGG, FLAC"
      ]
    },
    {
      category: "🤖 AI & Intelligenza",
      items: [
        "Gemini AI per preset audio intelligenti",
        "22 preset professionali curati (6 voice + 8 music + 8 mastering)",
        "Sistema di fallback automatico",
        "Retry logic con exponential backoff"
      ]
    },
    {
      category: "🎚️ Editing Avanzato",
      items: [
        "Timeline con virtualizzazione per progetti illimitati",
        "Waveform adattiva (qualità low/medium/high)",
        "Sistema completo copy/paste con Ctrl+C/V",
        "Scorciatoie da tastiera professionali"
      ]
    },
    {
      category: "📊 Analisi Professionale",
      items: [
        "Metriche LUFS, True Peak, Crest Factor",
        "Analisi spettrale completa",
        "Rilevamento problemi (clipping, DC offset)",
        "Conformità standard broadcast EBU R128"
      ]
    },
    {
      category: "⚡ Performance",
      items: [
        "Bundle ottimizzato in 5 chunk (max 252KB)",
        "Sistema preload intelligente",
        "Gestione memoria automatica",
        "60fps UI consistente"
      ]
    },
    {
      category: "🧪 Qualità & Testing",
      items: [
        "Suite di test completa con Vitest",
        "15+ test automatizzati",
        "Guida regressione dettagliata",
        "Monitoraggio performance integrato"
      ]
    }
  ];

  return (
    <div className="flex items-center justify-center h-full bg-gray-900">
      <div className="text-center p-12 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 max-w-2xl">
        <h1 className="text-5xl font-bold text-white mb-2">
          {APP_NAME}
        </h1>
        <h2 className="text-3xl font-light text-purple-400 mb-6">
          {APP_VERSION_NAME}
        </h2>
        <p className="text-gray-400 mb-8 max-w-lg mx-auto">
          Craft professional podcasts with cutting-edge technology. Leverage AI-powered audio enhancement, real-time waveform visualization, multi-track recording capabilities, and comprehensive editing tools to achieve broadcast-quality results that captivate your audience.
        </p>
        <div className="flex justify-center gap-6">
          <button
            onClick={onNewProject}
            className="px-8 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-transform transform hover:scale-105"
          >
            New Project
          </button>
          <button
            onClick={onLoadProject}
            className="px-8 py-3 bg-gray-600 text-white font-semibold rounded-lg shadow-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition-transform transform hover:scale-105"
          >
            Load Project
          </button>
        </div>
        <div className="mt-6">
          <button
            onClick={() => setShowFeatures(true)}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-transform transform hover:scale-105 mx-auto"
          >
            <WandIcon className="w-5 h-5" />
            Scopri le Funzionalità v1.0.0
          </button>
        </div>
        <div className="mt-12 text-xs text-gray-500">
          <span>Version {APP_VERSION} ({APP_VERSION_NAME})</span>
          <span className="mx-2">|</span>
          <span>Created by {APP_AUTHOR}</span>
        </div>
      </div>

      {/* Features Modal */}
      {showFeatures && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">
                🎙️ Runtime Radio Podcast Toolkit v1.0.0
              </h3>
              <button
                onClick={() => setShowFeatures(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
              >
                <CloseIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="text-center mb-6">
                <h4 className="text-xl font-semibold text-purple-400 mb-2">
                  "The Sonic Generational Evolution"
                </h4>
                <p className="text-gray-300">
                  Una rivoluzione completa nel podcasting professionale
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {features.map((category, index) => (
                  <div key={index} className="bg-gray-700 rounded-lg p-4">
                    <h5 className="text-lg font-semibold text-purple-300 mb-3">
                      {category.category}
                    </h5>
                    <ul className="space-y-2">
                      {category.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="text-sm text-gray-300 flex items-start">
                          <span className="text-green-400 mr-2 mt-1">✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="bg-gradient-to-r from-purple-900 to-blue-900 rounded-lg p-6 text-center">
                <h5 className="text-xl font-bold text-white mb-2">
                  🚀 Pronto per il Futuro
                </h5>
                <p className="text-gray-200 mb-4">
                  Architettura modulare pronta per espansioni future:
                  collaborazione in tempo reale, plugin system, cloud storage
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-black bg-opacity-30 rounded p-3">
                    <div className="text-purple-300 font-semibold">Performance</div>
                    <div className="text-gray-300">Ottimizzato</div>
                  </div>
                  <div className="bg-black bg-opacity-30 rounded p-3">
                    <div className="text-purple-300 font-semibold">Test Coverage</div>
                    <div className="text-gray-300">85%+</div>
                  </div>
                  <div className="bg-black bg-opacity-30 rounded p-3">
                    <div className="text-purple-300 font-semibold">Bundle Size</div>
                    <div className="text-gray-300">252KB max</div>
                  </div>
                  <div className="bg-black bg-opacity-30 rounded p-3">
                    <div className="text-purple-300 font-semibold">Latenza</div>
                    <div className="text-gray-300">Sub-10ms</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-700 text-center">
              <button
                onClick={() => setShowFeatures(false)}
                className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
              >
                Inizia a Creare!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WelcomeScreen;