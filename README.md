# Prompt Library
A simple place to keep your favorite prompts. Built with Next.js 16, Supabase, and Tailwind CSS.

## Features
- **Workspace Management** (TBD): Organize your prompts into distinct workspaces for better collaboration and separation of concerns.
- **Prompt Versioning**: Track changes and maintain history for your prompt iterations.
- **Content Comparison**: Visualize differences between prompt versions using a built-in diff viewer.
- **Organization Tools**: 
- **Tags**: Categorize prompts for easy filtering.
- **Favorites**: Quickly access your most-used prompts.

> **Note regarding Email**: While `nodemailer` is included in the project dependencies, it is **not currently configured** or active in the application logic.

## Technology Stack
This project leverages the latest standards in the React ecosystem:

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white) 
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white)

- **Framework**: [Next.js 16.1.6](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Backend & Auth**: Supabase (@supabase/ssr)
- **UI Components**: React 19, Lucide React

## How to Run with Docker
You can containerize and run this application using Docker.

### Prerequisites
- Docker installed on your machine.
- A valid `.env.local` file containing your Supabase credentials.

### Steps

1. **Build the Docker Image**
   Run the following command in the root directory of the project:
   ```bash
   docker build -t prompt-library .
   ```

2. **Run the Container**
   Start the application on port 3000. You must pass your environment variables (usually found in `.env.local`) to the container for the database connection to work.
   ```bash
   docker run -p 3000:3000 --env-file .env.local prompt-library
   ```

3. **Access the App**
   Open your browser and navigate to: [http://localhost:3000](http://localhost:3000)

## License

MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.