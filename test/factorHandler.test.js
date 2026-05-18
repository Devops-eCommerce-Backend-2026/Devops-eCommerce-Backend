import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import { deleteOne } from "../src/handlers/factor.js";
import { AppError } from "../src/utils/AppError.js";

const createResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("deleteOne", () => {
  let consoleLogSpy;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  test("deletes a document and sends success response", async () => {
    const document = { _id: "123", title: "Shoes" };
    const model = {
      findByIdAndDelete: jest.fn().mockResolvedValue(document),
    };
    const req = { params: { id: "123" } };
    const res = createResponse();
    const next = jest.fn();

    deleteOne(model, "product")(req, res, next);
    await Promise.resolve();

    expect(model.findByIdAndDelete).toHaveBeenCalledWith("123", { new: true });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "success",
      product: document,
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("passes an AppError to next when document is missing", async () => {
    const model = {
      findByIdAndDelete: jest.fn().mockResolvedValue(null),
    };
    const req = { params: { id: "missing-id" } };
    const res = createResponse();
    const next = jest.fn();

    deleteOne(model, "product")(req, res, next);
    await Promise.resolve();

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0]).toMatchObject({
      message: "product was not found",
      statuscode: 404,
    });
  });
});
