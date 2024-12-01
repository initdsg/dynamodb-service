import {
    DeleteCommand,
    QueryCommand,
    QueryCommandInput,
    ScanCommand,
    ScanCommandInput,
    UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { ServiceError } from "./ServiceError";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

export type SaveOptions<T> = {
    hashKey: keyof T;
    rangeKey?: keyof T;
    obj: Partial<T>;
};

export type GetOptions<T> = {
    index?: string;
    order?: "asc" | "dsc";
    limit?: number;
    hashKey: keyof T;
    hashKeyValue: unknown;
    rangeKey?: keyof T;
    rangeKeyValue?: unknown;
};

export type ListOptions = {
    limit?: number;
    filters?: Record<string, any>;
};

export type DeleteOptions<H, R> = {
    hashKey: string;
    hashKeyValue: H;
    rangeKey?: string;
    rangeKeyValue?: R;
};

export type AbstractServiceOptions = {
    dynamoDBClient?: DynamoDBClient;
};

export abstract class AbstractService<T extends object> {
    abstract tableName: string;
    private dynamoDBClient: DynamoDBClient;

    constructor(options?: AbstractServiceOptions) {
        this.dynamoDBClient = options?.dynamoDBClient || new DynamoDBClient();
    }

    protected async _save({
        hashKey,
        rangeKey,
        obj,
    }: SaveOptions<T>): Promise<T> {
        const properties = Object.keys(obj);

        // Remove hashKey and rangeKey from properties
        const hashKeyIndex = properties.indexOf(hashKey as string);
        if (hashKeyIndex > -1) {
            properties.splice(hashKeyIndex, 1);
        }

        if (rangeKey) {
            const rangeKeyIndex = properties.indexOf(rangeKey as string);
            if (rangeKeyIndex > -1) {
                properties.splice(rangeKeyIndex, 1);
            }
        }

        const updateExpression = properties.reduce(
            (acc, property) => `${acc} #${property} = :${property},`,
            "SET"
        );
        const keys = {
            [hashKey as string]: obj[hashKey as keyof T],
        };
        if (rangeKey) {
            keys[rangeKey as string] = obj[rangeKey as keyof T];
        }
        const expressionAttributeNames = properties.reduce((acc, property) => {
            return {
                ...acc,
                [`#${property}`]: property,
            };
        }, {});
        const expressionAttributeValues = properties.reduce((acc, property) => {
            return {
                ...acc,
                [`:${property}`]: obj[property as keyof T],
            };
        }, {});
        const updateCommand = new UpdateCommand({
            TableName: this.tableName,
            Key: keys,
            UpdateExpression: `
                ${updateExpression}
                #lastUpdated = :lastUpdated
            `,
            ExpressionAttributeNames: {
                ...expressionAttributeNames,
                "#lastUpdated": "lastUpdated",
            },
            ExpressionAttributeValues: {
                ...expressionAttributeValues,
                ":lastUpdated": new Date().getTime(),
            },
            ReturnValues: "ALL_NEW",
        });

        const { Attributes: item } =
            await this.dynamoDBClient.send(updateCommand);

        return item as T;
    }

    async _query({
        index,
        order,
        limit,
        hashKey,
        hashKeyValue,
        rangeKey,
        rangeKeyValue,
    }: GetOptions<T>): Promise<T[]> {
        const keys = {
            [hashKey as string]: hashKeyValue,
        };
        if (rangeKey && rangeKeyValue) {
            keys[rangeKey as string] = rangeKeyValue;
        }

        let KeyConditionExpression = `#${String(hashKey)} = :${String(hashKey)}`;
        if (rangeKey && rangeKeyValue) {
            KeyConditionExpression = `${KeyConditionExpression} and #${String(
                rangeKey
            )} = :${String(rangeKey)}`;
        }

        let ExpressionAttributeNames = {
            [`#${String(hashKey)}`]: hashKey,
        } as Record<string, string>;

        let ExpressionAttributeValues = {
            [`:${String(hashKey)}`]: hashKeyValue,
        };

        if (rangeKey && rangeKeyValue) {
            ExpressionAttributeNames = {
                ...ExpressionAttributeNames,
                [`#${String(rangeKey)}`]: rangeKey,
            } as Record<string, string>;

            ExpressionAttributeValues = {
                ...ExpressionAttributeValues,
                [`:${String(rangeKey)}`]: rangeKeyValue,
            };
        }

        const queryCommandInput: QueryCommandInput = {
            TableName: this.tableName,
            KeyConditionExpression,
            ExpressionAttributeNames,
            ExpressionAttributeValues,
            Limit: limit,
        };

        if (order) {
            queryCommandInput.ScanIndexForward = order === "asc";
        }

        if (index) {
            queryCommandInput.IndexName = index;
        }

        const getCommand = new QueryCommand(queryCommandInput);

        const { Items } = await this.dynamoDBClient.send(getCommand);

        return (Items as T[]) || [];
    }

    /**
     * Queries a Table according to a start and end value for the range key.
     * Start and end inclusive. You can fetch a single item by providing identical values for the start and end values.
     * The hash key must be provided.
     * Throws an error if the start value is larger than the end value when compared with '>'.
     * @param param0 Same as GetOptions, but the rangeKeyValue is replaced by rangeKeyStartValue and rangeKeyEndValue.
     * @returns An array of items retrieved from the table, with range key values equal to and between the given arguments.
     */
    async _queryBetween({
        index,
        hashKey,
        hashKeyValue,
        rangeKey,
        rangeKeyStartValue,
        rangeKeyEndValue,
    }: GetOptions<T> & {
        rangeKeyStartValue: unknown;
        rangeKeyEndValue: unknown;
    }): Promise<T[]> {
        const keys = {
            [hashKey as string]: hashKeyValue,
        };
        if (rangeKey && rangeKeyStartValue && rangeKeyEndValue) {
            keys[rangeKeyStartValue as string] = rangeKeyStartValue;
            keys[rangeKeyEndValue as string] = rangeKeyEndValue;

            if (rangeKeyStartValue > rangeKeyEndValue) {
                throw new ServiceError(
                    "QueryBetween start value is greater than end value"
                );
            }
        }

        let KeyConditionExpression = `#${String(hashKey)} = :${String(hashKey)}`;
        if (rangeKey && rangeKeyStartValue) {
            KeyConditionExpression = `${KeyConditionExpression} and #${String(
                rangeKey
            )} between :startValue and :endValue`;
        }

        let ExpressionAttributeNames = {
            [`#${String(hashKey)}`]: hashKey,
        } as Record<string, string>;

        let ExpressionAttributeValues = {
            [`:${String(hashKey)}`]: hashKeyValue,
        };

        if (rangeKey && rangeKeyStartValue && rangeKeyEndValue) {
            ExpressionAttributeNames = {
                ...ExpressionAttributeNames,
                [`#${String(rangeKey)}`]: rangeKey,
            } as Record<string, string>;

            ExpressionAttributeValues = {
                ...ExpressionAttributeValues,
                [`:startValue`]: rangeKeyStartValue,
                [`:endValue`]: rangeKeyEndValue,
            };
        }

        const queryCommandInput: QueryCommandInput = {
            TableName: this.tableName,
            KeyConditionExpression,
            ExpressionAttributeNames,
            ExpressionAttributeValues,
        };

        if (index) {
            queryCommandInput.IndexName = index;
        }

        const getCommand = new QueryCommand(queryCommandInput);

        const { Items } = await this.dynamoDBClient.send(getCommand);

        return (Items as T[]) || [];
    }

    /**
     * get(options) returns the first item.
     */
    protected async _get(options: GetOptions<T>): Promise<T | null> {
        const items = await this._query(options);

        if (!items || items.length === 0) {
            return null;
        }

        return items[0] as T;
    }

    /**
     * getAll(table) returns all items.
     */
    public async getAll(): Promise<T[]> {
        return await this._list({});
    }

    protected async _list({ filters, limit }: ListOptions): Promise<T[]> {
        const scanCommandParams: ScanCommandInput = {
            TableName: this.tableName,
            Limit: limit,
        };

        if (filters && Object.keys(filters).length > 0) {
            scanCommandParams.FilterExpression = Object.keys(filters)
                .map((filter) => `#${filter} = :${filter}`)
                .join(" AND ");
            scanCommandParams.ExpressionAttributeNames = Object.keys(
                filters
            ).reduce((acc, filter) => {
                return {
                    ...acc,
                    [`#${filter}`]: filter,
                };
            }, {});
            scanCommandParams.ExpressionAttributeValues = Object.keys(
                filters
            ).reduce((acc, filter) => {
                return {
                    ...acc,
                    [`:${filter}`]: filters[filter],
                };
            }, {});
        }

        const scanCommand = new ScanCommand(scanCommandParams);
        const results: T[] = [];

        do {
            const { Items, LastEvaluatedKey } =
                await this.dynamoDBClient.send(scanCommand);

            if (Items) {
                const items = Items as T[];
                results.push(...items);
            }

            if (limit) {
                if (results.length > limit) {
                    results.splice(0, limit);
                }

                if (results.length >= limit) {
                    break;
                }
            }

            scanCommand.input.ExclusiveStartKey = LastEvaluatedKey;
        } while (scanCommand.input.ExclusiveStartKey);

        return results;
    }

    protected async _delete<H, R>({
        hashKey,
        hashKeyValue,
        rangeKey,
        rangeKeyValue,
    }: DeleteOptions<H, R>): Promise<void> {
        const keys: Record<string, H | R> = {
            [hashKey]: hashKeyValue,
        };
        if (rangeKey && rangeKeyValue) {
            keys[rangeKey] = rangeKeyValue;
        }

        const deleteCommand = new DeleteCommand({
            TableName: this.tableName,
            Key: keys,
        });
        await this.dynamoDBClient.send(deleteCommand);
    }
}
