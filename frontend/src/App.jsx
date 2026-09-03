import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, AuthContext } from './AuthContext';
import Navbar from './Navbar';
import Login from './Login';
import Signup from './Signup';
import Dashboard from './Dashboard';
import StudyPath from './StudyPath';
import SkillProof from './SkillProof';
import StudySwap from './StudySwap';
import SeekerMeet from './SeekerMeet';
import Profile from './Profile';
import Studio from './Studio';
import { MeetingProvider } from './MeetingContext';
import FloatingMiniMeet from './FloatingMiniMeet';

function ProtectedRoute({ children }) {
  const { user, loading } = useContext(AuthContext);
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        Loading SEEKER session...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function HomePage() {
  const { user } = useContext(AuthContext);
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-950 text-white px-4 text-center">
      <div className="inline-block px-3 py-1 mb-4 rounded-full bg-indigo-900/50 text-indigo-400 text-xs font-semibold tracking-wide uppercase border border-indigo-700/50">
        Smart Education • Skill Exchange • SkillProof
      </div>
      <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 max-w-3xl">
        Master Core Concepts. Prove Skills. Swap Knowledge.
      </h1>
      <p className="text-slate-400 text-lg max-w-xl mb-8">
        SEEKER connects learners through verified study paths, verifiable skill tests, and real-time peer knowledge exchange.
      </p>
      {user ? (
        <Link
          to="/dashboard"
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg transition"
        >
          Go to Dashboard →
        </Link>
      ) : (
        <div className="flex gap-4">
          <Link
            to="/signup"
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg transition"
          >
            Get Started Free
          </Link>
          <Link
            to="/login"
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition"
          >
            Sign In
          </Link>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MeetingProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/studypath" element={<ProtectedRoute><StudyPath /></ProtectedRoute>} />
                <Route path="/skillproof" element={<ProtectedRoute><SkillProof /></ProtectedRoute>} />
                <Route path="/studyswap" element={<ProtectedRoute><StudySwap /></ProtectedRoute>} />
                <Route path="/meet/:roomId" element={<ProtectedRoute><SeekerMeet /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/studio" element={<ProtectedRoute><Studio /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            {/* Active PIP overlay while browsing anywhere across routes */}
            <FloatingMiniMeet />
          </div>
        </BrowserRouter>
      </MeetingProvider>
    </AuthProvider>
  );
}