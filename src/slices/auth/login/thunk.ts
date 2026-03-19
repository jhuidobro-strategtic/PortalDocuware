import { postFakeLogin } from "../../../helpers/fakebackend_helper";
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
      sessionStorage.setItem("authUser", JSON.stringify(response));
      dispatch(loginSuccess(response.data));
      history("/documents");
      return;
    }

    dispatch(apiError(response?.message || "Error de autenticacion"));
  } catch (error) {
    dispatch(apiError(error));
  }
};

export const logoutUser = () => async (dispatch: any) => {
  try {
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
