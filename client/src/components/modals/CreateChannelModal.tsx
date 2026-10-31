import React, { useState } from 'react';
import { X, Hash, Plus } from 'lucide-react';

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChannel: (name: string, description: string) => Promise<{ success: boolean; error?: string }>;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  isOpen,
  onClose,
  onCreateChannel,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanName = name.trim().toLowerCase().replace(/^#/, '');

    if (!cleanName) {
      setError('Channel name is required');
      return;
    }

    setIsSubmitting(true);
    const res = await onCreateChannel(cleanName, description.trim());
    setIsSubmitting(false);

    if (res.success) {
      setName('');
      setDescription('');
      onClose();
    } else {
      setError(res.error || 'Failed to create channel');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
      <div className="bg-[#090b0d] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 text-indigo-400 flex items-center justify-center">
              <Hash className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-zinc-100 font-mono">
              Create Channel
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 bg-red-950/40 border border-red-800/50 text-red-400 text-xs rounded-lg font-mono">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-mono font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
              Channel Name
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-zinc-500 font-mono text-sm">#</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                placeholder="rust-lang, devops, security..."
                className="w-full bg-[#0d0f12] border border-zinc-800 rounded-lg pl-7 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/80 font-mono transition-colors"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
              Description <span className="text-zinc-600 font-normal lowercase">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this channel about?"
              className="w-full bg-[#0d0f12] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/80 font-sans transition-colors"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-mono rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-3.5 py-1.5 text-xs font-mono font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Channel</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
