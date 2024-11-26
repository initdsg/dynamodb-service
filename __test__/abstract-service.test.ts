import { faker } from "@faker-js/faker";
import {
    testService,
    setup,
    createTable,
    deleteTable,
    testRangeService,
    TestRange,
} from "./setup";

describe("AbstractService", () => {
    beforeAll(() => {
        createTable();
    });

    afterAll(() => {
        deleteTable();
    });

    it("TestTable: should save object", async () => {
        const { testModel } = setup();

        const result = await testService.save(testModel);

        expect(result).toEqual(expect.objectContaining(testModel));
    });

    it("TestTable: should get object", async () => {
        const { testModel } = setup();

        await testService.save(testModel);

        const result = await testService.get(testModel.id);

        expect(result).toEqual(expect.objectContaining(testModel));
    });

    it("TestRangeTable: should save object", async () => {
        const { testRangeModel } = setup();

        const result = await testRangeService.save(testRangeModel);

        expect(result).toEqual(expect.objectContaining(testRangeModel));
    });

    it("TestRangeTable: should get object", async () => {
        const { testRangeModel } = setup();

        await testRangeService.save(testRangeModel);

        const result = await testRangeService.get(testRangeModel.id);

        expect(result).toEqual(expect.objectContaining(testRangeModel));
    });

    it("TestRangeTable: should get object with range key", async () => {
        const { testRangeModel } = setup();
        const testRangeModels: TestRange[] = [];

        for (let i = 0; i < 10; i++) {
            const obj = { ...testRangeModel, secondId: i.toString() };
            testRangeModels.push(obj);
            await testRangeService.save(obj);
        }

        const randomTestRangeModel =
            faker.helpers.arrayElement(testRangeModels);

        const result = await testRangeService.getWithRange(
            randomTestRangeModel.id,
            randomTestRangeModel.secondId
        );

        expect(result).toEqual(expect.objectContaining(randomTestRangeModel));
    });

    it("TestRangeTable: should get objects in descending order", async () => {
        const { testRangeModel } = setup();
        const testRangeModels: TestRange[] = [];

        for (let i = 0; i < 10; i++) {
            const obj = { ...testRangeModel, secondId: i.toString() };
            testRangeModels.push(obj);
            await testRangeService.save(obj);
        }

        const results = await testRangeService.query(testRangeModel.id);

        expect(results.length).toEqual(testRangeModels.length);

        // sort descending
        testRangeModels.sort(
            (a, b) => parseInt(b.secondId) - parseInt(a.secondId)
        );

        for (let i = 0; i < 10; i++) {
            const result = results[i];
            const testRangeModel = testRangeModels[i];

            expect(result).toEqual(expect.objectContaining(testRangeModel));
        }
    });

    it("TestRangeTable: should get objects in ascending order", async () => {
        const { testRangeModel } = setup();
        const testRangeModels: TestRange[] = [];

        for (let i = 0; i < 10; i++) {
            const obj = { ...testRangeModel, secondId: i.toString() };
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
});
