import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { AppError } from "../src/utils/AppError.js";

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

const categorySaveMock = jest.fn();
const slugifyMock = jest.fn((value) => `slug-${value}`);
const categoryQuery = {};

const categoryModelMock = jest.fn(function CategoryModel(body) {
  Object.assign(this, body);
  this.save = categorySaveMock;
});

categoryModelMock.find = jest.fn();
categoryModelMock.findByIdAndUpdate = jest.fn();

categoryQuery.skip = jest.fn().mockReturnValue(categoryQuery);
categoryQuery.limit = jest.fn().mockReturnValue(categoryQuery);
categoryQuery.find = jest.fn().mockReturnValue(categoryQuery);
categoryQuery.sort = jest.fn().mockReturnValue(categoryQuery);

await jest.unstable_mockModule("slugify", () => ({
  default: slugifyMock,
}));

await jest.unstable_mockModule("../Database/models/category.model.js", () => ({
  categoryModel: categoryModelMock,
}));

const { addCategory, getAllCategories, updateCategory } = await import(
  "../src/modules/category/category.controller.js"
);

const createResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("category module controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    categorySaveMock.mockResolvedValue(undefined);
    categoryModelMock.find.mockReturnValue(categoryQuery);
  });

  test("adds a category with uploaded image and generated slug", async () => {
    const req = {
      body: { name: "Shoes" },
      file: { filename: "shoes.png" },
    };
    const res = createResponse();
    const next = jest.fn();

    addCategory(req, res, next);
    await flushPromises();

    expect(slugifyMock).toHaveBeenCalledWith("Shoes");
    expect(categoryModelMock).toHaveBeenCalledWith({
      name: "Shoes",
      Image: "shoes.png",
      slug: "slug-Shoes",
    });
    expect(categorySaveMock).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "success",
      addcategory: expect.objectContaining({
        name: "Shoes",
        Image: "shoes.png",
        slug: "slug-Shoes",
      }),
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("lists categories through ApiFeatures query chain", async () => {
    const req = { query: { page: "2", sort: "name", name: "Shoes" } };
    const res = createResponse();

    getAllCategories(req, res, jest.fn());
    await flushPromises();

    expect(categoryModelMock.find).toHaveBeenCalledWith();
    expect(categoryQuery.skip).toHaveBeenCalledWith(3);
    expect(categoryQuery.limit).toHaveBeenCalledWith(3);
    expect(categoryQuery.find).toHaveBeenCalledWith({ name: "Shoes" });
    expect(categoryQuery.sort).toHaveBeenCalledWith("name");
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      page: 2,
      message: "success",
      getAllCategories: categoryQuery,
    });
  });

  test("updates a category with a generated slug", async () => {
    const updatedCategory = { _id: "123", name: "Bags" };
    categoryModelMock.findByIdAndUpdate.mockResolvedValue(updatedCategory);
    const req = { params: { id: "123" }, body: { name: "Bags" } };
    const res = createResponse();

    updateCategory(req, res, jest.fn());
    await flushPromises();

    expect(categoryModelMock.findByIdAndUpdate).toHaveBeenCalledWith(
      "123",
      { name: "Bags", slug: "slug-Bags" },
      { new: true }
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "success",
      updateCategory: updatedCategory,
    });
  });

  test("passes an AppError when updated category is missing", async () => {
    categoryModelMock.findByIdAndUpdate.mockResolvedValue(null);
    const req = { params: { id: "missing" }, body: { name: "Bags" } };
    const res = createResponse();
    const next = jest.fn();

    updateCategory(req, res, next);
    await flushPromises();

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0]).toMatchObject({
      message: "category was not found",
      statuscode: 404,
    });
  });
});
