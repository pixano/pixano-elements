# Coding recommendations

### Git

#### Use standard semantic commit messages

| Tag      | Description                                                  |
| -------- | ------------------------------------------------------------ |
| Add      | Create a capability e.g. feature, test, dependency           |
| Cut      | Remove a capability e.g. feature, test, dependency           |
| Fix      | Fix an issue e.g. bug, typo, accident, misstatement          |
| Start    | Begin doing something; e.g. create a feature flag            |
| Stop     | End doing something; e.g. remove a feature flag              |
| Bump     | Increase the version of something e.g. dependency            |
| Test     | Add or refector anything regard test, e.g add a new testCases|
| Make     | Change the build process, or tooling, or infra               |
| Refactor | A code change that MUST be just a refactoring                |
| Reformat | Refactor of formatting, e.g. omit whitespace                 |
| Optimize | Refactor of performance, e.g. speed up code                  |
| Document | Refactor of documentation, e.g. help files                   |
| License  | Edits regarding licensing; no production code change         |
| Revert   | Change back to the previous commit                           |

#### Request a merge

When the code is ready for code review, please request a merge in github with comment 'Ready for code review' with the associated issue number.

### Code

#### Typescript

Please follow [tslint](https://palantir.github.io/tslint/) for your contributions:

```bash
npm run tslint
```

#### Comments

Remember to documenting the code using JSDoc style comments.