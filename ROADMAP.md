## Planned Features

- **Pagination** Method for easy pagination of query results.

Sketch of an API...

```
const page = db.posts.page('id').isGreaterThan(4).size(10);
cosnt pageOne: Array<PostsWithJoins> = page.next();
cosnt pageTwo: Array<PostsWithJoins> = page.next();
cosnt pageThree: Array<PostsWithJoins> = page.next();

const hasMore: boolean = page.hasMore();
```

- **Version Enforcement and Data Migration** Compare schema changes to enforce bumping the database version when necessary. Possibly use a cache file or directory that could be committed to the repository to keep data needed to compare. Or use checksums in the generated files.

- **Schema Validation and Improved Debugging** Current debugging experience isn't great and it's possible to generate schemas that really shouldn't be valid. These errors appear at various times in the build process (some falling to TypeScript compilation) when they should be displayed to the user earlier with code pointers and suggestions.

Create a validator and debugger that will show the user exactly where an error occurred (without confusion stack trace) and suggest how to fix it.

- **Support Defaults** Ability to declare defaults in the schema.

```
database TodoDatabase {
  table Todos {
    @autoincrement id: number;
    name: string;
    complete: boolean = false;
  }
}
```

- **Cursor Support**

- **Advanced Search** Support applying more complex predicates to table searches.

- **Support Session and Local Storage** Could expand the schema to enable creation of type safe clients to store data in session and local storage. There would be different constraints, needing to be able to stringify objects as opposed to structured clone.

Maybe something like...

```
session Todos = Array<{
  name: string;
  complete: boolean;
}>;
```

- **Support Complex TypeScript Types** In the current form schemas can contain any JavaScript primitive type, anything that conforms to a TypeScript `TypeReferenceNode` with type parameters, object literal types and tuple types. This leaves out things like mapped types and conditional types.
