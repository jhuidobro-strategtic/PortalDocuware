//Include Both Helper File with needed methods
import { getFirebaseBackend } from "../../../helpers/firebase_helper";
import {
  postFakeLogin,
  postJwtLogin,
} from "../../../helpers/fakebackend_helper";

import { loginSuccess, logoutUserSuccess, apiError, reset_login_flag } from './reducer';

export const loginUser = (user : any, history : any) => async (dispatch : any) => {
  try {
    dispatch(reset_login_flag());
    
    // Usar la API de DocuWare para el login
    const response: any = await postFakeLogin({
      username: user.username, // Enviando username como espera la API
      password: user.password,
    });
    
    // La respuesta ya viene procesada por el interceptor en api_helper.ts
    if (response && response.success === true) {
      // Guardar los datos del usuario en sessionStorage
      sessionStorage.setItem("authUser", JSON.stringify(response));
      
      // Usar el formato de respuesta de la API de DocuWare
      const userData = response.data;
      dispatch(loginSuccess(userData));
      history('/dashboard');
    } 
    else {
      // Manejar el caso de error
      dispatch(apiError(response?.message || "Error de autenticación"));
    }
  } catch (error) {
    dispatch(apiError(error));
  }
};

export const logoutUser = () => async (dispatch : any) => {
  try {
    sessionStorage.removeItem("authUser");
    let fireBaseBackend : any = getFirebaseBackend();
    if (process.env.REACT_APP_DEFAULTAUTH === "firebase") {
      const response = fireBaseBackend.logout;
      dispatch(logoutUserSuccess(response));
    } else {
      dispatch(logoutUserSuccess(true));
    }

  } catch (error) {
    dispatch(apiError(error));
  }
};

export const socialLogin = (type : any, history : any) => async (dispatch : any) => {
  try {
    let response;

    if (process.env.REACT_APP_DEFAULTAUTH === "firebase") {
      const fireBaseBackend : any = getFirebaseBackend();
      response = fireBaseBackend.socialLoginUser(type);
    }
    //  else {
      //   response = postSocialLogin(data);
      // }
      
      const socialdata = await response;
    if (socialdata) {
      sessionStorage.setItem("authUser", JSON.stringify(response));
      dispatch(loginSuccess(response));
      history('/dashboard')
    }

  } catch (error) {
    dispatch(apiError(error));
  }
};

export const resetLoginFlag = () => async (dispatch : any) => {
  try {
    const response = dispatch(reset_login_flag());
    return response;
  } catch (error) {
    dispatch(apiError(error));
  }
};