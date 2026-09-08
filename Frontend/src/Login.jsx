import { useState } from 'react'
import axios from 'axios'
import './App.css'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";


function Login() {
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

      console.log('Login successful:', response.data)

      // Get data from Django response
      const accessToken = response.data.access
      const refreshToken = response.data.refresh

      const user = response.data.user

      const role = user.role
      const loggedInUsername = user.username

      // Save tokens
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)

      // Save user information  
      localStorage.setItem(
        'user',
        JSON.stringify(user)
      )

    window.location.href = '/dashboard'

    } catch (error) {
      console.log('Login failed:', error.response?.data)

      setError(
        error.response?.data?.message ||
        'Login failed'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">

      <div className="login-card">

        {/* Logo */}
        <div className="logo">

          <div className="logo-icon">
            Q
          </div>

          <div>
            <h1>QMS</h1>
            <p>
              Internal Audit & Compliance
            </p>
          </div>

        </div>

        {/* Welcome */}
        <div className="welcome">

          <h2>
            Welcome back
          </h2>

          <p>
            Sign in to access your compliance dashboard.
          </p>

        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit}>

          {/* Username */}
          <div className="form-group">

            <label htmlFor="username">
              Username
            </label>

            <input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
              required
            />

          </div>

          {/* Password */}
          <div className="form-group">

            <div className="password-label">

              <label htmlFor="password">
                Password
              </label>

              <button
                type="button"
                className="forgot-password"
              >
                Forgot password?
              </button>

            </div>

            <div className="password-input">

              <input
                id="password"
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                placeholder="Enter your password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                required
              />

              <button
                type="button"
                className="show-password"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
              >
                {showPassword
                  ? 'Hide'
                  : 'Show'}
              </button>

            </div>

          </div>

          {/* Error */}
          {error && (
            <p className="error-message">
              {error}
            </p>
          )}

          {/* Login Button */}
          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading
              ? 'Signing in...'
              : 'Sign In'}
          </button>

        </form>

        {/* Footer */}
        <div className="login-footer">

          <p>
            Need access? Contact your administrator.
          </p>

        </div>

      </div>

      <p className="copyright">
        QMS Internal Audit & Compliance System
      </p>

    </div>
  )
}

export default Login