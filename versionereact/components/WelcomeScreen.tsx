import React from 'react';
import { APP_VERSION, APP_AUTHOR, APP_VERSION_NAME, APP_NAME, APP_DESCRIPTION } from '../constants';

interface WelcomeScreenProps {
  onNewProject: () => void;
  onLoadProject: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNewProject, onLoadProject }) => {
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
        <div className="mt-12 text-xs text-gray-500">
          <span>Version {APP_VERSION} ({APP_VERSION_NAME})</span>
          <span className="mx-2">|</span>
          <span>Created by {APP_AUTHOR}</span>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;