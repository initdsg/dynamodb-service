import { execSync } from "child_process";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { AbstractService } from "../src/AbstractService";
import { faker } from "@faker-js/faker";

interface Test {
    id: string;
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

export function createTable() {
    execSync(`
        aws dynamodb create-table \
            --table-name Test \
            --attribute-definitions AttributeName=id,AttributeType=S \
            --key-schema AttributeName=id,KeyType=HASH \
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
}

export const testService = new TestService({
    dynamoDBClient: new DynamoDBClient({
        region: "ap-southeast-1", // Region is required, even for local
        endpoint: "http://localhost:8000", // Local DynamoDB endpoint
        credentials: {
            accessKeyId: "dummy", // Dummy credentials for local use
            secretAccessKey: "dummy",
        },
    }),
});

export function setup() {
    const testModel: Test = {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
    };

    return { testModel };
}
