import { authClient } from "../utils/auth/auth.js";

let userState = $state({ loading: true });
let userStatePromise = null;

const getUserFromSession = () => {
  if (userStatePromise) {
    return;
  }

  userStatePromise = authClient.getSession();
  userStatePromise.then((res) => {
    const session = res?.data;
    if (session?.user?.email) {
      userState = { ...session.user, loading: false };
    } else {
      userState = { email: null, loading: false };
    }
  });
};

const useUserState = () => {
  if (import.meta.env.SSR) {
  } else if (!userState?.email) {
    getUserFromSession();
  }

  return {
    get loading() {
      return userState?.loading === true;
    },
    get email() {
      return userState?.email;
    },
  };
};

export { useUserState };
