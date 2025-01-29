#!/usr/bin/env node

import { Command } from 'commander';
import ejs from 'ejs';
import inquirer from 'inquirer';
import fs from 'fs-extra'; // fs-extra to handle copy
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';

const program = new Command();
const setupFilePath = path.join(process.cwd(), 'microfrontend-setup.json');

// Utility function to read the last configuration from the JSON file.
const readConfigFile = async () => {
  try {
    const setupData = await fs.readFile(setupFilePath, 'utf-8');
    return JSON.parse(setupData);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    console.error(chalk.red('Error reading configuration file:', error.message));
    return [];
  }
};

// Save setup details to the configuration file.
const saveSetupToFile = async (setupDetails) => {
  const setupData = await readConfigFile();
  setupData.push(setupDetails);
  try {
    await fs.writeFile(setupFilePath, JSON.stringify(setupData, null, 2));
    console.log(chalk.green(`Setup details saved to ${setupFilePath}`));
  } catch (error) {
    console.error(chalk.red('Error saving setup details:', error.message));
  }
};

// Check if template directories exist.
const checkTemplateExistence = async (templateSourcePath) => {
  const requiredSubdirectories = ['host-app', 'remote-app'];
  for (const subdir of requiredSubdirectories) {
    const subdirPath = path.join(templateSourcePath, subdir);
    try {
      await fs.access(subdirPath);
    } catch {
      throw new Error(`Missing required template subdirectory: ${subdir}`);
    }
  }
};

// Prompt for user input with validation
const promptForInput = async (questions) => {
  const answers = await inquirer.prompt(questions);
  return answers;
};

// Function to update package.json with the correct scripts based on the tool
const updatePackageJson = (targetDir, tool) => {
  const packageJsonPath = path.join(targetDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  if (tool === 'Webpack') {
    packageJson.scripts = {
      "start": "webpack serve --config webpack.config.js --mode development",
      "build": "webpack --config webpack.config.js --mode production"
    };
  } else if (tool === 'Vite') {
    packageJson.scripts = {
      "start": "vite",
      "build": "vite build"
    };
  }

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log(`package.json updated with ${tool} scripts.`);
};

// Create an application from template (host or remote)
const createApplication = async ({
  applicationName,
  sourceDir,
  targetDir,
  port,
  remoteApplicationCount = 0,
  remoteApplicationName = null,
  microfrontendTool = 'Webpack'
}) => {
  console.log(chalk.yellow(`Creating ${applicationName}...`));
  try {
    const templateSourcePath = path.join(process.cwd(), 'templates', sourceDir);
    try {
      await fs.access(templateSourcePath);

      // Check if the templates directory and required subdirectories exist
      await checkTemplateExistence(path.join(process.cwd(), 'templates'));
    }
    catch (error) {
      // Handle the error when the directory doesn't exist
      throw new Error(`Template source directory not found: ${templateSourcePath}`);
    }


    // Copy template files to target directory
    await fs.copy(templateSourcePath, targetDir);

    // Remove index.ejs/webpack.config.ejs file from the remote directory.
    fs.remove(path.join(targetDir, 'src', 'index.ejs'));
    fs.remove(path.join(targetDir, 'webpack.config.ejs'));
    fs.remove(path.join(targetDir, 'vite.config.ejs'));

    let microfrontends;
    if (sourceDir === 'host-app') {
      microfrontends = [];
      for (let i = 1; i <= remoteApplicationCount; i++) {
        const remotePort = port + i;
        microfrontends.push({ name: `${remoteApplicationName}_${i}`, port: remotePort });
      }

      const hostIndex = path.join(templateSourcePath, 'src', 'index.ejs');

      try {
        // Asynchronously check if the host index template exists
        await fs.access(hostIndex);
        await renderTemplate(path.join(targetDir, 'src', 'index.jsx'), hostIndex, { microfrontends });
      } catch (error) {
        // If the file doesn't exist, throw an error
        throw new Error(`Host index template not found: ${hostIndex}`);
      }
    } else {
      microfrontends = { name: applicationName, port };
    }

    // Render webpack configuration
    if (microfrontendTool === 'Webpack') {
      try {
        const webpackConfigTemplate = path.join(templateSourcePath, 'webpack.config.ejs');
        await fs.access(webpackConfigTemplate);
        await renderTemplate(path.join(targetDir, 'webpack.config.js'), webpackConfigTemplate, { microfrontends });
        updatePackageJson(targetDir, 'Webpack');
      } catch (error) {
        throw new Error(`Error generating webpack configuration: ${error.message}`);
      }
    }

    else {
      try {
        const viteConfigTemplate = path.join(templateSourcePath, 'vite.config.ejs');
        await fs.access(viteConfigTemplate);
        await renderTemplate(path.join(targetDir, 'vite.config.js'), viteConfigTemplate, { microfrontends });
        updatePackageJson(targetDir, 'Vite');
      } catch (error) {
        throw new Error(`Error generating vite configuration: ${error.message}`);
      }
    }
    // Render vite configuration


    // Initialize the app (install dependencies)
    console.log(chalk.yellow(`Installing dependencies...`));
    try {
      execSync('npm install', { cwd: targetDir, stdio: 'inherit' });
    } catch (error) {
      throw new Error(`Failed to install dependencies for ${applicationName}: ${error.message}`);
    }

    console.log(chalk.green(`${applicationName} created successfully at ${targetDir}`));
    console.log(chalk.blue(`Run "cd ${applicationName} && npm start" to start the ${targetDir} application.`));

  } catch (error) {
    console.log(chalk.red(`Error creating application ${applicationName}: ${error.message}`));
    throw error;  // Re-throw to propagate error to the caller
  }
};

// Render an EJS template to a file asynchronously
const renderTemplate = async (outputPath, templateName, data) => {
  const templatePath = path.join(templateName);
  return new Promise((resolve, reject) => {
    ejs.renderFile(templatePath, data, (err, str) => {
      if (err) {
        reject(new Error(`Error rendering template: ${err.message}`));
      } else {
        fs.writeFile(outputPath, str).then(resolve).catch(reject);
      }
    });
  });
};

// Check and overwrite if needed
const confirmOverwrite = async (dir, type) => {
  try {
    await fs.access(dir);
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `${type} directory ${dir} already exists. Do you want to overwrite it?`,
        default: false
      }
    ]);
    if (!overwrite) return false;
    await fs.remove(dir);
    console.log(chalk.yellow(`Existing ${type} directory removed.`));
  } catch {
    // Directory doesn't exist, safe to proceed
    return true;
  }
  return true;
};

// Create microfrontend setup (host + remotes)
const createMicrofrontend = async ({ hostApplicationName, remoteApplicationName, remoteApplicationCount, microfrontendTool }) => {
  const targetHostDir = path.resolve(hostApplicationName);
  const targetRemoteDir = path.resolve(remoteApplicationName);

  // Create host application
  if ((await confirmOverwrite(targetHostDir, 'host')))
  await createApplication({ applicationName: hostApplicationName, sourceDir: 'host-app', targetDir: targetHostDir, port: 3000, remoteApplicationCount, remoteApplicationName, microfrontendTool });

  // Create remote applications
  for (let i = 0; i < remoteApplicationCount; i++) {
    const remoteDir = `${targetRemoteDir}_${i + 1}`;
    const port = 3000 + i + 1;
    if (!(await confirmOverwrite(remoteDir, 'remote'))) continue;
    await createApplication({ applicationName: `${remoteApplicationName}_${i + 1}`, sourceDir: 'remote-app', targetDir: remoteDir, port: port, undefined, undefined, microfrontendTool });
  }
};

// Add more remote apps to the host
const addRemotesToHost = async (remoteApplicationName, remoteApplicationCount, hostApplicationName, existingRemoteCount, microfrontendTool) => {
  const targetHostDir = path.resolve(hostApplicationName);
  try {
    await fs.access(targetHostDir);
  } catch {
    console.log(chalk.red(`Host directory ${targetHostDir} does not exist. Please create the host application first.`));
    return;
  }

  for (let i = existingRemoteCount; i < existingRemoteCount + remoteApplicationCount; i++) {
    const remoteDir = `${remoteApplicationName}_${i + 1}`;
    await createApplication({ applicationName: remoteDir, sourceDir: 'remote-app', targetDir: path.resolve(remoteDir), port: 3000 + i + 1, undefined, undefined, microfrontendTool });
  }
};

program
  .command('create')
  .description('Create a new microfrontend project')
  .action(async () => {
    try {
    const { hostApplicationName, remoteApplicationName, remoteApplicationCount, microfrontendTool } = await promptForInput([
      { type: 'input', name: 'hostApplicationName', message: 'Enter the name of your Host application:', validate: (input) => input ? true : 'Host application name is required!' },
      { type: 'input', name: 'remoteApplicationName', message: 'Enter the name of your Remote application:', validate: (input) => input ? true : 'Remote application name is required!' },
      { type: 'input', name: 'remoteApplicationCount', message: 'Enter the count of microfrontends (1-10):', validate: (input) => (parseInt(input, 10) > 0 && parseInt(input, 10) <= 10) ? true : 'Please enter a number between 1 and 10!' },
      {
        type: 'list',
        name: 'microfrontendTool',
        message: 'Which build tool do you want to use?',
        choices: ['Webpack', 'Vite'],
        default: 'Webpack', // Default to Webpack
      },
    ]);

    await createMicrofrontend({ hostApplicationName, remoteApplicationName, remoteApplicationCount, microfrontendTool });
    saveSetupToFile({ hostApplicationName, remoteApplicationName, remoteApplicationCount, microfrontendTool });
    } catch (error) {
      console.log(chalk.red('Error during creation:', error.message));
    }
  });

program
  .command('add-remote-to-host')
  .description('Add more remote applications to an existing host')
  .action(async () => {
    try {
      const lastConfig = (await readConfigFile()).pop();
      if (!lastConfig) {
        console.log(chalk.red('No previous configuration found.'));
        return;
      }

      const { hostApplicationName, remoteApplicationName, remoteApplicationCount, microfrontendTool } = lastConfig;

      // Check if remotes have already been added
      if (lastConfig.remoteApplicationCount > 10) {
        console.log(chalk.red('Maximum remotes have already been added to the host.'));
        return; // Prevent further execution
      }

      const { remoteApplicationCountToAdd } = await promptForInput([
        { type: 'input', name: 'remoteApplicationCountToAdd', message: 'Enter the count of microfrontends to add (1-10):', validate: (input) => (parseInt(input, 10) > 0 && parseInt(input, 10) <= 10) ? true : 'Please enter a number between 1 and 10!' }
      ]);

      saveSetupToFile({ ...lastConfig, remoteApplicationCount: parseInt(remoteApplicationCount, 10) + parseInt(remoteApplicationCountToAdd, 10) });
      await addRemotesToHost(remoteApplicationName, parseInt(remoteApplicationCountToAdd, 10), hostApplicationName, parseInt(remoteApplicationCount, 10), microfrontendTool);
    } catch (error) {
      console.log(chalk.red('Error adding remotes:', error.message));
    }
  });

program.parse(process.argv);
