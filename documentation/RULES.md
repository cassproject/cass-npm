# Coding Rules and Standards

## Development Guidelines
1. **Asynchronous First**: All blocking calls are deprecated. New functions must use Promises or `async/await`.
2. **Backward Compatibility**: Maintain compatibility with existing CaSS servers (1.2+).
3. **Environment Agnostic**: Code must run in both Node.js and Browser environments.
4. **Testing**: 
   - New features must include tests in `src/test/` or corresponding `.test.js` files.
   - Comprehensive cross-version testing is performed using Docker images.

## Linting and Style
The project uses ESLint to enforce coding standards. Key rules include:
- **Indent**: Tab-based indentation (or consistent 4 spaces as configured).
- **Braces**: "One True Brace Style" (1TBS).
- **Complexity**: Maximum line length of 2400 characters (accommodating for schema-heavy data).
- **Semantics**: Semicolons are required.
- **CamelCase**: Enforced for property names.

## Cryptographic Standards
- Prefer SHA-256 for signatures.
- Support SHA-1 only for legacy verification where necessary.
- FIPS mode must be respected if enabled in the environment.

## Documentation
- API documentation is generated using `yuidoc`.
- Use JSDoc-style comments for functions and classes.

## Versioning
- Use semantic versioning (e.g., 1.2.3).
- Update version numbers in `package.json` and `README.md`.

## Security
- Use secure coding practices.
- Implement proper input validation and sanitization.
- Use secure authentication and authorization mechanisms.
- Use secure communication channels (e.g., HTTPS).

## Performance
- Optimize code for performance.
- Use caching where appropriate.
- Use lazy loading for modules and resources.

## Agents
- The test15 and test16 related scripts in the package.json file are used to test the code in different environments like CaSS 1.5, CaSS 1.6, not node 15 or node 16. Those are further down in the file.