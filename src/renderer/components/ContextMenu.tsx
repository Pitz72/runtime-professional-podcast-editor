import React, { useEffect, useRef } from 'react';

// Lightweight context menu: desktop apps open a menu on right-click,
// they don't execute actions blindly.

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

export interface ContextMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

interface ContextMenuProps {
  menu: ContextMenuState;
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ menu, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', onClose);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', onClose);
    };
  }, [onClose]);

  // Keep the menu inside the viewport.
  const style: React.CSSProperties = {
    left: Math.min(menu.x, (typeof window !== 'undefined' ? window.innerWidth : 0) - 180),
    top: Math.min(menu.y, (typeof window !== 'undefined' ? window.innerHeight : 0) - menu.items.length * 36 - 12),
  };

  return (
    <div
      ref={ref}
      className="fixed z-[90] min-w-[160px] py-1 bg-gray-800 border border-gray-600 rounded-md shadow-2xl"
      style={style}
      role="menu"
    >
      {menu.items.map((item, index) => (
        <button
          key={index}
          role="menuitem"
          disabled={item.disabled}
          onClick={() => {
            onClose();
            item.onClick();
          }}
          className={`w-full text-left px-4 py-1.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed
            ${item.danger ? 'text-red-400 hover:bg-red-900/40' : 'text-gray-200 hover:bg-gray-700'}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};

export default ContextMenu;
