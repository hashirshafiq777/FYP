import { Navigate, Route, Routes } from "react-router-dom";

import { AgreementsIcon, HistoryIcon } from "./components/icons";
import AuthGate from "./auth/AuthGate";
import ProtectedRoute from "./auth/ProtectedRoute";
import PublicOnlyRoute from "./auth/PublicOnlyRoute";
import { useAuth } from "./auth/useAuth";
import AppShell from "./layouts/AppShell";
import Chat from "./pages/Chat";
import ComingSoon from "./pages/ComingSoon";
import Dashboard from "./pages/Dashboard";
import Documents from "./pages/Documents";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import SignUp from "./pages/SignUp";

/** `/` goes wherever the visitor belongs. */
function RootRedirect() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
}

export default function App() {
  return (
    <AuthGate>
      <Routes>
        <Route path="/" element={<RootRedirect />} />

        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<Dashboard />} />
            {/* Optional segment for the same reason as chat: selecting a document does not remount. */}
            <Route path="/documents/:documentId?" element={<Documents />} />
            {/* One route with an optional segment, so opening a thread does not remount the page. */}
            <Route path="/chat/:conversationId?" element={<Chat />} />
            <Route
              path="/agreements"
              element={
                <ComingSoon
                  titleKey="coming.agreements.title"
                  bodyKey="coming.agreements.body"
                  icon={<AgreementsIcon size={24} />}
                />
              }
            />
            <Route
              path="/history"
              element={
                <ComingSoon
                  titleKey="coming.history.title"
                  bodyKey="coming.history.body"
                  icon={<HistoryIcon size={24} />}
                />
              }
            />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthGate>
  );
}
