/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, ReactNode, useRef } from 'react';
import { 
  MessageCircle, 
  Grid2X2, 
  Compass, 
  User, 
  Search, 
  Plus, 
  ChevronRight,
  Camera,
  Scan,
  Gamepad2,
  ShoppingBag,
  Heart,
  Settings,
  ChevronLeft,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  Shield,
  Database,
  Download,
  Upload,
  FileText,
  ImagePlus,
  X,
  Smile,
  PlusCircle,
  MoreHorizontal,
  Trash2,
  Pin,
  Sparkles,
  Mic,
  FileUp,
  CheckSquare,
  Square,
  ToggleLeft,
  ToggleRight,
  FolderInput,
  Image,
  Video,
  MapPin,
  Banknote,
  Book,
  Music,
  Gift,
  ArrowRightLeft,
  Box
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import mammoth from 'mammoth';
import { GoogleGenAI } from '@google/genai';

// --- Types ---
type Tab = 'chat' | 'mini' | 'discover' | 'me';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  type: 'text' | 'sticker';
  content: string;
  stickerName?: string;
  timestamp: number;
}

interface ChatItem {
  id: string;
  name: string;
  lastMsg: string;
  time: string;
  avatar: string;
  unread?: number;
  remark?: string;
  persona?: string;
  isPinned?: boolean;
  timestamp?: number;
}

const formatMessageTime = (ts: number | string) => {
  if (!ts) return '';
  const date = new Date(ts);
  if (isNaN(date.getTime())) return String(ts); // fallback for old string formats
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  const diffTime = today.getTime() - targetDay.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  const timeStr = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  
  if (diffDays === 0) {
    return timeStr;
  } else if (diffDays === 1) {
    return `昨天 ${timeStr}`;
  } else if (diffDays < 30 && diffDays > 1) {
    return `${diffDays}天前 ${timeStr}`;
  } else {
    return `${date.getFullYear()}年${pad(date.getMonth() + 1)}月${pad(date.getDate())}日 ${timeStr}`;
  }
};

interface ApiConfig {
  url: string;
  key: string;
  model: string;
  presetId?: string;
  groupId?: string;
}

interface Preset {
  id: string;
  name: string;
  config: ApiConfig;
}

interface AppSettings {
  password: string;
  globalApi: ApiConfig;
  roleApi: ApiConfig;
  otherApi: ApiConfig;
  minimaxEnabled: boolean;
  minimaxApi: ApiConfig;
  presets: Preset[];
}

// --- Hooks ---
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      setStoredValue(prev => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        return valueToStore;
      });
    } catch (error) {
      console.log(error);
    }
  };

  return [storedValue, setValue] as const;
}

// --- Components ---

const Header = ({ title, showSearch = true, onAddClick }: { title: string, showSearch?: boolean, onAddClick?: () => void }) => (
  <header className="sticky top-0 z-20 w-full px-4 pt-12 pb-3 flex items-center justify-between bg-misty-pink/80 ios-blur border-b border-misty-pink-dark/30">
    <h1 className="text-xl font-bold tracking-tight text-slate-800">{title}</h1>
    <div className="flex items-center gap-4">
      {showSearch && <Search size={22} className="text-slate-600" />}
      <button onClick={onAddClick} className="active:opacity-50 transition-opacity">
        <Plus size={24} className="text-slate-600" />
      </button>
    </div>
  </header>
);

const SwipeableChatItem = ({ 
  chat, 
  onClick, 
  onPin, 
  onDelete 
}: { 
  key?: string | number,
  chat: ChatItem, 
  onClick: () => void, 
  onPin: () => void, 
  onDelete: () => void 
}) => {
  const [isSwiped, setIsSwiped] = useState(false);

  return (
    <div className="relative overflow-hidden w-full bg-slate-100 border-b border-misty-pink/30">
      {/* Background actions */}
      <div className="absolute inset-y-0 right-0 flex">
        <button 
          onClick={(e) => { e.stopPropagation(); onPin(); setIsSwiped(false); }} 
          className="bg-blue-500 text-white w-16 flex flex-col items-center justify-center text-xs font-medium active:bg-blue-600 transition-colors"
        >
          <Pin size={20} className="mb-1" />
          {chat.isPinned ? '取消' : '置顶'}
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); setIsSwiped(false); }} 
          className="bg-red-500 text-white w-16 flex flex-col items-center justify-center text-xs font-medium active:bg-red-600 transition-colors"
        >
          <Trash2 size={20} className="mb-1" />
          删除
        </button>
      </div>
      
      {/* Foreground item */}
      <motion.div
        drag="x"
        dragConstraints={{ left: isSwiped ? -128 : 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={(e, info) => {
          if (info.offset.x < -40 || info.velocity.x < -200) {
            setIsSwiped(true);
          } else if (info.offset.x > 40 || info.velocity.x > 200) {
            setIsSwiped(false);
          }
        }}
        animate={{ x: isSwiped ? -128 : 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative bg-soft-white z-10 flex items-center gap-3 px-4 py-3"
        whileTap={{ backgroundColor: '#f5f5f5' }}
        onClick={(e) => {
          if (isSwiped) {
            e.stopPropagation();
            setIsSwiped(false);
          } else {
            onClick();
          }
        }}
      >
        <div className="relative">
          {chat.avatar ? (
            <img 
              src={chat.avatar} 
              alt={chat.name} 
              className="w-14 h-14 rounded-2xl object-cover shadow-sm border-2 border-white bg-slate-100"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl shadow-sm border-2 border-white bg-slate-100 flex items-center justify-center text-slate-400">
              <User size={28} />
            </div>
          )}
          {!!chat.unread && chat.unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
              {chat.unread}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline mb-1">
            <h3 className="font-semibold text-[17px] text-slate-800 truncate">
              {chat.remark || chat.name}
            </h3>
            <span className="text-xs text-ios-gray">{formatMessageTime(chat.timestamp || chat.time)}</span>
          </div>
          <p className="text-sm text-ios-gray truncate">{chat.lastMsg}</p>
        </div>
      </motion.div>
    </div>
  );
};

const ChatView = ({ 
  chats, 
  onPin, 
  onDelete, 
  onChatClick 
}: { 
  chats: ChatItem[], 
  onPin: (id: string) => void, 
  onDelete: (id: string) => void,
  onChatClick: (chat: ChatItem) => void
}) => {
  const sortedChats = [...chats].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col h-full"
    >
      {sortedChats.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-32 text-ios-gray">
          <MessageCircle size={48} className="mb-4 opacity-20" />
          <p className="text-sm">暂无消息</p>
        </div>
      ) : (
        sortedChats.map((chat) => (
          <SwipeableChatItem 
            key={chat.id} 
            chat={chat} 
            onClick={() => onChatClick(chat)}
            onPin={() => onPin(chat.id)}
            onDelete={() => onDelete(chat.id)}
          />
        ))
      )}
    </motion.div>
  );
};

const MiniProgramView = () => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="p-4 grid grid-cols-4 gap-y-6"
  >
    {[
      { name: '美团', icon: <ShoppingBag className="text-orange-400" /> },
      { name: '游戏中心', icon: <Gamepad2 className="text-blue-400" /> },
      { name: '健康码', icon: <Heart className="text-green-400" /> },
      { name: '扫一扫', icon: <Scan className="text-purple-400" /> },
      { name: '小程序1', icon: <Grid2X2 className="text-pink-400" /> },
      { name: '小程序2', icon: <Grid2X2 className="text-yellow-500" /> },
      { name: '小程序3', icon: <Grid2X2 className="text-indigo-400" /> },
      { name: '更多', icon: <Plus className="text-slate-400" /> },
    ].map((item, i) => (
      <div key={i} className="flex flex-col items-center gap-2">
        <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-misty-pink/20">
          {item.icon}
        </div>
        <span className="text-xs text-slate-600">{item.name}</span>
      </div>
    ))}
  </motion.div>
);

const DiscoverView = () => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="flex flex-col gap-4 py-4"
  >
    <div className="bg-white/60 border-y border-misty-pink/30">
      <div className="flex items-center justify-between px-4 py-4 border-b border-misty-pink/20">
        <div className="flex items-center gap-3">
          <Camera size={22} className="text-blue-500" />
          <span className="text-[17px]">朋友圈</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md overflow-hidden border border-misty-pink/30">
            <img src="https://picsum.photos/seed/moments/50/50" alt="new" referrerPolicy="no-referrer" />
          </div>
          <ChevronRight size={18} className="text-ios-gray" />
        </div>
      </div>
    </div>

    <div className="bg-white/60 border-y border-misty-pink/30">
      {[
        { icon: <Scan size={22} className="text-blue-400" />, name: '扫一扫' },
        { icon: <Compass size={22} className="text-orange-400" />, name: '看一看' },
        { icon: <Search size={22} className="text-red-400" />, name: '搜一搜' },
      ].map((item, i) => (
        <div key={i} className="flex items-center justify-between px-4 py-4 border-b border-misty-pink/20 last:border-0">
          <div className="flex items-center gap-3">
            {item.icon}
            <span className="text-[17px]">{item.name}</span>
          </div>
          <ChevronRight size={18} className="text-ios-gray" />
        </div>
      ))}
    </div>
  </motion.div>
);

const ProfileView = ({ onOpenSettings }: { onOpenSettings: () => void }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="flex flex-col gap-4"
  >
    <div className="bg-white/80 px-4 py-8 flex items-center gap-4 border-b border-misty-pink/30">
      <div className="w-20 h-20 rounded-2xl shadow-md border-2 border-white bg-slate-100 flex items-center justify-center text-slate-400">
        <User size={40} />
      </div>
      <div className="flex-1">
        <h2 className="text-2xl font-bold text-slate-800">Sjzn User</h2>
        <p className="text-ios-gray text-sm mt-1">微信号: sjzn_phone</p>
      </div>
      <ChevronRight size={20} className="text-ios-gray" />
    </div>

    <div className="bg-white/60 border-y border-misty-pink/30">
      <div className="flex items-center justify-between px-4 py-4 border-b border-misty-pink/20">
        <div className="flex items-center gap-3">
          <Heart size={22} className="text-red-400" />
          <span className="text-[17px]">收藏</span>
        </div>
        <ChevronRight size={18} className="text-ios-gray" />
      </div>
      <div className="flex items-center justify-between px-4 py-4 border-b border-misty-pink/20">
        <div className="flex items-center gap-3">
          <ShoppingBag size={22} className="text-blue-400" />
          <span className="text-[17px]">卡包</span>
        </div>
        <ChevronRight size={18} className="text-ios-gray" />
      </div>
      <div 
        className="flex items-center justify-between px-4 py-4 border-b border-misty-pink/20 cursor-pointer active:bg-misty-pink/20 transition-colors"
        onClick={onOpenSettings}
      >
        <div className="flex items-center gap-3">
          <Settings size={22} className="text-slate-500" />
          <span className="text-[17px]">设置</span>
        </div>
        <ChevronRight size={18} className="text-ios-gray" />
      </div>
    </div>
  </motion.div>
);

const ApiConfigBlock = ({ 
  title, 
  config, 
  onChange, 
  presets, 
  onSavePreset, 
  showToast,
  placeholderText 
}: {
  title: string;
  config: ApiConfig;
  onChange: (c: ApiConfig) => void;
  presets: Preset[];
  onSavePreset: (name: string, config: ApiConfig) => void;
  showToast: (msg: string) => void;
  placeholderText?: string;
}) => {
  const [showKey, setShowKey] = useState(false);
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFetch = async () => {
    if (!config.url || !config.key) {
      showToast('请先填写 URL 和 API 密钥');
      return;
    }
    setIsFetching(true);
    try {
      const baseUrl = config.url.replace(/\/v1(\/chat\/completions)?\/?$/, '');
      const endpoint = `${baseUrl}/v1/models`;
      const res = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${config.key}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data?.data && Array.isArray(data.data)) {
        const models = data.data.map((m: any) => m.id);
        setFetchedModels(models);
        onChange({ ...config, model: '' });
        setShowModelDropdown(true);
        showToast(`成功拉取 ${models.length} 个模型`);
      } else {
        throw new Error('数据格式不正确');
      }
    } catch (error: any) {
      showToast(`拉取失败: ${error.message}`);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSavePreset = () => {
    if (newPresetName.trim()) {
      onSavePreset(newPresetName, config);
      setIsSavingPreset(false);
      setNewPresetName('');
    }
  };

  return (
    <div className="bg-white/80 rounded-2xl p-4 mb-4 shadow-sm border border-misty-pink/30">
      <h3 className="font-semibold text-slate-800 mb-3">{title}</h3>
      
      {/* Preset Selector */}
      <div className="mb-3">
        <label className="text-xs text-ios-gray block mb-1">切换预设</label>
        <select 
          className="w-full bg-slate-50 border border-misty-pink/30 rounded-lg px-3 py-2 text-sm outline-none focus:border-misty-pink-dark"
          value={config.presetId || ''}
          onChange={(e) => {
            const preset = presets.find((p) => p.id === e.target.value);
            if (preset) {
              onChange({ ...preset.config, presetId: preset.id });
            } else {
              onChange({ ...config, presetId: '' });
            }
          }}
        >
          <option value="">自定义 / {placeholderText || '默认'}</option>
          {presets.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* URL */}
      <div className="mb-3">
        <label className="text-xs text-ios-gray block mb-1">API URL</label>
        <input 
          type="text" 
          placeholder={placeholderText || "https://api.example.com"}
          className="w-full bg-slate-50 border border-misty-pink/30 rounded-lg px-3 py-2 text-sm outline-none focus:border-misty-pink-dark"
          value={config.url}
          onChange={(e) => onChange({ ...config, url: e.target.value, presetId: '' })}
        />
      </div>

      {/* Key */}
      <div className="mb-3 relative">
        <label className="text-xs text-ios-gray block mb-1">API 密钥</label>
        <div className="relative">
          <input 
            type={showKey ? "text" : "password"} 
            placeholder={placeholderText || "sk-..."}
            className="w-full bg-slate-50 border border-misty-pink/30 rounded-lg px-3 py-2 pr-10 text-sm outline-none focus:border-misty-pink-dark"
            value={config.key}
            onChange={(e) => onChange({ ...config, key: e.target.value, presetId: '' })}
          />
          <button 
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ios-gray hover:text-slate-600"
          >
            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Model & Fetch */}
      <div className="mb-3">
        <label className="text-xs text-ios-gray block mb-1">模型 (Model)</label>
        <div className="flex gap-2 relative" ref={dropdownRef}>
          <input 
            type="text" 
            placeholder={placeholderText || "gpt-3.5-turbo"}
            className="flex-1 bg-slate-50 border border-misty-pink/30 rounded-lg px-3 py-2 text-sm outline-none focus:border-misty-pink-dark"
            value={config.model}
            onChange={(e) => {
              onChange({ ...config, model: e.target.value, presetId: '' });
              setShowModelDropdown(false);
            }}
            onFocus={() => {
              if (fetchedModels.length > 0) setShowModelDropdown(true);
            }}
          />
          {showModelDropdown && fetchedModels.length > 0 && (
            <div className="absolute top-full left-0 right-[80px] mt-1 bg-white border border-misty-pink/30 rounded-lg shadow-lg z-50 max-h-[180px] overflow-y-auto">
              {fetchedModels.map(m => (
                <div 
                  key={m} 
                  className="px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer text-slate-700"
                  onClick={() => {
                    onChange({ ...config, model: m, presetId: '' });
                    setShowModelDropdown(false);
                  }}
                >
                  {m}
                </div>
              ))}
            </div>
          )}
          <button 
            onClick={handleFetch}
            disabled={isFetching}
            className="bg-misty-pink-dark/20 text-misty-pink-dark px-3 py-2 rounded-lg text-sm font-medium hover:bg-misty-pink-dark/30 transition-colors flex items-center gap-1 whitespace-nowrap disabled:opacity-50"
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
            {isFetching ? '拉取中' : '拉取'}
          </button>
        </div>
      </div>

      {/* Save Preset */}
      <div className="mt-4 pt-3 border-t border-misty-pink/20">
        {isSavingPreset ? (
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="输入名字 保存为预设"
              className="flex-1 bg-slate-50 border border-misty-pink/30 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-misty-pink-dark"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              autoFocus
            />
            <button 
              onClick={handleSavePreset}
              className="bg-misty-pink-dark text-white px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              保存
            </button>
            <button 
              onClick={() => setIsSavingPreset(false)}
              className="bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              取消
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsSavingPreset(true)}
            className="text-misty-pink-dark text-sm font-medium flex items-center gap-1 hover:opacity-80"
          >
            <Save size={14} />
            保存为全局预设
          </button>
        )}
      </div>
    </div>
  );
};

const MinimaxConfigBlock = ({ 
  config, 
  enabled,
  onChange, 
  onEnabledChange,
  presets, 
  onSavePreset, 
  showToast,
}: {
  config: ApiConfig;
  enabled: boolean;
  onChange: (c: ApiConfig) => void;
  onEnabledChange: (e: boolean) => void;
  presets: Preset[];
  onSavePreset: (name: string, config: ApiConfig) => void;
  showToast: (msg: string) => void;
}) => {
  const [showKey, setShowKey] = useState(false);
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFetch = async () => {
    const url = config.url || 'https://api.minimax.chat/v1';
    if (!config.key || !config.groupId) {
      showToast('请先填写 Group ID 和 API 密钥');
      return;
    }
    setIsFetching(true);
    try {
      const baseUrl = url.replace(/\/v1(\/chat\/completions)?\/?$/, '');
      const endpoint = `${baseUrl}/v1/models`;
      const res = await fetch(endpoint, {
        headers: { 
          'Authorization': `Bearer ${config.key}`,
          'GroupId': config.groupId
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data?.data && Array.isArray(data.data)) {
        const models = data.data.map((m: any) => m.id);
        setFetchedModels(models);
        onChange({ ...config, model: '' });
        setShowModelDropdown(true);
        showToast(`成功拉取 ${models.length} 个模型`);
      } else {
        throw new Error('数据格式不正确');
      }
    } catch (error: any) {
      showToast(`拉取失败: ${error.message}`);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSavePreset = () => {
    if (newPresetName.trim()) {
      onSavePreset(newPresetName, config);
      setIsSavingPreset(false);
      setNewPresetName('');
    }
  };

  return (
    <div className="bg-white/80 rounded-2xl p-4 mb-4 shadow-sm border border-misty-pink/30">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-800">MiniMax 配备 API</h3>
        <label className="flex items-center cursor-pointer">
          <div className="relative">
            <input 
              type="checkbox" 
              className="sr-only" 
              checked={enabled}
              onChange={(e) => onEnabledChange(e.target.checked)}
            />
            <div className={`block w-10 h-6 rounded-full transition-colors ${enabled ? 'bg-misty-pink-dark' : 'bg-slate-300'}`}></div>
            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${enabled ? 'translate-x-4' : ''}`}></div>
          </div>
        </label>
      </div>
      
      {enabled && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="overflow-hidden"
        >
          {/* Preset Selector */}
          <div className="mb-3">
            <label className="text-xs text-ios-gray block mb-1">切换预设</label>
            <select 
              className="w-full bg-slate-50 border border-misty-pink/30 rounded-lg px-3 py-2 text-sm outline-none focus:border-misty-pink-dark"
              value={config.presetId || ''}
              onChange={(e) => {
                const preset = presets.find((p) => p.id === e.target.value);
                if (preset) {
                  onChange({ ...preset.config, presetId: preset.id });
                } else {
                  onChange({ ...config, presetId: '' });
                }
              }}
            >
              <option value="">自定义 / 默认国内</option>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Group ID */}
          <div className="mb-3">
            <label className="text-xs text-ios-gray block mb-1">Group ID</label>
            <input 
              type="text" 
              placeholder="输入 Group ID"
              className="w-full bg-slate-50 border border-misty-pink/30 rounded-lg px-3 py-2 text-sm outline-none focus:border-misty-pink-dark"
              value={config.groupId || ''}
              onChange={(e) => onChange({ ...config, groupId: e.target.value, presetId: '' })}
            />
          </div>

          {/* Key */}
          <div className="mb-3 relative">
            <label className="text-xs text-ios-gray block mb-1">API 密钥</label>
            <div className="relative">
              <input 
                type={showKey ? "text" : "password"} 
                placeholder="输入 API Key"
                className="w-full bg-slate-50 border border-misty-pink/30 rounded-lg px-3 py-2 pr-10 text-sm outline-none focus:border-misty-pink-dark"
                value={config.key}
                onChange={(e) => onChange({ ...config, key: e.target.value, presetId: '' })}
              />
              <button 
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ios-gray hover:text-slate-600"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Model & Fetch */}
          <div className="mb-3">
            <label className="text-xs text-ios-gray block mb-1">模型 (Model)</label>
            <div className="flex gap-2 relative" ref={dropdownRef}>
              <input 
                type="text" 
                placeholder="abab6.5s-chat"
                className="flex-1 bg-slate-50 border border-misty-pink/30 rounded-lg px-3 py-2 text-sm outline-none focus:border-misty-pink-dark"
                value={config.model}
                onChange={(e) => {
                  onChange({ ...config, model: e.target.value, presetId: '' });
                  setShowModelDropdown(false);
                }}
                onFocus={() => {
                  if (fetchedModels.length > 0) setShowModelDropdown(true);
                }}
              />
              {showModelDropdown && fetchedModels.length > 0 && (
                <div className="absolute top-full left-0 right-[80px] mt-1 bg-white border border-misty-pink/30 rounded-lg shadow-lg z-50 max-h-[180px] overflow-y-auto">
                  {fetchedModels.map(m => (
                    <div 
                      key={m} 
                      className="px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer text-slate-700"
                      onClick={() => {
                        onChange({ ...config, model: m, presetId: '' });
                        setShowModelDropdown(false);
                      }}
                    >
                      {m}
                    </div>
                  ))}
                </div>
              )}
              <button 
                onClick={handleFetch}
                disabled={isFetching}
                className="bg-misty-pink-dark/20 text-misty-pink-dark px-3 py-2 rounded-lg text-sm font-medium hover:bg-misty-pink-dark/30 transition-colors flex items-center gap-1 whitespace-nowrap disabled:opacity-50"
              >
                <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
                {isFetching ? '拉取中' : '拉取'}
              </button>
            </div>
          </div>

          {/* Save Preset */}
          <div className="mt-4 pt-3 border-t border-misty-pink/20">
            {isSavingPreset ? (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="输入名字 保存为预设"
                  className="flex-1 bg-slate-50 border border-misty-pink/30 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-misty-pink-dark"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  autoFocus
                />
                <button 
                  onClick={handleSavePreset}
                  className="bg-misty-pink-dark text-white px-3 py-1.5 rounded-lg text-sm font-medium"
                >
                  保存
                </button>
                <button 
                  onClick={() => setIsSavingPreset(false)}
                  className="bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-sm font-medium"
                >
                  取消
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsSavingPreset(true)}
                className="text-misty-pink-dark text-sm font-medium flex items-center gap-1 hover:opacity-80"
              >
                <Save size={14} />
                保存为全局预设
              </button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

const SettingsView = ({ onBack }: { onBack: () => void }) => {
  const [settings, setSettings] = useLocalStorage<AppSettings>('sjzn_settings', {
    password: '',
    globalApi: { url: '', key: '', model: '' },
    roleApi: { url: '', key: '', model: '' },
    otherApi: { url: '', key: '', model: '' },
    minimaxEnabled: false,
    minimaxApi: { url: '', key: '', model: '', groupId: '' },
    presets: []
  });

  const [showPassword, setShowPassword] = useState(false);
  const [fetchToast, setFetchToast] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSavePreset = (name: string, config: ApiConfig) => {
    const newPreset: Preset = {
      id: Date.now().toString(),
      name,
      config: { ...config, presetId: undefined }
    };
    setSettings(prev => ({
      ...prev,
      presets: [...prev.presets, newPreset]
    }));
  };

  const updateApi = (key: keyof AppSettings, newConfig: ApiConfig) => {
    setSettings(prev => ({ ...prev, [key]: newConfig }));
  };

  const showToast = (msg: string) => {
    setFetchToast(msg);
    setTimeout(() => setFetchToast(''), 3000);
  };

  const handleExportData = async () => {
    showToast('正在压缩并导出数据...');
    // 模拟压缩图片的耗时
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const exportData: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sjzn_')) {
        exportData[key] = localStorage.getItem(key);
      }
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sjzn_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('导出成功！');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        let importedCount = 0;
        for (const key in importedData) {
          if (key.startsWith('sjzn_')) {
            localStorage.setItem(key, importedData[key]);
            importedCount++;
          }
        }
        if (importedCount > 0) {
          showToast('导入成功，即将刷新页面...');
          setTimeout(() => window.location.reload(), 1500);
        } else {
          showToast('导入失败：未找到有效数据');
        }
      } catch (error) {
        showToast('导入失败：文件格式错误');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute inset-0 bg-slate-100 z-50 flex flex-col"
    >
      <header className="sticky top-0 z-20 w-full px-4 pt-12 pb-3 flex items-center bg-misty-pink/90 ios-blur border-b border-misty-pink-dark/30">
        <button onClick={onBack} className="flex items-center text-slate-800 -ml-2">
          <ChevronLeft size={28} />
          <span className="text-[17px]">返回</span>
        </button>
        <h1 className="text-[17px] font-semibold absolute left-1/2 -translate-x-1/2">设置</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 pb-safe-area-bottom">
        {/* Toast */}
        <AnimatePresence>
          {fetchToast && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 bg-slate-800/80 text-white px-4 py-2 rounded-full text-sm z-50 ios-blur"
            >
              {fetchToast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Account Security */}
        <div className="bg-white/80 rounded-2xl p-4 mb-6 shadow-sm border border-misty-pink/30">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Shield size={18} className="text-misty-pink-dark" />
            账号安全
          </h3>
          <div className="relative">
            <label className="text-xs text-ios-gray block mb-1">设置密码</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="输入应用密码"
                className="w-full bg-slate-50 border border-misty-pink/30 rounded-lg px-3 py-2 pr-10 text-sm outline-none focus:border-misty-pink-dark"
                value={settings.password}
                onChange={(e) => setSettings(prev => ({ ...prev, password: e.target.value }))}
              />
              <button 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ios-gray hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* API Settings */}
        <h2 className="text-sm font-semibold text-ios-gray mb-2 ml-2 uppercase tracking-wider">API 配置 (自动保存)</h2>
        
        <ApiConfigBlock 
          title="全局 API 设置" 
          config={settings.globalApi} 
          onChange={(c) => updateApi('globalApi', c)}
          presets={settings.presets}
          onSavePreset={handleSavePreset}
          showToast={showToast}
        />

        <ApiConfigBlock 
          title="角色自主活动 API" 
          config={settings.roleApi} 
          onChange={(c) => updateApi('roleApi', c)}
          presets={settings.presets}
          onSavePreset={handleSavePreset}
          showToast={showToast}
          placeholderText="留空使用全局"
        />

        <ApiConfigBlock 
          title="其他功能 API" 
          config={settings.otherApi} 
          onChange={(c) => updateApi('otherApi', c)}
          presets={settings.presets}
          onSavePreset={handleSavePreset}
          showToast={showToast}
          placeholderText="留空使用全局"
        />

        <MinimaxConfigBlock 
          config={settings.minimaxApi} 
          enabled={settings.minimaxEnabled}
          onChange={(c) => updateApi('minimaxApi', c)}
          onEnabledChange={(e) => setSettings(prev => ({ ...prev, minimaxEnabled: e }))}
          presets={settings.presets}
          onSavePreset={handleSavePreset}
          showToast={showToast}
        />

        {/* Data Management */}
        <div className="bg-white/80 rounded-2xl p-4 mb-6 shadow-sm border border-misty-pink/30">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Database size={18} className="text-misty-pink-dark" />
            数据管理
          </h3>
          <div className="flex flex-col gap-3">
            <button 
              className="w-full bg-misty-pink-dark/10 text-misty-pink-dark py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-misty-pink-dark/20 transition-colors"
              onClick={handleExportData}
            >
              <Download size={18} />
              一键压缩导出数据
            </button>
            <input 
              type="file" 
              accept=".json" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <button 
              className="w-full bg-slate-100 text-slate-600 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
              onClick={handleImportClick}
            >
              <Upload size={18} />
              导入数据
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const AddCharacterModal = ({ onClose, onConfirm }: { onClose: () => void, onConfirm: (chat: ChatItem) => void }) => {
  const [avatar, setAvatar] = useState('');
  const [name, setName] = useState('');
  const [remark, setRemark] = useState('');
  const [persona, setPersona] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const personaInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatar(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePersonaImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      if (file.name.endsWith('.txt')) {
        const text = await file.text();
        setPersona(text);
      } else if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setPersona(result.value);
      } else {
        alert('仅支持 .txt 和 .docx 格式');
      }
    } catch (error) {
      alert('导入失败，请检查文件格式');
    } finally {
      setIsImporting(false);
      if (personaInputRef.current) personaInputRef.current.value = '';
    }
  };

  const handleConfirm = () => {
    if (!name.trim()) {
      alert('请输入角色名');
      return;
    }
    const newChat: ChatItem = {
      id: Date.now().toString(),
      name: name.trim(),
      remark: remark.trim(),
      persona: persona.trim(),
      avatar: avatar || '',
      lastMsg: '',
      time: new Date().toISOString(),
      timestamp: Date.now(),
      unread: 0
    };
    onConfirm(newChat);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white/95 backdrop-blur-xl rounded-[24px] shadow-2xl w-full max-w-[320px] overflow-hidden flex flex-col"
      >
        <div className="p-5 flex flex-col items-center gap-4">
          <h2 className="text-[17px] font-semibold text-slate-800">添加角色</h2>
          
          {/* Avatar Upload */}
          <div 
            className="w-20 h-20 rounded-full border-2 border-dashed border-misty-pink-dark flex items-center justify-center text-misty-pink-dark cursor-pointer relative overflow-hidden bg-misty-pink/10"
            onClick={() => avatarInputRef.current?.click()}
          >
            {avatar ? (
              <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <Plus size={28} />
            )}
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={avatarInputRef}
              onChange={handleAvatarChange}
            />
          </div>

          {/* Inputs */}
          <div className="w-full space-y-3">
            <input 
              type="text" 
              placeholder="角色名 (必填)" 
              className="w-full bg-slate-100/80 border-none rounded-xl px-3 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-misty-pink-dark/50 transition-all placeholder:text-slate-400"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input 
              type="text" 
              placeholder="备注 (选填)" 
              className="w-full bg-slate-100/80 border-none rounded-xl px-3 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-misty-pink-dark/50 transition-all placeholder:text-slate-400"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />
            
            <div className="relative">
              <textarea 
                placeholder="人设 (可输入或粘贴)" 
                className="w-full bg-slate-100/80 border-none rounded-xl px-3 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-misty-pink-dark/50 transition-all placeholder:text-slate-400 min-h-[80px] resize-none"
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
              />
              <button 
                onClick={() => personaInputRef.current?.click()}
                disabled={isImporting}
                className="absolute right-2 bottom-2 bg-white shadow-sm border border-slate-200 text-misty-pink-dark p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                title="导入 .txt 或 .docx"
              >
                <FileText size={16} />
              </button>
              <input 
                type="file" 
                accept=".txt,.docx" 
                className="hidden" 
                ref={personaInputRef}
                onChange={handlePersonaImport}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex p-4 gap-3 bg-white">
          <button 
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium active:bg-slate-200 transition-colors"
          >
            取消
          </button>
          <button 
            onClick={handleConfirm}
            className="flex-1 py-2.5 bg-misty-pink text-slate-800 rounded-xl font-medium active:opacity-80 transition-opacity"
          >
            确定
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const ConfirmModal = ({ title, message, onConfirm, onCancel }: { title: string, message: string, onConfirm: () => void, onCancel: () => void }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
  >
    <motion.div 
      initial={{ scale: 0.9, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.9, opacity: 0, y: 20 }}
      className="bg-white/95 backdrop-blur-xl rounded-[20px] shadow-2xl w-full max-w-[280px] overflow-hidden flex flex-col text-center"
    >
      <div className="p-6">
        <h3 className="text-[17px] font-semibold text-slate-800 mb-2">{title}</h3>
        <p className="text-[14px] text-slate-500">{message}</p>
      </div>
      <div className="flex p-4 gap-3 bg-white">
        <button 
          onClick={onCancel}
          className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium active:bg-slate-200 transition-colors"
        >
          取消
        </button>
        <button 
          onClick={onConfirm}
          className="flex-1 py-2.5 bg-misty-pink text-slate-800 rounded-xl font-medium active:opacity-80 transition-opacity"
        >
          删除
        </button>
      </div>
    </motion.div>
  </motion.div>
);

const ChatInfo = ({ chat, messages, setMessages, onBack }: { chat: ChatItem, messages: Message[], setMessages: (msgs: Message[]) => void, onBack: () => void }) => {
  const [chatBackground, setChatBackground] = useLocalStorage(`sjzn_chat_bg_${chat.id}`, '');
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Toggles
  const [muteNotifications, setMuteNotifications] = useLocalStorage(`sjzn_mute_${chat.id}`, false);
  const [pinChat, setPinChat] = useLocalStorage(`sjzn_pin_${chat.id}`, chat.isPinned || false);
  const [reminders, setReminders] = useLocalStorage(`sjzn_reminders_${chat.id}`, false);

  const searchResults = messages.filter(m => m.type === 'text' && m.content.includes(searchQuery));

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="absolute inset-0 z-[60] bg-[#F3F3F3] flex flex-col"
    >
      {/* Header */}
      <header className="pt-12 pb-3 px-4 bg-[#F3F3F3] flex items-center justify-between">
        <button onClick={onBack} className="flex items-center text-slate-800 active:opacity-50 transition-opacity">
          <ChevronLeft size={28} />
        </button>
        <h2 className="text-[17px] font-medium text-slate-800">聊天信息</h2>
        <div className="w-7"></div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-8">
        {/* Avatar Section */}
        <div className="bg-white py-6 flex flex-col items-center mb-2">
          {chat.avatar ? (
            <img src={chat.avatar} alt={chat.name} className="w-16 h-16 rounded-xl object-cover mb-2 border border-slate-100" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-2">
              <User size={32} />
            </div>
          )}
          <span className="text-sm text-slate-500">{chat.remark || chat.name}</span>
        </div>

        {/* Search History */}
        <div className="bg-white mb-2">
          <button 
            onClick={() => setShowSearchHistory(true)}
            className="w-full px-4 py-4 flex items-center justify-between active:bg-slate-50 transition-colors"
          >
            <span className="text-[16px] text-slate-800">查找聊天记录</span>
            <ChevronRight size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Toggles */}
        <div className="bg-white mb-2">
          <div className="px-4 py-4 flex items-center justify-between border-b border-slate-100/60">
            <span className="text-[16px] text-slate-800">消息免打扰</span>
            <button onClick={() => setMuteNotifications(!muteNotifications)} className="active:scale-95 transition-transform">
              {muteNotifications ? <ToggleRight size={32} className="text-blue-500" /> : <ToggleLeft size={32} className="text-slate-400" />}
            </button>
          </div>
          <div className="px-4 py-4 flex items-center justify-between border-b border-slate-100/60">
            <span className="text-[16px] text-slate-800">置顶聊天</span>
            <button onClick={() => setPinChat(!pinChat)} className="active:scale-95 transition-transform">
              {pinChat ? <ToggleRight size={32} className="text-blue-500" /> : <ToggleLeft size={32} className="text-slate-400" />}
            </button>
          </div>
          <div className="px-4 py-4 flex items-center justify-between">
            <span className="text-[16px] text-slate-800">提醒</span>
            <button onClick={() => setReminders(!reminders)} className="active:scale-95 transition-transform">
              {reminders ? <ToggleRight size={32} className="text-blue-500" /> : <ToggleLeft size={32} className="text-slate-400" />}
            </button>
          </div>
        </div>

        {/* Background */}
        <div className="bg-white mb-2">
          <button 
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    setChatBackground(e.target?.result as string);
                  };
                  reader.readAsDataURL(file);
                }
              };
              input.click();
            }}
            className="w-full px-4 py-4 flex items-center justify-between active:bg-slate-50 transition-colors"
          >
            <span className="text-[16px] text-slate-800">设置当前聊天背景</span>
            <ChevronRight size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Clear History */}
        <div className="bg-white mb-2">
          <button 
            onClick={() => setShowClearConfirm(true)}
            className="w-full px-4 py-4 flex items-center justify-between active:bg-slate-50 transition-colors"
          >
            <span className="text-[16px] text-slate-800">清空聊天记录</span>
            <ChevronRight size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Report */}
        <div className="bg-white mb-8">
          <button className="w-full px-4 py-4 flex items-center justify-between active:bg-slate-50 transition-colors">
            <span className="text-[16px] text-slate-800">投诉</span>
            <ChevronRight size={20} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* Search History Overlay */}
      <AnimatePresence>
        {showSearchHistory && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute inset-0 z-[70] bg-[#F3F3F3] flex flex-col"
          >
            {/* Header with Search Input */}
            <header className="pt-12 pb-3 px-4 bg-white flex items-center gap-3 border-b border-slate-100">
              <div className="flex-1 bg-slate-100 rounded-full flex items-center px-3 py-1.5">
                <Search size={18} className="text-slate-400 mr-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="搜索"
                  className="flex-1 bg-transparent outline-none text-[15px]"
                  autoFocus
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-slate-400">
                    <X size={16} />
                  </button>
                )}
              </div>
              <button onClick={() => { setShowSearchHistory(false); setSearchQuery(''); }} className="text-[15px] text-blue-500 font-medium whitespace-nowrap">
                取消
              </button>
            </header>

            {/* Results */}
            <div className="flex-1 overflow-y-auto bg-white">
              {searchQuery ? (
                searchResults.length > 0 ? (
                  searchResults.map(msg => (
                    <button
                      key={msg.id}
                      onClick={() => {
                        setShowSearchHistory(false);
                        onBack(); // Close ChatInfo
                        setTimeout(() => {
                          const el = document.getElementById(`msg-${msg.id}`);
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            el.classList.add('bg-yellow-100/50', 'transition-colors', 'duration-500');
                            setTimeout(() => el.classList.remove('bg-yellow-100/50'), 2000);
                          }
                        }, 300);
                      }}
                      className="w-full p-4 flex gap-3 border-b border-slate-100/60 active:bg-slate-50 text-left"
                    >
                      {msg.sender === 'user' ? (
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-slate-400 flex-shrink-0">
                          <User size={20} />
                        </div>
                      ) : chat.avatar ? (
                        <img src={chat.avatar} className="w-10 h-10 rounded-xl object-cover border-2 border-white shadow-sm bg-slate-100 flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-slate-400 flex-shrink-0">
                          <User size={20} />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[15px] font-medium text-slate-800">{msg.sender === 'user' ? '我' : (chat.remark || chat.name)}</span>
                          <span className="text-xs text-slate-400">{formatMessageTime(msg.timestamp)}</span>
                        </div>
                        <p className="text-[14px] text-slate-500 truncate">{msg.content}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 text-[15px]">无搜索结果</div>
                )
              ) : (
                <div className="p-8 text-center text-slate-400 text-[15px]">输入关键字搜索聊天记录</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clear Confirm Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setShowClearConfirm(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-xl p-6"
            >
              <h3 className="text-lg font-semibold text-slate-800 text-center mb-2">清空聊天记录</h3>
              <p className="text-slate-500 text-center mb-6 text-[15px]">确定要清空与 {chat.remark || chat.name} 的所有聊天记录吗？此操作不可恢复。</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium active:bg-slate-200 transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={() => {
                    setMessages([]);
                    setShowClearConfirm(false);
                  }}
                  className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-medium active:bg-red-600 transition-colors"
                >
                  清空
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ChatRoom = ({ chat, onBack }: { chat: ChatItem, onBack: () => void }) => {
  const [inputValue, setInputValue] = useState('');
  const [showMindPanel, setShowMindPanel] = useState(false);
  const [showStickerPanel, setShowStickerPanel] = useState(false);
  const [showAttachmentPanel, setShowAttachmentPanel] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showChatInfo, setShowChatInfo] = useState(false);
  
  // Chat messages state
  const [messages, setMessages] = useLocalStorage<Message[]>(`sjzn_msgs_${chat.id}`, []);
  const [recognizeUrl, setRecognizeUrl] = useLocalStorage('sjzn_recognize_url', false);
  const [chatBackground] = useLocalStorage(`sjzn_chat_bg_${chat.id}`, '');

  // Sticker states
  const [stickerGroups, setStickerGroups] = useLocalStorage<{id: string, name: string}[]>('sjzn_sticker_groups', [{ id: 'default', name: '未分类' }]);
  const [stickers, setStickers] = useLocalStorage<{id: string, name: string, url: string, groupId: string}[]>('sjzn_stickers', []);
  const [activeGroupId, setActiveGroupId] = useState('default');
  const [isManagingStickers, setIsManagingStickers] = useState(false);
  const [selectedStickers, setSelectedStickers] = useState<string[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  
  // New UI states
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [importGroupId, setImportGroupId] = useState('default');
  const [newImportGroupName, setNewImportGroupName] = useState('');
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [targetMoveGroupId, setTargetMoveGroupId] = useState('default');
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const suggestedStickers = inputValue.trim() ? stickers.filter(s => s.name.includes(inputValue.trim())).slice(0, 5) : [];

  const handleSendText = () => {
    if (!inputValue.trim()) return;
    const newMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      type: 'text',
      content: inputValue.trim(),
      timestamp: Date.now()
    };
    setMessages([...messages, newMsg]);
    setInputValue('');
    setShowStickerPanel(false);
    setShowAttachmentPanel(false);
  };

  const handleSendSticker = (sticker: {url: string, name: string}) => {
    const newMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      type: 'sticker',
      content: sticker.url,
      stickerName: sticker.name,
      timestamp: Date.now()
    };
    setMessages([...messages, newMsg]);
    setInputValue('');
    setShowStickerPanel(false);
    setShowAttachmentPanel(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.txt')) {
      const text = await file.text();
      setImportText(text);
    } else if (file.name.endsWith('.docx')) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      setImportText(result.value);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImportStickers = () => {
    if (!importText.trim()) return;
    
    let targetGroupId = importGroupId;
    if (importGroupId === 'new') {
      if (!newImportGroupName.trim()) return;
      targetGroupId = Date.now().toString();
      setStickerGroups([...stickerGroups, { id: targetGroupId, name: newImportGroupName.trim() }]);
    }
    
    const lines = importText.split('\n');
    const newStickers = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      const httpIndex = trimmed.indexOf('http');
      if (httpIndex !== -1) {
        let namePart = trimmed.substring(0, httpIndex).trim();
        const urlPart = trimmed.substring(httpIndex).trim();
        
        namePart = namePart.replace(/[:：\-\.\s]+$/, '');
        if (!namePart) namePart = '未命名';
        
        newStickers.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: namePart,
          url: urlPart,
          groupId: targetGroupId
        });
      }
    }
    
    if (newStickers.length > 0) {
      setStickers([...stickers, ...newStickers]);
    }
    
    setImportText('');
    setNewImportGroupName('');
    setImportGroupId('default');
    setShowImportModal(false);
  };

  const [settings] = useLocalStorage<AppSettings>('sjzn_settings', {
    password: '',
    globalApi: { url: '', key: '', model: '' },
    roleApi: { url: '', key: '', model: '' },
    otherApi: { url: '', key: '', model: '' },
    minimaxEnabled: false,
    minimaxApi: { url: '', key: '', model: '', groupId: '' },
    presets: []
  });

  const handleRequestReply = async () => {
    // Determine effective API config: use roleApi if configured, else globalApi
    const getEffectiveApi = () => {
      if (settings.roleApi.url && settings.roleApi.key) return settings.roleApi;
      return settings.globalApi;
    };

    const apiConfig = getEffectiveApi();
    const apiKey = apiConfig.key;
    let apiUrl = apiConfig.url || 'https://api.openai.com/v1/chat/completions';
    const model = apiConfig.model || 'gpt-3.5-turbo';

    if (!apiKey) {
      alert("请先在设置中配置 API 密钥");
      return;
    }

    if (!apiUrl.endsWith('/chat/completions')) {
      apiUrl = apiUrl.replace(/\/+$/, '') + '/chat/completions';
    }

    setIsTyping(true);
    
    // Convert messages to text for context
    const contextStr = messages.map(m => {
      if (m.type === 'text') {
        return `${m.sender === 'user' ? 'User' : chat.name}: ${m.content}`;
      } else {
        return `${m.sender === 'user' ? 'User' : chat.name}: [发送了表情包: ${m.stickerName || '未知'}]`;
      }
    }).join('\n');
    
    const prompt = `
You ARE ${chat.name || 'this character'}. This is not a roleplay, you are literally them.
Persona/Context: ${chat.persona || 'A friendly chat companion.'}

Here is the recent chat history:
${contextStr}

Please generate a reply mimicking a real person chatting on a mobile messaging app (like WeChat).
Follow these rules strictly:
1. ABSOLUTELY NO actions, inner thoughts, or expressions in parentheses/brackets (e.g., no *smiles*, no (sighs), no (thinks)). Just output the spoken words.
2. DO NOT output a single large block of text. Break your response into short, natural sentences or phrases, as if sending multiple separate messages.
3. Output each separate message on a new line.
4. Keep it casual, conversational, and in character.
5. Do not include prefixes like "AI:" or "${chat.name}:" in your output, just the message content.
`;

    let apiMessages: any[] = [
      { role: 'user', content: prompt }
    ];

    // If image recognition is enabled, append sticker images to the prompt
    if (recognizeUrl) {
      const contentArray: any[] = [
        { type: 'text', text: prompt }
      ];
      messages.forEach(m => {
        if (m.type === 'sticker' && m.content) {
          contentArray.push({
            type: 'image_url',
            image_url: { url: m.content }
          });
        }
      });
      apiMessages = [
        { role: 'user', content: contentArray }
      ];
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: apiMessages
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.choices[0].message.content || '';
      const lines = text.split('\n').filter((line: string) => line.trim() !== '');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Random delay between 100ms and 1000ms
        const delay = Math.floor(Math.random() * 900) + 100;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        const newMsg: Message = {
          id: Date.now().toString() + i,
          sender: 'ai',
          type: 'text',
          content: line,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, newMsg]);
      }
      
    } catch (error) {
      console.error("Error generating reply:", error);
      alert("AI 回复生成失败，请检查 API 设置");
    } finally {
      setIsTyping(false);
    }
  };

  const handleDeleteSelectedStickers = () => {
    setStickers(stickers.filter(s => !selectedStickers.includes(s.id)));
    setSelectedStickers([]);
    setIsManagingStickers(false);
  };

  const handleMoveSelectedStickers = () => {
    setStickers(stickers.map(s => 
      selectedStickers.includes(s.id) ? { ...s, groupId: targetMoveGroupId } : s
    ));
    setSelectedStickers([]);
    setIsManagingStickers(false);
    setShowMoveModal(false);
  };

  const activeStickers = stickers.filter(s => s.groupId === activeGroupId);

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="absolute inset-0 z-50 bg-[#F3F3F3] flex flex-col"
      style={{
        backgroundImage: chatBackground ? `url(${chatBackground})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Header */}
      <header className="pt-12 pb-3 px-4 bg-[#F3F3F3]/90 backdrop-blur-sm border-b border-slate-200 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center text-slate-800 active:opacity-50 transition-opacity">
          <ChevronLeft size={28} />
        </button>
        <h2 className="text-[17px] font-semibold text-slate-800">
          {isTyping ? '对方正在输入...' : (chat.remark || chat.name)}
        </h2>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowMindPanel(true)} className="text-slate-800 active:opacity-50 transition-opacity">
            <Heart size={24} />
          </button>
          <button onClick={() => setShowChatInfo(true)} className="text-slate-800 active:opacity-50 transition-opacity">
            <MoreHorizontal size={24} />
          </button>
        </div>
      </header>
      
      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto p-4"
        onClick={() => {
          setShowStickerPanel(false);
          setShowAttachmentPanel(false);
        }}
      >
         {messages.length > 0 ? (
           messages.map((msg, index) => {
             const prevMsg = index > 0 ? messages[index - 1] : null;
             const showTime = !prevMsg || (msg.timestamp - prevMsg.timestamp > 5 * 60 * 1000); // 5 minutes gap
             
             return (
               <React.Fragment key={msg.id}>
                 {showTime && (
                   <div className="text-center text-xs text-slate-400 my-4">
                     {formatMessageTime(msg.timestamp)}
                   </div>
                 )}
                 <div className={`flex gap-3 mb-4 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                   {msg.sender === 'ai' ? (
                     chat.avatar ? (
                       <img src={chat.avatar} className="w-10 h-10 rounded-2xl object-cover border-2 border-white shadow-sm bg-slate-100" />
                     ) : (
                       <div className="w-10 h-10 rounded-2xl bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-slate-400">
                         <User size={20} />
                       </div>
                     )
                   ) : (
                     <div className="w-10 h-10 rounded-2xl bg-blue-100 border-2 border-white shadow-sm flex items-center justify-center text-blue-500">
                       <User size={20} />
                     </div>
                   )}
                   
                   {msg.type === 'text' ? (
                     <div className={`miepaopao-wrapper ${msg.sender === 'user' ? 'user' : 'char'}`}>
                       <div className="miepaopao-decorations"></div>
                       <div className="miepaopao-layers"></div>
                       <div className="miepaopao-content">
                         {msg.content}
                       </div>
                     </div>
                   ) : (
                     <div className="w-[85px] rounded-xl overflow-hidden">
                       <img src={msg.content} alt="sticker" className="w-full h-auto object-contain" referrerPolicy="no-referrer" />
                     </div>
                   )}
                 </div>
               </React.Fragment>
             );
           })
         ) : (
           <div className="flex flex-col items-center justify-center pt-10 text-slate-400 text-sm">
             开始你们的对话吧
           </div>
         )}
         <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-[#F3F3F3] border-t border-slate-200 px-3 py-2 pb-safe-area-bottom flex flex-col gap-2 relative">
        {/* Suggested Stickers */}
        <AnimatePresence>
          {suggestedStickers.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-0 w-full px-3 pb-2 z-50 flex justify-start"
            >
              <div className="bg-white/90 backdrop-blur-md border border-slate-200 shadow-lg rounded-2xl p-2 inline-flex gap-2 overflow-x-auto hide-scrollbar max-w-full">
                {suggestedStickers.map(sticker => (
                  <button 
                    key={sticker.id}
                    onClick={() => handleSendSticker(sticker)}
                    className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 active:scale-95 transition-transform"
                  >
                    <img src={sticker.url} alt={sticker.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-3 w-full">
          <button 
            onClick={() => {
              setShowStickerPanel(!showStickerPanel);
              setShowAttachmentPanel(false);
            }}
            className={`${showStickerPanel ? 'text-slate-800' : 'text-slate-600'} active:opacity-50 transition-colors`}
          >
            <Smile size={28} strokeWidth={1.5} />
          </button>
          <div className="flex-1 bg-white rounded-full flex items-center px-4 py-2 shadow-sm border border-slate-200">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSendText();
                }
              }}
              className="w-full bg-transparent text-[15px] outline-none"
              placeholder="发送消息..."
            />
            <button className="text-slate-400 hover:text-slate-600 ml-2">
              <Mic size={20} strokeWidth={2} />
            </button>
          </div>
          <button 
            onClick={() => {
              setShowAttachmentPanel(!showAttachmentPanel);
              setShowStickerPanel(false);
            }}
            className={`${showAttachmentPanel ? 'text-slate-800' : 'text-slate-600'} active:opacity-50 transition-colors`}
          >
            <PlusCircle size={28} strokeWidth={1.5} />
          </button>
          <button 
            onClick={handleRequestReply}
            className="text-slate-600 active:opacity-50 transition-opacity flex items-center justify-center"
          >
            <Sparkles size={28} strokeWidth={1.5} />
          </button>
        </div>
      </div>
      {/* Sticker Panel */}
      <AnimatePresence>
        {showStickerPanel && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 280, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-[#F3F3F3] border-t border-slate-200 overflow-hidden flex flex-col"
          >
            {/* Group Tabs */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
              <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar flex-1 mr-2">
                {stickerGroups.map(g => (
                  <button 
                    key={g.id}
                    onClick={() => setActiveGroupId(g.id)}
                    className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${activeGroupId === g.id ? 'bg-white text-slate-800 shadow-sm font-medium border border-slate-200' : 'text-slate-500 hover:bg-slate-200/50 border border-transparent'}`}
                  >
                    {g.name}
                  </button>
                ))}
                {isAddingGroup ? (
                  <div className="flex items-center gap-1 bg-white rounded-full px-2 py-1 shadow-sm border border-slate-200">
                    <input 
                      autoFocus
                      type="text"
                      value={newGroupName}
                      onChange={e => setNewGroupName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newGroupName.trim()) {
                          setStickerGroups([...stickerGroups, { id: Date.now().toString(), name: newGroupName.trim() }]);
                          setIsAddingGroup(false);
                          setNewGroupName('');
                        }
                      }}
                      onBlur={() => {
                        setIsAddingGroup(false);
                        setNewGroupName('');
                      }}
                      className="w-20 text-sm outline-none bg-transparent"
                      placeholder="分组名"
                    />
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsAddingGroup(true)}
                    className="px-3 py-1.5 rounded-full text-sm text-slate-500 border border-dashed border-slate-300 hover:bg-slate-200/50 flex items-center gap-1 whitespace-nowrap"
                  >
                    <Plus size={14} /> 添加分组
                  </button>
                )}
              </div>
              <button 
                onClick={() => {
                  if (isManagingStickers) {
                    setIsManagingStickers(false);
                    setSelectedStickers([]);
                  } else {
                    setIsManagingStickers(true);
                  }
                }}
                className={`text-sm px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 ${isManagingStickers ? 'bg-slate-200 text-slate-800 font-medium' : 'text-slate-600 hover:bg-slate-200/50'}`}
              >
                {isManagingStickers ? '完成' : '管理'}
              </button>
            </div>

            {/* Sticker Grid */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-5 gap-3">
                {/* Add Sticker Button */}
                <button 
                  onClick={() => setShowImportModal(true)}
                  className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-200/50 hover:border-slate-400 transition-colors"
                >
                  <Plus size={24} className="mb-1" />
                  <span className="text-[10px]">添加表情</span>
                </button>

                {/* Stickers */}
                {activeStickers.map(sticker => (
                  <div 
                    key={sticker.id} 
                    className="relative flex flex-col items-center gap-1"
                    onClick={() => {
                      if (isManagingStickers) {
                        setSelectedStickers(prev => 
                          prev.includes(sticker.id) ? prev.filter(id => id !== sticker.id) : [...prev, sticker.id]
                        );
                      } else {
                        handleSendSticker(sticker);
                      }
                    }}
                  >
                    <div className={`aspect-square w-full rounded-xl overflow-hidden bg-white shadow-sm border ${isManagingStickers && selectedStickers.includes(sticker.id) ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'}`}>
                      <img src={sticker.url} alt={sticker.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <span className="text-[10px] text-slate-500 truncate w-full text-center">{sticker.name}</span>
                    
                    {isManagingStickers && (
                      <div className={`absolute top-1 right-1 w-4 h-4 rounded-full border flex items-center justify-center ${selectedStickers.includes(sticker.id) ? 'bg-blue-500 border-blue-500' : 'bg-white/80 border-slate-300'}`}>
                        {selectedStickers.includes(sticker.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Management Bar */}
            {isManagingStickers && (
              <div className="px-3 py-2 border-t border-slate-200 flex items-center justify-between bg-white">
                <button 
                  onClick={() => {
                    if (selectedStickers.length === activeStickers.length) {
                      setSelectedStickers([]);
                    } else {
                      setSelectedStickers(activeStickers.map(s => s.id));
                    }
                  }}
                  className="text-sm text-slate-600 px-3 py-1.5 flex items-center gap-1"
                >
                  {selectedStickers.length === activeStickers.length && activeStickers.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                  全选
                </button>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowMoveModal(true)}
                    disabled={selectedStickers.length === 0}
                    className="text-sm text-blue-500 px-3 py-1.5 disabled:opacity-50 font-medium"
                  >
                    移动 ({selectedStickers.length})
                  </button>
                  <button 
                    onClick={handleDeleteSelectedStickers}
                    disabled={selectedStickers.length === 0}
                    className="text-sm text-red-500 px-3 py-1.5 disabled:opacity-50 font-medium"
                  >
                    删除 ({selectedStickers.length})
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setShowSettingsModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-xl"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-800">独立设置</h3>
                <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-[15px] font-medium text-slate-800">识别 URL</div>
                    <div className="text-xs text-slate-500 mt-1">自动识别聊天中的链接并生成预览</div>
                  </div>
                  <button 
                    onClick={() => setRecognizeUrl(!recognizeUrl)}
                    className="active:scale-95 transition-transform"
                  >
                    {recognizeUrl ? <ToggleRight size={32} className="text-blue-500" /> : <ToggleLeft size={32} className="text-slate-400" />}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showChatInfo && (
          <ChatInfo 
            chat={chat} 
            messages={messages} 
            setMessages={setMessages} 
            onBack={() => setShowChatInfo(false)} 
          />
        )}
      </AnimatePresence>

      {/* Import Modal */}
      <AnimatePresence>
        {showImportModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-xl"
            >
              <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">导入表情包</h3>
                <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <div className="p-5 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-slate-700">选择分组</label>
                  <div className="flex gap-2">
                    <select 
                      value={importGroupId}
                      onChange={(e) => setImportGroupId(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-misty-pink-dark"
                    >
                      {stickerGroups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                      <option value="new">+ 新建分组</option>
                    </select>
                    {importGroupId === 'new' && (
                      <input 
                        type="text"
                        value={newImportGroupName}
                        onChange={(e) => setNewImportGroupName(e.target.value)}
                        placeholder="分组名称"
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-misty-pink-dark"
                      />
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-slate-700">表情包数据</label>
                  <div className="relative">
                    <textarea 
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      placeholder="支持格式：名称:URL、名称-URL、名称 URL 等&#10;一行一个例如：&#10;开心 https://example.com/1.png&#10;难过:https://example.com/2.png"
                      className="w-full h-40 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-misty-pink-dark resize-none"
                    />
                    <input 
                      type="file" 
                      accept=".txt,.docx" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-3 right-3 p-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                      title="导入文件 (.txt, .docx)"
                    >
                      <FileUp size={18} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-white flex gap-3 border-t border-slate-100">
                <button 
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium active:bg-slate-200 transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={handleImportStickers}
                  className="flex-1 py-2.5 bg-misty-pink text-slate-800 rounded-xl font-medium active:opacity-80 transition-opacity"
                >
                  导入
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attachment Panel */}
      <AnimatePresence>
        {showAttachmentPanel && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 280, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-[#F3F3F3] border-t border-slate-200 overflow-hidden flex flex-col"
          >
            <div className="p-4 grid grid-cols-5 gap-y-4 gap-x-2 flex-1">
              <div className="flex flex-col items-center gap-1">
                <button className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 active:bg-slate-50 transition-colors">
                  <Image size={28} className="text-slate-500" />
                </button>
                <span className="text-xs text-slate-500">照片</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <button className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 active:bg-slate-50 transition-colors">
                  <Camera size={28} className="text-slate-500" />
                </button>
                <span className="text-xs text-slate-500">拍摄</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <button className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 active:bg-slate-50 transition-colors">
                  <Video size={28} className="text-slate-500" />
                </button>
                <span className="text-xs text-slate-500">视频通话</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <button className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 active:bg-slate-50 transition-colors">
                  <MapPin size={28} className="text-slate-500" />
                </button>
                <span className="text-xs text-slate-500">位置</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <button className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 active:bg-slate-50 transition-colors">
                  <Banknote size={28} className="text-slate-500" />
                </button>
                <span className="text-xs text-slate-500">红包</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <button className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 active:bg-slate-50 transition-colors">
                  <ArrowRightLeft size={28} className="text-slate-500" />
                </button>
                <span className="text-xs text-slate-500">转账</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <button className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 active:bg-slate-50 transition-colors">
                  <Music size={28} className="text-slate-500" />
                </button>
                <span className="text-xs text-slate-500">音乐</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <button className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 active:bg-slate-50 transition-colors">
                  <Book size={28} className="text-slate-500" />
                </button>
                <span className="text-xs text-slate-500">日记</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <button className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 active:bg-slate-50 transition-colors">
                  <Gift size={28} className="text-slate-500" />
                </button>
                <span className="text-xs text-slate-500">礼物</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <button 
                  onClick={() => setShowSettingsModal(true)}
                  className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 active:bg-slate-50 transition-colors"
                >
                  <Settings size={28} className="text-slate-500" />
                </button>
                <span className="text-xs text-slate-500">独立设置</span>
              </div>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={`placeholder-${i}`} className="flex flex-col items-center gap-1">
                  <button className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 border-dashed active:bg-slate-50 transition-colors">
                    <Box size={28} className="text-slate-300" />
                  </button>
                  <span className="text-xs text-slate-400">占位</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Move Modal */}
      <AnimatePresence>
        {showMoveModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-xs overflow-hidden shadow-xl"
            >
              <div className="p-5 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 text-center">移动到分组</h3>
              </div>
              <div className="p-2 max-h-60 overflow-y-auto">
                {stickerGroups.map(g => (
                  <button 
                    key={g.id}
                    onClick={() => setTargetMoveGroupId(g.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-[15px] flex items-center justify-between ${targetMoveGroupId === g.id ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    {g.name}
                    {targetMoveGroupId === g.id && <CheckSquare size={18} />}
                  </button>
                ))}
              </div>
              <div className="p-4 bg-white flex gap-3 border-t border-slate-100">
                <button 
                  onClick={() => setShowMoveModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium active:bg-slate-200 transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={handleMoveSelectedStickers}
                  className="flex-1 py-2.5 bg-misty-pink text-slate-800 rounded-xl font-medium active:opacity-80 transition-opacity"
                >
                  确定
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mind Panel */}
      <AnimatePresence>
        {showMindPanel && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setShowMindPanel(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-pink-50 to-purple-50">
                <div className="flex items-center gap-2 text-slate-800">
                  <Heart size={20} className="text-pink-500 fill-pink-500" />
                  <h3 className="text-lg font-bold">心声面板</h3>
                </div>
                <button onClick={() => setShowMindPanel(false)} className="text-slate-400 hover:text-slate-600 bg-white/50 rounded-full p-1">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 min-h-[200px] flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                  <Sparkles size={32} />
                </div>
                <h4 className="text-slate-800 font-medium mb-2">预设心声状态</h4>
                <p className="text-sm text-slate-500">
                  这里将根据预设生成不同样子的心声内容。<br/>
                  （预设配置功能开发中...）
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [showSettings, setShowSettings] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [chats, setChats] = useLocalStorage<ChatItem[]>('sjzn_chats', []);
  const [activeChat, setActiveChat] = useState<ChatItem | null>(null);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);

  const handleAddCharacter = (newChat: ChatItem) => {
    setChats([newChat, ...chats]);
    setShowAddModal(false);
  };

  const handlePinChat = (id: string) => {
    setChats(chats.map(chat => 
      chat.id === id ? { ...chat, isPinned: !chat.isPinned } : chat
    ));
  };

  const handleDeleteChat = (id: string) => {
    setChatToDelete(id);
  };

  const confirmDeleteChat = () => {
    if (chatToDelete) {
      setChats(chats.filter(chat => chat.id !== chatToDelete));
      setChatToDelete(null);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'chat': return <ChatView chats={chats} onPin={handlePinChat} onDelete={handleDeleteChat} onChatClick={setActiveChat} />;
      case 'mini': return <MiniProgramView />;
      case 'discover': return <DiscoverView />;
      case 'me': return <ProfileView onOpenSettings={() => setShowSettings(true)} />;
    }
  };

  const getTitle = () => {
    switch (activeTab) {
      case 'chat': return '通讯';
      case 'mini': return '小程序';
      case 'discover': return '发现';
      case 'me': return '';
    }
  };

  return (
    <div className="flex justify-center bg-slate-100 min-h-screen">
      {/* Mobile Container */}
      <div className="relative w-full max-w-[430px] bg-milk-yellow/30 min-h-screen flex flex-col shadow-2xl overflow-hidden">
        
        {activeTab !== 'me' && !showSettings && (
          <Header 
            title={getTitle()} 
            onAddClick={() => {
              if (activeTab === 'chat') setShowAddModal(true);
            }} 
          />
        )}
        
        <main className="flex-1 overflow-y-auto pb-24">
          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>
        </main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 w-full max-w-[430px] bg-white/80 ios-blur border-t border-misty-pink/40 px-2 pt-2 pb-safe-area-bottom z-30">
          <div className="flex justify-around items-center h-16">
            <NavItem 
              active={activeTab === 'chat'} 
              onClick={() => setActiveTab('chat')}
              icon={<MessageCircle size={26} />}
              label="通讯"
            />
            <NavItem 
              active={activeTab === 'mini'} 
              onClick={() => setActiveTab('mini')}
              icon={<Grid2X2 size={26} />}
              label="小程序"
            />
            <NavItem 
              active={activeTab === 'discover'} 
              onClick={() => setActiveTab('discover')}
              icon={<Compass size={26} />}
              label="发现"
            />
            <NavItem 
              active={activeTab === 'me'} 
              onClick={() => setActiveTab('me')}
              icon={<User size={26} />}
              label="我的"
            />
          </div>
        </nav>

        {/* Settings Overlay */}
        <AnimatePresence>
          {showSettings && <SettingsView onBack={() => setShowSettings(false)} />}
        </AnimatePresence>

        {/* Add Character Modal */}
        <AnimatePresence>
          {showAddModal && (
            <AddCharacterModal 
              onClose={() => setShowAddModal(false)} 
              onConfirm={handleAddCharacter} 
            />
          )}
        </AnimatePresence>

        {/* Chat Room */}
        <AnimatePresence>
          {activeChat && (
            <ChatRoom chat={activeChat} onBack={() => setActiveChat(null)} />
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {chatToDelete && (
            <ConfirmModal 
              title="删除聊天" 
              message="确定要删除这个聊天吗？删除后将无法恢复。" 
              onConfirm={confirmDeleteChat} 
              onCancel={() => setChatToDelete(null)} 
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { 
  active: boolean, 
  onClick: () => void, 
  icon: ReactNode, 
  label: string 
}) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 relative ${
        active ? 'text-misty-pink-dark' : 'text-ios-gray'
      }`}
    >
      <motion.div
        animate={active ? { scale: 1.1, y: -2 } : { scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
      >
        {icon}
      </motion.div>
      <span className={`text-[10px] font-medium ${active ? 'opacity-100' : 'opacity-70'}`}>
        {label}
      </span>
      {active && (
        <motion.div 
          layoutId="activeTab"
          className="absolute -bottom-1 w-1 h-1 bg-misty-pink-dark rounded-full"
        />
      )}
    </button>
  );
}

