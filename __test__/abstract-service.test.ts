import { testService, setup, createTable, deleteTable } from "./setup";

describe("AbstractService", () => {
    beforeAll(() => {
        createTable();
    });

    afterAll(() => {
        deleteTable();
    });

    it("should save", async () => {
        const { testModel } = setup();

        const result = await testService.save(testModel);

        expect(result).toEqual(expect.objectContaining(testModel));
    });
});
