import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

interface EditMessageModalProps {
  isOpen: boolean;
  messageId: string;
  initialContent: string;
  onSave: (messageId: string, newContent: string) => void;
  onClose: () => void;
}

export const EditMessageModal: React.FC<EditMessageModalProps> = ({
  isOpen,
  messageId,
  initialContent,
  onSave,
  onClose,
}) => {
  const [content, setContent] = useState(initialContent);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSave(messageId, content.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none font-mono">
      <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-md w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#252526] border-b border-[#3c3c3c]">
          <h3 className="font-semibold text-xs text-[#cccccc]">
            Edit Message
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[#858585] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            className="w-full bg-[#252526] border border-[#3c3c3c] focus:border-[#007acc] rounded p-2.5 text-xs text-white placeholder-[#666666] outline-none font-mono resize-none transition-colors"
            placeholder="Edit your message..."
            autoFocus
          />

          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 text-xs rounded text-[#858585] hover:text-white hover:bg-[#37373d] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!content.trim()}
              className="px-3 py-1 text-xs font-semibold rounded bg-[#007acc] hover:bg-[#0062a3] disabled:opacity-40 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
