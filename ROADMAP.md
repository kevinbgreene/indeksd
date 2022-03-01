## Planned Features

- **Range types** - The ability to define a range of types with a shorthand operator.

For example:

```
type OneToTen = 1..10;
```

Would expand to:

```
type OneToTen = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
```
