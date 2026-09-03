import React, { useState, useEffect, useContext } from 'react';
import API from './api';
import { AuthContext } from './AuthContext';
import { 
  User, 
  Award, 
  Star, 
  MessageSquare, 
  BookOpen, 
  Edit3, 
  Check, 
  X, 
  GraduationCap, 
  Sparkles, 
  Calendar,
  ShieldCheck
} from 'lucide-react';

export default function Profile() {
  const { user, login } = useContext(AuthContext);

  const [scoresData, setScoresData] = useState({ assessments: [], summary: [] });
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Mode States
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [college, setCollege] = useState('');
  const [skillsTeachStr, setSkillsTeachStr] = useState('');
  const [skillsLearnStr, setSkillsLearnStr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const [scoresRes, reviewsRes, profileRes] = await Promise.all([
        API.get('/skillproof/my-scores'),
        API.get('/user/reviews'),
        API.get('/user/profile')
      ]);

      setScoresData(scoresRes.data || { assessments: [], summary: [] });
      setReviews(reviewsRes.data || []);

      const p = profileRes.data || user;
      if (p) {
        setName(p.name || '');
        setBio(p.bio || '');
        setCollege(p.college || '');
        setSkillsTeachStr((p.skillsTeach || []).join(', '));
        setSkillsLearnStr((p.skillsLearn || []).join(', '));
      }
    } catch (err) {
      console.error('Failed to load profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const skillsTeach = skillsTeachStr.split(',').map(s => s.trim()).filter(Boolean);
      const skillsLearn = skillsLearnStr.split(',').map(s => s.trim()).filter(Boolean);

      const res = await API.put('/user/profile', {
        name,
        bio,
        college,
        skillsTeach,
        skillsLearn
      });

      // Update local storage context
      const currentToken = localStorage.getItem('token');
      if (currentToken) {
        login(currentToken, res.data.user);
      }

      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        Loading learner profile and verified credentials...
      </div>
    );
  }

  const avgRating = user?.peerRating || 5.0;
  const totalReviewsCount = reviews.length;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      
      {/* Top Banner Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-indigo-600 border-2 border-indigo-400/40 flex items-center justify-center text-2xl font-black text-white shadow-xl uppercase">
              {user?.name?.charAt(0) || 'U'}
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white">{user?.name}</h1>
                <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verified Learner
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                {user?.college || 'Engineering Institute'}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <div className="flex items-center text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-400 mr-1" />
                  <span className="text-xs font-black">{avgRating}</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  ({totalReviewsCount} peer review{totalReviewsCount !== 1 ? 's' : ''})
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
          >
            {isEditing ? <X className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5 text-indigo-400" />}
            {isEditing ? 'Cancel Edit' : 'Edit Profile'}
          </button>
        </div>

        {/* In-Place Profile Editor Form */}
        {isEditing && (
          <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs animate-in fade-in">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">College / Institute</label>
              <input
                type="text"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-400 mb-1 font-semibold">Bio / Focus Area</label>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="e.g. Full-stack engineering enthusiast preparing for systems architecture..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Skills You Can Teach (Comma-separated)</label>
              <input
                type="text"
                value={skillsTeachStr}
                onChange={(e) => setSkillsTeachStr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Skills You Want to Learn (Comma-separated)</label>
              <input
                type="text"
                value={skillsLearnStr}
                onChange={(e) => setSkillsLearnStr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-2 flex justify-end pt-2">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition shadow flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Skills Radar + Reviews Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left 7 Cols: SkillProof Certified Badges */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" /> Verifiable Competency Badges
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">
              {scoresData.summary.length} Verified
            </span>
          </div>

          {scoresData.summary.length === 0 ? (
            <p className="text-xs text-slate-500 py-10 text-center">
              No verified competencies on record. Pass a SkillProof assessment to earn badges.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {scoresData.summary.map((item, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-2.5 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">{item.skill}</h3>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                      item.level === 'Advanced' ? 'bg-emerald-950 border border-emerald-800 text-emerald-400' :
                      item.level === 'Intermediate' ? 'bg-indigo-950 border border-indigo-800 text-indigo-300' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {item.level}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                      <span>Accuracy Level</span>
                      <strong className="text-white">{item.bestAccuracy}%</strong>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${item.bestAccuracy}%` }} 
                      />
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between pt-1">
                    <span>Evidence ID:</span>
                    <span className="text-indigo-400">{item.latestEvidence?.evidenceId || 'SKL-PROVED'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 5 Cols: Peer Endorsements & Reviews Feed */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" /> Peer Reviews &amp; Endorsements
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">
              {reviews.length} Total
            </span>
          </div>

          {reviews.length === 0 ? (
            <p className="text-xs text-slate-500 py-10 text-center">
              No peer endorsements received yet. Complete StudySwap sessions to earn recommendations.
            </p>
          ) : (
            <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
              {reviews.map((rev) => (
                <div key={rev._id} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">{rev.reviewerId?.name || 'Peer Reviewer'}</h4>
                      <p className="text-[10px] text-slate-500">{rev.reviewerId?.college || 'Engineering Institute'}</p>
                    </div>

                    <div className="flex items-center gap-0.5 text-amber-400">
                      {[...Array(rev.rating || 5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-400" />
                      ))}
                    </div>
                  </div>

                  {rev.feedbackText && (
                    <p className="text-xs text-slate-300 italic bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
                      "{rev.feedbackText}"
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                    <span>Endorsed: <strong className="text-indigo-300">{rev.skillEndorsed}</strong></span>
                    <span>{new Date(rev.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}