## Install dependencies

This project depends on yarn. See [Yarn installation](https://classic.yarnpkg.com/en/docs/install).

## Available Scripts

In the project directory, you can run:

### `yarn install`

Installs the Javascript dependencies of the project.

### `yarn audit`

Audits installed Javascript dependencies for vulnerabilities.\
Use `yarn run audit` when running on CI infrastructure.

### `yarn depends TEST=0`

Invokes the dependency build system and installs built depends.
Omit `TEST=0` to also run the test cases for depends.

### `yarn compile`

Compiles the smart contracts. Required for test cases.

### `yarn create-metadata`

Creates metadata files from src/locales/[lang]/cards.json files.

### `yarn start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `yarn build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `yarn test`

Runs the unit tests for the project.

Also launches the test runner for React tests.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `yarn format`

Applies automated formatting tools (prettier, eslint).

### `yarn lint`

Runs linting tools for the project.

### `yarn local-node`

Launches a local Ethereum VM for testing.

### `yarn hardhat:deploy`

Performs a test deployment on a temporary network. This causes `addresses.json` to be generated.

Contracts can be deployed on the following networks:

- `yarn local:deploy`
- `yarn rinkeby:deploy`
- `yarn ropsten:deploy`
- `yarn kovan:deploy`
- `yarn goerli:deploy`

### `yarn <network>:verify`

Verifies contracts with Etherscan on the given network.
Set the `ETHERSCAN_API_KEY` variable in your .env file.
Contracts can be verified on the following networks:

- `yarn rinkeby:verify`
- `yarn ropsten:verify`
- `yarn kovan:verify`
- `yarn goerli:verify`

## Deployment script naming scheme

Deployment scripts are executed by Hardhat in lexicographic order. Number
prefixes are used to control deployment order, with the following ranges
defined here:

- 000-099: Dependency contracts
- 100: Token contract
- 101-199: Dapp contracts
