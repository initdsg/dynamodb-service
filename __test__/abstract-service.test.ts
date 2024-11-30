import { faker } from "@faker-js/faker";
import {
    testService,
    setup,
    createTestTable,
    createTestRangeTable,
    deleteTestTable,
    deleteTestRangeTable,
    testRangeService,
    TestRange,
} from "./setup";

beforeAll(async () => {
    await createTestTable();
    await createTestRangeTable();
});

afterAll(async () => {
    await deleteTestTable();
    await deleteTestRangeTable();
});

describe("TestTable", () => {
    it("_getAll(): should get all objects", async () => {
        const count = faker.number.int({ min: 2, max: 10 });

        for (let i = 0; i < count; i++) {
            const { testModel } = setup();
            await testService.save(testModel);
        }

        const results = await testService.getAll();

        expect(results.length).toBeGreaterThanOrEqual(count);
    });

    it("_save(): should save object", async () => {
        const { testModel } = setup();

        const result = await testService.save(testModel);

        expect(result).toEqual(expect.objectContaining(testModel));
    });

    it("_get(): should get object", async () => {
        const { testModel } = setup();

        await testService.save(testModel);

        const result = await testService.get(testModel.id);

        expect(result).toEqual(expect.objectContaining(testModel));
    });

    it("_delete(): should delete object", async () => {
        const { testModel } = setup();

        await testService.save(testModel);

        const result = await testService.get(testModel.id);

        expect(result).toEqual(expect.objectContaining(testModel));

        await testService.delete(testModel.id);

        expect(testService.get(testModel.id)).resolves.toBeNull();
    });

    it("_list(): should find matching object", async () => {
        const { testModel } = setup();
        await testService.save(testModel);

        // fill up some data with other names
        for (let i = 0; i < 10; i++) {
            const { testModel: obj } = setup();

            // ensure that the name is not the same as the testModel
            if (obj.name === testModel.name) {
                continue;
            }

            await testService.save(obj);
        }

        // find by name
        const result = await testService.list(testModel.name);

        expect(result.length).toEqual(1);
        expect(result[0]).toEqual(expect.objectContaining(testModel));
    });

    it("_list(): should find matching objects with same field value", async () => {
        const { testModel } = setup();

        const count = faker.number.int({ min: 2, max: 10 });

        // fill up some data with same names
        for (let i = 0; i < count; i++) {
            const { testModel: obj } = setup();

            obj.name = testModel.name;
            await testService.save(obj);
        }

        // find by name
        const result = await testService.list(testModel.name);

        expect(result.length).toEqual(count);
        expect(result.every((model) => model.name === testModel.name)).toEqual(
            true
        );
    });

    it("_list(): should find matching objects with same field value with limit", async () => {
        const { testModel } = setup();

        const count = faker.number.int({ min: 2, max: 10 });

        // fill up some data with same names
        for (let i = 0; i < count; i++) {
            const { testModel: obj } = setup();

            obj.name = testModel.name;
            await testService.save(obj);
        }

        // find by name
        const result = await testService.list(testModel.name, 1);

        expect(result.length).toEqual(1);
        expect(result.every((model) => model.name === testModel.name)).toEqual(
            true
        );
    });
});

describe("TestTableIndex", () => {
    it("_get(): should get object from GSI", async () => {
        const { testModel } = setup();

        await testService.save(testModel);

        const result = await testService.getBySecondId(testModel.secondId);

        expect(result).toEqual(expect.objectContaining(testModel));
    });
});

describe("TestRangeTable", () => {
    it("_save(): should save object", async () => {
        const { testRangeModel } = setup();

        const result = await testRangeService.save(testRangeModel);

        expect(result).toEqual(expect.objectContaining(testRangeModel));
    });

    it("_get(): should get object", async () => {
        const { testRangeModel } = setup();

        await testRangeService.save(testRangeModel);

        const result = await testRangeService.get(testRangeModel.id);

        expect(result).toEqual(expect.objectContaining(testRangeModel));
    });

    it("_delete(): should delete object", async () => {
        const { testRangeModel } = setup();

        await testRangeService.save(testRangeModel);

        const result = await testRangeService.get(
            testRangeModel.id,
            testRangeModel.secondId
        );

        expect(result).toEqual(expect.objectContaining(testRangeModel));

        await testRangeService.delete(
            testRangeModel.id,
            testRangeModel.secondId
        );

        expect(
            testRangeService.get(testRangeModel.id, testRangeModel.secondId)
        ).resolves.toBeNull();
    });

    it("_get(): should get object with range key", async () => {
        const { testRangeModel } = setup();
        const testRangeModels: TestRange[] = [];

        for (let i = 0; i < 10; i++) {
            const obj = { ...testRangeModel, secondId: i };
            testRangeModels.push(obj);
            await testRangeService.save(obj);
        }

        const randomTestRangeModel =
            faker.helpers.arrayElement(testRangeModels);

        const result = await testRangeService.get(
            randomTestRangeModel.id,
            randomTestRangeModel.secondId
        );

        expect(result).toEqual(expect.objectContaining(randomTestRangeModel));
    });

    it("_query(): should get objects in descending order", async () => {
        const { testRangeModel } = setup();
        const testRangeModels: TestRange[] = [];

        for (let i = 0; i < 10; i++) {
            const obj = { ...testRangeModel, secondId: i };
            testRangeModels.push(obj);
            await testRangeService.save(obj);
        }

        const results = await testRangeService.query(testRangeModel.id, "dsc");

        expect(results.length).toEqual(testRangeModels.length);

        // sort descending
        testRangeModels.sort((a, b) => b.secondId - a.secondId);

        for (let i = 0; i < 10; i++) {
            const result = results[i];
            const testRangeModel = testRangeModels[i];

            expect(result).toEqual(expect.objectContaining(testRangeModel));
        }
    });

    it("_query(): should get objects in ascending order by default", async () => {
        const { testRangeModel } = setup();
        const testRangeModels: TestRange[] = [];

        for (let i = 0; i < 10; i++) {
            const obj = { ...testRangeModel, secondId: i };
            testRangeModels.push(obj);
            await testRangeService.save(obj);
        }

        const results = await testRangeService.query(testRangeModel.id);

        expect(results.length).toEqual(testRangeModels.length);

        for (let i = 0; i < 10; i++) {
            const result = results[i];
            const testRangeModel = testRangeModels[i];

            expect(result).toEqual(expect.objectContaining(testRangeModel));
        }
    });

    it("_query(): should get objects in ascending order", async () => {
        const { testRangeModel } = setup();
        const testRangeModels: TestRange[] = [];

        for (let i = 0; i < 10; i++) {
            const obj = { ...testRangeModel, secondId: i };
            testRangeModels.push(obj);
            await testRangeService.save(obj);
        }

        const results = await testRangeService.query(testRangeModel.id, "asc");

        expect(results.length).toEqual(testRangeModels.length);

        for (let i = 0; i < 10; i++) {
            const result = results[i];
            const testRangeModel = testRangeModels[i];

            expect(result).toEqual(expect.objectContaining(testRangeModel));
        }
    });

    it("_query(): should get objects with limit", async () => {
        const { testRangeModel } = setup();
        const testRangeModels: TestRange[] = [];

        for (let i = 0; i < 10; i++) {
            const obj = { ...testRangeModel, secondId: i };
            testRangeModels.push(obj);
            await testRangeService.save(obj);
        }

        const limit = faker.number.int({ min: 1, max: 8 });
        const results = await testRangeService.query(
            testRangeModel.id,
            "asc",
            limit
        );

        expect(results.length).toEqual(limit);

        for (let i = 0; i < limit; i++) {
            const result = results[i];
            const testRangeModel = testRangeModels[i];

            expect(result).toEqual(expect.objectContaining(testRangeModel));
        }
    });

    it("_queryBetween(): should query between objects", async () => {
        const { testRangeModel } = setup();
        const testRangeModels: TestRange[] = [];

        for (let i = 0; i < 100; i++) {
            const obj = { ...testRangeModel, secondId: i };
            testRangeModels.push(obj);
            await testRangeService.save(obj);
        }

        const min = faker.number.int({ min: 0, max: 20 });
        const max = faker.number.int({ min: 80, max: 100 });
        const results = await testRangeService.queryBetween(
            testRangeModel.id,
            min,
            max
        );

        const selectedRangeModels = testRangeModels.slice(min, max + 1);
        expect(results.length).toEqual(selectedRangeModels.length);

        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const testRangeModel = selectedRangeModels[i];

            expect(result).toEqual(expect.objectContaining(testRangeModel));
        }
    });

    it("_list(): should find matching object", async () => {
        const { testRangeModel } = setup();
        await testRangeService.save(testRangeModel);

        // fill up some data with other names
        for (let i = 0; i < 10; i++) {
            const { testRangeModel: obj } = setup();

            // ensure that the name is not the same as the testModel
            if (obj.name === testRangeModel.name) {
                continue;
            }

            await testRangeService.save(obj);
        }

        // find by name
        const result = await testRangeService.list(testRangeModel.name);

        expect(result.length).toEqual(1);
        expect(result[0]).toEqual(expect.objectContaining(testRangeModel));
    });

    it("_list(): should find matching objects with same field value", async () => {
        const { testRangeModel } = setup();

        const count = faker.number.int({ min: 2, max: 10 });

        // fill up some data with same names
        for (let i = 0; i < count; i++) {
            const { testRangeModel: obj } = setup();

            obj.name = testRangeModel.name;
            await testRangeService.save(obj);
        }

        // find by name
        const result = await testRangeService.list(testRangeModel.name);

        expect(result.length).toEqual(count);
        expect(
            result.every((model) => model.name === testRangeModel.name)
        ).toEqual(true);
    });

    it("_list(): should find matching objects with same field value with limit", async () => {
        const { testRangeModel } = setup();

        const count = faker.number.int({ min: 2, max: 10 });

        // fill up some data with same names
        for (let i = 0; i < count; i++) {
            const { testRangeModel: obj } = setup();

            obj.name = testRangeModel.name;
            await testRangeService.save(obj);
        }

        // find by name limit to 1
        const result = await testRangeService.list(testRangeModel.name, 1);

        expect(result.length).toEqual(1);
        expect(
            result.every((model) => model.name === testRangeModel.name)
        ).toEqual(true);
    });
});
