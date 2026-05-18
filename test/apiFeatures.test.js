import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { ApiFeatures } from "../src/utils/ApiFeatures.js";

const createMongooseQuery = () => {
  const mongooseQuery = {};
  mongooseQuery.skip = jest.fn().mockReturnValue(mongooseQuery);
  mongooseQuery.limit = jest.fn().mockReturnValue(mongooseQuery);
  mongooseQuery.find = jest.fn().mockReturnValue(mongooseQuery);
  mongooseQuery.sort = jest.fn().mockReturnValue(mongooseQuery);
  return mongooseQuery;
};

describe("ApiFeatures", () => {
  let mongooseQuery;

  beforeEach(() => {
    mongooseQuery = createMongooseQuery();
  });

  test("paginates with page limit of three", () => {
    const features = new ApiFeatures(mongooseQuery, { page: "2" });

    const result = features.pagination();

    expect(result).toBe(features);
    expect(mongooseQuery.skip).toHaveBeenCalledWith(3);
    expect(mongooseQuery.limit).toHaveBeenCalledWith(3);
  });

  test("uses page one when page is missing or non-positive", () => {
    new ApiFeatures(mongooseQuery, { page: "0" }).pagination();

    expect(mongooseQuery.skip).toHaveBeenCalledWith(0);
    expect(mongooseQuery.limit).toHaveBeenCalledWith(3);
  });

  test("filters query params and converts comparison operators", () => {
    const features = new ApiFeatures(mongooseQuery, {
      page: "3",
      sort: "price",
      fields: "title,price",
      keyword: "phone",
      price: { gte: "100", lte: "500" },
      category: "electronics",
    });

    const result = features.filteration();

    expect(result).toBe(features);
    expect(mongooseQuery.find).toHaveBeenCalledWith({
      price: { $gte: "100", $lte: "500" },
      category: "electronics",
    });
  });

  test("sorts comma-separated fields as a space-separated string", () => {
    const features = new ApiFeatures(mongooseQuery, {
      sort: "price,-createdAt",
    });

    const result = features.sort();

    expect(result).toBe(features);
    expect(mongooseQuery.sort).toHaveBeenCalledWith("price -createdAt");
  });

  test("does not sort when sort query is missing", () => {
    new ApiFeatures(mongooseQuery, {}).sort();

    expect(mongooseQuery.sort).not.toHaveBeenCalled();
  });

  test("searches title and descripton with case-insensitive regex", () => {
    const features = new ApiFeatures(mongooseQuery, { keyword: "shoe" });

    const result = features.search();

    expect(result).toBe(features);
    expect(mongooseQuery.find).toHaveBeenCalledWith({
      $or: [
        { title: { $regex: "shoe", $options: "i" } },
        { descripton: { $regex: "shoe", $options: "i" } },
      ],
    });
  });

  test("does not search when keyword is missing", () => {
    new ApiFeatures(mongooseQuery, {}).search();

    expect(mongooseQuery.find).not.toHaveBeenCalled();
  });
});
