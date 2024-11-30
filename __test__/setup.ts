import {
    CreateTableCommand,
    DeleteTableCommand,
    DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import { AbstractService } from "../src/AbstractService";
import { faker } from "@faker-js/faker";

export interface Test {
    id: string; // hash key
    secondId: string; // index primary key
    name: string;
}

class TestService extends AbstractService<Test> {
    tableName = "Test";

    async save(sample: Test) {
        return await this._save({
            hashKey: "id",
            obj: sample,
        });
    }

    async get(id: string) {
        return await this._get({
            hashKey: "id",
            hashKeyValue: id,
        });
    }

    async getBySecondId(secondId: string) {
        return await this._get({
            index: "TestIndex",
            hashKey: "secondId",
            hashKeyValue: secondId,
        });
    }

    async delete(id: string) {
        return await this._delete({
            hashKey: "id",
            hashKeyValue: id,
        });
    }

    async list(name: string, limit = 100) {
        return await this._list({
            filters: { name },
            limit,
        });
    }
}

export interface TestRange {
    id: string; // hash key
    secondId: number; // range key
    name: string;
}

class TestRangeService extends AbstractService<TestRange> {
    tableName = "TestRange";

    async save(sample: TestRange) {
        return await this._save({
            hashKey: "id",
            rangeKey: "secondId",
            obj: sample,
        });
    }

    async get(id: string, secondId?: number) {
        if (secondId) {
            return await this._get({
                hashKey: "id",
                hashKeyValue: id,
                rangeKey: "secondId",
                rangeKeyValue: secondId,
            });
        }

        return await this._get({
            hashKey: "id",
            hashKeyValue: id,
        });
    }

    async query(id: string, order?: "asc" | "dsc", limit?: number) {
        return await this._query({
            hashKey: "id",
            hashKeyValue: id,
            order,
            limit,
        });
    }

    async queryBetween(id: string, min: number, max: number) {
        return await this._queryBetween({
            hashKey: "id",
            hashKeyValue: id,
            rangeKey: "secondId",
            rangeKeyStartValue: min,
            rangeKeyEndValue: max,
        });
    }

    async delete(id: string, secondId: number) {
        return await this._delete({
            hashKey: "id",
            hashKeyValue: id,
            rangeKey: "secondId",
            rangeKeyValue: secondId,
        });
    }

    async list(name: string, limit = 100) {
        return await this._list({
            filters: { name },
            limit,
        });
    }
}

const dynamoDBClient = new DynamoDBClient({
    region: "ap-southeast-1", // Region is required, even for local
    endpoint: "http://localhost:8000", // Local DynamoDB endpoint
    credentials: {
        accessKeyId: "NULL",
        secretAccessKey: "NULL",
    },
});

export async function createTestTable() {
    const command = new CreateTableCommand({
        TableName: "Test",
        AttributeDefinitions: [
            {
                AttributeName: "id",
                AttributeType: "S",
            },
            {
                AttributeName: "secondId",
                AttributeType: "S",
            },
        ],
        KeySchema: [
            {
                AttributeName: "id",
                KeyType: "HASH",
            },
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: "TestIndex",
                KeySchema: [
                    {
                        AttributeName: "secondId",
                        KeyType: "HASH",
                    },
                ],
                Projection: {
                    ProjectionType: "ALL",
                },
                ProvisionedThroughput: {
                    ReadCapacityUnits: 1,
                    WriteCapacityUnits: 1,
                },
            },
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1,
        },
    });

    await dynamoDBClient.send(command);
}

export async function createTestRangeTable() {
    const command = new CreateTableCommand({
        TableName: "TestRange",
        AttributeDefinitions: [
            {
                AttributeName: "id",
                AttributeType: "S",
            },
            {
                AttributeName: "secondId",
                AttributeType: "N",
            },
        ],
        KeySchema: [
            {
                AttributeName: "id",
                KeyType: "HASH",
            },
            {
                AttributeName: "secondId",
                KeyType: "RANGE",
            },
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1,
        },
    });

    await dynamoDBClient.send(command);
}

export async function deleteTestTable() {
    const command = new DeleteTableCommand({
        TableName: "Test",
    });

    await dynamoDBClient.send(command);
}

export async function deleteTestRangeTable() {
    const command = new DeleteTableCommand({
        TableName: "TestRange",
    });

    await dynamoDBClient.send(command);
}

export const testService = new TestService({ dynamoDBClient });
export const testRangeService = new TestRangeService({ dynamoDBClient });

export function setup() {
    const testModel: Test = {
        id: faker.string.uuid(),
        secondId: faker.string.uuid(),
        name: faker.person.fullName(),
    };

    const testRangeModel: TestRange = {
        id: faker.string.uuid(),
        secondId: faker.number.int(),
        name: faker.person.fullName(),
    };

    return { testModel, testRangeModel };
}
