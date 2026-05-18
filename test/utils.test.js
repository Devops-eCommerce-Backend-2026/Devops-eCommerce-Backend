import { describe, expect, jest, test } from "@jest/globals";
import { AppError } from "../src/utils/AppError.js";
import { catchAsyncError } from "../src/utils/catchAsyncError.js";

describe("AppError", () => {
  test("stores the message and status code", () => {
    const error = new AppError("Not found", 404);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("Not found");
    expect(error.statuscode).toBe(404);
  });
});

describe("catchAsyncError", () => {
  test("passes rejected async errors to next", async () => {
    const error = new Error("database failed");
    const req = {};
    const res = {};
    const next = jest.fn();
    const handler = catchAsyncError(async () => {
      throw error;
    });

    handler(req, res, next);
    await Promise.resolve();

    expect(next).toHaveBeenCalledWith(error);
  });
});
