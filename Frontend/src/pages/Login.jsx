import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { errorMessage } from "../api/client";
import ParticleBackground from "../ParticleBackground";
import "../styles/login.css";

export default function Login() {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    if (user) return <Navigate to="/dashboard" replace />;

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await login(username, password);
            navigate(location.state?.from?.pathname || "/dashboard", { replace: true });
        } catch (err) {
            setError(
                err.response?.status === 401
                    ? "Invalid username or password."
                    : errorMessage(err, "Login failed.")
            );
            setLoading(false);
        }
    }

    return (
        <div className="login-page">
            <ParticleBackground />

            <div className="login-card">
                <div className="logo">
                    <div className="logo-icon">Q</div>
                    <div>
                        <h1>QMS</h1>
                        <p>Internal Audit &amp; Compliance</p>
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
                            autoComplete="username"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <div className="password-label">
                            <label htmlFor="password">Password</label>
                        </div>

                        <div className="password-input">
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                required
                            />
                            <button
                                type="button"
                                className="show-password"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>

                    {error && <p className="error-message">{error}</p>}

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? "Signing in..." : "Sign In"}
                    </button>
                </form>

                <div className="login-footer">
                    <p>Need access? Contact your administrator.</p>
                </div>
            </div>

            <p className="copyright">QMS Internal Audit &amp; Compliance System</p>
        </div>
    );
}
