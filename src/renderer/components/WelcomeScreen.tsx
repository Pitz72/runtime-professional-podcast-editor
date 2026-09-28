import React, { useEffect, useState } from 'react';
import { APP_VERSION, APP_AUTHOR, APP_VERSION_NAME, APP_NAME } from '../constants';
import { useT, useI18nStore } from '../i18n';
import { RadioIcon, FolderIcon, SlidersIcon, DuckingIcon, SparklesIcon } from './icons';

interface WelcomeScreenProps {
  onNewProject: () => void;
  onLoadProject: () => void;
  onOpenRecent: (path: string) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNewProject, onLoadProject, onOpenRecent }) => {
  const t = useT();
  const locale = useI18nStore(s => s.locale);
  const setLocale = useI18nStore(s => s.setLocale);
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    void window.electron?.getRecentProjects().then(setRecents);
  }, []);

  const fileName = (path: string) => path.split(/[\\/]/).pop() || path;

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-slate-950 text-slate-100 overflow-hidden select-none p-6">
      {/* Background Studio Radial Glow & Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/25 via-slate-950 to-slate-950 pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(to right, #fff 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }}
      />

      {/* Main Studio Container */}
      <div className="relative z-10 w-full max-w-4xl bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
        {/* Top Studio Brand Banner */}
        <div className="px-8 pt-8 pb-6 border-b border-slate-800/80 bg-gradient-to-b from-slate-800/40 to-transparent">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                <RadioIcon className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-white uppercase font-sans">
                    {APP_NAME}
                  </h1>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 tracking-wider">
                    PRO STUDIO
                  </span>
                </div>
                <p className="text-xs text-purple-400/90 font-mono tracking-wide mt-0.5">
                  {APP_VERSION_NAME} • Non-Destructive Audio Engine
                </p>
              </div>
            </div>

            {/* Language Selector Pill */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setLocale('it')}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded transition-colors ${
                  locale === 'it'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                IT
              </button>
              <button
                type="button"
                onClick={() => setLocale('en')}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded transition-colors ${
                  locale === 'en'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                EN
              </button>
            </div>
          </div>

          <p className="text-slate-400 text-xs sm:text-sm mt-4 max-w-2xl leading-relaxed">
            {t('welcome.tagline')}
          </p>
        </div>

        {/* Action Buttons & Recent Projects Grid */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Left Column: Quick Actions */}
          <div className="md:col-span-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              INIZIA ORA
            </h3>

            {/* New Project Button */}
            <button
              onClick={onNewProject}
              className="w-full group p-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-left text-white shadow-lg shadow-purple-900/30 border border-purple-400/30 transition-all transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold tracking-wide">
                  {t('welcome.newProject')}
                </span>
                <span className="text-xs font-mono bg-purple-900/60 px-2 py-0.5 rounded border border-purple-400/40">
                  CTRL+N
                </span>
              </div>
              <p className="text-[11px] text-purple-100/80 mt-1">
                Avvia una nuova sessione multitraccia con Voice, Music & FX preconfigurati.
              </p>
            </button>

            {/* Load Project Button */}
            <button
              onClick={onLoadProject}
              className="w-full group p-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-left text-slate-200 border border-slate-800 hover:border-slate-700 shadow-md transition-all transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-slate-600"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderIcon className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-bold tracking-wide">
                    {t('welcome.loadProject')}
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  .json
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Apri un file di progetto salvato su disco con tutte le clip e dissolvenze.
              </p>
            </button>

            {/* Studio Feature Bullets */}
            <div className="pt-2 space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <SlidersIcon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Preset DSP broadcast & Master Limiter</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <DuckingIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Sidechain Ducking automatico in real-time</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <SparklesIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Audition Preview istantaneo nel File Bin</span>
              </div>
            </div>
          </div>

          {/* Right Column: Recent Projects */}
          <div className="md:col-span-7 flex flex-col">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono mb-4">
              {t('welcome.recentProjects')}
            </h3>

            {recents.length > 0 ? (
              <div className="space-y-2 flex-1 overflow-y-auto max-h-[260px] pr-1">
                {recents.slice(0, 6).map(path => (
                  <button
                    key={path}
                    onClick={() => onOpenRecent(path)}
                    className="w-full group p-3 rounded-xl bg-slate-950 hover:bg-slate-800/90 border border-slate-800/80 hover:border-purple-500/40 text-left transition-all flex items-center justify-between"
                    title={path}
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 group-hover:scale-125 transition-transform" />
                        <span className="text-xs font-bold text-slate-100 group-hover:text-purple-300 transition-colors truncate">
                          {fileName(path)}
                        </span>
                      </div>
                      <span className="block text-[10px] text-slate-500 font-mono truncate mt-0.5">
                        {path}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono text-slate-400 group-hover:text-purple-400 transition-colors shrink-0">
                      APRI →
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950/60 rounded-xl border border-slate-800/60 text-center">
                <FolderIcon className="w-8 h-8 text-slate-700 mb-2" />
                <p className="text-xs text-slate-400 font-medium">Nessun progetto recente trovato</p>
                <p className="text-[10px] text-slate-600 mt-1 max-w-[220px]">
                  Crea una nuova sessione o apri un file per vederlo apparire qui.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Studio Footer */}
        <div className="px-8 py-3 bg-slate-950 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 font-mono gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              {t('welcome.version')} {APP_VERSION} ({APP_VERSION_NAME})
            </span>
          </div>
          <div>
            <span>{t('welcome.createdBy')} </span>
            <span className="text-slate-300 font-semibold">{APP_AUTHOR}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
