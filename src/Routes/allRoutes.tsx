import React, { lazy } from "react";
import { Navigate } from "react-router-dom";

const Login = lazy(() => import("../pages/Authentication/Login"));
const Logout = lazy(() => import("../pages/Authentication/Logout"));
const UserProfile = lazy(() => import("../pages/Authentication/user-profile"));
const Documents = lazy(() => import("../pages/Documents"));
const DocumentDetails = lazy(() => import("../pages/DocumentsDetails"));
const DocumentProgramacion = lazy(() => import("../pages/DocumentsProgramacion"));

const authProtectedRoutes = [
  { path: "/", component: <Navigate to="/documents" replace /> },
  { path: "/dashboard", component: <Navigate to="/documents" replace /> },
  { path: "/index", component: <Navigate to="/documents" replace /> },
  { path: "/documents", component: <Documents /> },
  { path: "/document-details", component: <DocumentDetails /> },
  { path: "/document-programation", component: <DocumentProgramacion /> },
  { path: "/profile", component: <UserProfile /> },
  { path: "*", component: <Navigate to="/documents" replace /> },
];

const publicRoutes = [
  { path: "/login", component: <Login /> },
  { path: "/logout", component: <Logout /> },
];

export { authProtectedRoutes, publicRoutes };
