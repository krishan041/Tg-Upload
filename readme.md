<p align="center">
    <img src="https://www.svgrepo.com/download/349527/telegram.svg" align="center" width="30%">
</p>
<p align="center"><h1 align="center">TG-UPLOAD</h1></p>
<p align="center">
	<em><code>❯ A Telegram bot that downloads files from URLs, extracts zip files, and uploads them back to Telegram as documents or media.</code></em>
</p>
<p align="center">
	<!-- local repository, no metadata badges. --></p>
<p align="center">Built with the tools and technologies:</p>
<p align="center">
	<img src="https://img.shields.io/badge/npm-CB3837.svg?style=default&logo=npm&logoColor=white" alt="npm">
	<img src="https://img.shields.io/badge/JavaScript-F7DF1E.svg?style=default&logo=JavaScript&logoColor=black" alt="JavaScript">
	<img src="https://img.shields.io/badge/Docker-2496ED.svg?style=default&logo=Docker&logoColor=white" alt="Docker">
</p>
<br>


## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Usage](#usage)
- [Testing](#testing)
- [Project Roadmap](#project-roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Overview

TG-UPLOAD is a Telegram bot designed to download files from provided URLs, extract zip files if necessary, and upload the contents back to Telegram as documents or media. It is built using JavaScript and can be run locally or via Docker.

## Features

- Download files from URLs.
- Automatically extract zip files.
- Upload files to Telegram as documents or media.
- Real-time download progress logging.

## Project Structure

```
TG-Upload/
├── bot.js
├── download-files.js
├── index.js
├── package.json
├── tg-upload.js
└── .env.example
```

## Getting Started

### Prerequisites

- Node.js and npm
- Docker

### Installation

#### From Source:

1. Clone the repository:
   ```bash
   git clone https://github.com/pankaj-raikar/Tg-Upload.git
   ```

2. Change Directory:
   ```bash
   cd Tg-Upload
   ```


3. Install dependencies:
   ```bash
   npm install
   ```

4. Create a `.env` file from `.env.example` and configure environment variables.
    ```bash
   cp .env.example .env
   ```


### Usage

#### Running with npm:
   ```bash
   npm start
   ```


## Testing

Currently, there are no specific tests included. Consider adding tests for download and upload functionalities in the future.

## Project Roadmap

- [X] Implement file download with progress logging.
- [ ] Enhance error handling and logging.
- [ ] Add support for more file types and improve upload speed.

## Contributing

- **Fork the Repository:** Start by forking the project repository to your GitHub account.
- **Clone Locally:** Clone the forked repository to your local machine.
  ```bash
  git clone https://github.com/pankaj-raikar/Tg-Upload.git
  ```
- **Create a New Branch:**
  ```bash
  git checkout -b new-feature
  ```
- **Make Your Changes:** Develop and test your changes locally.
- **Commit Your Changes:**
  ```bash
  git commit -m 'Your commit message'
  ```
- **Push to GitHub:**
  ```bash
  git push origin new-feature
  ```
- **Submit a Pull Request:** Create a PR against the original project repository.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Thank you to all contributors.
- Special thanks to the Telegram Bot API team and other dependencies used.