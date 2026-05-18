import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { AppError } from "../src/utils/AppError.js";

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

const productSaveMock = jest.fn();
const slugifyMock = jest.fn((value) => `slug-${value}`);
const productQuery = {};

const productModelMock = jest.fn(function ProductModel(body) {
  Object.assign(this, body);
  this.save = productSaveMock;
});

productModelMock.find = jest.fn();
productModelMock.findByIdAndUpdate = jest.fn();

productQuery.skip = jest.fn().mockReturnValue(productQuery);
productQuery.limit = jest.fn().mockReturnValue(productQuery);
productQuery.find = jest.fn().mockReturnValue(productQuery);
productQuery.sort = jest.fn().mockReturnValue(productQuery);

await jest.unstable_mockModule("slugify", () => ({
  default: slugifyMock,
}));

await jest.unstable_mockModule("../Database/models/product.model.js", () => ({
  productModel: productModelMock,
}));

const {
  addProduct,
  getAllProducts,
  getSpecificProduct,
  updateProduct,
} = await import("../src/modules/product/product.controller.js");

const createResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("product module controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    productSaveMock.mockResolvedValue(undefined);
    productModelMock.find.mockReturnValue(productQuery);
  });

  test("adds a product with uploaded images and generated slug", async () => {
    const req = {
      body: { title: "Running Shoe" },
      files: {
        imgCover: [{ filename: "cover.png" }],
        images: [{ filename: "side.png" }, { filename: "back.png" }],
      },
    };
    const res = createResponse();

    addProduct(req, res, jest.fn());
    await flushPromises();

    expect(slugifyMock).toHaveBeenCalledWith("Running Shoe");
    expect(productModelMock).toHaveBeenCalledWith({
      title: "Running Shoe",
      imgCover: "cover.png",
      images: ["side.png", "back.png"],
      slug: "slug-Running Shoe",
    });
    expect(productSaveMock).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "success",
      addProduct: expect.objectContaining({
        title: "Running Shoe",
        imgCover: "cover.png",
        images: ["side.png", "back.png"],
        slug: "slug-Running Shoe",
      }),
    });
  });

  test("lists products through ApiFeatures query chain", async () => {
    const req = { query: { page: "3", sort: "price,-createdAt", brand: "nike" } };
    const res = createResponse();

    getAllProducts(req, res, jest.fn());
    await flushPromises();

    expect(productModelMock.find).toHaveBeenCalledWith();
    expect(productQuery.skip).toHaveBeenCalledWith(6);
    expect(productQuery.limit).toHaveBeenCalledWith(3);
    expect(productQuery.find).toHaveBeenCalledWith({ brand: "nike" });
    expect(productQuery.sort).toHaveBeenCalledWith("price -createdAt");
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      page: 3,
      message: "success",
      getAllProducts: productQuery,
    });
  });

  test("updates product slug when title is present", async () => {
    const updatedProduct = { _id: "123", title: "New Shoe" };
    productModelMock.findByIdAndUpdate.mockResolvedValue(updatedProduct);
    const req = { params: { id: "123" }, body: { title: "New Shoe" } };
    const res = createResponse();

    updateProduct(req, res, jest.fn());
    await flushPromises();

    expect(productModelMock.findByIdAndUpdate).toHaveBeenCalledWith(
      "123",
      { title: "New Shoe", slug: "slug-New Shoe" },
      { new: true }
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "success",
      updateProduct: updatedProduct,
    });
  });

  test("does not generate a slug when title is missing during update", async () => {
    const updatedProduct = { _id: "123", price: 200 };
    productModelMock.findByIdAndUpdate.mockResolvedValue(updatedProduct);
    const req = { params: { id: "123" }, body: { price: 200 } };
    const res = createResponse();

    updateProduct(req, res, jest.fn());
    await flushPromises();

    expect(slugifyMock).not.toHaveBeenCalled();
    expect(productModelMock.findByIdAndUpdate).toHaveBeenCalledWith(
      "123",
      { price: 200 },
      { new: true }
    );
  });

  test("passes an AppError when updated product is missing", async () => {
    productModelMock.findByIdAndUpdate.mockResolvedValue(null);
    const req = { params: { id: "missing" }, body: { title: "New Shoe" } };
    const res = createResponse();
    const next = jest.fn();

    updateProduct(req, res, next);
    await flushPromises();

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0]).toMatchObject({
      message: "Product was not found",
      statuscode: 404,
    });
  });

  test("gets a specific product using the current findByIdAndUpdate behavior", async () => {
    const product = { _id: "123", title: "Running Shoe" };
    productModelMock.findByIdAndUpdate.mockResolvedValue(product);
    const req = { params: { id: "123" } };
    const res = createResponse();

    getSpecificProduct(req, res, jest.fn());
    await flushPromises();

    expect(productModelMock.findByIdAndUpdate).toHaveBeenCalledWith("123");
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "success",
      getSpecificProduct: product,
    });
  });
});
