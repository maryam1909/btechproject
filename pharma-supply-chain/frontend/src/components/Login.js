import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const USERS = {
  mfg1: { password: 'pass123', role: 'manufacturer' },
  dist1: { password: 'pass123', role: 'distributor' },
  ret1: { password: 'pass123', role: 'retailer' },
  cons1: { password: 'pass123', role: 'consumer' }
};

const Login = () => {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const submit = (e) => {
    e.preventDefault();
    setError('');
    const user = USERS[id];
    if (!user || user.password !== pw) {
      setError('Invalid credentials');
      return;
    }
    // Demo-only: redirect to role dashboard
    const route = `/${user.role}`;
    navigate(route);
  };

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 420, margin: '60px auto' }}>
        <h1>Demo Login</h1>
        <p style={{ color: '#666', marginTop: -8 }}>This login is for demo navigation only. Blockchain actions still require MetaMask.</p>
        {error && <div className="error" style={{ marginTop: 8 }}>{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label htmlFor="loginId">Login ID</label>
            <input id="loginId" value={id} onChange={(e)=>setId(e.target.value)} placeholder="mfg1 | dist1 | ret1 | cons1" />
          </div>
          <div className="form-group">
            <label htmlFor="loginPw">Password</label>
            <input id="loginPw" type="password" value={pw} onChange={(e)=>setPw(e.target.value)} placeholder="pass123" />
          </div>
          <button className="btn" type="submit">Login</button>
        </form>
        <div style={{ marginTop: 16, fontSize: 12, color: '#666' }}>
          <div>Demo accounts:</div>
          <ul>
            <li>mfg1 / pass123 → Manufacturer</li>
            <li>dist1 / pass123 → Distributor</li>
            <li>ret1 / pass123 → Retailer</li>
            <li>cons1 / pass123 → Consumer</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Login;
