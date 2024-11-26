import { execSync } from "child_process";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { AbstractService } from "../src/AbstractService";
import { faker } from "@faker-js/faker";

export interface Test {
    id: string; // hash key
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
}

export interface TestRange {
    id: string; // hash key
    secondId: string; // range key
    name: string;
}

class TestRangeService extends AbstractService<TestRange> {
    tableName = "TestRange";

    async save(sample: Test) {
        return await this._save({
            hashKey: "id",
            rangeKey: "secondId",
            obj: sample,
        });
    }

    async get(id: string) {
        return await this._get({
            hashKey: "id",
            hashKeyValue: id,
        });
    }

    async getWithRange(id: string, secondId: string) {
        return await this._get({
            hashKey: "id",
            hashKeyValue: id,
            rangeKey: "secondId",
            rangeKeyValue: secondId,
        });
    }

    async query(id: string, order?: "asc" | "dsc") {
        return await this._query({
            hashKey: "id",
            hashKeyValue: id,
            order,
        });
    }
}

export function createTable() {
    execSync(`
        aws dynamodb create-table \
            --table-name Test \
            --attribute-definitions AttributeName=id,AttributeType=S \
            --key-schema AttributeName=id,KeyType=HASH \
            --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
            --endpoint-url http://localhost:8000
    `);

    execSync(`
        aws dynamodb create-table \
            --table-name TestRange \
            --attribute-definitions AttributeName=id,AttributeType=S AttributeName=secondId,AttributeType=S \
            --key-schema AttributeName=id,KeyType=HASH AttributeName=secondId,KeyType=RANGE\
            --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
            --endpoint-url http://localhost:8000
    `);
}

export function deleteTable() {
    execSync(`
        aws dynamodb delete-table \
            --table-name Test \
            --endpoint-url http://localhost:8000
    `);

    execSync(`
        aws dynamodb delete-table \
            --table-name TestRange \
            --endpoint-url http://localhost:8000
    `);
}

const dynamoDBClient = new DynamoDBClient({
    region: "ap-southeast-1", // Region is required, even for local
    endpoint: "http://localhost:8000", // Local DynamoDB endpoint
    credentials: {
        accessKeyId: "dummy", // Dummy credentials for local use
        secretAccessKey: "dummy",
    },
});

export const testService = new TestService({ dynamoDBClient });
export const testRangeService = new TestRangeService({ dynamoDBClient });

export function setup() {
    const testModel: Test = {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
    };

    const testRangeModel: TestRange = {
        id: faker.string.uuid(),
        secondId: faker.string.uuid(),
        name: faker.person.fullName(),
    };

    return { testModel, testRangeModel };
}
