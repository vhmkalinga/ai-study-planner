import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    const result = await register(name, email, password, fieldOfStudy);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Failed to create account');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-paper rounded-xl shadow-sm border border-line p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary text-white w-12 h-12 rounded-xl flex items-center justify-center font-display font-bold text-2xl mb-4">
            S
          </div>
          <h1 className="font-display font-bold text-2xl text-ink">StudyFlow</h1>
        </div>
        
        <div className="mb-6">
          <h2 className="font-display font-bold text-xl text-ink">Create your account</h2>
          <p className="text-muted text-sm mt-1">Start planning your studies effectively</p>
        </div>
        
        {error && (
          <div className="bg-danger/10 text-danger text-sm p-3 rounded-lg mb-4 border border-danger/20">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold tracking-wider text-muted uppercase">Name</label>
            <div className="relative mt-1.5">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                <Icon name="user" size={18} />
              </div>
              <input 
                type="text" 
                required
                className="w-full h-10 pl-10 pr-3 bg-sidebar-bg border border-line rounded-md outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-ink"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <label className="text-xs font-bold tracking-wider text-muted uppercase">Email</label>
            <div className="relative mt-1.5">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                <Icon name="mail" size={18} />
              </div>
              <input 
                type="email" 
                required
                autoComplete="email"
                className="w-full h-10 pl-10 pr-3 bg-sidebar-bg border border-line rounded-md outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-ink"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <label className="text-xs font-bold tracking-wider text-muted uppercase">Password</label>
            <div className="relative mt-1.5">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                <Icon name="lock" size={18} />
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full h-10 pl-10 pr-10 bg-sidebar-bg border border-line rounded-md outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-ink"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button 
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-ink border-0 bg-transparent"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(!showPassword)}
              >
                <Icon name={showPassword ? "eyeOff" : "eye"} size={18} />
              </button>
            </div>
          </div>
          
          <div>
            <label className="text-xs font-bold tracking-wider text-muted uppercase">Field of Study <span className="normal-case font-medium tracking-normal">(optional)</span></label>
            <div className="relative mt-1.5">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                <Icon name="book" size={18} />
              </div>
              <input 
                type="text"
                className="w-full h-10 pl-10 pr-3 bg-sidebar-bg border border-line rounded-md outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-ink"
                placeholder="e.g., Computer Science"
                value={fieldOfStudy}
                onChange={(e) => setFieldOfStudy(e.target.value)}
              />
            </div>
          </div>
          
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold rounded-lg h-11 mt-2 shadow-sm transition-colors flex items-center justify-center disabled:opacity-70"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : "Create account"}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <span className="text-muted text-sm">Already have an account? </span>
          <Link to="/login" className="text-primary font-semibold text-sm hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
