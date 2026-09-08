import { useState } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
  e.preventDefault()

  setError('')
  setLoading(true)

  const loginData = {
    username: username,
    password: password,
  }

  try {
  const response = await axios.post(
    'http://127.0.0.1:8000/api/login/',
    loginData
  )

  const accessToken = response.data.access

  localStorage.setItem('accessToken', accessToken)

  console.log('Login successful:', response.data)
} catch (error) {
  setError(error.response?.data?.message || 'Login failed')
  console.log('Login failed:', error.response?.data)
}finally {
  setLoading(false)
}
}

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="logo">
          <div className="logo-icon">Q</div>
          <div>
            <h1>QMS</h1>
            <p>Internal Audit & Compliance</p>
          </div>
        </div>

        <div className="welcome">
          <h2>Welcome back</h2>
          <p>Sign in to access your compliance dashboard.</p>
        </div>

        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label htmlFor="username">Username</label>

            <input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <div className="password-label">
              <label htmlFor="password">Password</label>
              <button type="button" className="forgot-password">
                Forgot password?
              </button>
            </div>

            <div className="password-input">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button
                type="button"
                className="show-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {error && <p className="error-message">{error}</p>}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

        </form>

        <div className="login-footer">
          <p>Need access? Contact your administrator.</p>
        </div>

      </div>

      <p className="copyright">
        QMS Internal Audit & Compliance System
      </p>
    </div>
  )
}

export default App