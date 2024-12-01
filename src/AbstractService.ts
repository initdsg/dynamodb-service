import {
    BatchGetCommand,
    BatchGetCommandInput,
    DeleteCommand,
    GetCommand,
    GetCommandInput,
    QueryCommand,
    QueryCommandInput,
    ScanCommand,
    ScanCommandInput,
    UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { ServiceError } from "./ServiceError";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { chunk } from "./utils";

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

export type BatchGetOptions<T> = {
    items: {
        hashKey: keyof T;
        hashKeyValue: unknown;
        rangeKey?: keyof T;
        rangeKeyValue?: unknown;
    }[];
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

    /**
     * Saves an item to the table. This method creates a new item if it does not
     * exist, or updates an existing item. The update can be done partially,
     * where only the provided attributes are updated.
     */
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

        if (rangeKey != undefined) {
            const rangeKeyIndex = properties.indexOf(rangeKey as string);
            if (rangeKeyIndex > -1) {
                properties.splice(rangeKeyIndex, 1);
            }
        }

        const updateExpression = properties
            .map((property) => `#${property} = :${property}`)
            .join(",");

        const keys = {
            [hashKey.toString()]: obj[hashKey as keyof T],
        };

        if (rangeKey != undefined) {
            keys[rangeKey.toString()] = obj[rangeKey as keyof T];
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
            UpdateExpression: `SET ${updateExpression}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: "ALL_NEW",
        });

        const { Attributes: item } =
            await this.dynamoDBClient.send(updateCommand);

        return item as T;
    }

    /**
     * A more generic method to query a table. This method allows you to query
     * a table based on the hash key and range key. This method will if range
     * key is not provided for table with range key.
     */
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
     * Start and end inclusive. You can fetch a single item by providing
     * identical values for the start and end values. The hash key must be
     * provided. Throws an error if the start value is larger than the end value
     * when compared with '>'.
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

        if (
            rangeKey != undefined &&
            rangeKeyStartValue != undefined &&
            rangeKeyEndValue != undefined
        ) {
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
     * Fetches a single item from the table. This method is performant 0(1) as
     * it uses the `GetItem` API call (not for index since `GetItem` does not
     * work on indexes). `_get()` will throw an error if range key is not
     * provided for table with range key specified.
     */
    protected async _get(options: GetOptions<T>): Promise<T | null> {
        if (options.index) {
            const item = await this._query(options);
            return item[0] || null;
        }

        const getCommandInput: GetCommandInput = {
            TableName: this.tableName,
            Key: {
                [options.hashKey as string]: options.hashKeyValue,
            },
        };

        // loose check using == because options.rangeKey can be null or undefined
        if (
            options.rangeKey != undefined &&
            options.rangeKeyValue != undefined
        ) {
            getCommandInput.Key![options.rangeKey.toString()] =
                options.rangeKeyValue;
        }

        const command = new GetCommand(getCommandInput);
        const { Item } = await this.dynamoDBClient.send(command);

        return (Item as T) || null;
    }

    /**
     * Fetches multiple items from the table. This method is optimized in which
     * every 100 keys are batched under a single dynamodb request thus reducing
     * the number of calls to dynamodb.
     */
    protected async _batchGet(options: BatchGetOptions<T>): Promise<T[]> {
        const items = options.items.map((item) => {
            const keys: Record<string, unknown> = {
                [item.hashKey as string]: item.hashKeyValue,
            };

            if (item.rangeKey && item.rangeKeyValue) {
                keys[item.rangeKey as string] = item.rangeKeyValue;
            }

            return keys;
        });

        const LIMIT = 100; // DynamoDB limit
        const chunks = chunk(items, LIMIT);

        const results: T[] = [];

        for (const chunk of chunks) {
            const batchGetCommandInput: BatchGetCommandInput = {
                RequestItems: {
                    [this.tableName]: {
                        Keys: chunk,
                    },
                },
            };
            const batchGetCommand = new BatchGetCommand(batchGetCommandInput);
            const result = await this.dynamoDBClient.send(batchGetCommand);

            if (result.Responses) {
                const items = result.Responses[this.tableName] as T[];
                results.push(...items);
            }
        }

        return results;
    }

    /**
     * A simple method to get everything from the table. Use `_list()` under the
     * hood.
     */
    public async getAll(): Promise<T[]> {
        return await this._list({});
    }

    /**
     * Method to list items from the table. It's using
     * `ScanCommand` which can be expensive for large table.
     */
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

    /**
     * Deletes entry from the table.
     */
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
