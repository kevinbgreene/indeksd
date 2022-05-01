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
- --rootDir: Root directory for the project, used to resolve outDir and sourceDir if provided. Defaults to cwd.

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

A type is also generated for the objects stored in our object store. By default the type name is the same as the table name. However, if you want to define a different name you can use the @item annotation to define a name. In our example we called the table "Posts", but wanted items in the table to use the singular "Post".

For our example this would be generated as:

```
export type Post = {
  id: number;
  title: string;
  content: string;
  author: string;
};
```

You can import this type from the generated file.

```
import {init, Post} from './codegen/blog';
```

## Annotations

Annotations are used in the schema to further define the database we want.

Supported annotations:

- **@version** - Defined on the database to supply the version number.
- **@item** - Used on the table to define what name to use for a single item in a table. For example a "Posts" table could define each item as "Post".
- **@index** - Used on a field in a database to define that a given field should be an index. Takes an optional name argument that can be leveraged to define compound indexes.
- **@autoincrement** - Used on a field to say it should be autoincrement primary key.
- **@key** - Used on a field to define it as the primary key.
- **@unique** - Used on a field to declare that values of that field should be unique for each entry.

### Example Schema using above

```
database Blog @version(1) {
  table Posts @item("Post") {
    @autoincrement id: number;
    @index @index("title_author") @unique title: string;
    content: string;
    @index("title_author") author: string;
  }
}
```

This schema defines a Blog database with version 1. A table "Posts" where every entry in the table is a "Post". The primary key is the "id" field and it is an autoincrement field. Two indexes are defined, one "title" and one "title_author". The "title_author" index is a compound index allowing us to search by both the title and author fields. The title for each entry must also be unique.

## Automated Joins

IndexedDB is a document store meaning that it stores objects and not the tables we find in relational databases where join operations are common. In document stores sometimes we store redundant data in the name of keeping things simple. However, sometimes it does make sense to eliminate the redundancy.

Extending from our Blog example... let's say we want to store more information about our authors than name and we want the association between Posts and Authors.

We could create a table for "Authors" and then store the primary key of the Author for each item in our "Posts" table. That would look something like this:

```
database Blob {
  table Authors {
    @autoincrement id: number;
    firstName: string;
    lastName: string;
  }

  table Posts {
    @autoincrement id: number;
    title: string;
    content: string;
    author: number;
  }
}
```

Our generated client can automate some of this (with the intention of supporting more automation). Let's update our schema to look like this:

```
database Blob {
  table Authors @item("Author") {
    @autoincrement id: number;
    firstName: string;
    lastName: string;
  }

  table Posts {
    @autoincrement id: number;
    title: string;
    content: string;
    author: Author;
  }
}
```

You'll notice I changed the type of `author` in the "Posts" table to be "Author". I also added an item annotation to "Authors". I could have made the type of `author` to be "Authors", but the singular reads better. By defining the type of a field as another table I'm setting up a relationship between these two tables. When storing data a primary key to the "Authors" table will be stored in the `author` field in the "Posts" table. When performing a `get` the client will automatically fetch the author and merge the objects so the author field will actually hold the author object.

In the generated code there are two types created for `Posts`:

```
type Posts = {
  id: number;
  title: string;
  content: string;
  author: number;
};
type PostsWithJoins = {
  id: number;
  title: string;
  content: string;
  author: Author;
};
```

By default `get` operations will return the second object. You can disable this by setting `withJoins` to `false`. The `get` operations take an optional second argument that allows you to define some additional options for your query.

```
const postWithAuthor: PostsWithJoins = db.posts.get({id: 1});
const postWithoutAuthor: Posts = db.posts.get({id: 1}, {withJoins: false});
```

## Client Operations

Calling the exported `init` function returns our database client. This client currently only supports a subset of IndexedDB features.

### add

### put

### get

### getAll

### transaction
