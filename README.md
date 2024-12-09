# DynamoDB Service Package

A TypeScript-friendly wrapper for AWS DynamoDB that simplifies common database
operations with type safety and clean abstractions.

## Features

- Type-safe operations with TypeScript generics
- Simplified CRUD operations
- Batch operations support
- Query and Scan operations with filters
- Support for tables with composite keys (hash + range)
- Index querying support
- Automatic batch processing for large operations

## Installation

```bash
yarn add @initd.sg/dynamodb-service
```

## Usage

### Creating a Service

Create a service by extending the `AbstractService` class:

```typescript
interface User {
    userId: string;
    email: string;
    name: string;
    createdAt: number;
}

class UserService extends AbstractService<User> {
    tableName = "Users";

    save(user: User) {
        await userService._save({
            hashKey: "userId",
            obj: user,
        });
    }

    get(id: string) {
        return this._get({
            hashKey: "userId",
            hashKeyValue: "123"
        })
    }

    getWithRange(id: string, createAt: number) {
        return this._get({
            hashKey: "userId",
            hashKeyValue: id,
            rangeKey: "createdAt",
            rangeKeyValue: createdAt,
        })
    }

    query(opt: GetOptions) {
        return this._query(opts);
    }

    queryBetween(opt: GetOptions & { rangeKeyStartValue: number, rangeKeyEndValue: number }) {
        return this._queryBetween(opts);
    }

    batchGet(items: BatchGetOptions) {
        return this._batchGet(items);
    }

    list(opts: ListOptions) {
        return this._list(opts);
    }

    delete(id: string) {
        return this._delete({
            hashKey: "userId",
            hashKeyValue: id
        });
    }

    paginate(opts: PaginateOptions) {
        return this._paginate(opts);
    }
}
```

### Basic Operations

#### Save an Item

```typescript
const userService = new UserService();

await userService.save({
    userId: "123",
    email: "john@example.com",
    name: "John Doe",
    createdAt: Date.now()
});
```

#### Get an Item

```typescript
// Get by hash key
const user = await userService.get("123");

// Get by hash key and range key
const user = await userService.getWithRange("123", 1234567890);
```

#### Query Items

```typescript
// Basic query
const users = await userService.query({
    hashKey: "userId",
    hashKeyValue: "123"
});

// Query with index
const users = await userService.query({
    index: "email-index",
    hashKey: "email",
    hashKeyValue: "john@example.com"
});

// Query with ordering and limit
const users = await userService.query({
    hashKey: "userId",
    hashKeyValue: "123",
    order: "dsc",
    limit: 10
});
```

#### Query Between Range Values

```typescript
const users = await userService.queryBetween({
    hashKey: "userId",
    hashKeyValue: "123",
    rangeKey: "createdAt",
    rangeKeyStartValue: 1234567890,
    rangeKeyEndValue: 1234567899
});
```

#### Batch Get Items

```typescript
const users = await userService.batchGet({
    items: [
        { hashKey: "userId", hashKeyValue: "123" },
        { hashKey: "userId", hashKeyValue: "456" }
    ]
});
```

#### List Items

```typescript
// Get all items
const allUsers = await userService.getAll();

// List with filters
const filteredUsers = await userService.list({
    filters: {
        status: "active"
    },
    limit: 10
});
```

#### Delete an Item

```typescript
await userService.delete("userId");
```

#### Paginate Items

```typescript
// fetch first page
const { items, lastEvaluatedKeys } = await userService.paginate({
    limit: 10,
});

// fetch the next page
await userService.paginate({
    limit: 10,
    lastEvaluatedKeys,
});
```

## Configuration

You can provide your own DynamoDB client instance:

```typescript
const customClient = new DynamoDBClient({
    region: 'us-east-1',
    credentials: {
        accessKeyId: 'YOUR_ACCESS_KEY',
        secretAccessKey: 'YOUR_SECRET_KEY'
    }
});

const userService = new UserService({ dynamoDBClient: customClient });
```

## API Reference

### AbstractService<T>

Base class that provides all DynamoDB operations. Generic type `T` represents the shape of your table items.

#### Methods

- `_save(options: SaveOptions<T>): Promise<T>`
- `_get(options: GetOptions<T>): Promise<T | null>`
- `_query(options: GetOptions<T>): Promise<T[]>`
- `_queryBetween(options: GetOptions<T> & {rangeKeyStartValue, rangeKeyEndValue}): Promise<T[]>`
- `_batchGet(options: BatchGetOptions<T>): Promise<T[]>`
- `_list(options: ListOptions): Promise<T[]>`
- `getAll(): Promise<T[]>`
- `_delete(options: DeleteOptions<H, R>): Promise<void>`
- `_paginate(options: PaginateOptions): Promise<{ items: T[], lastEvaluatedKey: Record<string, any> }>`

## License

MIT

## Related article

https://medium.com/@initd.sg/dynamodb-made-easy-simplifying-dynamodb-interactions-using-initd-sg-dynamodb-service-0a53a1a00c3c
