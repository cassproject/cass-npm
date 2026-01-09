# Design Patterns and Principles

## Cryptographic Design
The library follows a "Privacy by Design" approach:
- **Client-Side Cryptography**: Encryption and decryption are primarily handled on the client side to ensure the server never sees unencrypted sensitive data (if configured).
- **Asynchronous Processing**: All cryptographic operations use the `EcCrypto` async wrappers, which delegate work to browser or node workers to maintain performance.
- **EcIdentityManager**: Centralized management for cryptographic identities, ensuring that keys are handled securely and paired with the correct data objects.

## Data Modeling
- **JSON-LD**: All objects transition to and from JSON-LD for data interoperability.
- **Type Hierarchies**: The library mirrors standard schema hierarchies (Schema.org, CTDL) using ECMAScript 6 classes.
- **Dynamic Recasting**: The library supports "recasting" objects into different types dynamically as more context (or more specific schema information) is obtained from the repository.

## Communication Patterns
- **Repository Abstraction**: Use of the `EcRepository` class to abstract away the details of HTTP/HTTPS/HTTP2 communication.
- **Caching (L2)**: Implementation of a persistent cache using IndexedDB (in browsers) to allow for offline-first capabilities or reduced network overhead during page reloads.
- **Batching**: Support for "multiput" and "precache" methods to reduce the number of individual network requests.

## Graph Theory
- **Implications and Assertions**: Relationships between competencies are modeled as a directed graph. The `EcFrameworkGraph` performs transitive closure and other graph operations to calculate competency achievement and gap analysis.
