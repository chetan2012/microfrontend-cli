Detailed code for setting up a microfrontend architecture using Webpack Module Federation with React. The setup includes:

Host Application: The main app that loads microfrontends.
Remote Application: A separate microfrontend that exposes a component to be used by the host.


Add bin key in package.json

npm link


create-microfrontend create

react-microfrontend-tool

## Description

**react-microfrontend-tool** is a powerful command-line tool that helps you set up a micro frontend architecture using Webpack Module Federation with React. It automates the initial project setup, allowing you to focus on building your application.

## Features

- **Latest React Version**: Always uses the latest version of React.
- **Optimized Folder Structure**: Project structure based on best practices.
- **Webpack Setup**: Automatic Webpack configuration for development and production builds.

## Installation

### Global Installation

Install the CLI tool globally using npm:

```bash
npm install -g react-microfrontend-tool
```

### Local Installation

Alternatively, you can install it locally within your project:

```bash
npm install --save-dev react-microfrontend-tool
```

## Usage

After installing the tool, you can use it to set up a micro frontend architecture using Webpack Module Federation with React.

### Create a New Micro Frontend

```bash
create-microfrontend create 
```

The CLI will prompt you for several configuration options:

1. **Host Application**: Enter the name of your Host application.
2. **Remote Application**: Enter the name of your Remote application.


### Example

```bash
create-microfrontend create
```

### Sample Prompt Flow:

```bash
? Enter the name of your Host application:

? Enter the name of your Remote application:
```

This will create host & remote application.

### Run the Project

Once the project is scaffolded, navigate into the host & remote directory:


You can now run the development server using:

```bash
npm start
```

### Build the Project

To create a production build, run:

```bash
npm run build
```

### Local Development

To work on the CLI tool itself:

1. Clone the repository:

   ```bash
   git clone https://github.com/chetan2012/microfrontend-cli.git
   ```

2. Install dependencies:

   ```bash
   cd microfrontend-cli
   npm install
   ```

3. Test the CLI locally:

   ```bash
   npm link
   ```

4. Now you can use the CLI locally for development:

   ```bash
   create-microfrontend
   ```

## License

This project is licensed under the ISC License. See the [LICENSE](./LICENSE) file for details.