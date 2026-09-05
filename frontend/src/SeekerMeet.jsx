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
  Subtitles,
  Globe,
  Minimize2,
  Volume2,
  VolumeX,
  Radio,
  LogOut,
  Star
} from 'lucide-react';

const SUPPORTED_LANGUAGES = [
  { code: 'en-US', label: 'English (US)', ttsCode: 'en-US' },
  { code: 'hi-IN', label: 'Hindi (हिंदी)', ttsCode: 'hi-IN' },
  { code: 'es-ES', label: 'Spanish (Español)', ttsCode: 'es-ES' },
  { code: 'fr-FR', label: 'French (Français)', ttsCode: 'fr-FR' },
  { code: 'de-DE', label: 'German (Deutsch)', ttsCode: 'de-DE' }
];

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export default function SeekerMeet() {
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
  const [meetingEnded, setMeetingEnded] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [videoActive, setVideoActive] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [message, setMessage] = useState('');
  const [notes, setNotes] = useState('');

  // Audio Connection State
  const [audioStatus, setAudioStatus] = useState('Connecting...'); 

  // Multilingual Settings
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [sourceLanguage, setSourceLanguage] = useState('en-US'); 
  const [targetLanguage, setTargetLanguage] = useState('en-US'); 
  const [audioDubbingEnabled, setAudioDubbingEnabled] = useState(false);
  const [activeSubtitle, setActiveSubtitle] = useState(null);

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
  const dataChannelRef = useRef(null);
  const recognitionRef = useRef(null);
  const screenStreamRef = useRef(null);
  const processedSignalIdsRef = useRef(new Set());
  const subtitleTimeoutRef = useRef(null);
  const isSpeechRunningRef = useRef(false);
  const iceCandidateQueueRef = useRef([]);
  const pendingCaptionQueueRef = useRef([]);

  const isHost = Boolean(
    session && (
      session.hostId?._id === user?.id ||
      session.hostId?._id === user?._id ||
      session.hostId === user?.id ||
      session.hostId === user?._id
    )
  );

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
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    dataChannelRef.current = null;
    remoteStreamRef.current = null;
    iceCandidateQueueRef.current = [];
    pendingCaptionQueueRef.current = [];
    processedSignalIdsRef.current.clear();

    if (subtitleTimeoutRef.current) {
      clearTimeout(subtitleTimeoutRef.current);
      subtitleTimeoutRef.current = null;
    }

    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    setActiveSubtitle(null);
    setAudioStatus('Connecting...');
  }, []);

  const sendSignal = async (type, payload) => {
    try {
      await API.post(`/meet/room/${roomId}/signal`, { type, payload });
    } catch (e) {}
  };

  const performTranslation = async (text, sourceLangCode, targetLangCode) => {
    if (!text) return text;
    const srcShort = sourceLangCode ? sourceLangCode.split('-')[0] : 'auto';
    const tgtShort = targetLangCode ? targetLangCode.split('-')[0] : 'en';
    if (srcShort === tgtShort) return text;

    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${srcShort}&tl=${tgtShort}&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data[0]) {
        return data[0].map(item => item[0]).join('');
      }
    } catch (e) {
      console.warn('Translation fallback error:', e);
    }
    return text;
  };

  const executeDubbedTTS = (text, langCode) => {
    if (!window.speechSynthesis || !audioDubbingEnabled || !text) return;
    try {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const langConfig = SUPPORTED_LANGUAGES.find(l => l.code === langCode);
      utterance.lang = langConfig ? langConfig.ttsCode : 'en-US';
      utterance.rate = 1.0;
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const matched = voices.find(v => v.lang.toLowerCase().includes(langCode.substring(0, 2).toLowerCase()));
        if (matched) utterance.voice = matched;
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {}
  };

  const handleIncomingRemoteSpeech = useCallback(async (payload) => {
    if (!captionsEnabled && !audioDubbingEnabled) return;

    const translatedText = await performTranslation(payload.rawText, payload.sourceLang || 'en-US', targetLanguage);

    if (captionsEnabled) {
      setActiveSubtitle({
        speakerName: payload.speakerName,
        text: translatedText
      });

      if (subtitleTimeoutRef.current) clearTimeout(subtitleTimeoutRef.current);
      subtitleTimeoutRef.current = setTimeout(() => {
        setActiveSubtitle(null);
      }, 6000);
    }

    if (audioDubbingEnabled) {
      executeDubbedTTS(translatedText, targetLanguage);
    }
  }, [captionsEnabled, audioDubbingEnabled, targetLanguage]);

  const setupDataChannel = useCallback((channel) => {
    dataChannelRef.current = channel;

    channel.onopen = () => {
      while (
        channel.readyState === 'open' &&
        pendingCaptionQueueRef.current.length > 0
      ) {
        channel.send(JSON.stringify(pendingCaptionQueueRef.current.shift()));
      }
    };

    channel.onclose = () => {
      if (dataChannelRef.current === channel) {
        dataChannelRef.current = null;
      }
    };

    channel.onerror = () => {};
    channel.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'caption') {
          handleIncomingRemoteSpeech(payload);
        }
      } catch (err) {
        console.warn('DataChannel message parse error:', err);
      }
    };
  }, [handleIncomingRemoteSpeech]);

  const createAndSendOffer = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);
      sendSignal('offer', offer);
    } catch (err) {
      console.warn('Offer creation error:', err);
    }
  }, [roomId]);

  const flushIceQueue = async (pc) => {
    while (iceCandidateQueueRef.current.length > 0) {
      const candidate = iceCandidateQueueRef.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {}
    }
  };

  const setupWebRTCConnection = useCallback(() => {
    if (peerConnectionRef.current) return;

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionRef.current = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      remoteStreamRef.current = stream;

      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.play().catch(e => console.warn('Audio playback restriction:', e));
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
      setAudioStatus('Audio Connected');
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal('ice-candidate', event.candidate);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setAudioStatus('Audio Connected');
      } else if (
        pc.connectionState === 'failed' ||
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'closed'
      ) {
        setAudioStatus('Remote audio unavailable');
      } else {
        setAudioStatus('Connecting...');
      }
    };

    if (isHost) {
      const dc = pc.createDataChannel('seeker-captions', { reliable: true });
      setupDataChannel(dc);
    }

    pc.ondatachannel = (event) => {
      setupDataChannel(event.channel);
    };

    if (isHost) {
      setTimeout(() => {
        createAndSendOffer();
      }, 1000);
    }
  }, [isHost, setupDataChannel, createAndSendOffer]);

  const pollSignalingChannel = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      const res = await API.get(`/meet/room/${roomId}/signal`);
      const signals = res.data.signals || [];

      for (const sig of signals) {
        const sigKey = `${sig.type}-${sig.timestamp}`;
        if (processedSignalIdsRef.current.has(sigKey)) continue;
        processedSignalIdsRef.current.add(sigKey);

        if (sig.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
          await flushIceQueue(pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
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
            try {
              await pc.addIceCandidate(new RTCIceCandidate(sig.payload));
            } catch (e) {}
          }
        } else if (sig.type === 'participant-left') {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
          if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
          setAudioStatus('Remote audio unavailable');
        }
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
      if (res.data.sharedNotes && !notes) {
        setNotes(res.data.sharedNotes);
      }
    } catch (err) {
      if (err.response?.status === 410) {
        setMeetingEnded(true);
        terminateLocalMedia();
        if (clearSession) clearSession();
      }
    }
  }, [roomId, notes, clearSession, terminateLocalMedia]);

  const startSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    if (isSpeechRunningRef.current) return;

    try {
      if (recognitionRef.current) recognitionRef.current.abort();

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false; // Prevents duplicate interim chunks
      recognition.lang = sourceLanguage; 

      recognition.onstart = () => {
        isSpeechRunningRef.current = true;
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }

        const clean = transcript.trim();
        if (clean.length > 0) {
          const payload = {
            type: 'caption',
            speakerName: user?.name || 'User',
            rawText: clean,
            sourceLang: sourceLanguage
          };

          if (
            dataChannelRef.current &&
            dataChannelRef.current.readyState === 'open'
          ) {
            dataChannelRef.current.send(JSON.stringify(payload));
          } else {
            pendingCaptionQueueRef.current.push(payload);
          }
        }
      };

      recognition.onerror = () => {
        isSpeechRunningRef.current = false;
      };

      recognition.onend = () => {
        isSpeechRunningRef.current = false;
        if ((captionsEnabled || audioDubbingEnabled) && micActive) {
          setTimeout(() => {
            try { recognition.start(); } catch (e) {}
          }, 250);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      isSpeechRunningRef.current = false;
    }
  };

  const stopSpeechRecognition = () => {
    isSpeechRunningRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
  };

  const initMeeting = useCallback(async () => {
    try {
      const res = await API.get(`/meet/room/${roomId}`);
      setSession(res.data);
      if (setActiveSession) setActiveSession(res.data);
      if (res.data.sharedNotes) setNotes(res.data.sharedNotes);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        localStreamRef.current = stream;
        stream.getVideoTracks().forEach(t => { t.enabled = false; });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setMicActive(true);
        if (setGlobalMic) setGlobalMic(true);
      } catch (mediaErr) {
        setMicActive(false);
        setVideoActive(false);
        if (setGlobalMic) setGlobalMic(false);
        if (setGlobalCam) setGlobalCam(false);
      }

      setupWebRTCConnection();
    } catch (err) {
      if (err.response?.status === 410 || err.response?.data?.session?.status === 'COMPLETED') {
        setMeetingEnded(true);
      }
    } finally {
      setLoading(false);
    }
  }, [roomId, setActiveSession, setupWebRTCConnection, setGlobalMic, setGlobalCam]);

  useEffect(() => {
    initMeeting();
    const signalInterval = setInterval(pollSignalingChannel, 1000);
    const roomPollInterval = setInterval(pollRoomData, 1500);

    return () => {
      clearInterval(signalInterval);
      clearInterval(roomPollInterval);
      terminateLocalMedia();
    };
  }, [initMeeting, pollSignalingChannel, pollRoomData, terminateLocalMedia]);

  useEffect(() => {
    if ((captionsEnabled || audioDubbingEnabled) && micActive) {
      startSpeechRecognition();
    } else {
      stopSpeechRecognition();
    }
  }, [captionsEnabled, audioDubbingEnabled, micActive, sourceLanguage]);

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
            const sender = peerConnectionRef.current
              .getSenders()
              .find(s => s.track && s.track.kind === 'video');

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

  const isUserA = user?.id === session?.studentA?._id || user?._id === session?.studentA?._id;
  const peer = isUserA ? session?.studentB : session?.studentA;
  const peerName = peer?.name || 'Connected User';

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
              SEEKER Meet: {session?.topicToCover}
            </h2>
            <p className="text-xs text-slate-400">
              Partner: <strong className="text-indigo-400">{peerName}</strong> ({peer?.college || 'Institution'}) • 
              Role: <span className="text-amber-400 uppercase font-semibold">{isHost ? 'Host' : 'Participant'}</span> • 
              Status: <span className="text-emerald-400 uppercase font-bold">{session?.status}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            {session?.durationMinutes} mins
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

          {isHost && (
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
                className={`absolute inset-0 w-full h-full object-cover rounded-2xl scale-x-[-1] ${videoActive ? 'block' : 'hidden'}`}
              />

              {!videoActive && (
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full bg-indigo-600/30 border border-indigo-500 flex items-center justify-center text-xl font-bold text-indigo-400 mb-2">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <span className="text-sm font-semibold text-white">{user?.name || 'You'} (You)</span>
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
                className={`absolute inset-0 w-full h-full object-cover rounded-2xl ${
                  remoteStreamRef.current ? 'block' : 'hidden'
                }`}
              />

              {!remoteStreamRef.current && (
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

              {remoteStreamRef.current && (
                <div className="absolute bottom-3 left-3 z-10 bg-slate-950/80 px-2 py-1 rounded-lg text-xs font-semibold">
                  {peerName}
                </div>
              )}

              <div className="hidden">
                <div className="w-20 h-20 rounded-full bg-sky-600/30 border border-sky-500 flex items-center justify-center text-xl font-bold text-sky-400 mb-2">
                  {peerName.charAt(0)}
                </div>
                <span className="text-sm font-semibold text-white">{peerName}</span>
                <span className="text-xs text-sky-400 mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> {audioStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Subtitle Banner */}
          {captionsEnabled && activeSubtitle && activeSubtitle.text && (
            <div className="bg-slate-900/95 border-2 border-indigo-500 rounded-xl p-3.5 shadow-2xl flex items-start gap-3 animate-in fade-in transition-all">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-[10px] font-black uppercase tracking-wider shrink-0 mt-0.5">
                LIVE CC ({targetLanguage.split('-')[0].toUpperCase()})
              </span>
              <div className="text-xs text-slate-100 leading-relaxed font-medium">
                <strong className="text-indigo-400 mr-2">{activeSubtitle.speakerName}:</strong>
                <span className="text-white font-semibold">
                  {activeSubtitle.text}
                </span>
              </div>
            </div>
          )}

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

            <button
              onClick={() => setCaptionsEnabled(!captionsEnabled)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                captionsEnabled ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <Subtitles className="w-4 h-4" />
              {captionsEnabled ? 'CC ON' : 'CC OFF'}
            </button>

            {/* Separate Speaker Source Language & Listener Target Language Dropdowns */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">My Spoken Lang</span>
                <select
                  value={sourceLanguage}
                  onChange={(e) => setSourceLanguage(e.target.value)}
                  className="bg-transparent text-xs text-white focus:outline-none cursor-pointer font-semibold"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={`src-${lang.code}`} value={lang.code} className="bg-slate-900 text-white">
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-l border-slate-800 pl-2 flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Target CC Lang</span>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="bg-transparent text-xs text-white focus:outline-none cursor-pointer font-semibold"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={`tgt-${lang.code}`} value={lang.code} className="bg-slate-900 text-white">
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (window.speechSynthesis) window.speechSynthesis.resume();
                  setAudioDubbingEnabled(!audioDubbingEnabled);
                }}
                title="Toggle AI Dubbed Voice Playback"
                className={`p-1.5 rounded-lg text-xs transition flex items-center gap-1 ml-1 ${
                  audioDubbingEnabled ? 'bg-emerald-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {audioDubbingEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span className="text-[10px] font-bold">Dubbing</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Chat */}
        <div className="lg:col-span-4 bg-slate-900 border-l border-slate-800 flex flex-col h-full">
          <div className="p-4 border-b border-slate-800 font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" /> SEEKER Meet Chat
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {session?.chatMessages?.length === 0 ? (
              <p className="text-xs text-slate-500 text-center mt-10">No messages yet. Say hi to your partner!</p>
            ) : (
              session?.chatMessages?.map((msg, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl text-xs ${
                    msg.senderName === user?.name
                      ? 'bg-indigo-600/30 border border-indigo-500/40 text-white ml-6'
                      : 'bg-slate-950 border border-slate-800 text-slate-300 mr-6'
                  }`}
                >
                  <span className="text-[10px] font-bold text-indigo-300 block mb-1">{msg.senderName}</span>
                  <p>{msg.message}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask a question..."
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