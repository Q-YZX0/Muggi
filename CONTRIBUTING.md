# Contributing to Muggi

Thank you for your interest in contributing to Muggi! This document provides guidelines for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help create a welcoming environment for all contributors

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/Q-YZX0/Muggi/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Environment details (OS, Node version, etc.)

### Suggesting Features

1. Open an issue with the `enhancement` label
2. Describe the feature and its use case
3. Explain why it would be valuable
4. Be open to discussion and feedback

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Write clean, readable code
   - Follow existing code style
   - Add tests for new features
   - Update documentation as needed

4. **Test your changes**
   ```bash
   npm test
   cd web3 && npx hardhat test
   ```

5. **Commit your changes**
   ```bash
   git commit -m "feat: add amazing feature"
   ```
   Use conventional commits:
   - `feat:` new feature
   - `fix:` bug fix
   - `docs:` documentation
   - `test:` tests
   - `refactor:` code refactoring
   - `chore:` maintenance

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request**
   - Provide a clear description
   - Reference related issues
   - Wait for review

## Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL
- Git

### Setup Steps

```bash
# Clone your fork
git clone https://github.com/Q-YZX0/Muggi.git
cd muggi

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your settings

# Run migrations
npm run db:migrate

# Start development server
npm run dev
```

### Running Tests

```bash
# All tests
npm test

# Web3 contracts
cd web3
npx hardhat test

# Specific test
npx hardhat test test/AdManager.test.js
```

## Project Structure

```
muggi/
├── src/                    # Next.js application
│   ├── app/               # App router pages
│   ├── components/        # React components
│   └── lib/               # Utilities
├── web3/                  # Smart contracts
│   ├── contracts/         # Solidity files
│   ├── test/             # Contract tests
│   └── scripts/          # Deployment scripts
├── wara-node/            # P2P node
└── docs/                 # Documentation
```

## Coding Standards

### JavaScript/TypeScript
- Use TypeScript when possible
- Follow ESLint rules
- Use meaningful variable names
- Add JSDoc comments for functions

### Solidity
- Follow Solidity style guide
- Add NatSpec comments
- Write comprehensive tests
- Consider gas optimization

### Git Commits
- Use conventional commits
- Keep commits atomic
- Write descriptive messages

## Testing Guidelines

- Write tests for new features
- Maintain or improve coverage
- Test edge cases
- Mock external dependencies

## Documentation

- Update README.md if needed
- Add JSDoc/NatSpec comments
- Update API documentation
- Include examples

## Security

- **Never commit secrets** (keys, passwords, etc.)
- Use environment variables
- Report security issues privately
- Follow security best practices

## Questions?

- Open a [Discussion](https://github.com/Q-YZX0/Muggi/discussions)
- Check existing issues
- Read the documentation

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---
Thank you for contributing to Muggi! 🎉

---
*Created by the YZX0.*