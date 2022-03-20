# Indeksd

A DSL for defining IndexedDB schemas.

Generate a type-safe IndexedDB client from a simple schema file.

## Installation

```
npm i -D indeksd
```

## Usage

Define a schema for your database.

```
database Blog {
  table Posts @item("Post") {
    @autoincrement id: number;
    @index title: string;
    content: string;
    @index author: string;
  }
}
```

This schema would create a database named "Blog" with a single object store names "Posts". The object store would have an autoincrement primary key "id" and two indexes "title" and "author" to search by.

Codegen can be performed programatically or via the command line.

Via command line:

```
inkeksd --sourceDir schemas --outDir codegen blog.db
```

Available options:

- --outDir: Where to save generated files to, relative to current directory. Will be created if it doesn't exist. Defaults to './codegen'.
- --sourceDir: The directory to search for raw schema files.

Anything passed beyond these will be assumed to be source files. If a given source file can't be found relative to `sourceDir` an error will be thrown.

### Using the Generated Code

The generated code uses no external dependencies. It just requires an environment with `indexedDB` defined on `globalThis`.

```
import {init} from './codegen/blog';

const db = await init();

const postId = await db.posts.add({
  title: 'First Post',
  content: 'This is the first post.',
  author: 'Kevin',
});
```

Because our "Posts" table was defined with an autoincrement "id" field the input type to the "add" method is defined as `Omit<Post, 'id'>`. We do get the `postId` as the result of the `add` operation.

Then when we want to get, we can use either the primary key, or one of our indexes.

```
const result1 = db.posts.get(postId);
const result2 = db.posts.get({id: postId});
const result3 = db.posts.get({title: 'First Post'});
const result4 = db.posts.get({author: 'Kevin'});
```

Again the argument types here are all generated so we couldn't try to perform a get with a field not defined as an index without getting a type error.

For more clarity the argument type for the get operation of "Posts" object store would be generated as:

```
export type PostsGetArgs = number | {
  id: number;
} | {
  title: string;
} | {
  author: string;
};
```
