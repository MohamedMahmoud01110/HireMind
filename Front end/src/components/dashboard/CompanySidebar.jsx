import React, { useState } from "react";

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

const ICONS = {
  dashboard:
    "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  addJob:
    "M12 4v16m8-8H4",
  jobs:
    "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  settings:
    "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  logout:
    "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "M6 18L18 6M6 6l12 12",
};

const NAV_ITEMS = [
  { key: "company-dashboard", label: "Dashboard", icon: ICONS.dashboard },
  { key: "add-job", label: "Add Job", icon: ICONS.addJob },
  { key: "my-jobs", label: "My Jobs", icon: ICONS.jobs },
  { key: "settings", label: "Settings", icon: ICONS.settings },
];

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
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1",
        isActive
          ? "text-white font-bold"
          : "text-slate-500 font-semibold hover:bg-slate-50 hover:text-slate-800",
      ].join(" ")}
      style={{
        fontFamily: "'Manrope', sans-serif",
        ...(isActive
          ? {
              background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
              boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
            }
          : {}),
      }}
    >
      <Icon
        path={item.icon}
        className={[
          "w-[18px] h-[18px] flex-shrink-0 transition-colors duration-200",
          isActive ? "text-white" : "text-slate-400",
        ].join(" ")}
      />
      {item.label}
    </button>
  );
}

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

function SidebarContent({ activeKey, onNavigate, onLogout }) {
  return (
    <div className="flex flex-col h-full">
      <LogoMark />
      <div className="px-4 pb-3">
        <span
          className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md"
          style={{
            background: "#eff6ff",
            color: "#2563eb",
            fontFamily: "'Manrope', sans-serif",
          }}
        >
          Company Portal
        </span>
      </div>
      <nav
        className="flex-1 px-3 flex flex-col gap-0.5 overflow-y-auto"
        aria-label="Company navigation"
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
      <div className="px-3 pb-5 pt-2">
        <div className="border-t border-gray-100 mb-3" />
        <LogoutButton onClick={onLogout} />
      </div>
    </div>
  );
}

export default function CompanySidebar({ activeKey, onNavigate, onLogout }) {
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

      <div className="hidden lg:block w-60 flex-shrink-0" aria-hidden="true" />

      <div
        className={[
          "lg:hidden fixed top-0 left-0 right-0 z-40",
          "h-14 bg-white border-b border-gray-100",
          "flex items-center justify-between px-4",
        ].join(" ")}
      >
        <div className="flex items-center gap-2">
          <img
            src="/hiremind-logo.jpeg"
            alt="HireMind"
            style={{ height: 28, width: "auto", objectFit: "contain" }}
          />
          <span
            className="text-[10px] font-bold uppercase text-blue-600"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Company
          </span>
        </div>
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

      {drawerOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-30 bg-black/25 backdrop-blur-[2px]"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
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
