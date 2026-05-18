import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { AppError } from "../src/utils/AppError.js";

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

const userSaveMock = jest.fn();
const token = "signed-token";

const userModelMock = jest.fn(function UserModel(body) {
  Object.assign(this, body);
  this._id = body._id || "user-id";
  this.role = body.role || "user";
  this.save = userSaveMock;
});

userModelMock.findOne = jest.fn();
userModelMock.findById = jest.fn();

const jwtMock = {
  sign: jest.fn(() => token),
  verify: jest.fn(),
};

const bcryptMock = {
  compareSync: jest.fn(),
};

await jest.unstable_mockModule("../Database/models/user.model.js", () => ({
  userModel: userModelMock,
}));

await jest.unstable_mockModule("jsonwebtoken", () => ({
  default: jwtMock,
}));

await jest.unstable_mockModule("bcrypt", () => ({
  default: bcryptMock,
}));

const { allowedTo, protectedRoutes, signIn, signUp } = await import(
  "../src/modules/auth/auth.controller.js"
);

const createResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("auth module controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    userSaveMock.mockResolvedValue(undefined);
  });

  test("blocks duplicate signup", async () => {
    userModelMock.findOne.mockResolvedValue({ email: "taken@example.com" });
    const req = { body: { email: "taken@example.com" } };
    const res = createResponse();
    const next = jest.fn();

    signUp(req, res, next);
    await flushPromises();

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0]).toMatchObject({
      message: "Account is already exist!",
      statuscode: 409,
    });
    expect(res.status).not.toHaveBeenCalled();
  });

  test("creates a user and token on signup", async () => {
    userModelMock.findOne.mockResolvedValue(null);
    const req = {
      body: {
        name: "Aly",
        email: "aly@example.com",
        password: "secret",
        role: "user",
      },
    };
    const res = createResponse();

    signUp(req, res, jest.fn());
    await flushPromises();

    expect(userModelMock).toHaveBeenCalledWith(req.body);
    expect(userSaveMock).toHaveBeenCalledTimes(1);
    expect(jwtMock.sign).toHaveBeenCalledWith(
      { email: "aly@example.com", name: "Aly", id: "user-id", role: "user" },
      "JR"
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "success",
      user: expect.objectContaining({
        name: "Aly",
        email: "aly@example.com",
        role: "user",
      }),
      token,
    });
  });

  test("rejects invalid signin", async () => {
    userModelMock.findOne.mockResolvedValue(null);
    const req = { body: { email: "none@example.com", password: "bad" } };
    const res = createResponse();
    const next = jest.fn();

    signIn(req, res, next);
    await flushPromises();

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0]).toMatchObject({
      message: "Invalid email or password",
      statuscode: 401,
    });
    expect(res.status).not.toHaveBeenCalled();
  });

  test("accepts valid signin", async () => {
    const user = {
      _id: "user-id",
      email: "aly@example.com",
      name: "Aly",
      password: "hashed",
      role: "admin",
    };
    userModelMock.findOne.mockResolvedValue(user);
    bcryptMock.compareSync.mockReturnValue(true);
    const req = { body: { email: "aly@example.com", password: "secret" } };
    const res = createResponse();

    signIn(req, res, jest.fn());
    await flushPromises();

    expect(bcryptMock.compareSync).toHaveBeenCalledWith("secret", "hashed");
    expect(jwtMock.sign).toHaveBeenCalledWith(
      { email: "aly@example.com", name: "Aly", id: "user-id", role: "admin" },
      "JR"
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: "success", token });
  });

  test("rejects protected route when token is missing", async () => {
    const req = { headers: {} };
    const res = createResponse();
    const next = jest.fn();

    protectedRoutes(req, res, next);
    await flushPromises();

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0]).toMatchObject({
      message: "Token was not provided!",
      statuscode: 401,
    });
  });

  test("rejects protected route when user cannot be found", async () => {
    jwtMock.verify.mockResolvedValue({ id: "missing-user", iat: 100 });
    userModelMock.findById.mockResolvedValue(null);
    const req = { headers: { token } };
    const next = jest.fn();

    protectedRoutes(req, createResponse(), next);
    await flushPromises();

    expect(jwtMock.verify).toHaveBeenCalledWith(token, "JR");
    expect(userModelMock.findById).toHaveBeenCalledWith("missing-user");
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0]).toMatchObject({
      message: "Invalid user",
      statuscode: 404,
    });
  });

  test("allows protected route with a valid token and user", async () => {
    const user = { _id: "user-id", role: "user" };
    jwtMock.verify.mockResolvedValue({ id: "user-id", iat: 100 });
    userModelMock.findById.mockResolvedValue(user);
    const req = { headers: { token } };
    const next = jest.fn();

    protectedRoutes(req, createResponse(), next);
    await flushPromises();

    expect(req.user).toBe(user);
    expect(next).toHaveBeenCalledWith();
  });

  test("allows roles through allowedTo", async () => {
    const req = { user: { role: "admin" } };
    const next = jest.fn();

    allowedTo("admin", "manager")(req, createResponse(), next);
    await flushPromises();

    expect(next).toHaveBeenCalledWith();
  });

  test("blocks unauthorized roles through allowedTo", async () => {
    const req = { user: { role: "user" } };
    const next = jest.fn();

    allowedTo("admin")(req, createResponse(), next);
    await flushPromises();

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0]).toMatchObject({
      message: "You are not authorized to access this route. Your are user",
      statuscode: 401,
    });
  });
});
