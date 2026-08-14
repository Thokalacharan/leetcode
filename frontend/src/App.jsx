import React, { useState, useEffect, useRef } from 'react';
import { 
  Flame, 
  Users, 
  Award, 
  Mail, 
  Zap, 
  RotateCw, 
  ExternalLink, 
  Inbox, 
  Loader2, 
  UserPlus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  AlertCircle, 
  Code2, 
  Clock, 
  Filter, 
  CheckCircle2, 
  Search,
  Trophy,
  Activity,
  Bot,
  Send,
  Sparkles,
  Key,
  HelpCircle,
  BookOpen
} from 'lucide-react';

function App() {
  const [friends, setFriends] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState({ friendsCount: 0, totalSolved: 0, alertsSent: 0, mostActive: 'None' });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  // Search & Filter States
  const [friendSearch, setFriendSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('ALL');

  // Add Friend Form State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newFriendName, setNewFriendName] = useState('');
  const [newFriendUrl, setNewFriendUrl] = useState('');
  const [addingFriend, setAddingFriend] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Editing Friend State
  const [editingFriendId, setEditingFriendId] = useState(null);
  const [editName, setEditName] = useState('');

  // AI Chatbot State
  const [apiKey, setApiKey] = useState(localStorage.getItem('codepulse_api_key') || '');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: "👋 Hi! I'm your **LeetCode AI Problem Finder**.\nAsk me for problem numbers, topics, or concepts (e.g., *'Find graph topological sort questions'* or *'What is the number for Course Schedule?'*), and I'll give you the exact problem numbers and direct links to code them!"
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const chatBottomRef = useRef(null);

  const API_BASE = import.meta.env.VITE_API_URL || '';

  // Load all dashboard data
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [friendsRes, activityRes] = await Promise.all([
        fetch(`${API_BASE}/api/friends`),
        fetch(`${API_BASE}/api/activity`)
      ]);

      const friendsData = await friendsRes.json();
      const activityData = await activityRes.json();

      const resolvedFriends = Array.isArray(friendsData) ? friendsData : Object.values(friendsData);
      const resolvedActivity = Array.isArray(activityData) ? activityData : [];

      setFriends(resolvedFriends);
      setSubmissions(resolvedActivity);
      calculateStats(resolvedFriends, resolvedActivity);
      setLastSync(new Date());
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Run on mount and establish poll sweeps every 10 seconds
  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, aiLoading]);

  // Compute metrics
  const calculateStats = (friendsList, submissionsList) => {
    const friendsCount = friendsList.length;
    const totalSolved = submissionsList.length;
    const alertsSent = submissionsList.filter(s => s.notified === true).length;

    let mostActive = 'None';
    if (submissionsList.length > 0) {
      const countMap = {};
      submissionsList.forEach(s => {
        const key = s.friendDisplayName || s.friendId;
        countMap[key] = (countMap[key] || 0) + 1;
      });

      let maxCount = 0;
      Object.entries(countMap).forEach(([name, count]) => {
        if (count > maxCount) {
          maxCount = count;
          mostActive = `${name} (${count})`;
        }
      });
    }

    setStats({ friendsCount, totalSolved, alertsSent, mostActive });
  };

  // Get solved count per friend
  const getSolvedCountForFriend = (friendId) => {
    return submissions.filter(s => s.friendId === friendId).length;
  };

  // Add Friend Handler
  const handleAddFriend = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!newFriendUrl) {
      setFormError('Please provide a LeetCode profile URL or username.');
      return;
    }

    setAddingFriend(true);
    try {
      const res = await fetch(`${API_BASE}/api/friends`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: newFriendName,
          profileUrl: newFriendUrl
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add friend.');
      }

      setFormSuccess(`Added ${data.friend.displayName || data.friend.username}!`);
      setNewFriendName('');
      setNewFriendUrl('');
      await loadData(true);

      setTimeout(() => {
        setIsAddModalOpen(false);
        setFormSuccess('');
      }, 1000);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setAddingFriend(false);
    }
  };

  // Delete Friend Handler
  const handleDeleteFriend = async (friendId, name) => {
    if (!window.confirm(`Remove ${name} from tracking?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/friends/${friendId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await loadData(true);
      }
    } catch (err) {
      console.error('Failed to delete friend:', err);
    }
  };

  // Edit Friend Handler
  const handleStartEdit = (friend) => {
    setEditingFriendId(friend.id);
    setEditName(friend.displayName || friend.username);
  };

  const handleSaveEdit = async (friendId) => {
    try {
      const res = await fetch(`${API_BASE}/api/friends/${friendId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: editName })
      });
      if (res.ok) {
        setEditingFriendId(null);
        await loadData(true);
      }
    } catch (err) {
      console.error('Failed to update friend:', err);
    }
  };

  // Trigger sync scan
  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch(`${API_BASE}/api/check-now`, { method: 'POST' });
      await loadData(true);
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setSyncing(false);
    }
  };

  // AI Chat Handler
  const handleSendMessage = async (queryText = null) => {
    const textToSend = queryText || chatInput;
    if (!textToSend || !textToSend.trim() || aiLoading) return;

    const userMsg = {
      id: String(Date.now()),
      role: 'user',
      text: textToSend.trim()
    };

    setChatMessages(prev => [...prev, userMsg]);
    if (!queryText) setChatInput('');
    setAiLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.text,
          apiKey: apiKey || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "AI request failed");
      }

      setChatMessages(prev => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          text: data.reply,
          source: data.source
        }
      ]);
    } catch (err) {
      setChatMessages(prev => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          text: `⚠️ **Notice:** ${err.message}. You can still use the problem search or configure your API Key anytime!`
        }
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveApiKey = (key) => {
    setApiKey(key);
    localStorage.setItem('codepulse_api_key', key);
    setShowKeyModal(false);
  };

  // Helper styles
  const getDifficultyBadge = (difficulty) => {
    const diff = (difficulty || '').toLowerCase().trim();
    if (diff === 'easy') {
      return {
        badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
        glow: 'border-l-emerald-500',
        dot: 'bg-emerald-400'
      };
    }
    if (diff === 'medium') {
      return {
        badge: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
        glow: 'border-l-amber-500',
        dot: 'bg-amber-400'
      };
    }
    if (diff === 'hard') {
      return {
        badge: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
        glow: 'border-l-rose-500',
        dot: 'bg-rose-400'
      };
    }
    return {
      badge: 'bg-slate-800 text-slate-400 border-slate-700/50',
      glow: 'border-l-slate-600',
      dot: 'bg-slate-500'
    };
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'N/A';
    const seconds = Math.floor(Date.now() / 1000 - timestamp);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Enhanced Rich Markdown & LeetCode Token Renderer
  const renderMessageContent = (content) => {
    if (!content) return '';

    const lines = content.split('\n');

    return (
      <div className="space-y-2 text-xs leading-relaxed text-slate-200">
        {lines.map((line, lineIdx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={lineIdx} className="h-1.5" />;
          }

          // Check if bullet point
          const isBullet = trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ');
          const lineText = isBullet ? trimmed.replace(/^[\*\-•]\s+/, '') : trimmed;

          return (
            <div key={lineIdx} className={isBullet ? "flex items-start space-x-2 pl-1.5 py-0.5" : "py-0.5"}>
              {isBullet && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0 shadow-sm shadow-amber-500/50" />
              )}
              <div className="flex-1">
                {renderInlineTokens(lineText)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderInlineTokens = (text) => {
    if (!text) return null;

    // Tokenize markdown bold, markdown link, URL, problem numbers, difficulty badges, inline code, italics
    const tokenRegex = /(\[([^\]]+)\]\((https:\/\/leetcode\.com\/[^\)]+)\)|https:\/\/leetcode\.com\/problems\/[a-z0-9\-_/]+|\*\*(.*?)\*\*|`([^`]+)`|\[(Easy|Medium|Hard)\]|#(\d+)|(\*|_)(.*?)\8)/gi;

    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = tokenRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const fullMatch = match[0];

      // 1. Markdown link: [Title](URL)
      if (match[2] && match[3]) {
        parts.push(
          <a
            key={match.index}
            href={match[3]}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-0.5 rounded-lg border border-amber-500/30 transition-all shadow-sm mx-1"
          >
            <span>{match[2]}</span>
            <ExternalLink className="h-3 w-3 inline opacity-80" />
          </a>
        );
      }
      // 2. Raw URL: https://leetcode.com/problems/...
      else if (fullMatch.startsWith('https://leetcode.com/')) {
        parts.push(
          <a
            key={match.index}
            href={fullMatch}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 font-bold text-brand-400 hover:text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded-lg border border-brand-500/20 transition-all underline mx-1"
          >
            <span>Open Problem</span>
            <ExternalLink className="h-3 w-3 inline" />
          </a>
        );
      }
      // 3. Bold: **text**
      else if (match[4] !== undefined) {
        parts.push(
          <strong key={match.index} className="font-extrabold text-white tracking-wide">
            {match[4]}
          </strong>
        );
      }
      // 4. Inline code: `code`
      else if (match[5] !== undefined) {
        parts.push(
          <code key={match.index} className="px-1.5 py-0.5 rounded bg-slate-900 text-amber-300 font-mono text-[11px] border border-slate-800 mx-0.5">
            {match[5]}
          </code>
        );
      }
      // 5. Difficulty: [Easy/Medium/Hard]
      else if (match[6] !== undefined) {
        const diff = match[6].toLowerCase();
        const style = diff === 'easy'
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          : diff === 'medium'
          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          : 'bg-rose-500/10 text-rose-400 border-rose-500/30';

        parts.push(
          <span key={match.index} className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border mx-1 ${style}`}>
            {match[6]}
          </span>
        );
      }
      // 6. Question Number: #123
      else if (match[7] !== undefined) {
        parts.push(
          <span key={match.index} className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono font-bold text-[11px] border border-amber-500/30 mx-0.5">
            #{match[7]}
          </span>
        );
      }
      // 7. Italics: *text* or _text_
      else if (match[10] !== undefined) {
        parts.push(
          <em key={match.index} className="italic text-slate-300">
            {match[10]}
          </em>
        );
      }
      else {
        parts.push(fullMatch);
      }

      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  // Filtered & Sorted friends (Sorted by total solved problems descending)
  const filteredFriends = friends
    .filter(friend => {
      const search = friendSearch.toLowerCase().trim();
      if (!search) return true;
      const nameMatch = (friend.displayName || '').toLowerCase().includes(search);
      const userMatch = (friend.username || '').toLowerCase().includes(search);
      return nameMatch || userMatch;
    })
    .sort((a, b) => {
      const solvedA = Number(a.totalSolved || 0);
      const solvedB = Number(b.totalSolved || 0);
      if (solvedB !== solvedA) {
        return solvedB - solvedA;
      }
      const rankA = Number(a.ranking || 9999999);
      const rankB = Number(b.ranking || 9999999);
      return rankA - rankB;
    });

  // Filtered submissions
  const filteredSubmissions = submissions.filter(sub => {
    if (difficultyFilter === 'ALL') return true;
    return (sub.difficulty || '').toUpperCase() === difficultyFilter;
  });

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 antialiased font-sans pb-24 selection:bg-brand-500 selection:text-white">
      
      {/* AMBIENT MESH GRADIENTS */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 left-1/4 w-[600px] h-[350px] bg-brand-600/10 blur-[140px] rounded-full"></div>
        <div className="absolute top-1/3 right-10 w-[500px] h-[300px] bg-indigo-600/10 blur-[150px] rounded-full"></div>
        <div className="absolute -bottom-20 left-1/3 w-[600px] h-[400px] bg-emerald-600/5 blur-[160px] rounded-full"></div>
      </div>

      {/* NAVIGATION HEADER */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#070b13]/85 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 via-amber-500 to-yellow-400 shadow-xl shadow-brand-500/25">
              <Flame className="h-6 w-6 text-slate-950 fill-current" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl sm:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-amber-100 to-amber-400 bg-clip-text text-transparent">
                  LeetPulse
                </span>
                <span className="rounded-full bg-brand-500/15 px-2.5 py-0.5 text-[10px] font-extrabold text-brand-400 border border-brand-500/30 uppercase tracking-wider">
                  AI & Live Tracker
                </span>
              </div>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center space-x-2.5 sm:space-x-3.5">
            <div className="hidden lg:flex items-center space-x-2 rounded-full bg-slate-900/90 px-3.5 py-1.5 border border-slate-800 text-xs text-slate-300 shadow-inner">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-medium text-slate-300">Live Polling (30s)</span>
            </div>

            <button 
              onClick={() => { setIsAddModalOpen(true); setFormError(''); setFormSuccess(''); }}
              className="inline-flex items-center space-x-2 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-amber-500 hover:from-brand-500 hover:to-amber-400 px-4 py-2 text-sm font-semibold text-white shadow-xl shadow-brand-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <UserPlus className="h-4 w-4 shrink-0" />
              <span>Add Friend</span>
            </button>

            <button 
              onClick={handleSync}
              disabled={syncing}
              title="Force check LeetCode now"
              className="inline-flex items-center space-x-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 px-3.5 py-2 text-sm font-semibold text-slate-200 border border-slate-700/80 shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <RotateCw className={`h-4 w-4 ${syncing ? 'animate-spin text-brand-400' : ''}`} />
              <span className="hidden md:inline">{syncing ? 'Checking...' : 'Check Now'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto mt-6 max-w-[1480px] px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* 1. STATS METRIC ROW */}
        <div className="grid grid-cols-2 gap-3.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          
          <div className="glass rounded-2xl p-5 border border-slate-800/80 hover:border-slate-700 transition-all shadow-lg hover:shadow-indigo-500/5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Tracked Friends</span>
              <div className="rounded-xl bg-indigo-500/10 p-2.5 text-indigo-400 border border-indigo-500/20">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">{stats.friendsCount}</span>
              <p className="mt-1 text-[11px] sm:text-xs text-slate-500">Live monitoring directory</p>
            </div>
          </div>

          <div className="glass rounded-2xl p-5 border border-slate-800/80 hover:border-slate-700 transition-all shadow-lg hover:shadow-emerald-500/5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Total Solved</span>
              <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400 border border-emerald-500/20">
                <Award className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">{stats.totalSolved}</span>
              <p className="mt-1 text-[11px] sm:text-xs text-slate-500">Recorded accepted solves</p>
            </div>
          </div>

          <div className="glass rounded-2xl p-5 border border-slate-800/80 hover:border-slate-700 transition-all shadow-lg hover:shadow-amber-500/5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Email Alerts</span>
              <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-400 border border-amber-500/20">
                <Mail className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">{stats.alertsSent}</span>
              <p className="mt-1 text-[11px] sm:text-xs text-slate-500">Instant notifications sent</p>
            </div>
          </div>

          <div className="glass rounded-2xl p-5 border border-slate-800/80 hover:border-slate-700 transition-all shadow-lg hover:shadow-rose-500/5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Top Active Solver</span>
              <div className="rounded-xl bg-rose-500/10 p-2.5 text-rose-400 border border-rose-500/20">
                <Zap className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-base sm:text-lg font-bold block truncate tracking-tight text-white">{stats.mostActive}</span>
              <p className="mt-1 text-[11px] sm:text-xs text-slate-500">Highest solve activity</p>
            </div>
          </div>

        </div>

        {/* 2. FRIENDS DIRECTORY LEADERBOARD (PRIMARY FULL-WIDTH SPATIAL SECTION) */}
        <div className="space-y-4">
          <div className="glass rounded-3xl overflow-hidden border border-slate-800/90 shadow-2xl bg-slate-900/30">
            
            {/* Top Bar */}
            <div className="border-b border-slate-800/80 bg-slate-900/50 px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/25">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                    <span>Friends Leaderboard & Directory</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
                      {filteredFriends.length} Solvers
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Ranked by total solved problems with live status & difficulty splits</p>
                </div>
              </div>

              {/* Instant Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={friendSearch}
                  onChange={(e) => setFriendSearch(e.target.value)}
                  placeholder="Search name or handle..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors shadow-inner"
                />
                {friendSearch && (
                  <button onClick={() => setFriendSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Friend Cards List with Generous Spacing */}
            <div className="p-4 sm:p-6 space-y-4">
              {loading && friends.length === 0 ? (
                <div className="py-20 text-center text-slate-500 bg-slate-950/40 rounded-3xl border border-slate-800/80">
                  <div className="flex items-center justify-center space-x-2.5">
                    <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
                    <span className="font-medium text-slate-400">Loading friends data...</span>
                  </div>
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="py-20 text-center text-slate-500 bg-slate-950/40 rounded-3xl border border-slate-800/80">
                  <div className="max-w-xs mx-auto text-center space-y-3">
                    <Inbox className="h-10 w-10 mx-auto text-slate-600 stroke-[1.5]" />
                    <p className="text-sm font-medium text-slate-400">
                      {friendSearch ? `No friend matches "${friendSearch}"` : 'No friends added yet.'}
                    </p>
                    {!friendSearch && (
                      <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="inline-flex items-center space-x-1.5 text-xs text-brand-400 hover:text-brand-300 font-semibold bg-brand-500/10 px-4 py-2 rounded-xl border border-brand-500/25 transition-all shadow-sm"
                      >
                        <UserPlus className="h-4 w-4" />
                        <span>Add your first friend</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                filteredFriends.map((friend, idx) => {
                  const solvedCount = getSolvedCountForFriend(friend.id);
                  const isOnline = friend.status === 'active' || (friend.lastActiveTime && (Date.now() / 1000 - friend.lastActiveTime < 86400 * 3));

                  const rankBadgeStyle = idx === 0 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/10' 
                    : idx === 1 
                    ? 'bg-slate-400/20 text-slate-200 border-slate-400/40' 
                    : idx === 2 
                    ? 'bg-orange-600/20 text-orange-300 border-orange-500/40' 
                    : 'bg-slate-900 text-slate-400 border-slate-800';

                  return (
                    <div 
                      key={friend.id} 
                      className="rounded-2xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700/90 p-5 sm:p-6 transition-all shadow-lg hover:shadow-xl hover:shadow-brand-500/5 group space-y-4"
                    >
                      {/* Top Row: Rank, Avatar, Name & Handle, Online Status, Action Buttons */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/70">
                        <div className="flex items-center space-x-4">
                          
                          {/* Leaderboard Rank Position */}
                          <div className={`h-8 w-8 rounded-xl border font-black text-xs flex items-center justify-center shrink-0 shadow-sm ${rankBadgeStyle}`}>
                            #{idx + 1}
                          </div>

                          {/* Avatar with Status Pulse */}
                          <div className="relative shrink-0">
                            <img 
                              src={friend.avatar || "https://assets.leetcode.com/users/default_avatar.png"} 
                              alt="" 
                              className="h-12 w-12 rounded-2xl border border-slate-700/80 bg-slate-950 object-cover shadow-md group-hover:border-slate-600 transition-colors" 
                              onError={(e) => { e.target.src = "https://assets.leetcode.com/users/default_avatar.png" }}
                            />
                            {isOnline ? (
                              <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-[#070b13]"></span>
                              </span>
                            ) : (
                              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-slate-600 border-2 border-[#070b13]"></span>
                            )}
                          </div>

                          {/* Name, Handle, Solved Pill */}
                          <div>
                            {editingFriendId === friend.id ? (
                              <div className="flex items-center space-x-2">
                                <input 
                                  type="text" 
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-1 text-xs text-slate-100 w-36 focus:outline-none focus:border-brand-500 shadow-inner"
                                  autoFocus
                                />
                                <button onClick={() => handleSaveEdit(friend.id)} className="text-emerald-400 hover:text-emerald-300 p-1.5 rounded hover:bg-slate-800"><Check className="h-4 w-4" /></button>
                                <button onClick={() => setEditingFriendId(null)} className="text-slate-400 hover:text-slate-300 p-1.5 rounded hover:bg-slate-800"><X className="h-4 w-4" /></button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                                <a 
                                  href={friend.profileUrl || `https://leetcode.com/u/${friend.username}/`} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="font-bold text-slate-100 hover:text-brand-400 flex items-center space-x-1.5 transition-colors text-base"
                                >
                                  <span>{friend.displayName || friend.username}</span>
                                  <ExternalLink className="h-3.5 w-3.5 text-slate-500 inline opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>

                                {friend.totalSolved !== undefined && friend.totalSolved > 0 && (
                                  <span 
                                    title={`Total Solved Breakdown: Easy: ${friend.easySolved || 0} | Medium: ${friend.mediumSolved || 0} | Hard: ${friend.hardSolved || 0}`}
                                    className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full text-xs font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm"
                                  >
                                    <Flame className="h-3 w-3 fill-amber-400" />
                                    <span>{friend.totalSolved} Solved</span>
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Handle & Difficulty Breakdown Tags */}
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs text-slate-500 font-mono">u/{friend.username}</span>
                              {friend.easySolved !== undefined && (friend.easySolved > 0 || friend.mediumSolved > 0 || friend.hardSolved > 0) && (
                                <span className="text-xs text-slate-400 font-medium">
                                  (<span className="text-emerald-400 font-bold">{friend.easySolved || 0} Easy</span> · <span className="text-amber-400 font-bold">{friend.mediumSolved || 0} Med</span> · <span className="text-rose-400 font-bold">{friend.hardSolved || 0} Hard</span>)
                                </span>
                              )}
                            </div>
                          </div>

                        </div>

                        {/* Online Status & Action Buttons */}
                        <div className="flex items-center space-x-3 self-end sm:self-auto">
                          {isOnline ? (
                            <span className="inline-flex items-center space-x-2 rounded-full px-3.5 py-1 text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                              <span>Online</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-2 rounded-full px-3.5 py-1 text-xs font-semibold bg-slate-800/80 text-slate-400 border border-slate-700/70">
                              <span className="h-2 w-2 rounded-full bg-slate-500"></span>
                              <span>Offline</span>
                            </span>
                          )}

                          <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-800">
                            <button 
                              onClick={() => handleStartEdit(friend)}
                              title="Edit display nickname"
                              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all shadow-sm"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteFriend(friend.id, friend.displayName || friend.username)}
                              title="Remove from tracking"
                              className="p-2 rounded-xl bg-slate-900 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/40 text-rose-400/80 hover:text-rose-400 transition-all shadow-sm"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Bottom 3-Column Data Grid with Spacious Padding */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1 text-xs">
                        
                        {/* Global Rank Box */}
                        <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-3.5 flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                            <Trophy className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Global Rank</span>
                            <span className="text-sm font-bold text-slate-100 font-mono">
                              {friend.ranking ? Number(friend.ranking).toLocaleString() : 'Unranked'}
                            </span>
                          </div>
                        </div>

                        {/* Tracked Solves Box */}
                        <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-3.5 flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Award className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Tracked Solves</span>
                            <span className="text-sm font-bold text-slate-100">
                              {solvedCount} {solvedCount === 1 ? 'Problem' : 'Problems'} Logged
                            </span>
                          </div>
                        </div>

                        {/* Latest Problem Box */}
                        <div className="sm:col-span-2 lg:col-span-1 rounded-xl bg-slate-900/60 border border-slate-800/80 p-3.5 flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            <Activity className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Latest Solved</span>
                            {friend.lastProblemTitle ? (
                              <div className="flex items-center space-x-2 mt-0.5 truncate">
                                <a 
                                  href={`https://leetcode.com/problems/${friend.lastProblemSlug}/`} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="font-bold text-slate-100 hover:text-brand-400 transition-colors truncate text-xs"
                                >
                                  {friend.lastProblemTitle}
                                </a>
                                <span className={`inline-flex rounded px-1.5 py-0.2 text-[9px] font-bold border uppercase tracking-wider ${getDifficultyBadge(friend.lastProblemDifficulty).badge}`}>
                                  {friend.lastProblemDifficulty || 'Easy'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-500 italic">No activity yet</span>
                            )}
                          </div>
                        </div>

                      </div>

                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>

        {/* 3. LOWER SPLIT SECTION: LIVE SOLVED FEED (LEFT) + AI PROBLEM FINDER CHATBOT (RIGHT) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: LIVE SOLVED FEED (6 COLS) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="glass rounded-3xl overflow-hidden border border-slate-800/90 shadow-2xl bg-slate-900/30 flex flex-col">
              
              {/* Header */}
              <div className="border-b border-slate-800/80 bg-slate-900/50 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center space-x-2">
                      <span>Live Solved Feed</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
                        {filteredSubmissions.length}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Recent accepted solutions across friends</p>
                  </div>
                </div>
              </div>

              {/* Difficulty Filter Tabs */}
              <div className="border-b border-slate-800/50 bg-slate-950/30 px-5 py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1.5">
                  <Filter className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-slate-400 font-medium text-[11px]">Filter:</span>
                </div>
                <div className="flex items-center space-x-1">
                  {['ALL', 'EASY', 'MEDIUM', 'HARD'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setDifficultyFilter(tab)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all ${
                        difficultyFilter === tab
                          ? 'bg-brand-500 text-slate-950 shadow-md shadow-brand-500/20'
                          : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800/80'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Feed Cards Container */}
              <div className="p-4 overflow-y-auto max-h-[580px] space-y-3.5">
                {filteredSubmissions.length === 0 ? (
                  <div className="text-center text-slate-500 py-20 space-y-2">
                    <Inbox className="h-10 w-10 mx-auto text-slate-600 stroke-[1.5]" />
                    <p className="text-sm font-medium text-slate-400">No activity recorded</p>
                    <p className="text-xs text-slate-500">Solved questions will populate here live</p>
                  </div>
                ) : (
                  filteredSubmissions.map((sub, idx) => {
                    const badgeStyles = getDifficultyBadge(sub.difficulty);
                    const timeAgo = formatTimeAgo(sub.timestamp);

                    return (
                      <div 
                        key={sub.id || idx}
                        className={`rounded-2xl border border-slate-800/90 bg-slate-950/40 p-4 transition-all hover:bg-slate-900/60 hover:border-slate-700/80 border-l-4 ${badgeStyles.glow} shadow-md`}
                      >
                        {/* Top: Solver Name & Timestamp */}
                        <div className="flex items-center justify-between text-xs mb-2.5">
                          <div className="flex items-center space-x-2">
                            <div className="h-6 w-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[10px] text-brand-400 uppercase">
                              {(sub.friendDisplayName || sub.friendId || 'F')[0]}
                            </div>
                            <span className="font-bold text-slate-100">
                              {sub.friendDisplayName || sub.friendId}
                            </span>
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/25 font-semibold flex items-center space-x-1">
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              <span>Solved</span>
                            </span>
                          </div>

                          <div className="flex items-center space-x-1 text-slate-500 text-[11px]">
                            <Clock className="h-3 w-3" />
                            <span>{timeAgo}</span>
                          </div>
                        </div>

                        {/* Problem Details */}
                        <div className="mb-3.5">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="text-xs font-mono text-slate-400 font-bold">
                              #{sub.questionId || '???'}
                            </span>
                            <a 
                              href={`https://leetcode.com/problems/${sub.problemSlug}/`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-sm font-bold text-white hover:text-brand-400 transition-colors"
                            >
                              {sub.problemTitle}
                            </a>
                            <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold border uppercase tracking-wider ${badgeStyles.badge}`}>
                              {sub.difficulty || 'Easy'}
                            </span>
                          </div>
                        </div>

                        {/* Bottom Actions */}
                        <div className="pt-2.5 border-t border-slate-800/60 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {sub.notified ? (
                              <span className="text-[10px] text-emerald-400 font-semibold flex items-center space-x-1">
                                <Mail className="h-3 w-3" />
                                <span>Alert Dispatched</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 flex items-center space-x-1">
                                <Mail className="h-3 w-3" />
                                <span>Logged</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            <a 
                              href={`https://leetcode.com/problems/${sub.problemSlug}/`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors flex items-center space-x-1 shadow-sm"
                            >
                              <span>Problem</span>
                              <ExternalLink className="h-3 w-3 text-slate-500" />
                            </a>

                            {sub.id && !sub.id.startsWith('mock_') && (
                              <a 
                                href={`https://leetcode.com/submissions/detail/${sub.id}/`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/25 hover:bg-indigo-500/20 transition-colors flex items-center space-x-1 shadow-sm"
                              >
                                <Code2 className="h-3.5 w-3.5" />
                                <span>View Code</span>
                              </a>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>

            </div>
          </div>

          {/* RIGHT: AI LEETCODE PROBLEM FINDER CHATBOT (6 COLS) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="glass rounded-3xl overflow-hidden border border-slate-800/90 shadow-2xl bg-slate-900/30 flex flex-col h-[670px]">
              
              {/* Chat Header */}
              <div className="border-b border-slate-800/80 bg-slate-900/50 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-brand-500/15 text-brand-400 border border-brand-500/30 shadow-md shadow-brand-500/10">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center space-x-2">
                      <span>LeetCode AI Problem Assistant</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                        AI Finder
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Ask for question numbers, algorithms & practice links</p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button 
                    onClick={() => setChatMessages([{
                      id: 'welcome',
                      role: 'assistant',
                      text: "👋 Hi! I'm your **LeetCode AI Problem Finder**.\nAsk me for problem numbers, topics, or concepts (e.g., *'Find graph topological sort questions'* or *'What is the number for Course Schedule?'*), and I'll give you the exact problem numbers and direct links to code them!"
                    }])}
                    title="Clear chat history"
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors text-xs font-semibold"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick Prompt Chips */}
              <div className="border-b border-slate-800/50 bg-slate-950/20 px-4 py-2.5 flex items-center space-x-2 overflow-x-auto text-[11px]">
                <span className="text-slate-500 shrink-0 flex items-center space-x-1 font-semibold">
                  <Sparkles className="h-3 w-3 text-brand-400" />
                  <span>Try:</span>
                </span>
                {[
                  "Dynamic Programming",
                  "Graph Cycle (Course Schedule)",
                  "Top Binary Search",
                  "LRU Cache #",
                  "Two Pointers / 3Sum"
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(prompt)}
                    disabled={aiLoading}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all font-medium disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Chat Message History */}
              <div className="p-4 sm:p-5 overflow-y-auto flex-grow space-y-4">
                {chatMessages.map(msg => (
                  <div 
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-4 sm:p-4.5 text-xs leading-relaxed transition-all ${
                        msg.role === 'user' 
                          ? 'bg-gradient-to-r from-brand-600 to-amber-600 text-white font-medium shadow-md shadow-brand-600/15' 
                          : 'bg-slate-950/90 border border-slate-800/90 text-slate-100 shadow-xl shadow-black/20'
                      }`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800/60 text-brand-400 font-bold text-[11px]">
                          <div className="flex items-center space-x-1.5">
                            <div className="h-5 w-5 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center">
                              <Bot className="h-3.5 w-3.5" />
                            </div>
                            <span className="tracking-wide">AI Problem Finder</span>
                            {msg.source && (
                              <span className="text-[10px] text-slate-400 font-normal bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                                {msg.source}
                              </span>
                            )}
                          </div>

                          <button 
                            onClick={() => navigator.clipboard.writeText(msg.text)}
                            title="Copy response text"
                            className="text-[10px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors font-medium"
                          >
                            Copy
                          </button>
                        </div>
                      )}
                      <div>
                        {renderMessageContent(msg.text)}
                      </div>
                    </div>
                  </div>
                ))}

                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-slate-950/90 border border-slate-800/90 p-4 text-xs text-slate-300 flex items-center space-x-2.5 shadow-lg">
                      <Loader2 className="h-4 w-4 animate-spin text-brand-400" />
                      <span className="font-medium">Querying Gemini AI for problem numbers & practice links...</span>
                    </div>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/50">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                  className="flex items-center space-x-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask a question, topic, or problem number (e.g. #207)..."
                    disabled={aiLoading}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={aiLoading || !chatInput.trim()}
                    className="p-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-amber-500 text-white hover:from-brand-500 hover:to-amber-400 disabled:opacity-40 transition-all shadow-md shadow-brand-600/20 shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>

            </div>
          </div>

        </div>

      </main>

      {/* API KEY CONFIGURATION MODAL */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="glass bg-[#0c111d] border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button 
              onClick={() => setShowKeyModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center space-x-3 mb-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-400 border border-brand-500/30">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">AI API Key Configuration</h3>
                <p className="text-xs text-slate-400">Add your Gemini / AI API key</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Google Gemini API Key
                </label>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-brand-500 placeholder-slate-600 font-mono transition-colors shadow-inner"
                />
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  💡 *You can get a free Gemini key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-brand-400 underline">Google AI Studio</a>. Saved locally in your browser!*
                </p>
              </div>

              <div className="pt-2 flex space-x-3">
                <button 
                  type="button" 
                  onClick={() => setShowKeyModal(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-800 text-sm font-semibold text-slate-400 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={() => handleSaveApiKey(apiKey)}
                  className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-amber-500 text-sm font-semibold text-white shadow-xl shadow-brand-600/25 hover:from-brand-500 hover:to-amber-400 transition-all"
                >
                  Save API Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD FRIEND MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="glass bg-[#0c111d] border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative">
            <button 
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center space-x-3 mb-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-400 border border-brand-500/30">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Add LeetCode Friend</h3>
                <p className="text-xs text-slate-400">Track solved problems automatically</p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 flex items-center space-x-2 rounded-xl bg-rose-500/10 border border-rose-500/25 p-3 text-xs text-rose-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mb-4 flex items-center space-x-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-3 text-xs text-emerald-400">
                <Check className="h-4 w-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAddFriend} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Display Nickname (Optional)
                </label>
                <input 
                  type="text" 
                  value={newFriendName}
                  onChange={(e) => setNewFriendName(e.target.value)}
                  placeholder="e.g. Prakash, Rakesh"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-brand-500 placeholder-slate-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  LeetCode Profile URL or Handle <span className="text-brand-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={newFriendUrl}
                  onChange={(e) => setNewFriendUrl(e.target.value)}
                  placeholder="e.g. https://leetcode.com/u/prakash-2736/ or prakash-2736"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-brand-500 placeholder-slate-600 font-mono text-xs transition-colors"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Automatically pulls avatar, ranking, and baseline solutions via GraphQL.
                </p>
              </div>

              <div className="pt-2 flex space-x-3">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-800 text-sm font-semibold text-slate-400 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={addingFriend || !newFriendUrl}
                  className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-amber-500 text-sm font-semibold text-white shadow-xl shadow-brand-600/25 hover:from-brand-500 hover:to-amber-400 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {addingFriend ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Fetching...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>Add Friend</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
