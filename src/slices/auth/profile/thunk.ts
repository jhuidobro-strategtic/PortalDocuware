import { postFakeProfile, postJwtProfile } from "../../../helpers/fakebackend_helper";
import { profileSuccess, profileError, resetProfileFlagChange } from "./reducer";

export const editProfile = (user: any) => async (dispatch: any) => {
    try {
        const response =
            process.env.REACT_APP_DEFAULTAUTH === "jwt"
                ? postJwtProfile({
                    username: user.first_name,
                    idx: user.idx,
                })
                : postFakeProfile({
                    first_name: user.first_name,
                    idx: user.idx,
                });

        const data = await response;

        if (data) {
            dispatch(profileSuccess(data));
        }
    } catch (error) {
        dispatch(profileError(error));
    }
};

export const resetProfileFlag = () => {
    try {
        return resetProfileFlagChange();
    } catch (error) {
        return error;
    }
};
