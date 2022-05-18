Here are some tested examples of full "from scratch" installations: install requirements, download the code, build and test. If you already installed some dependencies, you will only have to verify the versions.

The OS versions and dependencies versions are not restricted to the one we show here and other versions _may_ also work (with no warranty).


# WINDOWS
## Installation process example "from scratch" for Windows 10
In this example we use VS Code. You are of course free to use you prefered IDE !
### Requirements
- Install VS Code:
	- download Code [here](https://code.visualstudio.com/Download) by clicking on "Windows"
	- after download, follow the install instructions
- Install git:
	- download Git [here](https://git-scm.com/download/win) by clicking on "Click here to download the latest"
	- after download, follow the install instructions
- Install node and npm:
	- download Node [here](https://nodejs.org/en/download/releases/) by searching the version "10.19.0", clicking on "Downloads" and then choose "node-v10.19.0-x86.msi"
	- after download, follow the install instructions
	- npm is installed along Node
### Verifications
Start VS code, open a terminal. If the installation was successful, you should be able to run:
```
git --version
# Git version should be >2.0.
# you should optain something like:
# git version 2.36.1.windows.1

node --version
# v10.19.0

npm --version
# 6.13.4
```
### Download, build and test Pixano-Elements thanks to VS code
- Install the extension "Git Extension Pack"
- Click on "Clone a repository"
- Connect to github
- Select your fork of Pixano-Elements (if you don't want to fork, you can choose pixano/pixano-elements)
- (downloading)
- run in Code's terminal:
```
npm run deps
npm run build
npx serve demo
```
You should now be able to test our serverless demo on [http://localhost:3000](http://localhost:3000)



# LINUX
## Installation process example "from scratch" for Ubuntu 20.04
### Requirements
Open a terminal and run:
```bash
sudo apt install git
sudo apt install nodejs npm
```
Or install it with snap:
```bash
sudo snap install node --classic --channel=10/stable
```
### Verifications
Open a terminal. If the installation was successful, you should be able to run:
```bash
git --version
# Git version should be >2.0.
# you should optain something like:
# git version 2.25.1

node --version
# v10.19.0

npm --version
# 6.14.4
```
### Download, build and test Pixano-Elements
- Clone your fork of Pixano-Elements
```bash
git clone https://github.com/$YOURACCOUNT/pixano-elements.git
```
- OR: if you don't want to fork, you can clone pixano/pixano-elements:
```bash
git clone https://github.com/pixano/pixano-elements.git
```
- Run in a terminal:
```
npm run deps
npm run build
npx serve demo
```
You should now be able to test our serverless demo on [http://localhost:3000](http://localhost:3000)





