## Planned Features

- **Key Ranges** Support typed IDBKeyRanges

- **Version Enforcement** Compare schema changes to enforce bumping the database version when necessary. Possibly use a cache file or directory that could be committed to the repository to keep data needed to compare. Or use checksums in the generated files.

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

- **Table Subscriptions** Support to subscribe to changes to a given table. Could be used to support a React hook for rendering content added to the table (for example).

- **Cursor Support**

- **Advanced Search** Support applying more complex predicates to table searches.

- **Sorting** Currently searching on an index will naturally sort by that index... Allow sorting by arbitrary fields.
