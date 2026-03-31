import { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '../lib/api';
import { ROLE_LABELS } from '../lib/database.types';
import { Send, Paperclip, X, FileText, Image, Download } from 'lucide-react';

export interface ChatMessage {
  id: string;
  workspaceId: string | null;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  createdAt: string;
}

interface ChatWidgetProps {
  workspaceId?: string;
  targetName?: string;
  mode: 'workspace' | 'superadmin';
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Hôm nay';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Hôm qua';
  }
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(role: string): string {
  switch (role) {
    case 'super_admin':
      return 'bg-red-100 text-red-700';
    case 'manager':
      return 'bg-blue-100 text-blue-700';
    case 'leader':
      return 'bg-purple-100 text-purple-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function isImageFile(fileType: string | null): boolean {
  if (!fileType) return false;
  return fileType.startsWith('image/');
}

function isExcelFile(fileName: string | null): boolean {
  if (!fileName) return false;
  return fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
}

function isWordFile(fileName: string | null): boolean {
  if (!fileName) return false;
  return fileName.endsWith('.docx') || fileName.endsWith('.doc');
}

export default function ChatWidget({ workspaceId, targetName = 'Super Admin', mode }: ChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const queryParam = mode === 'superadmin' && workspaceId ? `?workspaceId=${workspaceId}` : '';
      console.log('[ChatWidget] Fetching messages', { mode, workspaceId, queryParam });
      const msgs = await api.chat.messages.list(queryParam);
      console.log('[ChatWidget] Fetched messages count:', msgs.length);
      setMessages(msgs);
    } catch (err) {
      console.error('[ChatWidget] Failed to fetch messages:', err);
      throw err; // Re-throw so callers can catch and handle
    }
  }, [workspaceId, mode]);

  const fetchCurrentUser = async () => {
    try {
      const profile = await api.auth.me();
      setCurrentUserId(profile.id);
    } catch (err) {
      console.error('Failed to fetch current user:', err);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchMessages();

    // Poll for new messages every 5 seconds
    pollingRef.current = setInterval(() => {
      fetchMessages().catch(err => {
        console.error('[ChatWidget] Polling error:', err);
        setError('Không thể tải tin nhắn. Vui lòng thử lại.');
      });
    }, 5000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() && !uploading) return;

    setError(null);
    try {
      console.log('[ChatWidget] Sending message', { mode, workspaceId, message: newMessage.trim().substring(0, 50) });
      await api.chat.messages.send({
        message: newMessage.trim(),
        workspaceId: mode === 'superadmin' ? workspaceId : undefined,
      });
      setNewMessage('');
      // Fetch messages after successful send, catch errors to show error banner
      try {
        await fetchMessages();
      } catch (fetchErr) {
        console.error('[ChatWidget] Fetch after send failed:', fetchErr);
        setError('Gửi tin nhắn thành công nhưng không thể tải danh sách. Vui lòng đợi hoặc tải lại trang.');
      }
    } catch (err) {
      console.error('[ChatWidget] Failed to send message:', err);
      setError(err instanceof Error ? err.message : 'Gửi tin nhắn thất bại');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { url, fileName, fileType } = await api.chat.upload(file);

      // Send message with file attachment
      await api.chat.messages.send({
        message: '',
        workspaceId: mode === 'superadmin' && workspaceId ? workspaceId : undefined,
        fileUrl: url,
        fileName,
        fileType,
      });

      // Refresh messages after successful upload
      try {
        await fetchMessages();
      } catch (fetchErr) {
        console.error('[ChatWidget] Fetch after upload failed:', fetchErr);
        setError('Tải file lên thành công nhưng không thể tải danh sách. Vui lòng đợi hoặc tải lại trang.');
      }
    } catch (err) {
      console.error('[ChatWidget] Failed to upload file:', err);
      alert('Failed to upload file: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: ChatMessage[] }[] = [];
  let currentDate = '';

  messages.forEach(msg => {
    const msgDate = new Date(msg.createdAt).toDateString();
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msg.createdAt, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  });

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-700 font-bold text-sm">SA</span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{targetName}</h3>
            <p className="text-xs text-slate-500">Hỗ trợ 24/7</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {groupedMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Send className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">Chưa có tin nhắn nào</p>
            <p className="text-slate-400 text-sm mt-1">Bắt đầu cuộc trò chuyện với {targetName}</p>
          </div>
        )}

        {groupedMessages.map((group, groupIdx) => (
          <div key={groupIdx}>
            {/* Date divider */}
            <div className="flex items-center justify-center my-4">
              <span className="px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-500 font-medium">
                {formatDate(group.date)}
              </span>
            </div>

            {/* Messages for this date */}
            {group.messages.map(msg => {
              const isSelf = msg.senderId === currentUserId;
              return (
                <div key={msg.id} className={`flex ${isSelf ? 'justify-end' : 'justify-start'} mb-3`}>
                  {!isSelf && (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mr-2 shrink-0 ${getAvatarColor(msg.senderRole)}`}>
                      {getInitials(msg.senderName)}
                    </div>
                  )}
                  <div className={`max-w-[75%] ${isSelf ? 'order-1' : ''}`}>
                    {!isSelf && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-slate-700">{msg.senderName}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          msg.senderRole === 'super_admin' ? 'bg-red-100 text-red-600' :
                          msg.senderRole === 'manager' ? 'bg-blue-100 text-blue-600' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {ROLE_LABELS[msg.senderRole as keyof typeof ROLE_LABELS] || msg.senderRole}
                        </span>
                      </div>
                    )}
                    <div className={`rounded-2xl px-4 py-2 ${
                      isSelf
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-slate-100 text-slate-800 rounded-bl-md'
                    }`}>
                      {msg.message && <p className="text-sm whitespace-pre-wrap">{msg.message}</p>}

                      {/* File attachment */}
                      {msg.fileUrl && (
                        <div className={`mt-2 rounded-lg p-2 ${
                          isSelf ? 'bg-blue-500' : 'bg-white border border-slate-200'
                        }`}>
                          {isImageFile(msg.fileType) ? (
                            <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                              <img
                                src={msg.fileUrl}
                                alt={msg.fileName || 'Image'}
                                className="max-w-[200px] rounded-lg"
                              />
                            </a>
                          ) : (
                            <a
                              href={msg.fileUrl}
                              download={msg.fileName || undefined}
                              className={`flex items-center gap-2 text-sm ${
                                isSelf ? 'text-white hover:text-blue-100' : 'text-blue-600 hover:text-blue-700'
                              }`}
                            >
                              {isExcelFile(msg.fileName) ? (
                                <FileText className="w-5 h-5" />
                              ) : isWordFile(msg.fileName) ? (
                                <FileText className="w-5 h-5" />
                              ) : (
                                <Paperclip className="w-5 h-5" />
                              )}
                              <span className="truncate max-w-[150px]">{msg.fileName}</span>
                              <Download className="w-4 h-4 shrink-0" />
                            </a>
                          )}
                        </div>
                      )}

                      <p className={`text-[10px] mt-1 ${
                        isSelf ? 'text-blue-200' : 'text-slate-400'
                      }`}>
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Banner */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-slate-100 bg-slate-50">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập tin nhắn..."
              rows={1}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              style={{ maxHeight: '120px' }}
            />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.doc,.docx,.pdf,.png,.jpg,.jpeg"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl disabled:opacity-50"
            title="Đính kèm file"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || uploading}
            className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
          Nhấn Enter để gửi • Hỗ trợ file .xlsx, .xls, .doc, .docx, .pdf, .png, .jpg
        </p>
      </div>
    </div>
  );
}
