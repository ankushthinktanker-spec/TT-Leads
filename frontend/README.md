# ThinkTanker Lead Management System - Frontend

Modern React + TypeScript frontend for the ThinkTanker Lead Management System.

## Features

- ✅ React 18 with TypeScript
- ✅ Vite for fast development
- ✅ Tailwind CSS for styling
- ✅ Redux Toolkit for state management
- ✅ React Router for navigation
- ✅ Axios for API calls
- ✅ React Hook Form + Zod for forms
- ✅ JWT Authentication

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables

Create a `.env` file:

```
VITE_API_URL=http://localhost:5000/api
```

## Project Structure

```
frontend/
├── src/
│   ├── components/      # Reusable components
│   ├── pages/           # Page components
│   ├── store/           # Redux store and slices
│   ├── lib/             # Utilities and helpers
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── public/              # Static assets
├── .env                 # Environment variables
├── vite.config.ts       # Vite configuration
├── tailwind.config.js   # Tailwind configuration
└── tsconfig.json        # TypeScript configuration
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Lint code

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Redux Toolkit** - State management
- **React Router** - Routing
- **Axios** - HTTP client
- **React Hook Form** - Form handling
- **Zod** - Schema validation

## License

ISC
