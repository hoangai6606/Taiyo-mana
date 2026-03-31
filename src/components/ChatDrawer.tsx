import { X } from 'lucide-react';
import ChatWidget from './ChatWidget';

interface ChatDrawerProps {
  workspaceId: string;
  workspaceName: string;
  onClose: () => void;
}

export default function ChatDrawer({ workspaceId, workspaceName, onClose }: ChatDrawerProps) {
  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-slate-100 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
          <div>
            <h2 className="font-semibold text-slate-900">Chat với Workspace</h2>
            <p className="text-sm text-slate-500">{workspaceName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Widget */}
        <div className="flex-1 overflow-hidden p-4">
          <ChatWidget
            workspaceId={workspaceId}
            targetName={workspaceName}
            mode="superadmin"
          />
        </div>
      </div>
    </div>
  );
}
