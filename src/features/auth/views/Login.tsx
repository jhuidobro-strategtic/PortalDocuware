import React, { useEffect, useState } from "react";
import {
  Spinner,
} from "reactstrap";
import { useSelector, useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import withRouter from "../../../components/common/withRouter";
import * as Yup from "yup";
import { useFormik } from "formik";

import ParticlesJS from "./AuthenticationInner/ParticlesJS";
import { loginUser, resetLoginFlag } from "../../../slices/auth/login/thunk";
import logologin from "../../../assets/images/Grupo_Cayala_Color.png";
import "./Login.css";

const getLoginErrorMessage = (
  message: unknown,
  t: (key: string) => string
) => {
  if (typeof message !== "string") {
    return t("Unable to sign in. Please try again.");
  }

  const normalizedMessage = message.trim().toLowerCase();

  if (!normalizedMessage) {
    return t("Unable to sign in. Please try again.");
  }

  if (
    normalizedMessage.includes("invalid username or password") ||
    normalizedMessage.includes("invalid credentials") ||
    normalizedMessage.includes("unauthorized")
  ) {
    return t("Incorrect username or password.");
  }

  if (
    normalizedMessage.includes("network") ||
    normalizedMessage.includes("failed to fetch") ||
    normalizedMessage.includes("timeout")
  ) {
    return t("Unable to connect to the server. Please try again.");
  }

  return t("Unable to sign in. Please try again.");
};

const Login = (props: any) => {
  const { t } = useTranslation();
  const dispatch: any = useDispatch();
  const { errorMsg } = useSelector((state: any) => state.Login);

  const [passwordShow, setPasswordShow] = useState<boolean>(false);
  const [loader, setLoader] = useState<boolean>(false);
  const [loginToast, setLoginToast] = useState<{
    id: number;
    message: string;
  } | null>(null);

  const validation: any = useFormik({
    initialValues: {
      username: "",
      password: "",
    },
    validationSchema: Yup.object({
      username: Yup.string().required(t("Please enter your username")),
      password: Yup.string().required(t("Please enter your password")),
    }),
    onSubmit: (values) => {
      dispatch(loginUser(values, props.router.navigate));
      setLoader(true);
    },
  });

  useEffect(() => {
    if (!errorMsg) {
      return;
    }

    setLoginToast({
      id: Date.now(),
      message: getLoginErrorMessage(errorMsg, t),
    });
    setLoader(false);

    const timer = window.setTimeout(() => {
      setLoginToast(null);
      dispatch(resetLoginFlag());
    }, 4200);

    return () => window.clearTimeout(timer);
  }, [dispatch, errorMsg, t]);

  document.title = "Login - DOCUWARE";

  return (
    <React.Fragment>
      {loginToast && (
        <div className="login-toast-container" aria-live="polite" aria-atomic="true">
          <div key={loginToast.id} className="login-toast" role="alert">
            <div className="login-toast-icon">
              <i className="ri-error-warning-line"></i>
            </div>
            <div className="login-toast-content">
              <span className="login-toast-title">{t("Error signing in")}</span>
              <span className="login-toast-message">{loginToast.message}</span>
            </div>
          </div>
        </div>
      )}

      <div className="premium-login-container">
        {/* Columna Izquierda (Video y Textos) */}
        <div className="premium-left-pane">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="premium-video-bg"
            src="/video/videodocuware.mp4"
          />
          <div className="premium-video-overlay"></div>
          
          <div className="premium-left-content">
            <h3 className="premium-welcome-text">{t("Welcome to").toUpperCase()}</h3>
            <h1 className="premium-brand-title">DOCUWARE</h1>
            <p className="premium-subtitle">Transformando la gestión documental empresarial</p>
            <p className="premium-description">
              Automatiza, organiza y protege tu información con tecnología inteligente.
            </p>
          </div>

          <div className="premium-particles-wrapper">
            <ParticlesJS />
          </div>
        </div>

        {/* Columna Derecha (Formulario) */}
        <div className="premium-right-pane">
          <div className="premium-glass-card">
            <div className="premium-logo-container">
              <img src={logologin} alt="Docuware Logo" />
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                validation.handleSubmit();
                return false;
              }}
            >
              <div className="premium-input-group">
                <label htmlFor="username" className="premium-label">
                  {t("Username")}
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  className={`premium-input ${validation.touched.username && validation.errors.username ? 'is-invalid' : ''}`}
                  placeholder={t("Enter your username")}
                  value={validation.values.username || ""}
                  onChange={validation.handleChange}
                  onBlur={validation.handleBlur}
                />
                {validation.touched.username && validation.errors.username && (
                  <span className="premium-error-text">{validation.errors.username}</span>
                )}
              </div>

              <div className="premium-input-group">
                <label htmlFor="password" className="premium-label">
                  {t("Password")}
                </label>
                <div className="premium-password-wrapper">
                  <input
                    id="password"
                    name="password"
                    type={passwordShow ? "text" : "password"}
                    className={`premium-input ${validation.touched.password && validation.errors.password ? 'is-invalid' : ''}`}
                    placeholder={t("Enter your password")}
                    value={validation.values.password || ""}
                    onChange={validation.handleChange}
                    onBlur={validation.handleBlur}
                  />
                  <button
                    type="button"
                    className="premium-password-toggle"
                    onClick={() => setPasswordShow(!passwordShow)}
                  >
                    <i className={passwordShow ? "ri-eye-off-fill align-middle fs-5" : "ri-eye-fill align-middle fs-5"}></i>
                  </button>
                </div>
                {validation.touched.password && validation.errors.password && (
                  <span className="premium-error-text">{validation.errors.password}</span>
                )}
              </div>

              <button
                type="submit"
                className="premium-button"
                disabled={loader}
              >
                {loader && <Spinner size="sm" className="me-2" />}
                {t("Sign In")}
              </button>
            </form>
          </div>

          <div className="premium-footer">
            <span className="security">
              <i className="ri-shield-check-fill"></i> Sistema seguro • Cifrado SSL
            </span>
            <span>Versión 2.5.1</span>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

export default withRouter(Login);
