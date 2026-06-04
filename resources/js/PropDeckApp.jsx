import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Sidebar } from "./components/Sidebar.jsx";
import { TopBar } from "./components/TopBar.jsx";
import { SearchDialog } from "./components/SearchDialog.jsx";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
import { useAppData } from "./hooks/useAppData.js";
import { LoginPage } from "./pages/auth/LoginPage.jsx";
import { SignupPage } from "./pages/auth/SignupPage.jsx";
import { DashboardPage } from "./pages/dashboard/DashboardPage.jsx";
import { ProposalsPage } from "./pages/proposals/ProposalsPage.jsx";
import { ProposalBuilderPage } from "./pages/proposals/ProposalBuilderPage.jsx";
import { ClientsPage } from "./pages/clients/ClientsPage.jsx";
import { ProductsPage } from "./pages/products/ProductsPage.jsx";
import { SettingsPage } from "./pages/settings/SettingsPage.jsx";
import { TeamPage } from "./pages/team/TeamPage.jsx";
import { usePermissions } from "./hooks/usePermissions.js";

const titles = {
  "/": "Dashboard",
  "/proposals/new": "New Proposal",
  "/proposals": "All Proposals",
  "/clients": "Clients",
  "/products": "Products & Plans",
  "/settings": "Settings",
  "/team": "Team",
};

function ProposalBuilderRoute(props) {
  const perms = usePermissions();
  if (!perms.canWrite("proposals")) {
    return <Navigate to="/proposals" replace />;
  }
  return <ProposalBuilderPage {...props} />;
}

function AppLayout() {
  const auth = useAuth();
  const perms = usePermissions();
  const { state, ready, reload, error } = useAppData({ enabled: true });
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const proposalClientId = searchParams.get("client");
  const selectedClient = useMemo(
    () => state.clients.find((client) => client.id === proposalClientId) || null,
    [proposalClientId, state.clients],
  );

  const openNewProposal = (clientId = null) => {
    if (!perms.canWrite("proposals")) return;
    const path = clientId ? `/proposals/new?client=${clientId}` : "/proposals/new";
    navigate(path);
  };

  const pageProps = { data: state, reload, navigate, openNewProposal, permissions: perms };

  return (
    <div className="app-shell">
      <Sidebar
        currentPath={location.pathname}
        onNavigate={(path) => navigate(path)}
        onNewProposal={() => openNewProposal()}
        rep={state.rep}
        settings={state.settings}
        user={auth.user}
      />
      <main className="workspace">
        <TopBar
          title={titles[location.pathname] || "PropDeck"}
          onSearch={() => setSearchOpen(true)}
          rep={state.rep}
          settings={state.settings}
          user={auth.user}
          onLogout={auth.logout}
        />
        <section className="workspace-content">
          {error && (
            <div className="loading-state">
              API error: {error}. Run <code>composer dev</code> or sign in again.
            </div>
          )}
          {!ready && !error && <div className="loading-state">Preparing PropDeck...</div>}
          {ready && (
            <Routes>
              <Route path="/" element={<DashboardPage {...pageProps} />} />
              <Route
                path="/proposals/new"
                element={<ProposalBuilderRoute {...pageProps} initialClient={selectedClient} />}
              />
              <Route path="/proposals" element={<ProposalsPage {...pageProps} />} />
              <Route path="/clients" element={<ClientsPage {...pageProps} />} />
              <Route path="/products" element={<ProductsPage {...pageProps} />} />
              <Route path="/settings" element={<SettingsPage {...pageProps} />} />
              <Route path="/team" element={<TeamPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </section>
      </main>
      {searchOpen && (
        <SearchDialog
          data={state}
          onClose={() => setSearchOpen(false)}
          onNavigate={(path) => {
            navigate(path);
            setSearchOpen(false);
          }}
        />
      )}
    </div>
  );
}

function AuthRoutes() {
  const auth = useAuth();

  if (auth.initializing) {
    return (
      <div className="auth-shell">
        <div className="auth-card auth-loading">Checking your session...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={auth.isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/signup"
        element={auth.isAuthenticated ? <Navigate to="/" replace /> : <SignupPage />}
      />
      <Route
        path="/*"
        element={auth.isAuthenticated ? <AppLayout /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
}

export default function PropDeckApp() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
