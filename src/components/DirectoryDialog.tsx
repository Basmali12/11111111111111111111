import React, { useState } from 'react';
import { Folder, HardDrive, CornerDownLeft, X, Check, ChevronRight, FolderPlus } from 'lucide-react';

interface DirectoryDialogProps {
  isOpen: boolean;
  initialPath: string;
  onClose: () => void;
  onSelectPath: (path: string) => void;
}

interface FolderItem {
  name: string;
  subfolders?: string[];
}

export const DirectoryDialog: React.FC<DirectoryDialogProps> = ({
  isOpen,
  initialPath,
  onClose,
  onSelectPath,
}) => {
  const [currentDrive, setCurrentDrive] = useState<string>('C:');
  const [currentPath, setCurrentPath] = useState<string>(initialPath || 'C:\\Data\\Exports');
  const [inputVal, setInputVal] = useState<string>(initialPath || 'C:\\Data\\Exports');
  const [folders, setFolders] = useState<FolderItem[]>([
    { name: 'Data', subfolders: ['Exports', 'Archives', 'Templates'] },
    { name: 'Program Files', subfolders: ['AppSystem', 'Common'] },
    { name: 'Users', subfolders: ['Admin', 'Public'] },
    { name: 'Backups', subfolders: ['Daily', 'Monthly'] },
    { name: 'Reports_2026', subfolders: ['Q1', 'Q2', 'Q3', 'Q4'] },
    { name: 'Excel_Databases', subfolders: ['Accounting', 'Inventory'] },
  ]);

  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);

  if (!isOpen) return null;

  const handleDriveChange = (drive: string) => {
    setCurrentDrive(drive);
    const newP = `${drive}\\Data\\Exports`;
    setCurrentPath(newP);
    setInputVal(newP);
  };

  const handleSelectFolder = (name: string) => {
    const updated = `${currentDrive}\\${name}`;
    setCurrentPath(updated);
    setInputVal(updated);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    setFolders((prev) => [...prev, { name: newFolderName.trim() }]);
    const newPath = `${currentDrive}\\${newFolderName.trim()}`;
    setCurrentPath(newPath);
    setInputVal(newPath);
    setNewFolderName('');
    setShowNewFolderInput(false);
  };

  const handleConfirm = () => {
    const finalPath = inputVal.trim() || currentPath;
    onSelectPath(finalPath);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-neutral-850 border-b border-neutral-800">
          <div className="flex items-center gap-2 text-neutral-200">
            <Folder className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-sm">محاكاة نافذة استعراض المجلدات (filedialog.askdirectory)</span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Path Breadcrumbs / Input Bar */}
        <div className="p-4 border-b border-neutral-800 bg-neutral-900/60 flex items-center gap-2">
          <span className="text-xs text-neutral-400 shrink-0 font-medium">المسار المختار:</span>
          <div className="flex-1 relative">
            <input
              type="text"
              dir="ltr"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-neutral-200 font-mono focus:outline-hidden focus:border-blue-500"
              placeholder="مثال: C:\Data\Exports"
            />
          </div>
        </div>

        {/* Directory Explorer Body */}
        <div className="flex h-72">
          {/* Drives Sidebar */}
          <div className="w-44 bg-neutral-950 border-l border-neutral-800 p-3 flex flex-col gap-1 shrink-0 overflow-y-auto">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider px-2 py-1">
              الأقراص والأماكن
            </span>
            {['C:', 'D:', 'E:'].map((drive) => (
              <button
                key={drive}
                onClick={() => handleDriveChange(drive)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-right w-full ${
                  currentDrive === drive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-neutral-300 hover:bg-neutral-800/80 hover:text-white'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5 shrink-0" />
                <span dir="ltr">{drive} القرص المحلي</span>
              </button>
            ))}

            <div className="mt-3 pt-3 border-t border-neutral-800 flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider px-2 py-1">
                المجلدات السريعة
              </span>
              <button
                onClick={() => {
                  const p = `C:\\Users\\Admin\\Documents\\AppExports`;
                  setCurrentPath(p);
                  setInputVal(p);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-neutral-300 hover:bg-neutral-800 text-right"
              >
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                <span>المستندات</span>
              </button>
              <button
                onClick={() => {
                  const p = `C:\\ProgramData\\AppExports`;
                  setCurrentPath(p);
                  setInputVal(p);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-neutral-300 hover:bg-neutral-800 text-right"
              >
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                <span>ProgramData</span>
              </button>
            </div>
          </div>

          {/* Folder Content Grid */}
          <div className="flex-1 p-4 bg-neutral-900 overflow-y-auto flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-neutral-400 font-medium">محتويات {currentDrive}\</span>
                <button
                  onClick={() => setShowNewFolderInput(true)}
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>مجلد جديد</span>
                </button>
              </div>

              {showNewFolderInput && (
                <div className="flex items-center gap-2 mb-3 p-2 bg-neutral-800/70 rounded-lg border border-neutral-700">
                  <input
                    type="text"
                    placeholder="اسم المجلد..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1 text-xs text-white"
                  />
                  <button
                    onClick={handleCreateFolder}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs"
                  >
                    إضافة
                  </button>
                  <button
                    onClick={() => setShowNewFolderInput(false)}
                    className="px-2 py-1 text-neutral-400 hover:text-white text-xs"
                  >
                    إلغاء
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {folders.map((folder) => {
                  const isSelected = inputVal.includes(folder.name);
                  return (
                    <button
                      key={folder.name}
                      onClick={() => handleSelectFolder(folder.name)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-right transition-colors ${
                        isSelected
                          ? 'bg-blue-900/30 border-blue-500/60 text-white'
                          : 'bg-neutral-850/60 border-neutral-800 hover:border-neutral-700 text-neutral-200 hover:bg-neutral-800'
                      }`}
                    >
                      <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" dir="ltr">
                          {folder.name}
                        </p>
                        {folder.subfolders && (
                          <p className="text-[10px] text-neutral-500 truncate" dir="ltr">
                            {folder.subfolders.join(' / ')}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-800 text-[11px] text-neutral-400">
              💡 في كود بايثون الحقيقي، يتم استدعاء <code className="font-mono text-blue-300">filedialog.askdirectory()</code> وتفتح نافذة الويندوز/الماك الأصلية مباشرة.
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-neutral-850 border-t border-neutral-800">
          <span className="text-xs text-neutral-400 font-mono truncate max-w-xs" dir="ltr">
            {inputVal}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleConfirm}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>تحديد هذا المجلد</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
