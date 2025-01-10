#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';


const program = new Command();

const createMicrofrontend = async ({hostApplicationName, remoteApplicationName}) => {
  const targetHostDir = path.resolve(hostApplicationName);
  const targetRemoteDir = path.resolve(remoteApplicationName);

  if (fs.existsSync(targetHostDir) || fs.existsSync(targetRemoteDir)) {
    console.log(chalk.red(`Either Host Directory or Remote Directory already exists.`));
    return;
  }

  await createApplication(hostApplicationName, 'host-app', targetHostDir);
  await createApplication(remoteApplicationName, 'remote-app', targetRemoteDir);
};

const createApplication = (applicationName, sourceDir, targetDir) => {
  console.log(chalk.yellow(`Creating ${applicationName}...`));
  try {
    // Copy the appropriate template based on app type
    const templatePath = path.join(process.cwd(), 'templates', sourceDir);
    fs.copySync(templatePath, targetDir);
  
    // Initialize the app (install dependencies)
    console.log(chalk.yellow(`Installing dependencies...`));
    execSync('npm install', { cwd: targetDir, stdio: 'inherit' });
  
    console.log(chalk.green(`${applicationName} created successfully at ${targetDir}`));

    console.log(chalk.blue(`Run "cd ${applicationName} && npm start" to start the ${targetDir} application.`));
  }

  catch (error) {
    console.log(chalk.red('Error starting the application.'));
  }

}

program
  .command('create')
  .description('Create a new microfrontend project')
  .action(async () => {
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
    ]);

    createMicrofrontend(answers);
  });

// Parse the command-line arguments
program.parse(process.argv);
