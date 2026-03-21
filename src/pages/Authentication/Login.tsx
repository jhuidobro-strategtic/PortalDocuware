import React, { useEffect, useState } from "react";
import {
  Card,
  CardBody,
  Col,
  Container,
  Input,
  Label,
  Row,
  Button,
  Form,
  FormFeedback,
  Spinner,
} from "reactstrap";
import { useSelector, useDispatch } from "react-redux";
import withRouter from "../../Components/Common/withRouter";
import * as Yup from "yup";
import { useFormik } from "formik";

import ParticlesJS from "../AuthenticationInner/ParticlesJS";
import { loginUser, resetLoginFlag } from "../../slices/auth/login/thunk";
import logologin from "../../assets/images/Grupo_Cayala_Color.png";
import fondoCayala from "../../assets/images/cayala.jpg";
import "./Login.css";

const getLoginErrorMessage = (message: unknown) => {
  if (typeof message !== "string") {
    return "No se pudo iniciar sesion. Intente nuevamente.";
  }

  const normalizedMessage = message.trim().toLowerCase();

  if (!normalizedMessage) {
    return "No se pudo iniciar sesion. Intente nuevamente.";
  }

  if (
    normalizedMessage.includes("invalid username or password") ||
    normalizedMessage.includes("invalid credentials") ||
    normalizedMessage.includes("unauthorized")
  ) {
    return "Usuario o contrasena incorrectos.";
  }

  if (
    normalizedMessage.includes("network") ||
    normalizedMessage.includes("failed to fetch") ||
    normalizedMessage.includes("timeout")
  ) {
    return "No se pudo conectar con el servidor. Intente nuevamente.";
  }

  return "No se pudo iniciar sesion. Intente nuevamente.";
};

const Login = (props: any) => {
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
      username: Yup.string().required("Por favor ingrese su usuario"),
      password: Yup.string().required("Por favor ingrese su contrasena"),
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
      message: getLoginErrorMessage(errorMsg),
    });
    setLoader(false);

    const timer = window.setTimeout(() => {
      setLoginToast(null);
      dispatch(resetLoginFlag());
    }, 4200);

    return () => window.clearTimeout(timer);
  }, [dispatch, errorMsg]);

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
              <span className="login-toast-title">Error al iniciar sesion</span>
              <span className="login-toast-message">{loginToast.message}</span>
            </div>
          </div>
        </div>
      )}

      <div className="auth-page-content">
        <Container fluid className="px-0">
          <Row className="min-vh-100 g-0">
            <Col md={6} className="d-none d-md-block position-relative">
              <div className="auth-image-container h-100 w-100 position-relative">
                <div
                  className="h-100 w-100 position-absolute"
                  style={{
                    backgroundImage: `url(${fondoCayala})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    zIndex: 1,
                    top: 0,
                    left: 0,
                  }}
                ></div>

                <div
                  className="h-100 w-100 position-absolute"
                  style={{
                    backgroundColor: "rgba(0, 0, 0, 0.2)",
                    zIndex: 2,
                    top: 0,
                    left: 0,
                  }}
                ></div>

                <div
                  className="position-absolute w-100 h-100 d-flex flex-column align-items-center justify-content-center text-white text-center"
                  style={{ zIndex: 3 }}
                >
                  <div className="w-50 border-top border-white mb-4" />

                  <h3 className="montserrat fs-3.5 fs-lg-1 mb-2 text-white">
                    BIENVENIDO A
                  </h3>

                  <h1 className="montserrat-bold display-4 fw-bold text-white">
                    DOCUWARE
                  </h1>

                  <div className="w-50 border-top border-white mt-4" />
                </div>

                <div
                  className="position-absolute w-100 h-100"
                  style={{ zIndex: 4 }}
                >
                  <ParticlesJS />
                </div>
              </div>
            </Col>

            <Col
              md={6}
              className="d-flex align-items-center justify-content-center"
            >
              <div className="w-100 p-4" style={{ maxWidth: "400px" }}>
                <Card className="shadow-sm border-0 cardDatosIniciales">
                  <CardBody className="p-4">
                    <div className="text-center mt-2">
                      <img src={logologin} alt="Docuware Logo" height="135" />
                    </div>

                    <Form
                      className="mt-4"
                      onSubmit={(event) => {
                        event.preventDefault();
                        validation.handleSubmit();
                        return false;
                      }}
                    >
                      <div className="mb-3">
                        <Label htmlFor="user" className="form-label">
                          Usuario
                        </Label>
                        <Input
                          name="username"
                          type="text"
                          placeholder="Ingrese su usuario"
                          value={validation.values.username || ""}
                          onChange={validation.handleChange}
                          onBlur={validation.handleBlur}
                          invalid={
                            !!(
                              validation.touched.username &&
                              validation.errors.username
                            )
                          }
                        />
                        {validation.touched.username &&
                          validation.errors.username && (
                            <FormFeedback type="invalid">
                              {validation.errors.username}
                            </FormFeedback>
                          )}
                      </div>

                      <div className="mb-3">
                        <Label htmlFor="password" className="form-label">
                          Contrasena
                        </Label>
                        <div className="position-relative auth-pass-inputgroup mb-3">
                          <Input
                            name="password"
                            value={validation.values.password || ""}
                            type={passwordShow ? "text" : "password"}
                            placeholder="Ingrese su contrasena"
                            onChange={validation.handleChange}
                            onBlur={validation.handleBlur}
                            invalid={
                              !!(
                                validation.touched.password &&
                                validation.errors.password
                              )
                            }
                          />
                          {validation.touched.password &&
                            validation.errors.password && (
                              <FormFeedback type="invalid">
                                {validation.errors.password}
                              </FormFeedback>
                            )}
                          <button
                            type="button"
                            className="btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted"
                            onClick={() => setPasswordShow(!passwordShow)}
                          >
                            <i className="ri-eye-fill align-middle"></i>
                          </button>
                        </div>
                      </div>

                      <div className="mt-4">
                        <Button
                          type="submit"
                          className="w-100 custom-button"
                          disabled={loader}
                        >
                          {loader && <Spinner size="sm" className="me-2" />}{" "}
                          Iniciar Sesion
                        </Button>
                      </div>
                    </Form>
                  </CardBody>
                </Card>
              </div>
            </Col>
          </Row>
        </Container>
      </div>
    </React.Fragment>
  );
};

export default withRouter(Login);
