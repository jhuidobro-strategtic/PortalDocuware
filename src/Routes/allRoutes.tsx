import React, { lazy } from "react";
import { Navigate } from "react-router-dom";

const Login = lazy(() => import("../pages/Authentication/Login"));
const Logout = lazy(() => import("../pages/Authentication/Logout"));
const UserProfile = lazy(() => import("../pages/Authentication/user-profile"));
const Documents = lazy(() => import("../pages/Documents"));
const DocumentsEdit = lazy(() => import("../pages/DocumentsEdit"));
const DocumentOrderC = lazy(() => import("../pages/DocumentsOrderC"));
const DocumentDetails = lazy(() => import("../pages/DocumentsDetails"));
const DocumentProgramacion = lazy(() => import("../pages/DocumentsProgramacion"));
const PurchaseOrderDetails = lazy(() => import("../pages/PurchaseOrderDetails"));
const Suppliers = lazy(() => import("../pages/Suppliers"));
const Expedients = lazy(() => import("../pages/Expedients"));

const authProtectedRoutes = [
  { path: "/", component: <Navigate to="/documents" replace /> },
  { path: "/dashboard", component: <Navigate to="/documents" replace /> },
  { path: "/index", component: <Navigate to="/documents" replace /> },
  { path: "/documents", component: <Documents /> },
  { path: "/documents/edit/:documentId", component: <DocumentsEdit /> },
  { path: "/documents/order-c/:documentId", component: <DocumentOrderC /> },
  { path: "/document-details", component: <DocumentDetails /> },
  { path: "/document-programation", component: <DocumentProgramacion /> },
  { path: "/purchase-order-details", component: <PurchaseOrderDetails /> },
  { path: "/suppliers", component: <Suppliers /> },
  { path: "/expedientes", component: <Expedients /> },
  { path: "/profile", component: <UserProfile /> },
  { path: "*", component: <Navigate to="/documents" replace /> },
];

const publicRoutes = [
  { path: "/login", component: <Login /> },
  { path: "/logout", component: <Logout /> },
];

export { authProtectedRoutes, publicRoutes };
