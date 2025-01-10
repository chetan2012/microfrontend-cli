const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

function generateHost(hostName) {
  const hostTemplatePath = path.join(__dirname, 'templates/host-template');
  const hostDir = path.join(process.cwd(), hostName);
  
  if (fs.existsSync(hostDir)) {
    console.log('Directory already exists!');
    return;
  }

  fs.mkdirSync(hostDir);
  copyTemplate(hostTemplatePath, hostDir);

  console.log(`Host application "${hostName}" created successfully!`);
}

function generateApp(appName) {
  const appTemplatePath = path.join(__dirname, 'templates/app-template');
  const appDir = path.join(process.cwd(), appName);

  if (fs.existsSync(appDir)) {
    console.log('Directory already exists!');
    return;
  }

  fs.mkdirSync(appDir);
  copyTemplate(appTemplatePath, appDir);

  console.log(`Micro frontend app "${appName}" created successfully!`);
}

function copyTemplate(sourceDir, destDir) {
  const files = fs.readdirSync(sourceDir);

  files.forEach(file => {
    const srcFile = path.join(sourceDir, file);
    const destFile = path.join(destDir, file);

    if (fs.statSync(srcFile).isDirectory()) {
      fs.mkdirSync(destFile);
      copyTemplate(srcFile, destFile);
    } else {
      fs.copyFileSync(srcFile, destFile);
    }
  });
}

module.exports = { generateHost, generateApp };
