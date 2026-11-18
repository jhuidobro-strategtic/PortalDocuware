import { postFakeLogin } from "../../../helpers/fakebackend_helper";
import { buildApiUrl } from "../../../helpers/api-url";
import { firstAllowedRoute, portalSession } from "../../../helpers/portal-access";
import {
  loginSuccess,
  logoutUserSuccess,
  apiError,
  reset_login_flag,
} from "./reducer";

export const loginUser = (user: any, history: any) => async (dispatch: any) => {
  try {
    dispatch(reset_login_flag());

    const response: any = await postFakeLogin({
      username: user.username,
      password: user.password,
    });

    if (response?.success === true) {
      const authSession = {
        ...response,
        token: response?.token ?? null,
        data: {
          ...response?.data,
          username: user.username,
          email: user.username,
        },
      };

      sessionStorage.setItem("authUser", JSON.stringify(authSession));
      dispatch(loginSuccess(authSession.data));
      history(firstAllowedRoute());
      return;
    }

    dispatch(apiError(response?.message || "Error de autenticacion"));
  } catch (error) {
    dispatch(apiError(error));
  }
};

export const logoutUser = () => async (dispatch: any) => {
  try {
    if (portalSession()?.token) {
      await fetch(buildApiUrl("users/session/"), { method: "DELETE" }).catch(() => undefined);
    }
    sessionStorage.removeItem("authUser");
    dispatch(logoutUserSuccess(true));
  } catch (error) {
    dispatch(apiError(error));
  }
};

export const resetLoginFlag = () => async (dispatch: any) => {
  try {
    return dispatch(reset_login_flag());
  } catch (error) {
    dispatch(apiError(error));
  }
};
