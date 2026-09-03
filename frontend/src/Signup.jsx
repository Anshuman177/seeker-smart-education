import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import { Compass, Lock, Mail, User, Building, AlertCircle } from 'lucide-react';

export default function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    college: 'Engineering Institute',
    skillsTeach: 'Python, SQL',
    skillsLearn: 'React, Node.js'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        college: formData.college,
        skillsTeach: formData.skillsTeach.split(',').map(s => s.trim()).filter(Boolean),
        skillsLearn: formData.skillsLearn.split(',').map(s => s.trim()).filter(Boolean)
      };
      await signup(payload);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-950 px-4 py-12">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-indigo-600/10 text-indigo-400 rounded-xl mb-3 border border-indigo-500/20">
            <Compass className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white">Create Account</h2>
          <p className="text-slate-400 text-sm mt-1">Join the SEEKER smart learning platform</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/50 border border-red-800 text-red-300 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Full Name</label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Rahul Sharma"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 pl-11 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="rahul@seeker.edu"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 pl-11 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 pl-11 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">College / Institution</label>
            <div className="relative">
              <Building className="w-5 h-5 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                name="college"
                value={formData.college}
                onChange={handleChange}
                placeholder="IIT Bombay"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 pl-11 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Skills I Can Teach (comma separated)</label>
            <input
              type="text"
              name="skillsTeach"
              value={formData.skillsTeach}
              onChange={handleChange}
              placeholder="Python, SQL, DBMS"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Skills I Want to Learn (comma separated)</label>
            <input
              type="text"
              name="skillsLearn"
              value={formData.skillsLearn}
              onChange={handleChange}
              placeholder="React, Node.js, DSA"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl shadow-lg transition disabled:opacity-50 mt-2"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}