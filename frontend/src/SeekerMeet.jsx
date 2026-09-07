import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from './api';
import { AuthContext } from './AuthContext';
import { MeetingContext } from './MeetingContext';
import { 
  Video, 
  Mic, 
  MicOff, 
  Send, 
  PhoneOff, 
  Users, 
  FileText, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  ScreenShare, 
  StopCircle,
  Minimize2,
  Radio,
  LogOut,
  Star,
  AlertCircle,
  Languages
} from 'lucide-react';

const CHAT_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' }
];

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export default function SeekerMeet() {
  console.log('[SEEKER MEET] Component rendered');

  const { roomId } = useParams();
  const { user } = useContext(AuthContext);
  const { 
    setActiveSession, 
    setIsMinimized, 
    clearSession, 
    setMicActive: setGlobalMic, 
    setCamActive: setGlobalCam 
  } = useContext(MeetingContext);
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [meetError, setMeetError] = useState(null);
  const [meetingEnded, setMeetingEnded] = useState(false);
  const [micActive, setMicActive] = useState(true);
  const [videoActive, setVideoActive] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [message, setMessage] = useState('');
  const [notes, setNotes] = useState('');

  // Audio Connection & Stream States
  const [audioStatus, setAudioStatus] = useState('Connecting...');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  // Chat Translation States
  const [chatTargetLang, setChatTargetLang] = useState('en');
  const [translatedMessages, setTranslatedMessages] = useState({}); // { [msgIndex]: { text: '...', error: false } }
  const [translatingIndex, setTranslatingIndex] = useState(null);

  // Review & Rating Modal States
  const [rating, setRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Hardware & WebRTC Refs
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const screenStreamRef = useRef(null);
  const processedSignalIdsRef = useRef(new Set());
  const iceCandidateQueueRef = useRef([]);
  const remoteAudioAvailableRef = useRef(false);

  const currentUserId = user?.id || user?._id;

  const terminateLocalMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    remoteStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    remoteAudioAvailableRef.current = false;
    iceCandidateQueueRef.current = [];
    processedSignalIdsRef.current.clear();

    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;

    setAudioStatus('Connecting...');
  }, []);

  // Bind local video stream via useEffect when state changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream]);

  // Bind remote video stream via useEffect when state changes (remote video must be muted)
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.muted = true;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  // Bind remote audio stream (always unmuted for original voice playback)
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.muted = false;
      console.log('[SEEKER AUDIO TEST] Remote audio playback enabled');
      remoteAudioRef.current.play().catch(err => {
        console.warn('[SEEKER RTC] Remote audio autoplay blocked:', err);
      });
    }
  }, [remoteStream]);

  const sendSignal = async (type, payload) => {
    try {
      await API.post(`/meet/room/${roomId}/signal`, { type, payload });
    } catch (e) {
      console.error('[SEEKER RTC] Error sending signal:', type, e);
    }
  };

  const createAndSendOffer = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    try {
      console.log('[SEEKER RTC] Creating host offer');
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);
      console.log('[SEEKER RTC] Sending offer');
      sendSignal('offer', offer);
    } catch (err) {
      console.error('[SEEKER RTC] Offer creation error:', err);
    }
  }, [roomId]);

  const flushIceQueue = async (pc) => {
    while (iceCandidateQueueRef.current.length > 0) {
      const candidate = iceCandidateQueueRef.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('[SEEKER RTC] Error flushing queued ICE candidate:', e);
      }
    }
  };

  const setupWebRTCConnection = useCallback((fetchedIsHost) => {
    if (peerConnectionRef.current) return;

    console.log('[SEEKER RTC] Current user:', currentUserId);
    console.log('[SEEKER RTC] Host:', fetchedIsHost);

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionRef.current = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.ontrack = (event) => {
      console.log('[SEEKER AUDIO TEST] Remote audio track received');
      if (event.track.kind === 'audio') {
        remoteAudioAvailableRef.current = true;
      }

      let stream = event.streams?.[0];
      if (!stream) {
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }
        stream = remoteStreamRef.current;
        if (!stream.getTracks().includes(event.track)) {
          stream.addTrack(event.track);
        }
      } else {
        remoteStreamRef.current = stream;
      }

      setRemoteStream(stream);

      const state = pc.connectionState;
      console.log('[SEEKER AUDIO TEST] WebRTC connection state:', state);
      if (state === 'connected' && remoteAudioAvailableRef.current) {
        setAudioStatus('Audio Connected');
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal('ice-candidate', event.candidate);
      }
    };

    const updateConnectionState = () => {
      console.log('[SEEKER AUDIO TEST] WebRTC connection state:', pc.connectionState);
      const state = pc.connectionState;
      if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        setAudioStatus('Remote audio unavailable');
      } else if (state === 'connected' && remoteAudioAvailableRef.current) {
        setAudioStatus('Audio Connected');
      } else {
        setAudioStatus('Connecting...');
      }
    };

    pc.onconnectionstatechange = updateConnectionState;
    pc.oniceconnectionstatechange = updateConnectionState;

    if (fetchedIsHost) {
      setTimeout(() => {
        createAndSendOffer();
      }, 1000);
    }
  }, [createAndSendOffer, currentUserId]);

  const pollSignalingChannel = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      const res = await API.get(`/meet/room/${roomId}/signal`);
      const signals = res.data.signals || [];
      if (signals.length === 0) return;

      const successfullyAckedIds = [];

      for (const sig of signals) {
        const sigKey = sig._id || `${sig.type}-${sig.timestamp}`;
        if (processedSignalIdsRef.current.has(sigKey)) {
          if (sig._id) successfullyAckedIds.push(sig._id);
          continue;
        }

        try {
          if (sig.type === 'offer') {
            console.log('[SEEKER RTC] Received offer');
            await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
            await flushIceQueue(pc);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            console.log('[SEEKER RTC] Sending answer');
            sendSignal('answer', answer);
          } else if (sig.type === 'answer') {
            if (pc.signalingState === 'have-local-offer') {
              await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
              await flushIceQueue(pc);
            }
          } else if (sig.type === 'ice-candidate') {
            if (!pc.remoteDescription || !pc.remoteDescription.type) {
              iceCandidateQueueRef.current.push(sig.payload);
            } else {
              await pc.addIceCandidate(new RTCIceCandidate(sig.payload));
            }
          } else if (sig.type === 'participant-left') {
            remoteAudioAvailableRef.current = false;
            setRemoteStream(null);
            remoteStreamRef.current = null;
            setAudioStatus('Remote audio unavailable');
          }

          processedSignalIdsRef.current.add(sigKey);
          if (sig._id) successfullyAckedIds.push(sig._id);
        } catch (signalErr) {
          console.warn('[SEEKER RTC] Error processing signal (will retry):', sig.type, signalErr);
        }
      }

      if (successfullyAckedIds.length > 0) {
        await API.post(`/meet/room/${roomId}/signal/ack`, { signalIds: successfullyAckedIds });
      }
    } catch (e) {}
  }, [roomId]);

  const pollRoomData = useCallback(async () => {
    try {
      const res = await API.get(`/meet/room/${roomId}`);
      if (res.data.status === 'COMPLETED') {
        setMeetingEnded(true);
        terminateLocalMedia();
        if (clearSession) clearSession();
        return;
      }
      setSession(res.data);
      setNotes(prev => (prev === '' ? (res.data.sharedNotes || '') : prev));
    } catch (err) {
      if (err.response?.status === 410) {
        setMeetingEnded(true);
        terminateLocalMedia();
        if (clearSession) clearSession();
      }
    }
  }, [roomId, clearSession, terminateLocalMedia]);

  const initMeeting = useCallback(async () => {
    console.log('[SEEKER MEET] Loading room');
    try {
      const res = await API.get(`/meet/room/${roomId}`);
      console.log('[SEEKER MEET] Room loaded');
      setSession(res.data);
      if (setActiveSession) setActiveSession(res.data);
      if (res.data.sharedNotes) setNotes(res.data.sharedNotes);

      const fetchedHostId = res.data.hostId?._id || res.data.hostId;
      const fetchedIsHost = String(fetchedHostId) === String(currentUserId);

      console.log('[SEEKER MEET] Getting media');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        localStreamRef.current = stream;
        stream.getVideoTracks().forEach(t => { t.enabled = true; });
        stream.getAudioTracks().forEach(t => { t.enabled = true; });

        setLocalStream(stream);
        setMicActive(true);
        setVideoActive(true);
        if (setGlobalMic) setGlobalMic(true);
        if (setGlobalCam) setGlobalCam(true);
      } catch (mediaErr) {
        console.warn('[SEEKER MEET] Media acquisition issue:', mediaErr);
        setMicActive(false);
        setVideoActive(false);
        if (setGlobalMic) setGlobalMic(false);
        if (setGlobalCam) setGlobalCam(false);
      }

      console.log('[SEEKER MEET] WebRTC initialization started');
      setupWebRTCConnection(fetchedIsHost);
    } catch (err) {
      console.error('[SEEKER MEET] WebRTC initialization failed:', err);
      setMeetError(err.response?.data?.message || err.message || 'Failed to initialize meeting room.');
      if (err.response?.status === 410 || err.response?.data?.session?.status === 'COMPLETED') {
        setMeetingEnded(true);
      }
    } finally {
      setLoading(false);
    }
  }, [roomId, setActiveSession, setupWebRTCConnection, setGlobalMic, setGlobalCam, currentUserId]);

  // Stable mount effect without UI dependencies that would trigger re-initialization
  useEffect(() => {
    initMeeting();
    const signalInterval = setInterval(pollSignalingChannel, 1000);
    const roomPollInterval = setInterval(pollRoomData, 1500);

    return () => {
      clearInterval(signalInterval);
      clearInterval(roomPollInterval);
      terminateLocalMedia();
    };
  }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  const translateChatMessage = async (text, targetLang) => {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data[0]) {
        return data[0].map(item => item[0]).join('');
      }
    } catch (e) {
      console.warn('Chat translation error:', e);
    }
    throw new Error('Translation failed');
  };

  const handleTranslateMessage = async (index, text) => {
    if (translatedMessages[index]?.text) return; // Cached
    setTranslatingIndex(index);
    try {
      const translated = await translateChatMessage(text, chatTargetLang);
      setTranslatedMessages(prev => ({
        ...prev,
        [index]: { text: translated, error: false }
      }));
    } catch (err) {
      setTranslatedMessages(prev => ({
        ...prev,
        [index]: { text: 'Translation unavailable. Try again.', error: true }
      }));
    } finally {
      setTranslatingIndex(null);
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicActive(audioTrack.enabled);
        if (setGlobalMic) setGlobalMic(audioTrack.enabled);
      }
    } else {
      setMicActive(prev => !prev);
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoActive(videoTrack.enabled);
        if (setGlobalCam) setGlobalCam(videoTrack.enabled);
      }
    } else {
      setVideoActive(prev => !prev);
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
      if (peerConnectionRef.current && localStreamRef.current) {
        const camTrack = localStreamRef.current.getVideoTracks()[0];
        const sender = peerConnectionRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender && camTrack) sender.replaceTrack(camTrack);
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        screenStreamRef.current = stream;
        setIsScreenSharing(true);

        const screenTrack = stream.getVideoTracks()[0];
        if (peerConnectionRef.current) {
          const sender = peerConnectionRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        }

        screenTrack.onended = () => {
          setIsScreenSharing(false);
          if (peerConnectionRef.current && localStreamRef.current) {
            const camTrack = localStreamRef.current.getVideoTracks()[0];
            const sender = peerConnectionRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender && camTrack) {
              sender.replaceTrack(camTrack).catch(() => {});
            }
          }
        };
      } catch (err) {}
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    try {
      await API.post(`/meet/room/${roomId}/message`, { message, sharedNotes: notes });
      setMessage('');
      pollRoomData();
    } catch (err) {}
  };

  const handleNotesChange = async (val) => {
    setNotes(val);
    try {
      await API.post(`/meet/room/${roomId}/message`, { sharedNotes: val });
    } catch (err) {}
  };

  const handleLeaveMeeting = async () => {
    terminateLocalMedia();
    if (clearSession) clearSession();
    if (setActiveSession) setActiveSession(null);
    if (setIsMinimized) setIsMinimized(false);

    try {
      await API.post(`/meet/room/${roomId}/leave`);
    } catch (e) {}

    navigate('/studyswap');
  };

  const handleEndMeetingForEveryone = async () => {
    const confirmEnd = window.confirm(
      'Are you sure you want to end this meeting for everyone? This room will permanently close.'
    );
    if (!confirmEnd) return;

    try {
      await API.put(`/meet/room/${roomId}/end`);
      terminateLocalMedia();
      if (clearSession) clearSession();
      if (setActiveSession) setActiveSession(null);
      if (setIsMinimized) setIsMinimized(false);
      setMeetingEnded(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not end meeting.');
    }
  };

  const handleSubmitReview = async () => {
    setSubmittingReview(true);
    try {
      await API.post(`/meet/room/${roomId}/review`, {
        rating,
        punctualityScore: 5,
        feedbackText,
        skillEndorsed: session?.topicToCover?.split(' ')[0] || 'Peer Collaboration'
      });
      alert('Endorsement submitted! User reputation updated in MongoDB.');
      navigate('/studyswap');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
        <span>Connecting to Two-Way WebRTC Session...</span>
      </div>
    );
  }

  const studentAObj = session?.studentA;
  const studentBObj = session?.studentB;
  const isStudentA = String(studentAObj?._id || studentAObj) === String(currentUserId);
  const peer = isStudentA ? studentBObj : studentAObj;
  const hostObj = session?.hostId;
  const hostName = hostObj?.name || (hostObj === currentUserId ? user?.name : null);
  const isHostComputed = Boolean(session && String(hostObj?._id || hostObj) === String(currentUserId));
  const peerName = peer?.name || (isHostComputed ? (session?.studentA?.name || session?.studentB?.name) : hostName) || 'Connected User';
  const currentUserName = user?.name || 'You';

  if (meetingEnded) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-8 space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-indigo-400" />
          </div>

          <div>
            <h1 className="text-xl font-black mb-1">Session Concluded</h1>
            <p className="text-xs text-slate-400">
              Rate your learning session with <strong className="text-white">{peerName}</strong> to update their verified skill reputation.
            </p>
          </div>

          <div className="space-y-4 text-left">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Knowledge &amp; Collaboration ({rating}/5)
              </label>
              <div className="flex gap-2 justify-center py-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 text-amber-400 hover:scale-110 transition"
                  >
                    <Star className={`w-6 h-6 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Skill Endorsement Note
              </label>
              <textarea
                rows={3}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Explained concepts clearly, solved all problems, very supportive..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/studyswap')}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition"
            >
              Skip
            </button>
            <button
              onClick={handleSubmitReview}
              disabled={submittingReview}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg disabled:opacity-50"
            >
              {submittingReview ? 'Submitting...' : 'Endorse & Exit'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-slate-950 text-white flex flex-col">
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {meetError && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-2.5 flex items-center gap-2 text-amber-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Notice: {meetError} (Meeting UI is active)</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              audioStatus === 'Audio Connected'
                ? 'bg-emerald-500 animate-pulse'
                : 'bg-amber-500'
            }`}
          />
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2">
              SEEKER Meet: {session?.topicToCover || 'Peer Collaboration'}
            </h2>
            <p className="text-xs text-slate-400">
              Partner: <strong className="text-indigo-400">{peerName}</strong> ({peer?.college || 'Institution'}) • 
              Role: <span className="text-amber-400 uppercase font-semibold">{isHostComputed ? 'Host' : 'Participant'}</span> • 
              Status: <span className="text-emerald-400 uppercase font-bold">{session?.status || 'LIVE'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            {session?.durationMinutes || 30} mins
          </div>

          <button
            onClick={() => {
              if (setIsMinimized) setIsMinimized(true);
              navigate('/skillproof');
            }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition border border-slate-700 shadow-md"
          >
            <Minimize2 className="w-4 h-4 text-indigo-400" /> Minimize
          </button>

          <button
            onClick={handleLeaveMeeting}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition border border-slate-700 shadow-md"
          >
            <LogOut className="w-4 h-4 text-slate-400" /> Leave
          </button>

          {isHostComputed && (
            <button
              onClick={handleEndMeetingForEveryone}
              className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition shadow-lg"
            >
              <PhoneOff className="w-4 h-4" /> End for Everyone
            </button>
          )}
        </div>
      </div>

      {/* Main Stage Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        
        {/* Left Stage */}
        <div className="lg:col-span-8 p-6 flex flex-col gap-4 overflow-y-auto">
          
          {isScreenSharing && (
            <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-2xl p-4 shadow-2xl relative">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                  <ScreenShare className="w-4 h-4" /> Live Screen Sharing Active
                </span>
                <button
                  onClick={toggleScreenShare}
                  className="text-xs bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white px-3 py-1 rounded-lg font-semibold transition flex items-center gap-1.5"
                >
                  <StopCircle className="w-4 h-4" /> Stop Sharing
                </button>
              </div>
              <video
                ref={(el) => {
                  if (el && screenStreamRef.current) {
                    el.srcObject = screenStreamRef.current;
                    el.play().catch(() => {});
                  }
                }}
                autoPlay
                playsInline
                muted
                className="w-full h-80 object-contain rounded-xl bg-black border border-slate-800"
              />
            </div>
          )}

          {/* Videos Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl h-56 flex flex-col items-center justify-center relative p-4 shadow-inner overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover rounded-2xl scale-x-[-1] ${videoActive && localStream ? 'block' : 'hidden'}`}
              />

              {(!videoActive || !localStream) && (
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full bg-indigo-600/30 border border-indigo-500 flex items-center justify-center text-xl font-bold text-indigo-400 mb-2">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <span className="text-sm font-semibold text-white">{currentUserName} (You)</span>
                  <span className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Present in Room
                  </span>
                </div>
              )}

              <div className="absolute bottom-3 right-3 flex gap-2 z-10">
                <span className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${micActive ? 'bg-slate-950/80 text-emerald-400' : 'bg-red-950/80 text-red-400'}`}>
                  {micActive ? <Radio className="w-3 h-3 animate-pulse text-emerald-400" /> : null}
                  {micActive ? '🎙️ Mic Active' : '🔇 Mic Muted'}
                </span>
                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${videoActive ? 'bg-emerald-950/80 text-emerald-400' : 'bg-slate-950/80 text-slate-400'}`}>
                  {videoActive ? '📹 Video ON' : '🚫 Video OFF'}
                </span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl h-56 flex flex-col items-center justify-center relative p-4 shadow-inner overflow-hidden">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover rounded-2xl ${
                  remoteStream ? 'block' : 'hidden'
                }`}
              />

              {!remoteStream && (
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full bg-sky-600/30 border border-sky-500 flex items-center justify-center text-xl font-bold text-sky-400 mb-2">
                    {peerName.charAt(0)}
                  </div>
                  <span className="text-sm font-semibold text-white">{peerName}</span>
                  <span className="text-xs text-sky-400 mt-1 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> {audioStatus}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Scratchpad Whiteboard */}
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Shared Whiteboard &amp; Code Notes
              </h3>
            </div>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Write explanation notes, code snippets, or solutions here. Syncs live across users..."
              className="flex-1 min-h-[130px] bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-emerald-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Meeting Controls */}
          <div className="flex flex-wrap items-center justify-center gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
            <button
              onClick={toggleMic}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                micActive ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-red-600 text-white'
              }`}
            >
              {micActive ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4" />}
              {micActive ? 'Mic Active' : 'Mic Muted'}
            </button>

            <button
              onClick={toggleCamera}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                videoActive ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <Video className="w-4 h-4" />
              {videoActive ? 'Turn Off Camera' : 'Turn On Camera'}
            </button>

            <button
              onClick={toggleScreenShare}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                isScreenSharing ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <ScreenShare className="w-4 h-4" />
              {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
            </button>
          </div>
        </div>

        {/* Right Side: Chat & Multilingual Translation */}
        <div className="lg:col-span-4 bg-slate-900 border-l border-slate-800 flex flex-col h-full">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" /> SEEKER Meet Chat
            </div>
            
            {/* Chat Target Language Selector */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              <Languages className="w-3.5 h-3.5 text-indigo-400" />
              <select
                value={chatTargetLang}
                onChange={(e) => setChatTargetLang(e.target.value)}
                className="bg-transparent text-[11px] text-white focus:outline-none cursor-pointer font-semibold"
              >
                {CHAT_LANGUAGES.map((lang) => (
                  <option key={`chat-lang-${lang.code}`} value={lang.code} className="bg-slate-900 text-white">
                    Translate to {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {session?.chatMessages?.length === 0 ? (
              <p className="text-xs text-slate-500 text-center mt-10">No messages yet. Say hi to your partner!</p>
            ) : (
              session?.chatMessages?.map((msg, i) => {
                const isOwnMessage = msg.senderName === currentUserName || (user?.name && msg.senderName === user.name);
                const translationEntry = translatedMessages[i];

                return (
                  <div
                    key={i}
                    className={`p-3 rounded-xl text-xs space-y-2 ${
                      isOwnMessage
                        ? 'bg-indigo-600/30 border border-indigo-500/40 text-white ml-6'
                        : 'bg-slate-950 border border-slate-800 text-slate-300 mr-6'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-indigo-300">{msg.senderName}</span>
                      <span className="text-[9px] text-slate-500">
                        {new Date(msg.sentAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-white leading-relaxed">Original: {msg.message}</p>

                    {/* Translation Section for Other User's Messages */}
                    {!isOwnMessage && (
                      <div className="pt-1 border-t border-slate-800/80">
                        {translationEntry ? (
                          <div className={`text-[11px] font-medium leading-relaxed ${translationEntry.error ? 'text-amber-400' : 'text-emerald-400'}`}>
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold mb-0.5">
                              Translation ({CHAT_LANGUAGES.find(l => l.code === chatTargetLang)?.label || chatTargetLang}):
                            </span>
                            {translationEntry.text}
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={translatingIndex === i}
                            onClick={() => handleTranslateMessage(i, msg.message)}
                            className="text-[10px] bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white px-2.5 py-1 rounded-md font-semibold transition flex items-center gap-1 disabled:opacity-50"
                          >
                            <Languages className="w-3 h-3" />
                            {translatingIndex === i ? 'Translating...' : `Translate to ${CHAT_LANGUAGES.find(l => l.code === chatTargetLang)?.label || chatTargetLang}`}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}