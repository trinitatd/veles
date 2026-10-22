# Veles

**A Full-Stack Technical Blogging and Content Management Platform**

Veles is a space for developers, students, and technology enthusiasts to
publish technical articles, share ideas, discover knowledge, and connect
with other writers. Built with the MERN stack, Veles combines a focused
writing experience with author profiles and community features.

🌐 **Live Demo:** https://veles-phi.vercel.app/

------------------------------------------------------------------------

## Table of Contents

-   [Overview](#overview)
-   [Features](#features)
-   [Tech Stack](#tech-stack)
-   [Architecture](#architecture)
-   [Getting Started](#getting-started)
-   [Environment Variables](#environment-variables)
-   [Running Locally](#running-locally)
-   [Deployment](#deployment)
-   [Project Structure](#project-structure)
-   [Contributing](#contributing)
-   [Team](#team)
-   [License](#license)

## Overview

General-purpose publishing platforms can feel cluttered when all you
want is a dedicated place to write and read technical content. **Veles**
aims to provide a focused platform where users can publish useful
articles, build an author presence, and engage with the technical
community.

The project is developed by a team of student engineers from the
Information Technology department at Government Engineering College,
Barton Hill.

## Features

-   **Technical publishing** --- create and share technical articles.
-   **Authentication** --- user sign-in and account management powered
    by Clerk.
-   **Author profiles** --- explore writers and their published work.
-   **Rich content experience** --- browse and read articles through a
    dedicated interface.
-   **Messaging and private-channel workflows** --- support for user
    communication and channel requests.
-   **Media delivery** --- ImageKit integration for image and media
    assets.
-   **Responsive interface** --- a modern UI built with React and
    Tailwind CSS.
-   **Client-side routing** --- navigate between pages using React
    Router.
-   **Dark mode** --- switch between light and dark appearances.
-   **Full-stack architecture** --- a React client communicates with an
    Express backend and MongoDB database.

> Features may depend on the current deployment configuration and
> environment variables.

## Tech Stack

  Layer            Technologies
  ---------------- -----------------------------------------
  Frontend         React, Vite, Tailwind CSS, React Router
  Backend          Node.js, Express.js
  Database         MongoDB, Mongoose
  Authentication   Clerk
  Media            ImageKit
  Deployment       Vercel (client), Render (server)

## Architecture

``` text
User
  |
  v
React + Vite Client
  |-- Clerk Authentication
  |-- React Router
  |-- Tailwind CSS UI
  |
  v
Express.js API
  |
  |-- Mongoose
  v
MongoDB Atlas

Media assets --> ImageKit
Client deployment --> Vercel
Backend deployment --> Render
```

## Getting Started

### Prerequisites

Install the following before running the project:

-   Node.js and npm
-   A MongoDB database (local MongoDB or MongoDB Atlas)
-   Clerk application credentials
-   ImageKit credentials if using its media features

### Clone the repository

``` bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd <YOUR_REPOSITORY_DIRECTORY>
```

If the project contains separate `client` and `backend` folders, install
dependencies in each folder.

``` bash
cd client
npm install
```

``` bash
cd ../backend
npm install
```

Use the actual folder names in your repository if they differ.

## Environment Variables

Create local `.env` files for the client and server. **Never commit real
credentials, API secrets, database passwords, or private keys.**

### Client

A Vite client commonly uses environment variables prefixed with `VITE_`.
Add the variable names expected by your source code, for example:

``` env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_API_URL=http://localhost:5000
```

### Backend

Use the exact variable names referenced by your backend code. A typical
configuration may look like:

``` env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
CLERK_SECRET_KEY=your_clerk_secret_key
IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
IMAGEKIT_URL_ENDPOINT=your_imagekit_url_endpoint
```

These names are examples; confirm them against the project's
configuration and source files before running the application. Keep
`.env` files out of version control and provide a sanitized
`.env.example` for collaborators.

## Running Locally

Open two terminals from the repository root.

**Terminal 1 --- backend**

``` bash
cd backend
npm install
npm run dev
```

If the backend does not define a `dev` script, check its `package.json`
and use the configured start command.

**Terminal 2 --- client**

``` bash
cd client
npm install
npm run dev
```

Vite will print the local development URL in the terminal, commonly
`http://localhost:5173`.

## Deployment

The live client is deployed on Vercel:

-   **Live site:** https://veles-phi.vercel.app/

The backend can be deployed separately (for example, on Render). When
deploying:

1.  Configure all required environment variables in the hosting
    provider.
2.  Set the client API URL to the deployed backend URL.
3.  Configure backend CORS to allow the deployed client origin.
4.  Add production URLs to the relevant Clerk settings.
5.  Verify MongoDB Atlas network access and database credentials.
6.  Test authentication, article publishing, profiles, messaging, media,
    and direct navigation to nested routes.

Never include secret values in source code, screenshots, commits, or
this README.

## Project Structure

The exact structure may vary by branch. A typical layout is:

``` text
veles/
├── client/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── routes/
│   ├── models/
│   ├── controllers/
│   ├── package.json
│   └── server.js
├── .gitignore
└── README.md
```

## Contributing

Contributions and suggestions are welcome.

1.  Fork the repository.
2.  Create a feature branch: `git checkout -b feature/your-feature`.
3.  Make your changes and test them locally.
4.  Commit your changes with a clear message.
5.  Push your branch and open a pull request.

Please do not commit `.env` files, build outputs, dependency folders, or
credentials.

## Team

**Veles --- Team of Four Student Engineers**\
Information Technology\
Government Engineering College, Barton Hill, Kerala, India

Add each team member's name, role, and profile links here.

## License

No license has been specified yet. Unless a license is added to the
repository, reuse and redistribution are not automatically permitted.
Add a `LICENSE` file when the project's licensing decision has been
made.
