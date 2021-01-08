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

Compiles the smart contracts.

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
