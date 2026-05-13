import React, { lazy } from "react";
import { Navigate } from "react-router-dom";

const Login = lazy(() => import("../features/auth/views/Login"));
const Logout = lazy(() => import("../features/auth/views/Logout"));
const UserProfile = lazy(() => import("../features/auth/views/user-profile"));
const Documents = lazy(() => import("../features/documents/views/List"));
const DocumentsEdit = lazy(() => import("../features/documents/views/Edit"));
const DocumentOrderC = lazy(() => import("../features/documents/views/OrderC"));
const DocumentDetails = lazy(() => import("../features/documents/views/Details"));
const DocumentProgramacion = lazy(() => import("../features/documents/views/Programacion"));
const PurchaseOrderDetails = lazy(() => import("../features/purchase-orders/views"));
const Suppliers = lazy(() => import("../features/suppliers/views"));
const Expedients = lazy(() => import("../features/expedients/views"));

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
