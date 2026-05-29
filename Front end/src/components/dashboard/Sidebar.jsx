import React, { useState } from "react";

/* ═══════════════════════════════════════════════════════════════
   SVG ICON PRIMITIVE
═══════════════════════════════════════════════════════════════ */
function Icon({ path, className = "w-[18px] h-[18px]" }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ICON PATHS  (Heroicons outline)
═══════════════════════════════════════════════════════════════ */
const ICONS = {
  dashboard:
    "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  cv: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  assessment:
    "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  interview:
    "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
  report:
    "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  payment:
    "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
  settings:
    "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  logout:
    "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "M6 18L18 6M6 6l12 12",
};

/* ═══════════════════════════════════════════════════════════════
   NAV ITEMS
═══════════════════════════════════════════════════════════════ */
const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: ICONS.dashboard },
  { key: "cv", label: "CV Analysis", icon: ICONS.cv },
  { key: "assessment", label: "PreAssessment", icon: ICONS.assessment },
  { key: "interview", label: "AI Interview", icon: ICONS.interview },
  { key: "report", label: "My Report", icon: ICONS.report },
  { key: "payment", label: "Payment", icon: ICONS.payment },
  { key: "settings", label: "Settings", icon: ICONS.settings },
];

/* ═══════════════════════════════════════════════════════════════
   LOGO MARK
═══════════════════════════════════════════════════════════════ */
function LogoMark() {
  return (
    <div className="flex items-center px-4 pt-5 pb-5">
      <img
        src="/hiremind-logo.jpeg"
        alt="HireMind"
        style={{ height: 36, width: "auto", objectFit: "contain" }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NAV ITEM
   Active:  bg-blue-50, blue text, blue left accent bar, bold label
   Idle:    gray-500 text, gray-50 hover bg, smooth 200ms transition
═══════════════════════════════════════════════════════════════ */
function NavItem({ item, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(item.key)}
      aria-current={isActive ? "page" : undefined}
      className={[
        "relative w-full flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-xl",
        "text-[13px] text-left cursor-pointer",
        "transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-1",
        isActive
          ? "text-white font-bold"
          : "text-slate-500 font-semibold hover:bg-slate-50 hover:text-slate-800",
      ].join(" ")}
      style={{
        fontFamily: "'Manrope', sans-serif",
        ...(isActive
          ? {
              background: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)",
              boxShadow: "0 4px 12px rgba(249,115,22,0.3)",
            }
          : {}),
      }}
    >
      {/* Left accent bar - hidden when active (gradient bg is used instead) */}
      <span
        className={[
          "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full",
          "transition-all duration-200",
          isActive ? "h-0 opacity-0" : "h-0 opacity-0",
        ].join(" ")}
        aria-hidden="true"
      />

      <Icon
        path={item.icon}
        className={[
          "w-[18px] h-[18px] flex-shrink-0 transition-colors duration-200",
          isActive ? "text-white" : "text-slate-400",
        ].join(" ")}
      />

      {/* Label */}
      {item.label}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LOGOUT BUTTON
═══════════════════════════════════════════════════════════════ */
function LogoutButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl",
        "text-[13px] font-semibold text-red-400",
        "cursor-pointer transition-all duration-200",
        "hover:bg-red-50 hover:text-red-600",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300",
      ].join(" ")}
      style={{ fontFamily: "'Manrope', sans-serif" }}
    >
      <Icon
        path={ICONS.logout}
        className="w-[18px] h-[18px] flex-shrink-0 text-red-400"
      />
      Logout
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SIDEBAR CONTENT  (shared between desktop & mobile drawer)
═══════════════════════════════════════════════════════════════ */
function SidebarContent({ activeKey, onNavigate, onLogout }) {
  return (
    <div className="flex flex-col h-full">
      {/* Top — logo */}
      <LogoMark />

      {/* Middle — nav */}
      <nav
        className="flex-1 px-3 flex flex-col gap-0.5 overflow-y-auto"
        aria-label="Main navigation"
      >
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.key}
            item={item}
            isActive={activeKey === item.key}
            onClick={onNavigate}
          />
        ))}
      </nav>

      {/* Bottom — divider + logout */}
      <div className="px-3 pb-5 pt-2">
        <div className="border-t border-gray-100 mb-3" />
        <LogoutButton onClick={onLogout} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SIDEBAR — default export

   Props:
     activeKey   {string}    key of the currently active route
     onNavigate  {Function}  called with (key) when an item is clicked
     onLogout    {Function}  called when Logout is clicked

   Desktop (≥ lg): fixed left, h-screen, w-60, non-scrolling
   Mobile  (< lg): fixed top bar + slide-in drawer with backdrop
═══════════════════════════════════════════════════════════════ */
export default function Sidebar({ activeKey, onNavigate, onLogout }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleNav = (key) => {
    onNavigate?.(key);
    setDrawerOpen(false);
  };

  const handleLogout = () => {
    setDrawerOpen(false);
    localStorage.removeItem("token");
    onLogout?.();
  };

  return (
    <>
      {/* ── DESKTOP SIDEBAR ──────────────────────────────────── */}
      <aside
        className={[
          "hidden lg:flex flex-col",
          "fixed top-0 left-0 h-screen w-60",
          "bg-white border-r border-gray-100",
          "z-30",
        ].join(" ")}
      >
        <SidebarContent
          activeKey={activeKey}
          onNavigate={handleNav}
          onLogout={handleLogout}
        />
      </aside>

      {/* Spacer so main content doesn't slide under the sidebar */}
      <div className="hidden lg:block w-60 flex-shrink-0" aria-hidden="true" />

      {/* ── MOBILE TOP BAR ───────────────────────────────────── */}
      <div
        className={[
          "lg:hidden fixed top-0 left-0 right-0 z-40",
          "h-14 bg-white border-b border-gray-100",
          "flex items-center justify-between px-4",
        ].join(" ")}
      >
        {/* Compact logo */}
        <div className="flex items-center gap-2">
          <img
            src="/hiremind-logo.jpeg"
            alt="HireMind"
            style={{ height: 28, width: "auto", objectFit: "contain" }}
          />
        </div>

        {/* Hamburger / close toggle */}
        <button
          type="button"
          onClick={() => setDrawerOpen((o) => !o)}
          aria-label={drawerOpen ? "Close menu" : "Open menu"}
          aria-expanded={drawerOpen}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors focus:outline-none"
        >
          <Icon
            path={drawerOpen ? ICONS.close : ICONS.menu}
            className="w-5 h-5"
          />
        </button>
      </div>

      {/* ── MOBILE DRAWER ────────────────────────────────────── */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-30 bg-black/25 backdrop-blur-[2px]"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Panel */}
          <aside
            className={[
              "lg:hidden fixed top-14 left-0 bottom-0 z-40",
              "w-64 bg-white border-r border-gray-100",
              "flex flex-col overflow-y-auto shadow-xl",
            ].join(" ")}
          >
            <SidebarContent
              activeKey={activeKey}
              onNavigate={handleNav}
              onLogout={handleLogout}
            />
          </aside>
        </>
      )}
    </>
  );
}
