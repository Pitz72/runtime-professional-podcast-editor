import React, { useEffect, useState } from 'react';
import { APP_VERSION, APP_AUTHOR, APP_VERSION_NAME, APP_NAME } from '../constants';
import { useT, useI18nStore, Locale } from '../i18n';

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
    <div className="flex items-center justify-center h-full bg-gray-900">
      <div className="text-center p-12 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 max-w-2xl w-full">
        <h1 className="text-5xl font-bold text-white mb-2">
          {APP_NAME}
        </h1>
        <h2 className="text-3xl font-light text-purple-400 mb-6">
          {APP_VERSION_NAME}
        </h2>
        <p className="text-gray-400 mb-8 max-w-lg mx-auto">
          {t('welcome.tagline')}
        </p>
        <div className="flex justify-center gap-6">
          <button
            onClick={onNewProject}
            className="px-8 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-transform transform hover:scale-105"
          >
            {t('welcome.newProject')}
          </button>
          <button
            onClick={onLoadProject}
            className="px-8 py-3 bg-gray-600 text-white font-semibold rounded-lg shadow-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition-transform transform hover:scale-105"
          >
            {t('welcome.loadProject')}
          </button>
        </div>

        {recents.length > 0 && (
          <div className="mt-8 text-left max-w-md mx-auto">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {t('welcome.recentProjects')}
            </h3>
            <ul className="space-y-1">
              {recents.slice(0, 5).map(path => (
                <li key={path}>
                  <button
                    onClick={() => onOpenRecent(path)}
                    className="w-full text-left px-3 py-2 rounded-md bg-gray-700/50 hover:bg-gray-700 text-sm"
                    title={path}
                  >
                    <span className="text-purple-300 font-medium">{fileName(path)}</span>
                    <span className="block text-xs text-gray-500 truncate">{path}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-2">
          <label htmlFor="language-select" className="text-xs text-gray-500">{t('welcome.language')}:</label>
          <select
            id="language-select"
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            className="px-2 py-1 bg-gray-700 border border-gray-600 rounded-md text-white text-xs focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="it">Italiano</option>
            <option value="en">English (US)</option>
          </select>
        </div>

        <div className="mt-8 text-xs text-gray-500">
          <span>{t('welcome.version')} {APP_VERSION} ({APP_VERSION_NAME})</span>
          <span className="mx-2">|</span>
          <span>{t('welcome.createdBy')} {APP_AUTHOR}</span>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
