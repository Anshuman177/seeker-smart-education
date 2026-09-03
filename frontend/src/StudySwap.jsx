import React, { useState, useEffect, useContext } from 'react';
import API from './api';
import { AuthContext } from './AuthContext';
import { 
  Users, 
  Search, 
  Send, 
  Calendar, 
  X, 
  Clock, 
  Video, 
  Shuffle, 
  Trash2, 
  MoreVertical, 
  Bell, 
  AlertTriangle,
  Radio,
  CheckCircle2,
  Hourglass,
  Check,
  Ban
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PREDEFINED_REASONS = [
  'Unable to attend',
  'Need to reschedule',
  'Technical issue',
  'Other'
];

export default function StudySwap() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('matched'); // 'matched' | 'requests' | 'sessions' | 'notifications'
  const [peers, setPeers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Proposal Modal State
  const [selectedPeer, setSelectedPeer] = useState(null);
  const [skillOffered, setSkillOffered] = useState('');
  const [skillRequested, setSkillRequested] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [sendingProposal, setSendingProposal] = useState(false);

  // Accept & Schedule Modal State
  const [acceptingReq, setAcceptingReq] = useState(null);
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduleTime, setScheduleTime] = useState('18:00');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [meetingTopic, setMeetingTopic] = useState('');
  const [schedulingLoading, setSchedulingLoading] = useState(false);

  // 3-Dot Host Notice Modal State
  const [notifyModalSession, setNotifyModalSession] = useState(null);
  const [selectedReason, setSelectedReason] = useState('Unable to attend');
  const [customReasonNote, setCustomReasonNote] = useState('');
  const [submittingNotice, setSubmittingNotice] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  useEffect(() => {
    loadPeers();
    loadRequests();
    loadSessions();
    loadNotifications();
    const timer = setInterval(() => {
      loadSessions();
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const loadPeers = async (query = '') => {
    setLoading(true);
    try {
      const endpoint = query ? `/studyswap/discover?query=${encodeURIComponent(query)}` : '/studyswap/matches';
      const res = await API.get(endpoint);
      setPeers(res.data || []);
    } catch (err) {
      console.error('Failed to load peers:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async () => {
    try {
      const res = await API.get('/studyswap/requests');
      setIncomingRequests(res.data.incoming || []);
      setOutgoingRequests(res.data.outgoing || []);
    } catch (err) {}
  };

  const loadSessions = async () => {
    try {
      const res = await API.get('/studyswap/sessions');
      setSessions(res.data || []);
    } catch (err) {}
  };

  const loadNotifications = async () => {
    try {
      const res = await API.get('/user/notifications');
      setNotifications(res.data || []);
    } catch (err) {}
  };

  const isTimeReached = (sessionDateStr, sessionTimeStr) => {
    if (!sessionDateStr || !sessionTimeStr) return false;
    const sessionDate = new Date(`${sessionDateStr}T${sessionTimeStr}:00`);
    return Date.now() >= sessionDate.getTime();
  };

  const isApproaching = (sessionDateStr, sessionTimeStr) => {
    if (!sessionDateStr || !sessionTimeStr) return false;
    const sessionDate = new Date(`${sessionDateStr}T${sessionTimeStr}:00`);
    const diffMins = (sessionDate.getTime() - Date.now()) / (1000 * 60);
    return diffMins > 0 && diffMins <= 30;
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadPeers(searchQuery);
  };

  const openProposalModal = (match) => {
    const peer = match.peer || match;
    setSelectedPeer(peer);
    setSkillOffered(user?.skillsTeach?.[0] || 'JavaScript');
    setSkillRequested(peer.skillsTeach?.[0] || peer.skillsLearn?.[0] || 'Python');
    setCustomMessage(`Hi ${peer.name}! I would love to connect for a StudySwap session.`);
  };

  const handleSendProposal = async () => {
    if (!selectedPeer) return;
    setSendingProposal(true);
    try {
      await API.post('/studyswap/request', {
        receiverId: selectedPeer._id,
        skillOffered,
        skillRequested,
        message: customMessage
      });
      alert(`Request sent to ${selectedPeer.name}! You will wait until they accept.`);
      setSelectedPeer(null);
      loadRequests();
      setActiveTab('requests');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send proposal.');
    } finally {
      setSendingProposal(false);
    }
  };

  // Fixed: Correctly passes scheduleDate and scheduleTime from component state
  const handleAcceptAndSchedule = async () => {
    if (!acceptingReq) return;
    setSchedulingLoading(true);
    try {
      await API.put(`/studyswap/request/${acceptingReq._id}`, {
        status: 'ACCEPTED',
        scheduledDate: scheduleDate,
        scheduledTime: scheduleTime,
        durationMinutes: Number(durationMinutes) || 30,
        topicToCover: meetingTopic || `${acceptingReq.skillRequested} & ${acceptingReq.skillOffered} Study Session`
      });

      alert('Meeting scheduled successfully! You are the Host of this session.');
      setAcceptingReq(null);
      loadRequests();
      loadSessions();
      loadNotifications();
      setActiveTab('sessions');
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Error scheduling session.';
      alert(`Schedule Failed: ${errMsg}`);
    } finally {
      setSchedulingLoading(false);
    }
  };

  const handleRejectRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to decline this request?')) return;
    try {
      await API.put(`/studyswap/request/${requestId}`, { status: 'REJECTED' });
      loadRequests();
    } catch (err) {
      alert('Could not reject request.');
    }
  };

  const handleSendHostNotice = async () => {
    if (!notifyModalSession) return;
    setSubmittingNotice(true);
    try {
      await API.post(`/studyswap/session/${notifyModalSession._id}/notify`, {
        reason: selectedReason,
        customMessage: customReasonNote
      });
      alert('Notice sent directly to user.');
      setNotifyModalSession(null);
      setCustomReasonNote('');
      loadSessions();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send notice.');
    } finally {
      setSubmittingNotice(false);
    }
  };

  const handleDeleteRequest = async (requestId) => {
    if (!window.confirm('Delete this request permanently from database?')) return;
    try {
      await API.delete(`/studyswap/request/${requestId}`);
      loadRequests();
    } catch (err) {
      alert('Could not delete request.');
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Delete this meeting session permanently?')) return;
    try {
      await API.delete(`/studyswap/session/${sessionId}`);
      loadSessions();
    } catch (err) {
      alert('Could not delete session.');
    }
  };

  const dismissNotification = async (id) => {
    try {
      await API.delete(`/user/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) {}
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      
      {/* Header */}
      <div>
        <span className="inline-block px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2 border border-indigo-500/30">
          Peer-to-Peer Knowledge Exchange
        </span>
        <h1 className="text-3xl font-black text-white">StudySwap Matchmaking &amp; Meet</h1>
        <p className="text-slate-400 text-sm mt-1">
          Connect with verified learning partners, schedule peer sessions, and join live WebRTC rooms.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-3 border-b border-slate-800 pb-4">
        <button
          onClick={() => setActiveTab('matched')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'matched' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" /> Discover Users ({peers.length})
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'requests' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Send className="w-4 h-4" /> Swap Requests ({incomingRequests.length + outgoingRequests.length})
        </button>

        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'sessions' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" /> Scheduled Sessions ({sessions.length})
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'notifications' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Bell className="w-4 h-4" /> Notifications ({notifications.length})
        </button>
      </div>

      {/* TAB 1: PEERS DISCOVERY */}
      {activeTab === 'matched' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xl">
            <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1 w-full">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users by name or skill..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-lg shrink-0"
              >
                Search
              </button>
            </form>

            <button
              onClick={() => { setSearchQuery(''); loadPeers(); }}
              className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0"
            >
              <Shuffle className="w-4 h-4 text-indigo-400" /> Reset
            </button>
          </div>

          {loading ? (
            <div className="text-center py-16 text-slate-500 text-xs">Finding available study partners...</div>
          ) : peers.length === 0 ? (
            <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-2">
              <Users className="w-8 h-8 mx-auto text-slate-600 mb-1" />
              <h3 className="text-sm font-bold text-white">No Users Found</h3>
              <p className="text-xs text-slate-400">Try searching for other subjects or reset filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {peers.map((item, idx) => {
                const peer = item.peer || item;
                const matchPct = item.matchPercentage || 50;

                return (
                  <div 
                    key={peer._id || idx}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl space-y-4 hover:border-slate-700 transition"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-base font-bold text-white">{peer.name}</h3>
                          <p className="text-[11px] text-slate-400">{peer.college}</p>
                        </div>
                        <span className="bg-indigo-950/70 border border-indigo-800/60 text-indigo-300 text-[10px] font-black px-2.5 py-1 rounded-lg">
                          {matchPct}% Match
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider block mb-1">
                            Can Teach:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {peer.skillsTeach?.map((s, i) => (
                              <span key={i} className="bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="pt-1">
                          <span className="text-[10px] font-bold uppercase text-sky-400 tracking-wider block mb-1">
                            Wants to Learn:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {peer.skillsLearn?.map((s, i) => (
                              <span key={i} className="bg-sky-950/40 border border-sky-800/40 text-sky-300 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => openProposalModal(item)}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-1.5 mt-2"
                    >
                      <Send className="w-3.5 h-3.5" /> Propose Swap
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SWAP REQUESTS */}
      {activeTab === 'requests' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Incoming */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center justify-between">
              <span>Incoming Invites ({incomingRequests.length})</span>
              <span className="text-[10px] text-slate-400 font-normal">You can accept and schedule</span>
            </h2>

            {incomingRequests.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No incoming requests right now.</p>
            ) : (
              incomingRequests.map((req) => (
                <div key={req._id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white">{req.senderId?.name}</h4>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                      req.status === 'ACCEPTED' ? 'bg-emerald-950 text-emerald-400' :
                      req.status === 'REJECTED' ? 'bg-red-950 text-red-400' : 'bg-amber-950 text-amber-400'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Offers: <strong className="text-emerald-400">{req.skillOffered}</strong> • Wants: <strong className="text-sky-400">{req.skillRequested}</strong>
                  </p>
                  {req.message && <p className="text-[11px] text-slate-300 italic">"{req.message}"</p>}

                  <div className="flex gap-2 pt-2">
                    {req.status === 'PENDING' ? (
                      <>
                        <button
                          onClick={() => {
                            setAcceptingReq(req);
                            setMeetingTopic(`${req.skillRequested} & ${req.skillOffered} Session`);
                          }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs transition shadow flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Accept &amp; Schedule
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req._id)}
                          className="bg-slate-800 hover:bg-red-600 hover:text-white text-slate-300 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                          title="Decline"
                        >
                          <Ban className="w-3.5 h-3.5" /> Decline
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">
                        {req.status === 'ACCEPTED' ? 'Accepted & Scheduled in Sessions tab' : 'Declined'}
                      </span>
                    )}

                    <button
                      onClick={() => handleDeleteRequest(req._id)}
                      className="bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white px-3 py-2 rounded-xl text-xs font-bold transition border border-red-500/20"
                      title="Delete from history"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Outgoing */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center justify-between">
              <span>Sent Proposals ({outgoingRequests.length})</span>
              <span className="text-[10px] text-slate-400 font-normal">Waiting for partner response</span>
            </h2>

            {outgoingRequests.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">You haven't sent any proposals yet.</p>
            ) : (
              outgoingRequests.map((req) => (
                <div key={req._id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white">To: {req.receiverId?.name}</h4>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                      req.status === 'ACCEPTED' ? 'bg-emerald-950 text-emerald-400' :
                      req.status === 'REJECTED' ? 'bg-red-950 text-red-400' : 'bg-amber-950 text-amber-400'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    You offer: <strong className="text-emerald-400">{req.skillOffered}</strong> • You want: <strong className="text-sky-400">{req.skillRequested}</strong>
                  </p>

                  {req.status === 'PENDING' && (
                    <div className="bg-amber-950/40 border border-amber-500/30 text-amber-300 text-[11px] p-2 rounded-lg flex items-center gap-2">
                      <Hourglass className="w-3.5 h-3.5 animate-spin" />
                      <span>Waiting for <strong>{req.receiverId?.name}</strong> to accept your proposal.</span>
                    </div>
                  )}

                  {req.status === 'ACCEPTED' && (
                    <div className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[11px] p-2 rounded-lg flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Accepted! Session scheduled in the <strong>Scheduled Sessions</strong> tab.</span>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => handleDeleteRequest(req._id)}
                      className="bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition border border-red-500/20"
                    >
                      Cancel / Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      )}

      {/* TAB 3: SCHEDULED SESSIONS */}
      {activeTab === 'sessions' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" /> Active &amp; Scheduled Peer Sessions
          </h2>

          {sessions.length === 0 ? (
            <p className="text-xs text-slate-500 py-10 text-center">No sessions scheduled yet. Accept an incoming request to book a session.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {sessions.map((sess) => {
                const isHost = sess.hostId?._id === user?.id || sess.hostId === user?.id || sess.hostId === user?._id;
                const hostName = sess.hostId?.name || (isHost ? user?.name : 'Host');
                const partner = sess.studentA?._id === user?._id || sess.studentA === user?._id ? sess.studentB : sess.studentA;
                const timeArrived = isTimeReached(sess.scheduledDate, sess.scheduledTime);
                const approaching = isApproaching(sess.scheduledDate, sess.scheduledTime);
                const isCompleted = sess.status === 'COMPLETED';

                const displayStatus = isCompleted ? 'COMPLETED' : (timeArrived ? 'LIVE' : 'SCHEDULED');

                return (
                  <div key={sess._id} className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-4 relative">
                    
                    {approaching && !isCompleted && (
                      <div className="bg-amber-950/80 border border-amber-500/40 px-3 py-1.5 rounded-xl flex items-center gap-2 text-amber-300 text-[11px] font-semibold">
                        <Clock className="w-3.5 h-3.5 animate-pulse" />
                        Meeting starts soon at {sess.scheduledTime}!
                      </div>
                    )}

                    {sess.hostNotice?.message && (
                      <div className="bg-indigo-950/50 border border-indigo-500/30 p-2.5 rounded-xl text-[11px] text-indigo-300 space-y-0.5">
                        <div className="flex items-center gap-1.5 font-bold text-indigo-200">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Notice from Host: {sess.hostNotice.reason}
                        </div>
                        <p>{sess.hostNotice.message}</p>
                      </div>
                    )}

                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[11px] font-mono text-indigo-400 font-bold block mb-1">
                            {sess.scheduledDate} @ {sess.scheduledTime} ({sess.durationMinutes || 30} mins)
                          </span>
                          <h4 className="text-sm font-bold text-white">{sess.topicToCover}</h4>
                          <div className="text-xs text-slate-400 mt-1 space-y-0.5">
                            <p>Host: <strong className="text-amber-400">{hostName}</strong> {isHost && '(You)'}</p>
                            <p>Partner: <strong className="text-indigo-300">{partner?.name || 'User'}</strong></p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase flex items-center gap-1 ${
                            displayStatus === 'LIVE' 
                              ? 'bg-emerald-950 border border-emerald-700 text-emerald-400 animate-pulse'
                              : displayStatus === 'COMPLETED'
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-indigo-950/80 text-indigo-300 border border-indigo-800'
                          }`}>
                            {displayStatus === 'LIVE' && <Radio className="w-3 h-3" />}
                            {displayStatus}
                          </span>

                          {isHost && !isCompleted && (
                            <div className="relative">
                              <button
                                onClick={() => setOpenDropdownId(openDropdownId === sess._id ? null : sess._id)}
                                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {openDropdownId === sess._id && (
                                <div className="absolute right-0 mt-1 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 z-30">
                                  <button
                                    onClick={() => {
                                      setNotifyModalSession(sess);
                                      setOpenDropdownId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs text-amber-300 hover:bg-slate-800 flex items-center gap-2"
                                  >
                                    <AlertTriangle className="w-3.5 h-3.5" /> Notify Partner
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleDeleteSession(sess._id);
                                      setOpenDropdownId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-slate-800 flex items-center gap-2"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete Session
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80">
                      {timeArrived && !isCompleted ? (
                        <button
                          onClick={() => navigate(`/meet/${sess.roomId}`)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg"
                        >
                          <Video className="w-4 h-4" /> Join Live Meeting
                        </button>
                      ) : !isCompleted ? (
                        <button
                          disabled
                          className="flex-1 bg-slate-900 border border-slate-800 text-slate-500 font-bold py-2 rounded-xl text-xs cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <Clock className="w-4 h-4" /> Join available at {sess.scheduledTime}
                        </button>
                      ) : (
                        <button
                          disabled
                          className="flex-1 bg-slate-900 text-slate-600 font-bold py-2 rounded-xl text-xs cursor-not-allowed"
                        >
                          Meeting Ended
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteSession(sess._id)}
                        className="bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white px-3 py-2 rounded-xl text-xs font-bold transition border border-red-500/20"
                        title="Delete Session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: NOTIFICATIONS INBOX */}
      {activeTab === 'notifications' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-400" /> Notifications Inbox
          </h2>

          {notifications.length === 0 ? (
            <p className="text-xs text-slate-500 py-10 text-center">No notifications at the moment.</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div key={n._id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">
                      {new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString()}
                    </span>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      {n.type === 'HOST_CANCELLATION' ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      {n.title}
                    </h4>
                    <p className="text-xs text-slate-300">{n.message}</p>
                  </div>

                  <button
                    onClick={() => dismissNotification(n._id)}
                    className="text-slate-500 hover:text-slate-300 p-1 rounded transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: PROPOSE SWAP */}
      {selectedPeer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Propose Swap with {selectedPeer.name}</h3>
              <button onClick={() => setSelectedPeer(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Skill You Will Teach</label>
                <input
                  type="text"
                  value={skillOffered}
                  onChange={(e) => setSkillOffered(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Skill You Want Them to Teach</label>
                <input
                  type="text"
                  value={skillRequested}
                  onChange={(e) => setSkillRequested(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Message</label>
                <textarea
                  rows={3}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              onClick={handleSendProposal}
              disabled={sendingProposal}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg disabled:opacity-50"
            >
              {sendingProposal ? 'Sending...' : 'Send Swap Invitation'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: USER B ACCEPTS & SCHEDULES */}
      {acceptingReq && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Accept &amp; Schedule Meeting</h3>
                <span className="text-[10px] text-amber-400 font-semibold">You will host this session</span>
              </div>
              <button onClick={() => setAcceptingReq(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Meeting Topic</label>
                <input
                  type="text"
                  value={meetingTopic}
                  onChange={(e) => setMeetingTopic(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Date</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Time</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Duration (Minutes)</label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleAcceptAndSchedule}
              disabled={schedulingLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg disabled:opacity-50"
            >
              {schedulingLoading ? 'Creating Room...' : 'Confirm Schedule & Generate Room'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: HOST NOTICE MODAL */}
      {notifyModalSession && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Notify Partner About Session
              </h3>
              <button onClick={() => setNotifyModalSession(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Select Reason</label>
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  {PREDEFINED_REASONS.map((r, i) => (
                    <option key={i} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Custom Message (Optional)</label>
                <textarea
                  rows={3}
                  value={customReasonNote}
                  onChange={(e) => setCustomReasonNote(e.target.value)}
                  placeholder="e.g. Can we reschedule to 7:00 PM due to urgent work?"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              onClick={handleSendHostNotice}
              disabled={submittingNotice}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg disabled:opacity-50"
            >
              {submittingNotice ? 'Sending...' : 'Send Notice to Partner'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}