import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import { globalErrorHandling } from "../src/middlewares/GlobalErrorHandling.js";
import { validate } from "../src/middlewares/validate.js";

const createResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("globalErrorHandling", () => {
  const originalMode = process.env.MODE;

  afterEach(() => {
    process.env.MODE = originalMode;
  });

  test("returns only the error message outside dev mode", () => {
    process.env.MODE = "prod";
    const err = Object.assign(new Error("Something broke"), { statuscode: 400 });
    const res = createResponse();

    globalErrorHandling(err, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Something broke" });
  });

  test("includes stack in dev mode", () => {
    process.env.MODE = "dev";
    const err = Object.assign(new Error("Something broke"), { statuscode: 503 });
    const res = createResponse();

    globalErrorHandling(err, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      error: "Something broke",
      stack: err.stack,
    });
  });
});

describe("validate", () => {
  let consoleLogSpy;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  test("calls next when schema validation succeeds", () => {
    const schema = {
      validate: jest.fn().mockReturnValue({}),
    };
    const req = {
      body: { title: "Shoes" },
      params: { id: "123" },
      query: { page: "1" },
    };
    const res = createResponse();
    const next = jest.fn();

    validate(schema)(req, res, next);

    expect(schema.validate).toHaveBeenCalledWith(
      { title: "Shoes", id: "123", page: "1" },
      { abortEarly: false }
    );
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.json).not.toHaveBeenCalled();
  });

  test("returns validation messages when schema validation fails", () => {
    const schema = {
      validate: jest.fn().mockReturnValue({
        error: {
          details: [
            { message: "\"name\" is required", path: ["name"] },
            { message: "\"price\" must be a number", path: ["price"] },
          ],
        },
      }),
    };
    const req = { body: {}, params: {}, query: {} };
    const res = createResponse();
    const next = jest.fn();

    validate(schema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenNthCalledWith(1, {
      message: "\"name\" is required",
      field: "name",
    });
    expect(res.json).toHaveBeenNthCalledWith(2, {
      message: "\"price\" must be a number",
      field: "price",
    });
    expect(res.json).toHaveBeenNthCalledWith(3, []);
  });
});
