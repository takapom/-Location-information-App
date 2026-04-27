import { getPostAuthRoute, validateAuthCredentials } from "@/features/auth/authForm";

describe("authForm", () => {
  test("未入力では認証に進ませない", () => {
    expect(validateAuthCredentials({ email: "", password: "" })).toEqual({
      valid: false,
      message: "メールアドレスとパスワードを入力してください"
    });
  });

  test("登録前にメール形式とパスワード長を検証する", () => {
    expect(validateAuthCredentials({ email: "invalid", password: "password123" })).toMatchObject({
      valid: false,
      message: "メールアドレスの形式を確認してください"
    });
    expect(validateAuthCredentials({ email: "user@example.com", password: "short" })).toMatchObject({
      valid: false,
      message: "パスワードは8文字以上で入力してください"
    });
  });

  test("メールは正規化し、新規登録後はプロフィール初期設定へ進める", () => {
    expect(validateAuthCredentials({ email: " USER@Example.COM ", password: "password123" })).toEqual({
      valid: true,
      credentials: { email: "user@example.com", password: "password123" }
    });
    expect(getPostAuthRoute("signup")).toBe("/profile?setup=1");
    expect(getPostAuthRoute("signin")).toBe("/map");
  });
});
