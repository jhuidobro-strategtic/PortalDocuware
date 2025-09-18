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
  Alert,
  Spinner,
} from "reactstrap";
// import ParticlesAuth from "../AuthenticationInner/ParticlesAuth";
import ParticlesJS from "../AuthenticationInner/ParticlesJS";

//redux
import { useSelector, useDispatch } from "react-redux";

import { Link } from "react-router-dom";
import withRouter from "../../Components/Common/withRouter";
// Formik validation
import * as Yup from "yup";
import { useFormik } from "formik";

// actions
import { loginUser, socialLogin, resetLoginFlag } from "../../slices/thunks";

// import logoLight from "../../assets/images/logo-light.png";
import { createSelector } from "reselect";
//import images
import logologin from "../../assets/images/Grupo_Cayala_Color.png";
import fondoCayala from "../../assets/images/cayala.jpg";
import { motion } from "framer-motion";
const Login = (props: any) => {
  const dispatch: any = useDispatch();

  const selectLayoutState = (state: any) => state;
  const loginpageData = createSelector(selectLayoutState, (state) => ({
    user: state.Account.user,
    error: state.Login.error,
    errorMsg: state.Login.errorMsg,
  }));
  // Inside your component
  const { user, error, errorMsg } = useSelector(loginpageData);

  const [userLogin, setUserLogin] = useState<any>([]);
  const [passwordShow, setPasswordShow] = useState<boolean>(false);

  const [loader, setLoader] = useState<boolean>(false);

  useEffect(() => {
    if (user && user) {
      const updatedUserData =
        process.env.REACT_APP_DEFAULTAUTH === "firebase"
          ? user.multiFactor.user.email
          : user.email;
      const updatedUserPassword =
        process.env.REACT_APP_DEFAULTAUTH === "firebase"
          ? ""
          : user.confirm_password;
      setUserLogin({
        email: updatedUserData,
        password: updatedUserPassword,
      });
    }
  }, [user]);

  const validation: any = useFormik({
    // enableReinitialize : use this flag when initial values needs to be changed
    enableReinitialize: true,

    initialValues: {
      email: userLogin.email || "osmar@test.com" || "",
      password: userLogin.password || "123456" || "",
    },
    validationSchema: Yup.object({
      email: Yup.string().required("Please Enter Your Email"),
      password: Yup.string().required("Please Enter Your Password"),
    }),
    onSubmit: (values) => {
      dispatch(loginUser(values, props.router.navigate));
      setLoader(true);
    },
  });

  const signIn = (type: any) => {
    dispatch(socialLogin(type, props.router.navigate));
  };

  //for facebook and google authentication
  const socialResponse = (type: any) => {
    signIn(type);
  };

  useEffect(() => {
    if (errorMsg) {
      setTimeout(() => {
        dispatch(resetLoginFlag());
        setLoader(false);
      }, 3000);
    }
  }, [dispatch, errorMsg]);

  document.title = "Login - DOCUWARE";
  return (
    <React.Fragment>
      <div className="auth-page-content">
        <Container fluid className="px-0">
          <Row className="min-vh-100 g-0">
            {/* Imagen a la derecha */}
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
                  <motion.div
                    className="w-50 border-top border-white mb-4"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  />

                  <motion.h3
                    className="montserrat fs-3.5 fs-lg-1 mb-2 text-white"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                  >
                    BIENVENIDO A
                  </motion.h3>

                  <motion.h1
                    className="montserrat-bold display-4 fw-bold text-white"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                  >
                    DOCUWARE
                  </motion.h1>

                  <motion.div
                    className="w-50 border-top border-white mt-4"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.8 }}
                  />
                </div>

                <div
                  className="position-absolute w-100 h-100"
                  style={{ zIndex: 4 }}
                >
                  <ParticlesJS />
                </div>
              </div>
            </Col>

            {/* Login a la izquierda */}
            <Col
              md={6}
              className="d-flex align-items-center justify-content-center"
            >
              <div className="w-100 p-4" style={{ maxWidth: "400px" }}>
                <Card className="shadow-sm border-0 cardDatosIniciales">
                  <CardBody className="p-4">
                    <div className="text-center mt-2">
                      <img src={logologin} alt="Cayalá Logo" height="135" />
                    </div>
                    {error && <Alert color="danger">{error}</Alert>}

                    <Form
                      className="mt-4"
                      onSubmit={(e) => {
                        e.preventDefault();
                        validation.handleSubmit();
                        return false;
                      }}
                    >
                      <div className="mb-3">
                        <Label htmlFor="user" className="form-label">
                          Usuario
                        </Label>
                        <Input
                          name="email"
                          type="text"
                          placeholder="Ingrese su usuario"
                          value={validation.values.email || ""}
                          onChange={validation.handleChange}
                          onBlur={validation.handleBlur}
                          invalid={
                            !!(
                              validation.touched.email &&
                              validation.errors.email
                            )
                          }
                        />
                        {validation.touched.email &&
                          validation.errors.email && (
                            <FormFeedback type="invalid">
                              {validation.errors.email}
                            </FormFeedback>
                          )}
                      </div>

                      <div className="mb-3">
                        <Label htmlFor="password" className="form-label">
                          Contraseña
                        </Label>
                        <div className="position-relative auth-pass-inputgroup mb-3">
                          <Input
                            name="password"
                            value={validation.values.password || ""}
                            type={passwordShow ? "text" : "password"}
                            placeholder="Ingrese su contraseña"
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
                          Iniciar Sesión
                        </Button>
                      </div>
                    </Form>
                  </CardBody>
                </Card>

                <div className="mt-4 text-center">
                  <p className="mb-0">
                    ¿No tienes una cuenta?{" "}
                    <Link
                      to="/register"
                      className="fw-semibold text-primary text-decoration-underline"
                    >
                      Regístrate
                    </Link>
                  </p>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </div>
    </React.Fragment>
  );
};

export default withRouter(Login);
