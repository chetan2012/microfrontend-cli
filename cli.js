#!/usr/bin/env node

import { Command } from 'commander';
import ejs from 'ejs';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';

const program = new Command();

const checkTemplateExistence = (templateSourcePath) => {
  // Check if the template directory exists
  if (!fs.existsSync(templateSourcePath)) {
    throw new Error(`Template directory not found: ${templateSourcePath}. Please make sure the templates directory exists.`);
  }

  // Check if specific subdirectories (host-app and remote-app) exist
  const requiredSubdirectories = ['host-app', 'remote-app'];
  for (const subdir of requiredSubdirectories) {
    const subdirPath = path.join(templateSourcePath, subdir);
    if (!fs.existsSync(subdirPath)) {
      throw new Error(`Missing required template subdirectory: ${subdir}. Ensure the '${subdir}' directory exists inside the templates folder.`);
    }
  }
};

const createMicrofrontend = async ({ hostApplicationName, remoteApplicationName, remoteApplicationCount }) => {
  const targetHostDir = path.resolve(hostApplicationName);
  const targetRemoteDir = path.resolve(remoteApplicationName);

  if (fs.existsSync(targetHostDir)) {
    console.log(chalk.red(`Host Directory already exists at ${targetHostDir}.`));
    return;
  }

  // Create host application
  try {
    await createApplication({
      applicationName: hostApplicationName,
      sourceDir: 'host-app',
      targetDir: targetHostDir,
      port: 3000,
      remoteApplicationCount,
      remoteApplicationName,
    });
  } catch (error) {
    console.log(chalk.red(`Failed to create host application: ${error.message}`));
  }

  // Create remote applications
  for (let i = 1; i <= remoteApplicationCount; i++) {
    const remoteDir = `${targetRemoteDir}_${i}`;
    if (fs.existsSync(remoteDir)) {
      console.log(chalk.red(`Remote Directory already exists at ${remoteDir}.`));
      continue; // Skip the creation of this remote if it exists
    }
    try {
      await createApplication({
        applicationName: `${remoteApplicationName}_${i}`,
        sourceDir: 'remote-app',
        targetDir: remoteDir,
        port: `${3000 + i}`,
        remoteApplicationCount,
      });
    } catch (error) {
      console.log(chalk.red(`Failed to create remote application ${remoteApplicationName}_${i}: ${error.message}`));
    }
  }
};

const createApplication = async ({
  applicationName, 
  sourceDir, 
  targetDir, 
  port, 
  remoteApplicationCount, 
  remoteApplicationName = null
}) => {
  console.log(chalk.yellow(`Creating ${applicationName}...`));
  try {
    const templateSourcePath = path.join(process.cwd(), 'templates', sourceDir);
    if (!fs.existsSync(templateSourcePath)) {
      throw new Error(`Template source directory not found: ${templateSourcePath}`);
    }

    // Check if the templates directory and required subdirectories exist
    checkTemplateExistence(path.join(process.cwd(), 'templates'));

    // Copy template files to target directory
    fs.copySync(templateSourcePath, targetDir);

    // Remove index.ejs/webpack.config.ejs file from the remote directory.
    fs.remove(path.join(targetDir, 'src', 'index.ejs'));
    fs.remove(path.join(targetDir, 'src', 'webpack.config.ejs'));

    let microfrontends;
    if (sourceDir === 'host-app') {
      microfrontends = [];
      for (let i = 1; i <= remoteApplicationCount; i++) {
        const remotePort = port + i;
        microfrontends.push({ name: `${remoteApplicationName}_${i}`, port: remotePort });
      }

      const hostIndex = path.join(templateSourcePath, 'src', 'index.ejs');
      if (!fs.existsSync(hostIndex)) {
        throw new Error(`Host index template not found: ${hostIndex}`);
      }

      ejs.renderFile(hostIndex, { microfrontends }, (err, str) => {
        if (err) throw err;
        
        fs.writeFileSync(path.join(targetDir, 'src', 'index.js'), str);
      });
    } else {
      microfrontends = { name: applicationName, port };
    }

    // Render webpack configuration
    try {
      const webpackConfigTemplate = path.join(templateSourcePath, 'webpack.config.ejs');
      if (!fs.existsSync(webpackConfigTemplate)) {
        throw new Error(`Webpack config template not found: ${webpackConfigTemplate}`);
      }

      ejs.renderFile(webpackConfigTemplate, { microfrontends }, (err, str) => {
        if (err) throw err;
        fs.writeFileSync(path.join(targetDir, 'webpack.config.js'), str);
      });
    } catch (error) {
      throw new Error(`Error generating webpack configuration: ${error.message}`);
    }

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

program
  .command('create')
  .description('Create a new microfrontend project')
  .action(async () => {
    try {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'hostApplicationName',
          message: 'Enter the name of your Host application:',
          validate: (input) => input ? true : 'Host application name is required!',
        },
        {
          type: 'input',
          name: 'remoteApplicationName',
          message: 'Enter the name of your Remote application:',
          validate: (input) => input ? true : 'Remote application name is required!',
        },
        {
          type: 'input',
          name: 'remoteApplicationCount',
          message: 'Enter the count of microfrontends:',
          validate: (input) => input ? true : 'Micro Frontend count is required!',
        }
      ]);

      await createMicrofrontend(answers);
    } catch (error) {
      console.log(chalk.red('Error while setting up microfrontends:', error.message));
    }
  });

// Parse the command-line arguments
program.parse(process.argv);