import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { createSelector } from "reselect";
import { useSelector, useDispatch } from "react-redux";

import { logoutUser } from "../../slices/auth/login/thunk";

const Logout = () => {
  const dispatch: any = useDispatch();
  const logoutData = createSelector(
    (state: any) => state.Login,
    (state) => state.isUserLogout
  );
  const isUserLogout = useSelector(logoutData);

  useEffect(() => {
    dispatch(logoutUser());
  }, [dispatch]);

  if (isUserLogout) {
    return <Navigate to="/login" replace />;
  }

  return null;
};

export default Logout;
