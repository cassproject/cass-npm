# Coding Rules and Standards

This document outlines the coding standards, architecture, and conventions for the `cass-npm` library. Adherence to these rules ensures consistency and compatibility across both Browser and Node.js environments.

## 1. Architecture & Design Patterns

### 1.1 Class Naming
- Core library classes MUST be prefixed with `Ec` (e.g., `EcRepository`, `EcIdentityManager`, `EcPk`).
- Data models should follow the naming conventions of their respective schemas (e.g., `Competency`, `Framework`, `Assertion`).

### 1.2 Global Namespace
- Core library classes SHOULD be attached to the `global` object to ensure availability in legacy environments and simplified usage.
- Schema-specific objects are grouped under `global.schema` and `global.ce`.

### 1.3 Asynchronous Patterns
- **Asynchronous First**: All blocking calls are deprecated. New functions must use Promises or `async/await`.
- All asynchronous methods MUST support both **Promises** and **Callbacks**.
- Use the helper functions defined in `index.js` (or `com/eduworks/ec/promises/helpers.js`):
    - `cassPromisify(promise, success, failure)`: Converts a promise to support success/failure callbacks.
    - `cassReturnAsPromise(object, success, failure)`: Returns an object as a promise that also supports callbacks.

### 1.4 Compatibility
- **Backward Compatibility**: Maintain compatibility with existing CaSS servers (1.2+).
- **Environment Agnostic**: Code MUST run in both Node.js and Browser environments. Usage of environment-specific APIs MUST be guarded (e.g., `typeof window !== 'undefined'`).

## 2. Linked Data (JSON-LD)

- All objects intended for storage/retrieval from CaSS MUST inherit from `EcLinkedData` or `EcRemoteLinkedData`.
- **JSON-LD Fields**: While JSON-LD uses `@id`, `@type`, and `@context`, the library primarily uses `id`, `type`, and `context`. The mapping is handled during serialization by `EcLinkedData.atIfy()`.
- Use `getFullType()` to get the fully qualified type URI.

## 3. Cryptography & Security

- **Client-Side Cryptography**: Encryption and decryption are primarily handled on the client side.
- **EcIdentityManager**: Centralized management for cryptographic identities and signature sheet generation.
- **Standards**:
    - Prefer SHA-256 for signatures.
    - Support SHA-1 only for legacy verification where necessary.
    - FIPS mode must be respected if enabled in the environment.
- Private data should be handled via `EcEncryptedValue`.

## 4. Coding Style (Linting)

The project uses ESLint to enforce standards. Follow existing file conventions where ambiguity exists.

- **Semicolons**: Required.
- **Indentation**: Tab-based indentation (or consistent 4 spaces).
- **Braces**: "One True Brace Style" (1TBS).
- **Line Length**: Limit highly long lines (max 2400 characters for generated models, but keep human-written code concise).
- **CamelCase**: Use `camelCase` for variables and properties.
- **Trailing Spaces**: Forbidden.

## 5. Documentation

- Use JSDoc/YUIDoc style comments for all public classes and methods.
- Document modules using the `@module` tag.
- API documentation is generated using `yuidoc`.

## 6. Testing

- **Unit Tests**: Place in `src/test/` and use Mocha.
- **Integration Tests**: Large-scale tests against real CaSS instances should be run using the Docker setup defined in `docker/`.
- **Browser Testing**: Use Cypress for verifying functionality in the browser.

## 7. Licensing

- All code is licensed under **Apache-2.0**.
