import { Navigate, Route, Routes } from "react-router-dom";

import {
  AgreementsIcon,
  ChatIcon,
  DocumentsIcon,
  HistoryIcon,
} from "./components/icons";
import AuthGate from "./auth/AuthGate";
import ProtectedRoute from "./auth/ProtectedRoute";
import PublicOnlyRoute from "./auth/PublicOnlyRoute";
import { useAuth } from "./auth/useAuth";
import AppShell from "./layouts/AppShell";
import ComingSoon from "./pages/ComingSoon";
import Dashboard from "./pages/Dashboard";
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
            <Route
              path="/documents"
              element={
                <ComingSoon
                  titleKey="coming.documents.title"
                  bodyKey="coming.documents.body"
                  icon={<DocumentsIcon size={24} />}
                />
              }
            />
            <Route
              path="/chat"
              element={
                <ComingSoon
                  titleKey="coming.chat.title"
                  bodyKey="coming.chat.body"
                  icon={<ChatIcon size={24} />}
                />
              }
            />
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
