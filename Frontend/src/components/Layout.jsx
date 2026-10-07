import { useState } from "react";
import {
    NavLink,
    Outlet,
    useLocation,
    useNavigate,
} from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import {
    ROLES,
    ROLE_LABELS,
    departmentLabel,
} from "../constants";

import { useTheme } from "../theme/ThemeContext";

const ICONS = {
    dashboard:
        "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",

    projects:
        "M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z",

    audits:
        "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",

    checklists:
        "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",

    frameworks:
        "M12 2l9 5-9 5-9-5 9-5zm-9 10l9 5 9-5M3 17l9 5 9-5",

    departments:
        "M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6",

    orientations:
        "M12 14l9-5-9-5-9 5 9 5zm0 0v7m-6-4.5V12",

    pool:
        "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
};

const {
    DIRECTOR,
    QMS,
    EMPLOYEE,
} = ROLES;

const NAV = [
    {
        to: "/dashboard",
        label: "Dashboard",
        icon: "dashboard",
    },
    {
        to: "/projects",
        label: "Projects",
        icon: "projects",
        roles: [DIRECTOR, QMS],
    },
    {
        to: "/audits",
        label: "Audits",
        icon: "audits",
        roles: [DIRECTOR, QMS],
    },
    {
        to: "/audits",
        label: "My audits",
        icon: "audits",
        roles: [EMPLOYEE],
    },
    {
        to: "/auditor-pool",
        label: "Auditor pool",
        icon: "pool",
        roles: [QMS],
    },
    {
        to: "/checklists",
        label: "Checklists",
        icon: "checklists",
        roles: [DIRECTOR, QMS],
    },
    {
        to: "/frameworks",
        label: "Frameworks",
        icon: "frameworks",
        roles: [DIRECTOR, QMS],
    },
    {
        to: "/departments",
        label: "Departments",
        icon: "departments",
        roles: [DIRECTOR, QMS],
    },
    {
        to: "/orientations",
        label: "Orientations",
        icon: "orientations",
        roles: [QMS, EMPLOYEE],
    },
];

function Icon({ name }) {
    return (
        <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d={ICONS[name]} />
        </svg>
    );
}

function SidebarToggle({ open, onClick }) {
    return (
        <button
            className="sidebar-toggle"
            onClick={onClick}
            aria-label={open ? "Close sidebar" : "Open sidebar"}
            title={open ? "Close sidebar" : "Open sidebar"}
        >
            <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                {open ? (
                    <>
                        <rect
                            x="3"
                            y="4"
                            width="18"
                            height="16"
                            rx="2"
                        />
                        <path d="M9 4v16" />
                    </>
                ) : (
                    <>
                        <rect
                            x="3"
                            y="4"
                            width="18"
                            height="16"
                            rx="2"
                        />
                        <path d="M15 4v16" />
                    </>
                )}
            </svg>
        </button>
    );
}

function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    const isLight = theme === "light";

    return (
        <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={
                isLight
                    ? "Switch to dark mode"
                    : "Switch to light mode"
            }
            title={
                isLight
                    ? "Dark mode"
                    : "Light mode"
            }
        >
            {isLight ? (
                <svg
                    viewBox="0 0 24 24"
                    width="19"
                    height="19"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
            ) : (
                <svg
                    viewBox="0 0 24 24"
                    width="19"
                    height="19"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <circle
                        cx="12"
                        cy="12"
                        r="4"
                    />
                    <path d="M12 2v2" />
                    <path d="M12 20v2" />
                    <path d="M4.93 4.93l1.41 1.41" />
                    <path d="M17.66 17.66l1.41 1.41" />
                    <path d="M2 12h2" />
                    <path d="M20 12h2" />
                    <path d="M4.93 19.07l1.41-1.41" />
                    <path d="M17.66 6.34l1.41-1.41" />
                </svg>
            )}
        </button>
    );
}

export default function Layout() {
    const { user, logout } = useAuth();

    const navigate = useNavigate();
    const location = useLocation();

    const [sidebarOpen, setSidebarOpen] = useState(true);

    const items = NAV.filter(
        (item) =>
            !item.roles ||
            item.roles.includes(user.role)
    );

    const initials =
        `${user.first_name?.[0] || user.username[0]}${user.last_name?.[0] || ""}`
            .toUpperCase();

    const handleLogout = () => {
        logout();

        navigate("/login", {
            replace: true,
        });
    };

    const toggleSidebar = () => {
        setSidebarOpen(
            (current) => !current
        );
    };

    return (
        <div
            className={`shell ${
                sidebarOpen
                    ? "sidebar-expanded"
                    : "sidebar-collapsed"
            }`}
        >
            <aside
                className={`sidebar ${
                    sidebarOpen
                        ? "is-open"
                        : ""
                }`}
            >
                <div className="brand">
                    <span className="brand-mark">
                        Q
                    </span>

                    <div className="brand-text">
                        <strong>QMS</strong>

                        <small>
                            Audit &amp; Compliance
                        </small>
                    </div>

                    <SidebarToggle
                        open={sidebarOpen}
                        onClick={toggleSidebar}
                    />
                </div>

                <nav className="nav">
                    {items.map((item) => (
                        <NavLink
                            key={item.label}
                            to={item.to}
                            className={({ isActive }) =>
                                `nav-link ${
                                    isActive
                                        ? "active"
                                        : ""
                                }`
                            }
                        >
                            <Icon name={item.icon} />

                            <span className="nav-label">
                                {item.label}
                            </span>
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-user">
                    <span className="avatar">
                        {initials}
                    </span>

                    <div className="sidebar-user-text">
                        <strong>
                            {user.first_name
                                ? `${user.first_name} ${user.last_name}`
                                : user.username}
                        </strong>

                        <small>
                            {ROLE_LABELS[user.role] ||
                                user.role}{" "}
                            ·{" "}
                            {departmentLabel(
                                user.department
                            )}
                        </small>
                    </div>

                    <button
                        className="icon-btn"
                        onClick={handleLogout}
                        title="Sign out"
                        aria-label="Sign out"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            width="18"
                            height="18"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                        >
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <path d="M16 17l5-5-5-5" />
                            <path d="M21 12H9" />
                        </svg>
                    </button>
                </div>
            </aside>

            {!sidebarOpen && (
                <button
                    className="sidebar-reopen"
                    onClick={toggleSidebar}
                    aria-label="Open sidebar"
                    title="Open sidebar"
                >
                    <svg
                        viewBox="0 0 24 24"
                        width="19"
                        height="19"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <rect
                            x="3"
                            y="4"
                            width="18"
                            height="16"
                            rx="2"
                        />
                        <path d="M15 4v16" />
                    </svg>
                </button>
            )}

            <div className="main">
                <header className="topbar">
                    <span className="topbar-title">
                        QMS · Internal Audit &amp; Compliance System
                    </span>

                    <div className="topbar-actions">
                        <ThemeToggle />
                    </div>
                </header>

                <main className="content">
                    <div
                        key={location.pathname}
                        className="page-transition"
                    >
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
} 