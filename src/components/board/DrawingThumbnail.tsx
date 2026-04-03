'use client';

import { useState } from 'react';
import type { Drawing } from '@/lib/types';

interface DrawingThumbnailProps {
  drawing: Drawing;
}

export function DrawingThumbnail({ drawing }: DrawingThumbnailProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setLightboxOpen(true)}
        className="w-16 h-16 rounded border border-gray-200 dark:border-gray-600 overflow-hidden hover:ring-2 hover:ring-indigo-400 transition-all flex-shrink-0 bg-white"
        title="View drawing"
        aria-label="View drawing"
      >
        <img
          src={drawing.data}
          alt="Drawing"
          className="w-full h-full object-cover"
        />
      </button>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-lg w-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Drawing</h3>
              <button
                onClick={() => setLightboxOpen(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <img
              src={drawing.data}
              alt="Drawing (full size)"
              className="w-full rounded border border-gray-200 dark:border-gray-700"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-right">
              {new Date(drawing.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
