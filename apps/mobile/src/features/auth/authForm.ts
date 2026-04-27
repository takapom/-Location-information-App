export type AuthFormMode = "signin" | "signup";

export type AuthCredentials = {
  email: string;
  password: string;
};

export type AuthValidationResult =
  | { valid: true; credentials: AuthCredentials }
  | { valid: false; message: string };

const minPasswordLength = 8;

export function validateAuthCredentials(input: AuthCredentials): AuthValidationResult {
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!email || !password) {
    return { valid: false, message: "メールアドレスとパスワードを入力してください" };
  }

  if (!email.includes("@")) {
    return { valid: false, message: "メールアドレスの形式を確認してください" };
  }

  if (password.length < minPasswordLength) {
    return { valid: false, message: `パスワードは${minPasswordLength}文字以上で入力してください` };
  }

  return { valid: true, credentials: { email, password } };
}

export function getPostAuthRoute(mode: AuthFormMode) {
  return mode === "signup" ? "/profile?setup=1" : "/map";
}
