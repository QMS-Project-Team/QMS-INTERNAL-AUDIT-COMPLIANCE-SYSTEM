import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ROLES, ROLE_LABELS, departmentLabel } from "../constants";

const ICONS = {
    dashboard: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
    projects: "M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z",
    audits: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
    checklists: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    frameworks: "M12 2l9 5-9 5-9-5 9-5zm-9 10l9 5 9-5M3 17l9 5 9-5",
    departments: "M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6",
    orientations: "M12 14l9-5-9-5-9 5 9 5zm0 0v7m-6-4.5V12",
};

const { DIRECTOR, MANAGER, QMS, AUDITOR } = ROLES;

const NAV = [
    { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
    { to: "/projects", label: "Projects", icon: "projects", roles: [DIRECTOR, MANAGER, QMS] },
    { to: "/audits", label: "Audits", icon: "audits", roles: [DIRECTOR, MANAGER, QMS] },
    { to: "/checklists", label: "Checklists", icon: "checklists", roles: [DIRECTOR, MANAGER, QMS] },
    { to: "/frameworks", label: "Frameworks", icon: "frameworks", roles: [DIRECTOR, MANAGER, QMS] },
    { to: "/departments", label: "Departments", icon: "departments", roles: [DIRECTOR, MANAGER, QMS] },
    { to: "/orientations", label: "Orientations", icon: "orientations", roles: [QMS, AUDITOR] },
];

function Icon({ name }) {
    return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={ICONS[name]} />
        </svg>
    );
}

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);

    const items = NAV.filter((item) => !item.roles || item.roles.includes(user.role));
    const initials = `${user.first_name?.[0] || user.username[0]}${user.last_name?.[0] || ""}`.toUpperCase();

    const handleLogout = () => {
        logout();
        navigate("/login", { replace: true });
    };

    return (
        <div className="shell">
            <aside className={`sidebar ${open ? "is-open" : ""}`}>
                <div className="brand">
                    <span className="brand-mark">Q</span>
                    <div>
                        <strong>QMS</strong>
                        <small>Audit &amp; Compliance</small>
                    </div>
                </div>

                <nav className="nav">
                    {items.map((item) => (
                        <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)}
                            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                            <Icon name={item.icon} />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-user">
                    <span className="avatar">{initials}</span>
                    <div className="sidebar-user-text">
                        <strong>{user.first_name ? `${user.first_name} ${user.last_name}` : user.username}</strong>
                        <small>
                            {ROLE_LABELS[user.role] || user.role} · {departmentLabel(user.department)}
                        </small>
                    </div>
                    <button className="icon-btn" onClick={handleLogout} title="Sign out" aria-label="Sign out">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                        </svg>
                    </button>
                </div>
            </aside>

            {open && <div className="sidebar-scrim" onClick={() => setOpen(false)} />}

            <div className="main">
                <header className="topbar">
                    <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Open menu">
                        ☰
                    </button>
                    <span className="topbar-title">Internal Audit &amp; Compliance System</span>
                </header>
                <main className="content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
