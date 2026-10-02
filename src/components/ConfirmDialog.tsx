import React, { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = true,
  onConfirm,
  onCancel,
}) => {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Safety: focus cancel button on open so pressing enter doesn't accidentally execute destructive action
    const timer = setTimeout(() => cancelBtnRef.current?.focus(), 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      onClick={onCancel}
    >
      <div
        className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl w-full max-w-md shadow-xl overflow-hidden p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start space-x-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isDestructive
                ? 'bg-red-50 text-[#B91C1C] border border-red-200'
                : 'bg-blue-50 text-[#2563EB] border border-blue-200'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="confirm-dialog-title" className="text-base font-bold text-[#111111] tracking-tight">
              {title}
            </h3>
            <p id="confirm-dialog-desc" className="text-xs text-[#6B6B67] mt-1 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-[#D9D9D4]">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-[#6B6B67] hover:text-[#111111] hover:bg-[#EBEBE7] rounded-xl transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-semibold rounded-xl text-white transition-all cursor-pointer shadow-xs active:scale-[0.98] ${
              isDestructive ? 'bg-[#B91C1C] hover:bg-red-700' : 'bg-[#111111] hover:bg-[#2563EB]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
