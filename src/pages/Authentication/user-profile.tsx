import React, { useState, useEffect } from "react";
import { isEmpty } from "lodash";
import { useTranslation } from "react-i18next";

import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  Button,
  Label,
  Input,
  FormFeedback,
  Form,
} from "reactstrap";

import * as Yup from "yup";
import { useFormik } from "formik";
import { useSelector, useDispatch } from "react-redux";
import { createSelector } from "reselect";

import avatar from "../../assets/images/users/avatar-1.jpg";
import FloatingAlerts, {
  FloatingAlertItem,
} from "../../Components/Common/FloatingAlerts";
import { editProfile, resetProfileFlag } from "../../slices/auth/profile/thunk";

const UserProfile = () => {
  const { t } = useTranslation();
  const dispatch: any = useDispatch();

  const [email, setemail] = useState(t("No email"));
  const [idx, setidx] = useState("1");
  const [userName, setUserName] = useState("Admin");
  const [profileName, setProfileName] = useState(t("No profile"));

  const selectLayoutState = (state: any) => state.Profile;
  const userprofileData = createSelector(selectLayoutState, (state) => ({
    user: state.user,
    success: state.success,
    error: state.error,
  }));

  const { user, success, error } = useSelector(userprofileData);

  useEffect(() => {
    if (sessionStorage.getItem("authUser")) {
      const storedUser = sessionStorage.getItem("authUser");
      if (storedUser) {
        const obj = JSON.parse(storedUser);

        if (process.env.REACT_APP_DEFAULTAUTH === "firebase") {
          obj.displayName = user.username;
          setUserName(obj.displayName || "Admin");
          setemail(obj.email || "admin@gmail.com");
          setidx(obj.uid || "1");
        } else if (
          process.env.REACT_APP_DEFAULTAUTH === "fake" ||
          process.env.REACT_APP_DEFAULTAUTH === "jwt"
        ) {
          if (!isEmpty(user)) {
            obj.data.fullname = user.first_name;
            sessionStorage.removeItem("authUser");
            sessionStorage.setItem("authUser", JSON.stringify(obj));
          }

          setUserName(
            obj.data.fullname || obj.data.first_name || obj.data.username || "Admin"
          );
          setemail(obj.data.email || obj.data.username || t("No email"));
          setidx(String(obj.data.profileID || obj.data._id || "1"));
          setProfileName(obj.data.profileName || t("No profile"));
        }
        setTimeout(() => {
          dispatch(resetProfileFlag());
        }, 3000);
      }
    }
  }, [dispatch, t, user]);

  const validation = useFormik({
    enableReinitialize: true,
    initialValues: {
      first_name: userName || "Admin",
      idx: idx || "",
    },
    validationSchema: Yup.object({
      first_name: Yup.string().required(t("Please enter your username")),
    }),
    onSubmit: (values) => {
      dispatch(editProfile(values));
    },
  });

  document.title = `${t("Profile")} | Docuware`;
  const floatingAlerts: FloatingAlertItem[] = [];

  if (error) {
    floatingAlerts.push({
      id: "profile-error",
      type: "danger",
      message: error,
    });
  }

  if (success) {
    floatingAlerts.push({
      id: "profile-success",
      type: "success",
      message: t("Username updated to {{name}}", { name: userName }),
    });
  }

  return (
    <React.Fragment>
      <div className="page-content mt-lg-5">
        <Container fluid>
          <FloatingAlerts alerts={floatingAlerts} />
          <Row>
            <Col lg="12">
              <Card>
                <CardBody>
                  <div className="d-flex">
                    <div className="mx-3">
                      <img
                        src={avatar}
                        alt=""
                        className="avatar-md rounded-circle img-thumbnail"
                      />
                    </div>
                    <div className="flex-grow-1 align-self-center">
                      <div className="text-muted">
                        <h5>{userName || "Admin"}</h5>
                        <p className="mb-1">
                          {t("Email: {{email}}", { email })}
                        </p>
                        <p className="mb-1">
                          {t("Profile: {{profile}}", { profile: profileName })}
                        </p>
                        <p className="mb-0">
                          {t("Id No.: #{{id}}", { id: idx })}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>

          <h4 className="card-title mb-4">{t("Change User Name")}</h4>

          <Card>
            <CardBody>
              <Form
                className="form-horizontal"
                onSubmit={(e) => {
                  e.preventDefault();
                  validation.handleSubmit();
                  return false;
                }}
              >
                <div className="form-group">
                  <Label className="form-label">{t("User Name")}</Label>
                  <Input
                    name="first_name"
                    className="form-control"
                    placeholder={t("Enter user name")}
                    type="text"
                    onChange={validation.handleChange}
                    onBlur={validation.handleBlur}
                    value={validation.values.first_name || ""}
                    invalid={
                      validation.touched.first_name && validation.errors.first_name
                        ? true
                        : false
                    }
                  />
                  {validation.touched.first_name && validation.errors.first_name ? (
                    <FormFeedback type="invalid">
                      {validation.errors.first_name}
                    </FormFeedback>
                  ) : null}
                  <Input name="idx" value={idx} type="hidden" />
                </div>
                <div className="text-center mt-4">
                  <Button type="submit" color="danger">
                    {t("Update User Name")}
                  </Button>
                </div>
              </Form>
            </CardBody>
          </Card>
        </Container>
      </div>
    </React.Fragment>
  );
};

export default UserProfile;
