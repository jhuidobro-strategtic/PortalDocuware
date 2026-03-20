import { useEffect, useState } from "react";
import { getLoggedinUser } from "../../helpers/api_helper";

const useProfile = () => {
  const userProfileSession = getLoggedinUser();
  const token = userProfileSession?.token ?? null;
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(
    userProfileSession ? userProfileSession : null
  );

  useEffect(() => {
    const userProfileSession = getLoggedinUser();
    setUserProfile(userProfileSession ? userProfileSession : null);
    setLoading(false);
  }, []);


  return { userProfile, loading,token };
};

export { useProfile };
