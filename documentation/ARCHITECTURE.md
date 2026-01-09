# Architecture

## System Overview
The CaSS Library is organized into a modular structure that separates concern between data models, remote repository interaction, and cryptographic operations.

## Directory Structure
- `src/`: Root directory for source code.
  - `com/eduworks/`: eduworks-specific core logic.
    - `ec/`: Core framework and utility classes.
      - `crypto/`: Cryptographic implementations and workers.
      - `graph/`: Competency and framework graph processing.
      - `remote/`: Repository communication logic.
    - `schema/`: Object models for Schema.org types.
  - `org/`: Standardized organization-level data models.
    - `cassproject/`: CaSS-specific data structures.
    - `credentialengine/`: Credential Engine / CTDL implementations.
    - `schema/`: Standardized schema models.
  - `test/`: Unit and integration tests.
- `docker/`: Dockerfiles for testing against various Node.js and environment configurations.
- `index.js`: Main entry point for the library.

## Key Components
### 1. Repository Management (`EcRepository`)
Handles connectivity to CaSS servers, searching, fetching, and persisting data.

### 2. Identity Management (`EcIdentityManager`)
Manages user identities and cryptographic keys for signing and encrypting data.

### 3. Competency Graph (`EcFrameworkGraph`)
Calculates relationships between competencies, including implications and assertions.

### 4. Cryptographic Workers
Utilizes web workers to perform heavy cryptographic operations (RSA/AES) asynchronously, preventing UI blocking or main thread lag.
