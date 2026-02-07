# School Management System - Frontend

This is the frontend application for the School Management System, built with [Next.js](https://nextjs.org).

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Backend API server running (see backend README)

### Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local yesii
   ```

2. Update `.env.local` with your configuration:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:4000
   ```

   **For Production:**
   ```env
   NEXT_PUBLIC_API_URL=https://your-api-domain.com
   ```

### Installation

```bash
npm install
# or
yarn install
# or
pnpm install
```

### Development

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Build for Production

```bash
npm run build
npm start
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:4000` | Yes |

**Note:** Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Never put sensitive data in these variables.

## API Integration

The frontend is fully integrated with the backend API. All endpoints are configured in `lib/api/`:

- **Auth**: `/api/auth` - Login, register, logout, get current user
- **Students**: `/api/students` - CRUD operations, class assignment, transfer
- **Classes**: `/api/classes` - Class and subject management
- **Payments**: `/api/payments` - Payment processing and receipts
- **Attendance**: `/api/attendance` - Attendance tracking
- **Marks**: `/api/marks` - Grade management and calculations
- **Reports**: `/api/reports` - Student and class reports
- **Terms**: `/api/terms` - Academic term management
- **SubExams**: `/api/subexams` - Sub-exam configuration

### API Client Configuration

The API client (`lib/api/client.ts`) is configured with:
- Automatic cookie-based authentication
- Error handling with toast notifications
- Request/response interceptors
- Environment-based URL configuration

## Project Structure

```
school-system-frontend/
├── app/                    # Next.js app router pages
│   ├── (auth)/            # Authentication pages
│   └── dashboard/         # Dashboard pages
├── components/            # React components
│   ├── forms/            # Form components
│   ├── layout/           # Layout components
│   ├── shared/           # Shared components
│   ├── tables/           # Table components
│   └── ui/               # UI components (shadcn/ui)
├── lib/
│   ├── api/              # API client functions
│   ├── hooks/             # Custom React hooks
│   ├── store/             # State management (Zustand)
│   ├── types/             # TypeScript types
│   └── utils/             # Utility functions
└── public/                # Static assets
```

## Features

- ✅ User authentication (Owner, Registrar, Teacher roles)
- ✅ Student management
- ✅ Class and subject management
- ✅ Attendance tracking
- ✅ Grade/mark management
- ✅ Payment processing
- ✅ Report generation
- ✅ Toast notifications for all operations
- ✅ Responsive design

## Troubleshooting

### API Connection Issues

1. **Check backend is running**: Ensure the backend server is running on the port specified in `NEXT_PUBLIC_API_URL`
2. **Check CORS**: Verify backend CORS settings allow requests from your frontend URL
3. **Check environment variables**: Ensure `.env.local` is properly configured
4. **Check browser console**: Look for network errors or CORS issues

### Common Issues

- **"NEXT_PUBLIC_API_URL is not set"**: Create `.env.local` file with the API URL
- **401 Unauthorized**: Session expired, you'll be redirected to login
- **CORS errors**: Ensure backend `FRONTEND_URL` matches your frontend URL

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new).

1. Push your code to GitHub
2. Import your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!
