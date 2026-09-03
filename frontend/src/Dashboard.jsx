import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from './api';
import { AuthContext } from './AuthContext';
import { 
  BookOpen, 
  Award, 
  Users, 
  Calendar, 
  Video, 
  TrendingUp, 
  AlertCircle, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Sparkles 
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await API.get('/student/dashboard');
      setDashboardData(res.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const isTimeReached = (scheduledDate, scheduledTime) => {
    if (!scheduledDate || !scheduledTime) return false;
    const sessionDate = new Date(`${scheduledDate}T${scheduledTime}:00`);
    return Date.now() >= sessionDate.getTime();
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        Loading personalized learning metrics...
      </div>
    );
  }

  const upcoming = dashboardData?.upcomingSessions || [];
  const skillSummary = dashboardData?.skillSummary || [];
  const weakTopics = dashboardData?.weakTopics || [];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900/40 via-slate-900 to-slate-900 border border-indigo-500/20 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold uppercase tracking-wider border border-indigo-500/30">
            <Sparkles className="w-3.5 h-3.5" /> Learner Command Center
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white">
            Welcome back, {user?.name || 'User'}!
          </h1>
          <p className="text-slate-400 text-xs max-w-xl leading-relaxed">
            Track your verified competencies, manage upcoming peer knowledge swaps, and revise identified concept gaps.
          </p>
        </div>

        <div className="flex gap-3 z-10 shrink-0">
          <Link
            to="/studyswap"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-lg flex items-center gap-2"
          >
            <Users className="w-4 h-4" /> Swap Sessions
          </Link>
          <Link
            to="/skillproof"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-2 shadow-md"
          >
            <Award className="w-4 h-4 text-emerald-400" /> SkillProof Tests
          </Link>
        </div>
      </div>

      {/* Top 4 Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Quizzes Done</span>
            <BookOpen className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-black text-white">
            {dashboardData?.totalQuizzesAttempted || 0}
          </div>
          <p className="text-[11px] text-slate-500">Across StudyPath curricula</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Verified Skills</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400">
            {skillSummary.length}
          </div>
          <p className="text-[11px] text-slate-500">Certified by SkillProof tests</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Upcoming Meets</span>
            <Calendar className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl font-black text-sky-400">
            {dashboardData?.upcomingSessionsCount || 0}
          </div>
          <p className="text-[11px] text-slate-500">Scheduled StudySwap rooms</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Pending Swaps</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400">
            {dashboardData?.pendingRequestsCount || 0}
          </div>
          <p className="text-[11px] text-slate-500">Awaiting your response</p>
        </div>

      </div>

      {/* Center Grid: Active Sessions + Weak Concepts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Upcoming Sessions */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" /> Scheduled StudySwap Sessions
            </h2>
            <Link to="/studyswap" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">No scheduled sessions at the moment.</p>
              <Link 
                to="/studyswap" 
                className="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
              >
                Discover Peers to Swap Knowledge
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((sess) => {
                const partner = sess.studentA?._id === user?._id || sess.studentA === user?._id 
                  ? sess.studentB 
                  : sess.studentA;
                const timeArrived = isTimeReached(sess.scheduledDate, sess.scheduledTime);

                return (
                  <div 
                    key={sess._id} 
                    className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase block">
                        {sess.scheduledDate} @ {sess.scheduledTime}
                      </span>
                      <h4 className="text-xs font-bold text-white">{sess.topicToCover}</h4>
                      <p className="text-[11px] text-slate-400">
                        Peer: <strong className="text-slate-200">{partner?.name || 'User'}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {timeArrived ? (
                        <button
                          onClick={() => navigate(`/meet/${sess.roomId}`)}
                          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shrink-0"
                        >
                          <Video className="w-3.5 h-3.5" /> Join Meeting
                        </button>
                      ) : (
                        <span className="w-full sm:w-auto text-center px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-500 font-semibold shrink-0 flex items-center gap-1.5 justify-center">
                          <Clock className="w-3.5 h-3.5" /> Opens at {sess.scheduledTime}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Weak Topics / Concepts to Revise */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400" /> Focus Topics to Revise
              </h2>
              <span className="text-[10px] text-slate-500">score &lt; 60%</span>
            </div>

            {weakTopics.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-xs font-bold text-white">All Concept Areas Strong!</p>
                <p className="text-[11px] text-slate-400">No diagnostic quiz score below 60%.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {weakTopics.slice(0, 4).map((topic, i) => (
                  <div key={i} className="bg-slate-950 border border-slate-800/80 p-3.5 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{topic.topic}</span>
                      <span className="text-red-400 font-bold text-[11px]">{topic.percentage}%</span>
                    </div>
                    <p className="text-[10px] text-slate-400">{topic.subject}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link
            to="/studypath"
            className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2 text-center"
          >
            Go to StudyPath Roadmaps <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>

      {/* Bottom Row: Verified Skills Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> SkillProof Verified Competencies
          </h3>
          <Link to="/skillproof" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
            Take New Assessment <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {skillSummary.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            No verified skills recorded yet. Complete a SkillProof test to showcase competency badges.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {skillSummary.map((item, idx) => (
              <div key={idx} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white">{item.skill}</h4>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                    item.level === 'Advanced' ? 'bg-emerald-950 text-emerald-400' :
                    item.level === 'Intermediate' ? 'bg-indigo-950 text-indigo-400' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {item.level}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Accuracy: <strong className="text-white">{item.accuracy}%</strong></span>
                  <span>{item.attempts} attempt{item.attempts !== 1 ? 's' : ''}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}