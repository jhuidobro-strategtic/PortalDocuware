import React, { lazy } from "react";
import { Navigate } from "react-router-dom";

const Login = lazy(() => import("../features/auth/pages/Login"));
const Logout = lazy(() => import("../features/auth/pages/Logout"));
const UserProfile = lazy(() => import("../features/auth/pages/user-profile"));
const Documents = lazy(() => import("../features/documents/pages/List"));
const DocumentsEdit = lazy(() => import("../features/documents/pages/Edit"));
const DocumentOrderC = lazy(() => import("../features/documents/pages/OrderC"));
const DocumentDetails = lazy(() => import("../features/documents/pages/Details"));
const DocumentProgramacion = lazy(() => import("../features/documents/pages/Programacion"));
const PurchaseOrderDetails = lazy(() => import("../features/purchase-orders/pages"));
const Suppliers = lazy(() => import("../features/suppliers/pages"));
const Expedients = lazy(() => import("../features/expedients/pages"));

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
