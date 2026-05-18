import { describe, expect, test } from "@jest/globals";
import {
  addCategoryValidation,
  deleteCategoryValidation,
  updateCategoryValidation,
} from "../src/modules/category/category.validation.js";
import {
  addProductValidation,
  deleteProductValidation,
  getSpecificProductValidation,
  updateProductValidation,
} from "../src/modules/product/product.validation.js";
import {
  addUserValidation,
  changeUserPasswordValidation,
  deleteUserValidation,
  updateUserValidation,
} from "../src/modules/user/user.validation.js";

const objectId = "64f1a0f0a0f0a0f0a0f0a0f0";

describe("category validations", () => {
  test("accepts a valid add category payload", () => {
    const { error, value } = addCategoryValidation.validate({
      name: "Shoes",
      Image: "shoes.png",
    });

    expect(error).toBeUndefined();
    expect(value.name).toBe("Shoes");
  });

  test("requires a 24-character hex id for category updates and deletes", () => {
    expect(updateCategoryValidation.validate({ id: objectId, name: "Bags" }).error).toBeUndefined();
    expect(deleteCategoryValidation.validate({ id: objectId }).error).toBeUndefined();
    expect(deleteCategoryValidation.validate({ id: "bad-id" }).error).toBeDefined();
  });
});

describe("product validations", () => {
  const validProduct = {
    title: "Running Shoe",
    descripton: "Comfortable running shoe",
    price: 100,
    category: objectId,
    subcategory: objectId,
    brand: objectId,
  };

  test("accepts a valid add product payload", () => {
    const { error, value } = addProductValidation.validate(validProduct);

    expect(error).toBeUndefined();
    expect(value.title).toBe("Running Shoe");
  });

  test("requires product object ids for id-based operations", () => {
    expect(getSpecificProductValidation.validate({ id: objectId }).error).toBeUndefined();
    expect(deleteProductValidation.validate({ id: objectId }).error).toBeUndefined();
    expect(getSpecificProductValidation.validate({ id: "123" }).error).toBeDefined();
  });

  test("accepts current update product contract with a required title", () => {
    const { error } = updateProductValidation.validate({
      id: objectId,
      title: "Updated Shoe",
    });

    expect(error).toBeUndefined();
    expect(updateProductValidation.validate({ id: objectId }).error).toBeDefined();
  });
});

describe("user/auth-style validations", () => {
  test("accepts a valid user signup-style payload", () => {
    const { error } = addUserValidation.validate({
      name: "Aly",
      email: "aly@example.com",
      password: "secret",
    });

    expect(error).toBeUndefined();
  });

  test("validates id-based user operations", () => {
    expect(updateUserValidation.validate({ id: objectId, name: "New Name" }).error).toBeUndefined();
    expect(changeUserPasswordValidation.validate({ id: objectId, password: "newpass" }).error).toBeUndefined();
    expect(deleteUserValidation.validate({ id: objectId }).error).toBeUndefined();
    expect(deleteUserValidation.validate({ id: "bad-id" }).error).toBeDefined();
  });
});
