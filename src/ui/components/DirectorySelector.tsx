import { useEffect, useState } from "react";

interface DirectorySelectorProps {
  cwd: string;
  additionalDirectories: string[];
  onCwdChange: (value: string) => void;
  onAddDirectory: (dir: string) => void;
  onRemoveDirectory: (dir: string) => void;
  onApply: () => void;
  onClose: () => void;
}

export function DirectorySelector({
  cwd,
  additionalDirectories,
  onCwdChange,
  onAddDirectory,
  onRemoveDirectory,
  onApply,
  onClose
}: DirectorySelectorProps) {
  const [recentCwds, setRecentCwds] = useState<string[]>([]);

  useEffect(() => {
    window.electron.getRecentCwds().then(setRecentCwds).catch(console.error);
  }, []);

  const handleSelectDirectory = async () => {
    const result = await window.electron.selectDirectory();
    if (result) onCwdChange(result);
  };

  const handleAddAdditionalDirectory = async () => {
    const result = await window.electron.selectDirectory();
    if (result && result !== cwd && !additionalDirectories.includes(result)) {
      onAddDirectory(result);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/20 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-ink-900/5 bg-surface p-6 shadow-elevated">
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold text-ink-800">Select Working Directories</div>
          <button className="rounded-full p-1.5 text-muted hover:bg-surface-tertiary hover:text-ink-700 transition-colors" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="mt-2 text-sm text-muted">Choose the directories for Claude to work with.</p>

        <div className="mt-5 grid gap-4">
          {/* Main Directory */}
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-muted">Main Directory</span>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-xl border border-ink-900/10 bg-surface-secondary px-4 py-2.5 text-sm text-ink-800 placeholder:text-muted-light focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
                placeholder="/path/to/project"
                value={cwd}
                onChange={(e) => onCwdChange(e.target.value)}
              />
              <button
                type="button"
                onClick={handleSelectDirectory}
                className="rounded-xl border border-ink-900/10 bg-surface px-3 py-2 text-sm text-ink-700 hover:bg-surface-tertiary transition-colors"
              >
                Browse...
              </button>
            </div>
            {recentCwds.length > 0 && (
              <div className="mt-2 grid gap-2">
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-light">Recent</div>
                <div className="flex flex-wrap gap-2">
                  {recentCwds.map((path) => (
                    <button
                      key={path}
                      type="button"
                      className={`max-w-full truncate rounded-full border px-3 py-1.5 text-xs transition-colors ${cwd === path ? "border-accent/60 bg-accent/10 text-ink-800" : "border-ink-900/10 bg-white text-muted hover:border-ink-900/20 hover:text-ink-700"}`}
                      onClick={() => onCwdChange(path)}
                      title={path}
                    >
                      {path}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </label>

          {/* Additional Directories */}
          <div className="grid gap-1.5">
            <span className="text-xs font-medium text-muted">Additional Directories (Optional)</span>
            <p className="text-xs text-muted-light">Add more directories for cross-folder operations.</p>

            {additionalDirectories.length > 0 && (
              <div className="mt-2 space-y-2">
                {additionalDirectories.map((dir) => (
                  <div key={dir} className="flex items-center gap-2 rounded-xl border border-ink-900/10 bg-surface-secondary px-3 py-2">
                    <span className="flex-1 truncate text-sm text-ink-700" title={dir}>{dir}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveDirectory(dir)}
                      className="rounded-full p-1 text-muted hover:bg-error/10 hover:text-error transition-colors"
                      aria-label="Remove directory"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={handleAddAdditionalDirectory}
              className="mt-2 flex items-center gap-2 rounded-xl border border-dashed border-ink-900/20 px-3 py-2.5 text-sm text-muted hover:border-ink-900/40 hover:text-ink-700 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add Directory
            </button>
          </div>

          <button
            className="flex flex-col items-center rounded-full bg-accent px-5 py-3 text-sm font-medium text-white shadow-soft hover:bg-accent-hover transition-colors"
            onClick={onApply}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
